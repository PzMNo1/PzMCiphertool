param(
    [string]$SamplesManifest = "frontendciphertool\model\agent\fixtures\research-eval-runs\samples.json",
    [string]$EvalsetPath = "frontendciphertool\model\agent\fixtures\research-evalset\cases.json",
    [string]$SampleIds = "",
    [string]$Tags = "",
    [string]$ReportDir = "",
    [string]$SummaryPath = "",
    [switch]$SkipEvalsetTest,
    [switch]$SkipExportWorkflow,
    [switch]$SkipControl,
    [switch]$SkipDefaultEval,
    [switch]$SkipBackendStatus,
    [switch]$SkipSidecarAudit,
    [switch]$KeepReports
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js is required to run the Research Agent harness verification."
}

$startedAt = (Get-Date).ToUniversalTime().ToString("o")
$summary = [ordered]@{
    schemaVersion = "research-agent-harness-summary-v1"
    startedAt = $startedAt
    finishedAt = ""
    status = "running"
    samplesManifest = $SamplesManifest
    evalsetPath = $EvalsetPath
    sampleIds = $SampleIds
    tags = $Tags
    reportDir = $ReportDir
    error = ""
    steps = @()
    samples = @()
}

function Write-HarnessSummary {
    if ([string]::IsNullOrWhiteSpace($SummaryPath)) {
        return
    }
    if ([string]::IsNullOrWhiteSpace([string]$summary.finishedAt)) {
        $summary.finishedAt = (Get-Date).ToUniversalTime().ToString("o")
    }
    $summaryDir = Split-Path -Parent $SummaryPath
    if (-not [string]::IsNullOrWhiteSpace($summaryDir) -and -not (Test-Path -LiteralPath $summaryDir)) {
        New-Item -ItemType Directory -Path $summaryDir | Out-Null
    }
    $summary | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $SummaryPath -Encoding UTF8
    Write-Host "Research Agent harness summary: $SummaryPath"
}

trap {
    if ($summary.status -eq "running") {
        $summary.status = "fail"
        $summary.finishedAt = (Get-Date).ToUniversalTime().ToString("o")
        $summary.error = [string]$_.Exception.Message
        Write-HarnessSummary
    }
    break
}

function Invoke-HarnessStep {
    param(
        [string]$Name,
        [scriptblock]$Command,
        [string]$Kind = "step"
    )

    Write-Host "==> $Name"
    $stepStartedAt = (Get-Date).ToUniversalTime().ToString("o")
    try {
        & $Command
    } catch {
        $summary.steps += [ordered]@{
            name = $Name
            kind = $Kind
            status = "fail"
            startedAt = $stepStartedAt
            finishedAt = (Get-Date).ToUniversalTime().ToString("o")
            error = [string]$_.Exception.Message
        }
        throw
    }
    $summary.steps += [ordered]@{
        name = $Name
        kind = $Kind
        status = "pass"
        startedAt = $stepStartedAt
        finishedAt = (Get-Date).ToUniversalTime().ToString("o")
        error = ""
    }
    Write-Host "OK: $Name"
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

function Split-HarnessList {
    param(
        [string]$Value
    )

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return @()
    }
    $normalized = $Value -replace ",", " "
    return @($normalized -split "\s+" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | ForEach-Object { [string]$_ })
}

