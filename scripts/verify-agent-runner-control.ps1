param(
    [switch]$SkipSyntax
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js is required to run the Agent Runner control smoke."
}

if (-not $SkipSyntax) {
    node -c frontendciphertool\model\agent\AgentRunnerControl.js
    node -c frontendciphertool\model\main.js
    node -c frontendciphertool\modules.js
}

node frontendciphertool\model\agent\agent_runner_control.test.js
node frontendciphertool\model\agent\agent_runner_control_smoke.js

Write-Host "Agent Runner frontend control verified."
