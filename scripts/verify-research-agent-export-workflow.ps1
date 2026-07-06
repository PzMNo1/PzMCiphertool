param(
    [string]$FixturePath = "frontendciphertool\model\agent\fixtures\research-eval-runs\backend-status-sample.json",
    [string]$CaseId = "quick_current_policy_check",
    [switch]$VerifyAddSample
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js is required to verify the Research Agent export workflow."
}

$root = Join-Path $env:TEMP ("research-agent-export-workflow-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $root | Out-Null
$serverScript = Join-Path $root "mock-agent-runner-server.js"
$portFile = Join-Path $root "port.txt"
$bundlePath = Join-Path $root "bundle.json"
$manifestPath = Join-Path $root "samples.json"
$fixtureDir = Join-Path $root "fixtures"

$resolvedFixture = Resolve-Path -LiteralPath $FixturePath
$fixtureLiteral = $resolvedFixture.Path | ConvertTo-Json -Compress
$portLiteral = $portFile | ConvertTo-Json -Compress

@"
const http = require('http');
const fs = require('fs');
const status = JSON.parse(fs.readFileSync($fixtureLiteral, 'utf8'));
const run = status.data && Array.isArray(status.data.runs) ? status.data.runs[0] : null;
const runId = run && run.runId ? run.runId : 'mock-run';
const audit = run && run.evidenceAudit ? run.evidenceAudit : {
  schemaVersion: 'agent-evidence-audit-v1',
  runId,
  count: 0,
  summary: { total: 0, coverage: {} },
  items: []
};
const auditResponse = { success: true, message: 'Agent runner evidence audit loaded', data: audit };
const server = http.createServer((req, res) => {
  res.setHeader('content-type', 'application/json; charset=utf-8');
  if (req.url.startsWith('/api/agent-runner/status/mock-run')) {
    res.end(JSON.stringify(status));
    return;
  }
  if (req.url.startsWith('/api/agent-runner/status')) {
    res.end(JSON.stringify(status));
    return;
  }
  if (req.url.startsWith('/api/agent-runner/runs/' + encodeURIComponent(runId) + '/evidence-audit')) {
    res.end(JSON.stringify(auditResponse));
    return;
  }
  res.statusCode = 404;
  res.end(JSON.stringify({ success: false, message: 'not found', url: req.url }));
});
server.listen(0, '127.0.0.1', () => {
  fs.writeFileSync($portLiteral, String(server.address().port));
});
"@ | Set-Content -LiteralPath $serverScript -Encoding UTF8

$proc = Start-Process -FilePath node -ArgumentList @($serverScript) -PassThru -WindowStyle Hidden
try {
    $deadline = (Get-Date).AddSeconds(10)
    while (-not (Test-Path -LiteralPath $portFile)) {
        if ((Get-Date) -gt $deadline) {
            throw "Mock Agent Runner server did not start."
        }
        Start-Sleep -Milliseconds 100
    }

    $port = (Get-Content -LiteralPath $portFile -Raw).Trim()
    & powershell -NoProfile -ExecutionPolicy Bypass -File scripts\export-research-agent-runner-bundle.ps1 `
        -BaseUrl "http://127.0.0.1:$port" `
        -RunId "mock-run" `
        -OutputPath $bundlePath
    if ($LASTEXITCODE -ne 0) {
        throw "export-research-agent-runner-bundle.ps1 failed with code $LASTEXITCODE"
    }
    if (-not (Test-Path -LiteralPath $bundlePath)) {
        throw "Expected exported bundle was not written: $bundlePath"
    }

    & node frontendciphertool\model\agent\research_eval_runner_cli.js --input $bundlePath --cases $CaseId --fail-on-fail --fail-on-missing
    if ($LASTEXITCODE -ne 0) {
        throw "research_eval_runner_cli.js failed with code $LASTEXITCODE"
    }

    $preflightSummaryPath = Join-Path $root "preflight-summary.json"
    & powershell -NoProfile -ExecutionPolicy Bypass -File scripts\preflight-research-agent-runner-export.ps1 `
        -BaseUrl "http://127.0.0.1:$port" `
        -RunId "mock-run" `
        -SampleId "mock-preflight-sample" `
        -SampleTitle "Mock preflight sample" `
        -Tags "real_export backend_status quick" `
        -SummaryPath $preflightSummaryPath
    if ($LASTEXITCODE -ne 0) {
        throw "preflight-research-agent-runner-export.ps1 failed with code $LASTEXITCODE"
    }
    if (-not (Test-Path -LiteralPath $preflightSummaryPath)) {
        throw "Expected preflight summary was not written: $preflightSummaryPath"
    }
    $preflightSummary = Get-Content -LiteralPath $preflightSummaryPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($preflightSummary.status -ne "pass") {
        throw "Expected preflight summary status=pass, got $($preflightSummary.status)"
    }
    if ($preflightSummary.next.sampleId -ne "mock-preflight-sample") {
        throw "Expected preflight next sample id to be preserved."
    }
    if (-not (@($preflightSummary.inferredCases) -contains $CaseId)) {
        throw "Expected preflight to infer eval case id $CaseId."
    }
    if ([string]$preflightSummary.next.addSampleCommand -notmatch "export-research-agent-runner-bundle\.ps1" -or [string]$preflightSummary.next.addSampleCommand -notmatch "\-AddSample") {
        throw "Expected preflight summary to include a runnable export -AddSample command."
    }

    if ($VerifyAddSample) {
        Copy-Item -LiteralPath "frontendciphertool\model\agent\fixtures\research-eval-runs\samples.json" -Destination $manifestPath
        & powershell -NoProfile -ExecutionPolicy Bypass -File scripts\export-research-agent-runner-bundle.ps1 `
            -BaseUrl "http://127.0.0.1:$port" `
            -RunId "mock-run" `
            -OutputPath (Join-Path $root "bundle-for-add.json") `
            -AddSample `
            -SampleId "mock-export-add-sample" `
            -SampleTitle "Mock export add sample" `
            -Cases $CaseId `
            -Tags "real_export backend_status quick" `
            -ManifestPath $manifestPath `
            -FixtureDir $fixtureDir `
            -QuietAddSample
        if ($LASTEXITCODE -ne 0) {
            throw "export-research-agent-runner-bundle.ps1 -AddSample failed with code $LASTEXITCODE"
        }
        $manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
        $added = @($manifest.samples | Where-Object { $_.id -eq "mock-export-add-sample" })
        if ($added.Count -ne 1) {
            throw "Expected export -AddSample to append exactly one manifest entry."
        }
        if (-not (Test-Path -LiteralPath (Join-Path $fixtureDir "mock-export-add-sample.json"))) {
            throw "Expected export -AddSample to copy the bundle into the fixture dir."
        }
    }
} finally {
    if ($proc -and -not $proc.HasExited) {
        Stop-Process -Id $proc.Id -Force
    }
}

Write-Host "Research Agent export workflow verified."
