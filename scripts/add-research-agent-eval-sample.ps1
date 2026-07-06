param(
    [Parameter(Mandatory = $true)]
    [string]$InputPath,
    [Parameter(Mandatory = $true)]
    [string]$Id,
    [Parameter(Mandatory = $true)]
    [string]$Title,
    [Parameter(Mandatory = $true)]
    [string]$Cases,
    [string]$Tags = "real_export",
    [string]$ManifestPath = "frontendciphertool\model\agent\fixtures\research-eval-runs\samples.json",
    [string]$FixtureDir = "frontendciphertool\model\agent\fixtures\research-eval-runs",
    [double]$MinAverageScore = 1,
    [int]$MaxFailCount = 0,
    [int]$MaxMissingCount = 0,
    [int]$MinSourceCount = 3,
    [int]$MinEvidenceCount = 3,
    [double]$MinCitationEvidenceCoverage = 1,
    [double]$MinEvidenceClosureRate = 1,
    [switch]$Default,
    [switch]$Quiet,
    [switch]$Apply
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

function Split-SampleList {
    param(
        [string]$Value
    )

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return @()
    }
    $normalized = $Value -replace ",", " "
    return @($normalized -split "\s+" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | ForEach-Object { [string]$_ })
}

function ConvertTo-RepoRelativePath {
    param(
        [string]$Path
    )

    $resolved = Resolve-Path -LiteralPath $Path
    $rootPath = (Get-Location).Path
    if (-not $rootPath.EndsWith([System.IO.Path]::DirectorySeparatorChar)) {
        $rootPath = $rootPath + [System.IO.Path]::DirectorySeparatorChar
    }
    $rootUri = New-Object System.Uri($rootPath)
    $targetUri = New-Object System.Uri($resolved.Path)
    $relative = [System.Uri]::UnescapeDataString($rootUri.MakeRelativeUri($targetUri).ToString())
    return ($relative -replace "\\", "/")
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

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js is required to validate Research Agent eval samples."
}

$caseList = @(Split-SampleList -Value $Cases)
if ($caseList.Count -eq 0) {
    throw "At least one eval case id is required."
}
$tagList = @(Split-SampleList -Value $Tags)
if ($tagList.Count -eq 0) {
    throw "At least one sample tag is required."
}
if ($Id -notmatch "^[A-Za-z0-9_.-]+$") {
    throw "Sample id must use only letters, numbers, dot, underscore, or dash: $Id"
}
foreach ($threshold in @($MinAverageScore, $MaxFailCount, $MaxMissingCount, $MinSourceCount, $MinEvidenceCount, $MinCitationEvidenceCoverage, $MinEvidenceClosureRate)) {
    if ([double]$threshold -lt 0) {
        throw "Sample expectation thresholds must be >= 0."
    }
}

$resolvedInput = Resolve-Path -LiteralPath $InputPath
$resolvedManifest = Resolve-Path -LiteralPath $ManifestPath
$manifest = Get-Content -LiteralPath $resolvedManifest.Path -Raw -Encoding UTF8 | ConvertFrom-Json
$existing = @($manifest.samples | Where-Object { $_.id -eq $Id })
if ($existing.Count -gt 0) {
    throw "Research Agent eval sample id already exists in manifest: $Id"
}

$destinationName = "{0}{1}" -f $Id, [System.IO.Path]::GetExtension($resolvedInput.Path)
if ([string]::IsNullOrWhiteSpace([System.IO.Path]::GetExtension($destinationName))) {
    $destinationName = "$Id.json"
}
$destinationPath = Join-Path $FixtureDir $destinationName
$inputForValidation = $resolvedInput.Path
if ($Apply) {
    if (-not (Test-Path -LiteralPath $FixtureDir)) {
        New-Item -ItemType Directory -Path $FixtureDir | Out-Null
    }
    Copy-Item -LiteralPath $resolvedInput.Path -Destination $destinationPath -Force
    $inputForValidation = (Resolve-Path -LiteralPath $destinationPath).Path
}

$caseArg = $caseList -join ","
$reportPath = Join-Path $env:TEMP ("research-agent-import-check-{0}.json" -f ([guid]::NewGuid().ToString("N")))
try {
    & node "frontendciphertool\model\agent\research_eval_runner_cli.js" "--input" $inputForValidation "--cases" $caseArg "--output" $reportPath "--fail-on-fail" "--fail-on-missing"
    $exitCode = $LASTEXITCODE
    if ($null -ne $exitCode -and $exitCode -ne 0) {
        throw "research_eval_runner_cli.js exited with code $exitCode"
    }
} finally {
    if (Test-Path -LiteralPath $reportPath) {
        Remove-Item -LiteralPath $reportPath -Force
    }
}

$entryInputPath = if ($Apply) { ConvertTo-RepoRelativePath -Path $destinationPath } else { ConvertTo-RepoRelativePath -Path $resolvedInput.Path }
$entry = [ordered]@{
    id = $Id
    title = $Title
    inputPath = $entryInputPath
    cases = $caseList
    tags = $tagList
    expectations = [ordered]@{
        minAverageScore = $MinAverageScore
        maxFailCount = $MaxFailCount
        maxMissingCount = $MaxMissingCount
        minSourceCount = $MinSourceCount
        minEvidenceCount = $MinEvidenceCount
        minCitationEvidenceCoverage = $MinCitationEvidenceCoverage
        minEvidenceClosureRate = $MinEvidenceClosureRate
    }
    default = [bool]$Default
}

if ($Apply) {
    $manifest.samples = @($manifest.samples) + @($entry)
    Write-Utf8NoBom -Path $resolvedManifest.Path -Content ($manifest | ConvertTo-Json -Depth 10)
    if (-not $Quiet) {
        Write-Host "Research Agent eval sample added: $Id"
        Write-Host "Copied input: $entryInputPath"
        Write-Host "Updated manifest: $($resolvedManifest.Path)"
    }
} else {
    if (-not $Quiet) {
        Write-Host "Research Agent eval sample import dry-run. Re-run with -Apply to copy the input and update the manifest."
    }
}

if (-not $Quiet) {
    $entry | ConvertTo-Json -Depth 10
}