function Get-ManifestSamples {
    param(
        [string]$ManifestPath,
        [string]$RequestedIds,
        [string]$RequestedTags,
        [object]$Evalset
    )

    $resolvedManifest = Resolve-Path -LiteralPath $ManifestPath
    $manifest = Get-Content -LiteralPath $resolvedManifest.Path -Raw -Encoding UTF8 | ConvertFrom-Json
    $samples = @($manifest.samples)
    if (-not $samples -or $samples.Count -eq 0) {
        throw "Research Agent eval sample manifest has no samples: $ManifestPath"
    }
    Test-ManifestSamples -Samples $samples -ManifestPath $resolvedManifest.Path -Evalset $Evalset

    $requestedIdList = @(Split-HarnessList -Value $RequestedIds)
    $requestedTagList = @(Split-HarnessList -Value $RequestedTags)

    if ($requestedIdList.Count -gt 0 -and $requestedTagList.Count -gt 0) {
        throw "Use either -SampleIds or -Tags for Research Agent eval sample selection, not both."
    }

    if ($requestedIdList.Count -gt 0) {
        $selected = @($samples | Where-Object { $requestedIdList -contains $_.id })
        $selectedIds = @($selected | ForEach-Object { $_.id })
        $missing = @($requestedIdList | Where-Object { $selectedIds -notcontains $_ })
        if ($missing.Count -gt 0) {
            throw "Unknown Research Agent eval sample id(s): $($missing -join ', ')"
        }
        return $selected
    }

    if ($requestedTagList.Count -gt 0) {
        $selected = @()
        foreach ($sample in $samples) {
            $sampleTags = @($sample.tags | ForEach-Object { [string]$_ })
            $matchesAllTags = $true
            foreach ($tag in $requestedTagList) {
                if ($sampleTags -notcontains $tag) {
                    $matchesAllTags = $false
                    break
                }
            }
            if ($matchesAllTags) {
                $selected += $sample
            }
        }
        if ($selected.Count -eq 0) {
            throw "No Research Agent eval sample matched tag(s): $($requestedTagList -join ', ')"
        }
        return $selected
    }

    return @($samples | Where-Object { $_.default -ne $false })
}

function Test-ManifestSamples {
    param(
        [object[]]$Samples,
        [string]$ManifestPath,
        [object]$Evalset
    )

    $seen = @{}
    $caseIds = @{}
    foreach ($testCase in @($Evalset.cases)) {
        $caseId = [string]$testCase.id
        if (-not [string]::IsNullOrWhiteSpace($caseId)) {
            $caseIds[$caseId] = $true
        }
    }
    if ($caseIds.Count -eq 0) {
        throw "Research Agent evalset has no cases: $EvalsetPath"
    }
    foreach ($sample in $Samples) {
        $id = [string]$sample.id
        if ([string]::IsNullOrWhiteSpace($id)) {
            throw "Research Agent eval sample manifest contains a sample without id: $ManifestPath"
        }
        if ($seen.ContainsKey($id)) {
            throw "Research Agent eval sample manifest contains duplicate sample id: $id"
        }
        $seen[$id] = $true

        $inputPath = [string]$sample.inputPath
        if ([string]::IsNullOrWhiteSpace($inputPath)) {
            throw "Research Agent eval sample '$id' has no inputPath."
        }
        if (-not (Test-Path -LiteralPath $inputPath)) {
            throw "Research Agent eval sample '$id' inputPath does not exist: $inputPath"
        }

        $cases = @($sample.cases)
        if (-not $cases -or $cases.Count -eq 0) {
            throw "Research Agent eval sample '$id' has no cases."
        }
        $blankCases = @($cases | Where-Object { [string]::IsNullOrWhiteSpace([string]$_) })
        if ($blankCases.Count -gt 0) {
            throw "Research Agent eval sample '$id' contains blank case id(s)."
        }
        $unknownCases = @($cases | Where-Object { -not $caseIds.ContainsKey([string]$_) })
        if ($unknownCases.Count -gt 0) {
            throw "Research Agent eval sample '$id' references unknown case id(s): $($unknownCases -join ', ')"
        }

        $tags = @($sample.tags | ForEach-Object { [string]$_ })
        $blankTags = @($tags | Where-Object { [string]::IsNullOrWhiteSpace($_) })
        if ($blankTags.Count -gt 0) {
            throw "Research Agent eval sample '$id' contains blank tag(s)."
        }
        $expectations = $sample.expectations
        if ($expectations) {
            foreach ($field in @('minAverageScore', 'maxFailCount', 'maxMissingCount', 'minSourceCount', 'minEvidenceCount', 'minCitationEvidenceCoverage', 'minEvidenceClosureRate')) {
                if ($null -ne $expectations.$field) {
                    $value = [double]$expectations.$field
                    if ($value -lt 0) {
                        throw "Research Agent eval sample '$id' expectation '$field' must be >= 0."
                    }
                }
            }
        }
    }
}

function Test-SampleSkipped {
    param(
        [object]$Sample
    )

    $id = [string]$Sample.id
    if ($SkipDefaultEval -and $id -eq "frontend-history-manual-acceptance") {
        return $true
    }
    if ($SkipBackendStatus -and $id -eq "backend-status-quick") {
        return $true
    }
    if ($SkipSidecarAudit -and $id -eq "backend-status-sidecar-audit-quick") {
        return $true
    }
    return $false
}

