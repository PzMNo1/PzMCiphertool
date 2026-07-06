param(
    [string]$BackendDir = "backendcipher",
    [string]$JavaHome = "D:\10_Leochad\jdk-17.0.12",
    [string]$MavenHome = "D:\10_Leochad\apache-maven-3.9.5",
    [switch]$PreferProcessEnv
)

$ErrorActionPreference = "Stop"

function Import-AgentDotEnv {
    param(
        [string[]]$Paths,
        [switch]$PreferProcessEnv
    )

    $names = @("OPENAI_API_KEY", "OPENAI_BASE_URL", "OPENAI_MODEL")
    foreach ($path in $Paths) {
        if (-not (Test-Path -LiteralPath $path)) {
            continue
        }

        Get-Content -LiteralPath $path | ForEach-Object {
            if ($_ -notmatch '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
                return
            }

            $name = $matches[1]
            if ($names -notcontains $name) {
                return
            }

            $value = $matches[2].Trim()
            if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
                $value = $value.Substring(1, $value.Length - 2)
            }

            $current = [Environment]::GetEnvironmentVariable($name, "Process")
            if ($PreferProcessEnv -and -not [string]::IsNullOrWhiteSpace($current)) {
                return
            }

            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

function Get-MaskedValue {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) {
        return "<missing>"
    }
    if ($Value.Length -le 8) {
        return "***"
    }
    return "$($Value.Substring(0, 4))...$($Value.Substring($Value.Length - 4))"
}

function Resolve-WorkspacePath {
    param([string]$Path)
    if ([System.IO.Path]::IsPathRooted($Path)) {
        return $Path
    }
    return Join-Path (Get-Location) $Path
}

$backendPath = Resolve-WorkspacePath $BackendDir
if (-not (Test-Path -LiteralPath $backendPath)) {
    throw "Backend directory not found: $backendPath"
}

$workspaceDotEnv = Join-Path (Get-Location) ".env"
$backendDotEnv = Join-Path $backendPath ".env"
Import-AgentDotEnv -Paths @($workspaceDotEnv, $backendDotEnv) -PreferProcessEnv:$PreferProcessEnv

if (-not $env:OPENAI_API_KEY) {
    throw "OPENAI_API_KEY is required. Configure a valid OpenAI-compatible key before running real E2E."
}

if ($JavaHome -and (Test-Path -LiteralPath $JavaHome)) {
    $env:JAVA_HOME = $JavaHome
}
if ($MavenHome -and (Test-Path -LiteralPath $MavenHome)) {
    $env:MAVEN_HOME = $MavenHome
}
if ($env:JAVA_HOME) {
    $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
}
if ($env:MAVEN_HOME) {
    $env:PATH = "$env:MAVEN_HOME\bin;$env:PATH"
}

Write-Host "Running backend research Agent real E2E..."
Write-Host "Backend: $backendPath"
Write-Host "Model:   $($env:OPENAI_MODEL)"
Write-Host "Base:    $($env:OPENAI_BASE_URL)"
Write-Host "Key:     $(Get-MaskedValue $env:OPENAI_API_KEY) ($($env:OPENAI_API_KEY.Length) chars)"
Write-Host "Output:  $backendPath\target\agent-real-e2e"

Push-Location $backendPath
try {
    & mvn --% -Dtest=BackendResearchAgentLoopRealE2ETest -Dagent.realE2E=true test
    if ($LASTEXITCODE -ne 0) {
        $responsePath = Join-Path $backendPath "target\agent-real-e2e\run-response.json"
        if (Test-Path -LiteralPath $responsePath) {
            try {
                $json = Get-Content -LiteralPath $responsePath -Raw | ConvertFrom-Json -Depth 120
                $readiness = $json.research_run_bundle.productionReadiness
                $diagnostics = $readiness.diagnostics
                Write-Host "Real E2E readiness: $($readiness.status) ($($readiness.readinessScore))"
                if ($diagnostics) {
                    Write-Host "Model:   $($diagnostics.model.status) / $($diagnostics.model.errorCategory) / $($diagnostics.model.statusCode)"
                    Write-Host "Editing: $($diagnostics.editorial.status) / $($diagnostics.editorial.errorCategory) / $($diagnostics.editorial.statusCode)"
                    Write-Host "Action:  $($diagnostics.recommendedAction)"
                }
            } catch {
                Write-Host "Could not parse target\agent-real-e2e\run-response.json: $($_.Exception.Message)"
            }
        }
        throw "Real E2E failed. Inspect target\agent-real-e2e\research-run-bundle.json and target\surefire-reports."
    }
} finally {
    Pop-Location
}

Write-Host "Real E2E passed. Review target\agent-real-e2e\manuscript.md and research-run-bundle.json."
