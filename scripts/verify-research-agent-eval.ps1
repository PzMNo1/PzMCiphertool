param(
    [string]$InputPath = "frontendciphertool\model\agent\fixtures\research-eval-runs\manual-acceptance-sample.json",
    [string]$Cases = "quick_current_policy_check,deep_industry_adoption_brief,deep_failed_page_recovery,deep_bilingual_regulation_compare,deep_community_signal_scan",
    [string]$OutputPath = "",
    [switch]$FailOnMissing,
    [switch]$BackendStatusSample,
    [switch]$BackendStatusSidecarAuditSample,
    [switch]$KeepReport,
    [switch]$QuietReportPath
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if ($BackendStatusSample) {
    $InputPath = "frontendciphertool\model\agent\fixtures\research-eval-runs\backend-status-sample.json"
    $Cases = "quick_current_policy_check"
}
if ($BackendStatusSidecarAuditSample) {
    $InputPath = "frontendciphertool\model\agent\fixtures\research-eval-runs\backend-status-with-sidecar-audit-sample.json"
    $Cases = "quick_current_policy_check"
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js is required to run the Research Agent eval harness."
}

function Invoke-CheckedProcess {
    param(
        [string]$FilePath,
        [string[]]$Arguments = @()
    )

    & $FilePath @Arguments
    $exitCode = $LASTEXITCODE
    if ($null -ne $exitCode -and $exitCode -ne 0) {
        throw "$FilePath exited with code $exitCode"
    }
}

$resolvedInput = Resolve-Path -LiteralPath $InputPath
$reportPath = $OutputPath
if ([string]::IsNullOrWhiteSpace($reportPath)) {
    $reportPath = Join-Path $env:TEMP ("research-agent-eval-report-{0}.json" -f ([guid]::NewGuid().ToString("N")))
}

$nodeArgs = @(
    "frontendciphertool\model\agent\research_eval_runner_cli.js",
    "--input", $resolvedInput.Path,
    "--cases", $Cases,
    "--output", $reportPath,
    "--fail-on-fail"
)

if ($FailOnMissing) {
    $nodeArgs += "--fail-on-missing"
}

Invoke-CheckedProcess -FilePath "node" -Arguments $nodeArgs

$report = Get-Content -LiteralPath $reportPath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($report.summary.failCount -ne 0) {
    throw "Research Agent eval failed: failCount=$($report.summary.failCount)"
}
if ($FailOnMissing -and $report.summary.missingCount -ne 0) {
    throw "Research Agent eval missing cases: missingCount=$($report.summary.missingCount)"
}

Write-Host ("Research Agent eval verified: cases={0} evaluated={1} pass={2} fail={3} missing={4} average={5:N3}" -f `
    $report.summary.caseCount,
    $report.summary.evaluatedCount,
    $report.summary.passCount,
    $report.summary.failCount,
    $report.summary.missingCount,
    [double]$report.summary.averageScore)

if (-not $KeepReport -and [string]::IsNullOrWhiteSpace($OutputPath)) {
    Remove-Item -LiteralPath $reportPath -Force
} elseif (-not $QuietReportPath) {
    Write-Host "Research Agent eval report: $reportPath"
}