function Get-SampleReportPath {
    param(
        [object]$Sample
    )

    if ([string]::IsNullOrWhiteSpace($ReportDir)) {
        return ""
    }
    if (-not (Test-Path -LiteralPath $ReportDir)) {
        New-Item -ItemType Directory -Path $ReportDir | Out-Null
    }
    $safeId = ([string]$Sample.id) -replace "[^A-Za-z0-9_.-]", "_"
    return Join-Path $ReportDir ("research-agent-eval-{0}.json" -f $safeId)
}

function New-TempSampleReportPath {
    return Join-Path $env:TEMP ("research-agent-eval-report-{0}.json" -f ([guid]::NewGuid().ToString("N")))
}

function Get-EvalReportSummary {
    param(
        [string]$ReportPath
    )

    $report = Get-Content -LiteralPath $ReportPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $reportSummary = $report.summary
    $caseResults = @($report.results | ForEach-Object {
        $metrics = $_.metrics
        [ordered]@{
            caseId = [string]$_.caseId
            status = [string]$_.status
            score = [double]$_.score
            gaps = @($_.gaps)
            metrics = [ordered]@{
                toolCount = [int]$metrics.toolCount
                sourceCount = [int]$metrics.sourceCount
                evidenceCount = [int]$metrics.evidenceCount
                citationCount = [int]$metrics.citationCount
                citationHitRate = [double]$metrics.citationHitRate
                citationEvidenceCoverage = [double]$metrics.citationEvidenceCoverage
                evidenceClosureRate = [double]$metrics.evidenceClosureRate
            }
        }
    })
    return [ordered]@{
        caseCount = [int]$reportSummary.caseCount
        evaluatedCount = [int]$reportSummary.evaluatedCount
        passCount = [int]$reportSummary.passCount
        failCount = [int]$reportSummary.failCount
        missingCount = [int]$reportSummary.missingCount
        averageScore = [double]$reportSummary.averageScore
        results = $caseResults
    }
}

function Test-SampleExpectations {
    param(
        [object]$Sample,
        [object]$EvalSummary
    )

    $expectations = $Sample.expectations
    if (-not $expectations) {
        return
    }

    $id = [string]$Sample.id
    $failures = @()
    if ($null -ne $expectations.minAverageScore -and [double]$EvalSummary.averageScore -lt [double]$expectations.minAverageScore) {
        $failures += "averageScore $($EvalSummary.averageScore) < $($expectations.minAverageScore)"
    }
    if ($null -ne $expectations.maxFailCount -and [int]$EvalSummary.failCount -gt [int]$expectations.maxFailCount) {
        $failures += "failCount $($EvalSummary.failCount) > $($expectations.maxFailCount)"
    }
    if ($null -ne $expectations.maxMissingCount -and [int]$EvalSummary.missingCount -gt [int]$expectations.maxMissingCount) {
        $failures += "missingCount $($EvalSummary.missingCount) > $($expectations.maxMissingCount)"
    }

    foreach ($result in @($EvalSummary.results)) {
        $caseId = [string]$result.caseId
        $metrics = $result.metrics
        if ($null -ne $expectations.minSourceCount -and [int]$metrics.sourceCount -lt [int]$expectations.minSourceCount) {
            $failures += "$caseId sourceCount $($metrics.sourceCount) < $($expectations.minSourceCount)"
        }
        if ($null -ne $expectations.minEvidenceCount -and [int]$metrics.evidenceCount -lt [int]$expectations.minEvidenceCount) {
            $failures += "$caseId evidenceCount $($metrics.evidenceCount) < $($expectations.minEvidenceCount)"
        }
        if ($null -ne $expectations.minCitationEvidenceCoverage -and [double]$metrics.citationEvidenceCoverage -lt [double]$expectations.minCitationEvidenceCoverage) {
            $failures += "$caseId citationEvidenceCoverage $($metrics.citationEvidenceCoverage) < $($expectations.minCitationEvidenceCoverage)"
        }
        if ($null -ne $expectations.minEvidenceClosureRate -and [double]$metrics.evidenceClosureRate -lt [double]$expectations.minEvidenceClosureRate) {
            $failures += "$caseId evidenceClosureRate $($metrics.evidenceClosureRate) < $($expectations.minEvidenceClosureRate)"
        }
    }

    if ($failures.Count -gt 0) {
        throw "Research Agent eval sample '$id' failed expectation(s): $($failures -join '; ')"
    }
}

