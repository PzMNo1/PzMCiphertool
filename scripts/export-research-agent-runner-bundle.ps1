param(
    [string]$BaseUrl = "http://localhost:8080",
    [string]$RunId = "",
    [string]$OutputPath = "",
    [string]$Authorization = "",
    [int]$EvidenceAuditLimit = 100,
    [switch]$SkipEvidenceAudit,
    [switch]$AddSample,
    [string]$SampleId = "",
    [string]$SampleTitle = "",
    [string]$Cases = "",
    [string]$Tags = "real_export backend_status",
    [string]$ManifestPath = "frontendciphertool\model\agent\fixtures\research-eval-runs\samples.json",
    [string]$FixtureDir = "frontendciphertool\model\agent\fixtures\research-eval-runs",
    [double]$MinAverageScore = 1,
    [int]$MaxFailCount = 0,
    [int]$MaxMissingCount = 0,
    [int]$MinSourceCount = 3,
    [int]$MinEvidenceCount = 3,
    [double]$MinCitationEvidenceCoverage = 1,
    [double]$MinEvidenceClosureRate = 1,
    [switch]$QuietAddSample,
    [switch]$Default
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

function Join-Url {
    param(
        [string]$Root,
        [string]$Path
    )

    return $Root.TrimEnd("/") + "/" + $Path.TrimStart("/")
}

function Invoke-AgentRunnerJson {
    param(
        [string]$Url
    )

    $headers = @{}
    if (-not [string]::IsNullOrWhiteSpace($Authorization)) {
        $headers["Authorization"] = $Authorization
    }
    try {
        return Invoke-RestMethod -Method Get -Uri $Url -Headers $headers
    } catch {
        throw "Agent Runner export request failed for $Url : $($_.Exception.Message)"
    }
}

function Get-RunIdsFromStatusResponse {
    param(
        [object]$StatusResponse
    )

    $runs = @()
    if ($StatusResponse.data -and $StatusResponse.data.runs) {
        $runs = @($StatusResponse.data.runs)
    } elseif ($StatusResponse.runs) {
        $runs = @($StatusResponse.runs)
    } elseif ($StatusResponse.data -and $StatusResponse.data.runId) {
        $runs = @($StatusResponse.data)
    } elseif ($StatusResponse.runId) {
        $runs = @($StatusResponse)
    }
    return @($runs | ForEach-Object { [string]$_.runId } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
}

function Write-Utf8NoBom {
    param(
        [string]$Path,
        [string]$Content
    )

    $fullPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Path)
    $directory = Split-Path -Parent $fullPath
    if (-not [string]::IsNullOrWhiteSpace($directory) -and -not (Test-Path -LiteralPath $directory)) {
        New-Item -ItemType Directory -Path $directory | Out-Null
    }
    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($fullPath, $Content, $encoding)
}

if ($EvidenceAuditLimit -lt 1) {
    throw "EvidenceAuditLimit must be >= 1."
}
if ($AddSample) {
    if ([string]::IsNullOrWhiteSpace($SampleId)) {
        throw "-SampleId is required when -AddSample is set."
    }
    if ([string]::IsNullOrWhiteSpace($SampleTitle)) {
        throw "-SampleTitle is required when -AddSample is set."
    }
    if ([string]::IsNullOrWhiteSpace($Cases)) {
        throw "-Cases is required when -AddSample is set."
    }
    foreach ($threshold in @($MinAverageScore, $MaxFailCount, $MaxMissingCount, $MinSourceCount, $MinEvidenceCount, $MinCitationEvidenceCoverage, $MinEvidenceClosureRate)) {
        if ([double]$threshold -lt 0) {
            throw "Sample expectation thresholds must be >= 0."
        }
    }
}

$statusPath = if ([string]::IsNullOrWhiteSpace($RunId)) { "api/agent-runner/status" } else { "api/agent-runner/status/$RunId" }
$statusUrl = Join-Url -Root $BaseUrl -Path $statusPath
$statusResponse = Invoke-AgentRunnerJson -Url $statusUrl
$runIds = @(Get-RunIdsFromStatusResponse -StatusResponse $statusResponse)
if ($runIds.Count -eq 0) {
    throw "Agent Runner status response did not contain any runId values: $statusUrl"
}

$evidenceAuditResponses = @()
if (-not $SkipEvidenceAudit) {
    foreach ($id in $runIds) {
        $auditUrl = Join-Url -Root $BaseUrl -Path ("api/agent-runner/runs/{0}/evidence-audit?limit={1}" -f [uri]::EscapeDataString($id), $EvidenceAuditLimit)
        try {
            $evidenceAuditResponses += Invoke-AgentRunnerJson -Url $auditUrl
        } catch {
            $evidenceAuditResponses += [ordered]@{
                success = $false
                message = "Agent runner evidence audit export failed"
                data = [ordered]@{
                    schemaVersion = "agent-evidence-audit-v1"
                    runId = $id
                    error = [string]$_.Exception.Message
                }
            }
        }
    }
}

$temporaryOutputRoot = ""
if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $suffix = if ([string]::IsNullOrWhiteSpace($RunId)) { "status" } else { $RunId -replace "[^A-Za-z0-9_.-]", "_" }
    if ($AddSample) {
        $temporaryOutputRoot = Join-Path $env:TEMP ("research-agent-runner-export-" + [guid]::NewGuid().ToString("N"))
        New-Item -ItemType Directory -Path $temporaryOutputRoot | Out-Null
        $OutputPath = Join-Path $temporaryOutputRoot ("agent-runner-export-{0}.json" -f $suffix)
    } else {
        $OutputPath = Join-Path "frontendciphertool\model\agent\fixtures\research-eval-runs" ("agent-runner-export-{0}.json" -f $suffix)
    }
}
$outputDir = Split-Path -Parent $OutputPath
if (-not [string]::IsNullOrWhiteSpace($outputDir) -and -not (Test-Path -LiteralPath $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

$bundle = [ordered]@{
    exportType = "agent-runner-api-bundle"
    version = "agent-runner-export-v1"
    exportedAt = (Get-Date).ToUniversalTime().ToString("o")
    source = [ordered]@{
        baseUrl = $BaseUrl
        statusUrl = $statusUrl
        runId = $RunId
        evidenceAuditLimit = $EvidenceAuditLimit
        evidenceAuditSkipped = [bool]$SkipEvidenceAudit
    }
    statusResponse = $statusResponse
    evidenceAuditResponses = $evidenceAuditResponses
}
Write-Utf8NoBom -Path $OutputPath -Content ($bundle | ConvertTo-Json -Depth 20)
Write-Host "Research Agent runner bundle exported: $OutputPath"
Write-Host "Run ids: $($runIds -join ', ')"

if ($AddSample) {
    $addArgs = @(
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        "scripts\add-research-agent-eval-sample.ps1",
        "-InputPath",
        $OutputPath,
        "-Id",
        $SampleId,
        "-Title",
        $SampleTitle,
        "-Cases",
        $Cases,
        "-Tags",
        $Tags,
        "-ManifestPath",
        $ManifestPath,
        "-FixtureDir",
        $FixtureDir,
        "-MinAverageScore",
        ([string]$MinAverageScore),
        "-MaxFailCount",
        ([string]$MaxFailCount),
        "-MaxMissingCount",
        ([string]$MaxMissingCount),
        "-MinSourceCount",
        ([string]$MinSourceCount),
        "-MinEvidenceCount",
        ([string]$MinEvidenceCount),
        "-MinCitationEvidenceCoverage",
        ([string]$MinCitationEvidenceCoverage),
        "-MinEvidenceClosureRate",
        ([string]$MinEvidenceClosureRate),
        "-Apply"
    )
    if ($QuietAddSample) {
        $addArgs += "-Quiet"
    }
    if ($Default) {
        $addArgs += "-Default"
    }
    & powershell @addArgs
    $exitCode = $LASTEXITCODE
    if ($null -ne $exitCode -and $exitCode -ne 0) {
        throw "add-research-agent-eval-sample.ps1 exited with code $exitCode"
    }
}

if (-not [string]::IsNullOrWhiteSpace($temporaryOutputRoot) -and (Test-Path -LiteralPath $temporaryOutputRoot)) {
    Remove-Item -LiteralPath $temporaryOutputRoot -Recurse -Force
}