if (-not $SkipEvalsetTest) {
    Invoke-HarnessStep "Research evalset unit and CLI regression" {
        Invoke-CheckedProcess -FilePath "node" -Arguments @("frontendciphertool\model\agent\research_evalset.test.js")
    } "evalset_test"
}

if (-not $SkipExportWorkflow) {
    Invoke-HarnessStep "Research Agent backend export workflow" {
        Invoke-CheckedProcess -FilePath "powershell" -Arguments @(
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            "scripts\verify-research-agent-export-workflow.ps1",
            "-VerifyAddSample"
        )
    } "export_workflow"
}

$resolvedEvalset = Resolve-Path -LiteralPath $EvalsetPath
$evalset = Get-Content -LiteralPath $resolvedEvalset.Path -Raw -Encoding UTF8 | ConvertFrom-Json
$samples = Get-ManifestSamples -ManifestPath $SamplesManifest -RequestedIds $SampleIds -RequestedTags $Tags -Evalset $evalset
foreach ($sample in $samples) {
    if (Test-SampleSkipped -Sample $sample) {
        Write-Host "SKIP: Research eval sample $($sample.id)"
        $summary.samples += [ordered]@{
            id = [string]$sample.id
            title = [string]$sample.title
            status = "skipped"
            inputPath = [string]$sample.inputPath
            cases = @($sample.cases)
            reportPath = ""
        }
        continue
    }
    Invoke-HarnessStep "Research eval sample $($sample.id): $($sample.title)" {
        $cases = @($sample.cases) -join ","
        if ([string]::IsNullOrWhiteSpace($cases)) {
            throw "Research Agent eval sample has no cases: $($sample.id)"
        }
        $evalArgs = @(
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            "scripts\verify-research-agent-eval.ps1",
            "-InputPath",
            [string]$sample.inputPath,
            "-Cases",
            $cases,
            "-FailOnMissing"
        )
        $artifactReportPath = Get-SampleReportPath -Sample $sample
        $reportPath = $artifactReportPath
        $usingTempReport = $false
        if ([string]::IsNullOrWhiteSpace($reportPath)) {
            $reportPath = New-TempSampleReportPath
            $usingTempReport = $true
        }
        $summaryReportPath = $artifactReportPath
        if ($usingTempReport -and $KeepReports) {
            $summaryReportPath = $reportPath
        }
        $evalArgs += "-OutputPath"
        $evalArgs += $reportPath
        if ($KeepReports) {
            $evalArgs += "-KeepReport"
        }
        if ($usingTempReport -and -not $KeepReports) {
            $evalArgs += "-QuietReportPath"
        }
        try {
            Invoke-CheckedProcess -FilePath "powershell" -Arguments $evalArgs
            $evalSummary = Get-EvalReportSummary -ReportPath $reportPath
            Test-SampleExpectations -Sample $sample -EvalSummary $evalSummary
        } finally {
            if ($usingTempReport -and -not $KeepReports -and (Test-Path -LiteralPath $reportPath)) {
                Remove-Item -LiteralPath $reportPath -Force
            }
        }
        $summary.samples += [ordered]@{
            id = [string]$sample.id
            title = [string]$sample.title
            status = "pass"
            inputPath = [string]$sample.inputPath
            cases = @($sample.cases)
            reportPath = $summaryReportPath
            eval = $evalSummary
        }
    } "eval_sample"
}

if (-not $SkipControl) {
    Invoke-HarnessStep "Agent Runner frontend control harness" {
        Invoke-CheckedProcess -FilePath "powershell" -Arguments @(
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            "scripts\verify-agent-runner-control.ps1"
        )
    } "runner_control"
}

$summary.status = "pass"
$summary.finishedAt = (Get-Date).ToUniversalTime().ToString("o")

Write-HarnessSummary

Write-Host "Research Agent harness verified."
