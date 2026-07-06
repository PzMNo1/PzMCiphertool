param(
    [string]$BaseUrl = "http://localhost:8080",
    [string]$RunId = "",
    [string]$Cases = "",
    [string]$Authorization = "",
    [int]$EvidenceAuditLimit = 100,
    [string]$OutputPath = "",
    [string]$SummaryPath = "",
    [string]$SampleId = "",
    [string]$SampleTitle = "",
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
    [switch]$Default,
    [switch]$SkipEvidenceAudit,
    [switch]$KeepBundle
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

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

function Read-JsonFile {
    param(
        [string]$Path
    )
    return Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json
}

function Split-List {
    param(
        [string]$Value
    )

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return @()
    }
    $normalized = $Value -replace ",", " "
    return @($normalized -split "\s+" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | ForEach-Object { [string]$_ })
}

function Quote-PowerShellArgument {
    param(
        [string]$Value
    )

    return "'" + ([string]$Value).Replace("'", "''") + "'"
}

function New-SafeSampleId {
    param(
        [string]$Seed
    )

    $safe = ([string]$Seed).Trim() -replace "[^A-Za-z0-9_.-]+", "-"
    $safe = $safe.Trim("-._")
    if ([string]::IsNullOrWhiteSpace($safe)) {
        $safe = "agent-runner"
    }
    if ($safe.Length -gt 72) {
        $safe = $safe.Substring(0, 72).Trim("-._")
    }
    return $safe.ToLowerInvariant()
}

function Get-BundleRunIds {
    param(
        [object]$Bundle
    )
    $runs = @()
    if ($Bundle.statusResponse -and $Bundle.statusResponse.data -and $Bundle.statusResponse.data.runs) {
        $runs = @($Bundle.statusResponse.data.runs)
    } elseif ($Bundle.statusResponse -and $Bundle.statusResponse.runs) {
        $runs = @($Bundle.statusResponse.runs)
    } elseif ($Bundle.statusResponse -and $Bundle.statusResponse.data -and $Bundle.statusResponse.data.runId) {
        $runs = @($Bundle.statusResponse.data)
    } elseif ($Bundle.statusResponse -and $Bundle.statusResponse.runId) {
        $runs = @($Bundle.statusResponse)
    }
    return @($runs | ForEach-Object { [string]$_.runId } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
}

function Get-CompactEvalSummary {
    param(
        [object]$Report
    )

    $reportSummary = $Report.summary
    $caseResults = @($Report.results | ForEach-Object {
        $metrics = $_.metrics
        [ordered]@{
            caseId = [string]$_.caseId
            status = [string]$_.status
            score = [double]$_.score
            gaps = @($_.gaps | ForEach-Object { [string]$_.id })
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

function Get-ExpectationFailures {
    param(
        [object]$EvalSummary
    )

    $failures = @()
    if ($null -ne $MinAverageScore -and [double]$EvalSummary.averageScore -lt [double]$MinAverageScore) {
        $failures += "averageScore $($EvalSummary.averageScore) < $MinAverageScore"
    }
    if ($null -ne $MaxFailCount -and [int]$EvalSummary.failCount -gt [int]$MaxFailCount) {
        $failures += "failCount $($EvalSummary.failCount) > $MaxFailCount"
    }
    if ($null -ne $MaxMissingCount -and [int]$EvalSummary.missingCount -gt [int]$MaxMissingCount) {
        $failures += "missingCount $($EvalSummary.missingCount) > $MaxMissingCount"
    }

    foreach ($result in @($EvalSummary.results)) {
        $caseId = [string]$result.caseId
        $metrics = $result.metrics
        if ($null -ne $MinSourceCount -and [int]$metrics.sourceCount -lt [int]$MinSourceCount) {
            $failures += "$caseId sourceCount $($metrics.sourceCount) < $MinSourceCount"
        }
        if ($null -ne $MinEvidenceCount -and [int]$metrics.evidenceCount -lt [int]$MinEvidenceCount) {
            $failures += "$caseId evidenceCount $($metrics.evidenceCount) < $MinEvidenceCount"
        }
        if ($null -ne $MinCitationEvidenceCoverage -and [double]$metrics.citationEvidenceCoverage -lt [double]$MinCitationEvidenceCoverage) {
            $failures += "$caseId citationEvidenceCoverage $($metrics.citationEvidenceCoverage) < $MinCitationEvidenceCoverage"
        }
        if ($null -ne $MinEvidenceClosureRate -and [double]$metrics.evidenceClosureRate -lt [double]$MinEvidenceClosureRate) {
            $failures += "$caseId evidenceClosureRate $($metrics.evidenceClosureRate) < $MinEvidenceClosureRate"
        }
    }
    return $failures
}

function New-AddSampleCommand {
    param(
        [string]$ResolvedSampleId,
        [string]$ResolvedSampleTitle,
        [string]$CaseArg,
        [string]$TagArg
    )

    $segments = @(
        "powershell",
        "-NoProfile",
        "-ExecutionPolicy Bypass",
        "-File $(Quote-PowerShellArgument -Value 'scripts\export-research-agent-runner-bundle.ps1')",
        "-BaseUrl $(Quote-PowerShellArgument -Value $BaseUrl)",
        "-EvidenceAuditLimit $EvidenceAuditLimit"
    )
    if (-not [string]::IsNullOrWhiteSpace($RunId)) {
        $segments += "-RunId $(Quote-PowerShellArgument -Value $RunId)"
    }
    if (-not [string]::IsNullOrWhiteSpace($Authorization)) {
        $segments += "-Authorization $(Quote-PowerShellArgument -Value '<redacted>')"
    }
    if ($SkipEvidenceAudit) {
        $segments += "-SkipEvidenceAudit"
    }
    $segments += @(
        "-AddSample",
        "-SampleId $(Quote-PowerShellArgument -Value $ResolvedSampleId)",
        "-SampleTitle $(Quote-PowerShellArgument -Value $ResolvedSampleTitle)",
        "-Cases $(Quote-PowerShellArgument -Value $CaseArg)",
        "-Tags $(Quote-PowerShellArgument -Value $TagArg)",
        "-ManifestPath $(Quote-PowerShellArgument -Value $ManifestPath)",
        "-FixtureDir $(Quote-PowerShellArgument -Value $FixtureDir)",
        "-MinAverageScore $MinAverageScore",
        "-MaxFailCount $MaxFailCount",
        "-MaxMissingCount $MaxMissingCount",
        "-MinSourceCount $MinSourceCount",
        "-MinEvidenceCount $MinEvidenceCount",
        "-MinCitationEvidenceCoverage $MinCitationEvidenceCoverage",
        "-MinEvidenceClosureRate $MinEvidenceClosureRate"
    )
    if ($Default) {
        $segments += "-Default"
    }
    return ($segments -join " ")
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js is required to preflight Research Agent runner exports."
}
$caseList = @(Split-List -Value $Cases)
$tagList = @(Split-List -Value $Tags)
if ($tagList.Count -eq 0) {
    throw "At least one sample tag is required."
}
if (-not [string]::IsNullOrWhiteSpace($SampleId) -and $SampleId -notmatch "^[A-Za-z0-9_.-]+$") {
    throw "Sample id must use only letters, numbers, dot, underscore, or dash: $SampleId"
}
foreach ($threshold in @($MinAverageScore, $MaxFailCount, $MaxMissingCount, $MinSourceCount, $MinEvidenceCount, $MinCitationEvidenceCoverage, $MinEvidenceClosureRate)) {
    if ([double]$threshold -lt 0) {
        throw "Sample expectation thresholds must be >= 0."
    }
}
$caseArg = $caseList -join ","
$tagArg = $tagList -join " "

$tempRoot = Join-Path $env:TEMP ("research-agent-runner-preflight-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempRoot | Out-Null
$bundlePath = if ([string]::IsNullOrWhiteSpace($OutputPath)) { Join-Path $tempRoot "bundle.json" } else { $OutputPath }
$reportPath = Join-Path $tempRoot "eval-report.json"

$summary = [ordered]@{
    schemaVersion = "research-agent-runner-export-preflight-v1"
    startedAt = (Get-Date).ToUniversalTime().ToString("o")
    finishedAt = ""
    status = "running"
    baseUrl = $BaseUrl
    runId = $RunId
    cases = $Cases
    requestedCases = $caseList
    inferredCases = @()
    evidenceAuditLimit = $EvidenceAuditLimit
    evidenceAuditSkipped = [bool]$SkipEvidenceAudit
    bundlePath = $bundlePath
    runIds = @()
    expectations = [ordered]@{
        minAverageScore = $MinAverageScore
        maxFailCount = $MaxFailCount
        maxMissingCount = $MaxMissingCount
        minSourceCount = $MinSourceCount
        minEvidenceCount = $MinEvidenceCount
        minCitationEvidenceCoverage = $MinCitationEvidenceCoverage
        minEvidenceClosureRate = $MinEvidenceClosureRate
    }
    eval = $null
    expectationFailures = @()
    next = $null
    error = ""
}

try {
    $exportArgs = @(
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        "scripts\export-research-agent-runner-bundle.ps1",
        "-BaseUrl",
        $BaseUrl,
        "-OutputPath",
        $bundlePath,
        "-EvidenceAuditLimit",
        ([string]$EvidenceAuditLimit)
    )
    if (-not [string]::IsNullOrWhiteSpace($RunId)) {
        $exportArgs += "-RunId"
        $exportArgs += $RunId
    }
    if (-not [string]::IsNullOrWhiteSpace($Authorization)) {
        $exportArgs += "-Authorization"
        $exportArgs += $Authorization
    }
    if ($SkipEvidenceAudit) {
        $exportArgs += "-SkipEvidenceAudit"
    }
    $exportOutput = & powershell @exportArgs 2>&1
    $exportExitCode = $LASTEXITCODE
    $exportOutput | ForEach-Object { Write-Host $_ }
    if ($exportExitCode -ne 0) {
        $detail = ($exportOutput | ForEach-Object { [string]$_ }) -join "`n"
        throw "export-research-agent-runner-bundle.ps1 failed with code $exportExitCode. $detail"
    }

    $bundle = Read-JsonFile -Path $bundlePath
    $summary.runIds = @(Get-BundleRunIds -Bundle $bundle)

    if ($caseList.Count -eq 0) {
        $mappingOutput = & node frontendciphertool\model\agent\research_eval_runner_cli.js --input $bundlePath --output $reportPath 2>&1
        $mappingExitCode = $LASTEXITCODE
        if ($mappingExitCode -ne 0) {
            $detail = ($mappingOutput | ForEach-Object { [string]$_ }) -join "`n"
            throw "research_eval_runner_cli.js failed while inferring eval cases with code $mappingExitCode. $detail"
        }
        $mappingReport = Read-JsonFile -Path $reportPath
        $seenCaseIds = @{}
        $caseList = @($mappingReport.input.mappedCaseIds | ForEach-Object { [string]$_ } | Where-Object {
            if ([string]::IsNullOrWhiteSpace($_)) {
                return $false
            }
            if ($seenCaseIds.ContainsKey($_)) {
                return $false
            }
            $seenCaseIds[$_] = $true
            return $true
        })
        if ($caseList.Count -eq 0) {
            throw "Unable to infer eval case ids from the exported bundle. Pass -Cases <caseId> or ensure the run carries caseId/evalCaseId metadata."
        }
        $caseArg = $caseList -join ","
        $summary.cases = $caseArg
        $summary.inferredCases = $caseList
    } else {
        $summary.cases = $caseArg
    }

    & node frontendciphertool\model\agent\research_eval_runner_cli.js --input $bundlePath --cases $caseArg --output $reportPath
    if ($LASTEXITCODE -ne 0) {
        throw "research_eval_runner_cli.js failed with code $LASTEXITCODE"
    }

    $report = Read-JsonFile -Path $reportPath
    $summary.eval = Get-CompactEvalSummary -Report $report
    $summary.expectationFailures = @(Get-ExpectationFailures -EvalSummary $summary.eval)
    if ($summary.expectationFailures.Count -gt 0) {
        throw "Research Agent runner export preflight failed expectation(s): $($summary.expectationFailures -join '; ')"
    }

    $sampleSeed = if (-not [string]::IsNullOrWhiteSpace($RunId)) {
        $RunId
    } elseif ($summary.runIds.Count -gt 0) {
        [string]$summary.runIds[0]
    } else {
        "agent-runner"
    }
    $timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddHHmmss")
    $resolvedSampleId = if ([string]::IsNullOrWhiteSpace($SampleId)) { "real-$(New-SafeSampleId -Seed $sampleSeed)-$timestamp" } else { $SampleId }
    $resolvedSampleTitle = if ([string]::IsNullOrWhiteSpace($SampleTitle)) {
        $runLabel = if ($summary.runIds.Count -gt 0) { $summary.runIds -join ", " } else { $RunId }
        if ([string]::IsNullOrWhiteSpace($runLabel)) { $runLabel = $BaseUrl }
        "Real Agent Runner export $runLabel"
    } else {
        $SampleTitle
    }
    $summary.next = [ordered]@{
        sampleId = $resolvedSampleId
        sampleTitle = $resolvedSampleTitle
        cases = $caseList
        tags = $tagList
        addSampleCommand = New-AddSampleCommand -ResolvedSampleId $resolvedSampleId -ResolvedSampleTitle $resolvedSampleTitle -CaseArg $caseArg -TagArg $tagArg
        authorizationRedacted = (-not [string]::IsNullOrWhiteSpace($Authorization))
    }
    $summary.status = "pass"
} catch {
    $summary.status = "fail"
    $summary.error = [string]$_.Exception.Message
    throw
} finally {
    $summary.finishedAt = (Get-Date).ToUniversalTime().ToString("o")
    if (-not [string]::IsNullOrWhiteSpace($SummaryPath)) {
        Write-Utf8NoBom -Path $SummaryPath -Content ($summary | ConvertTo-Json -Depth 10)
        Write-Host "Research Agent runner export preflight summary: $SummaryPath"
    }
    if (-not $KeepBundle -and [string]::IsNullOrWhiteSpace($OutputPath) -and (Test-Path -LiteralPath $bundlePath)) {
        Remove-Item -LiteralPath $bundlePath -Force
    }
}

Write-Host ("Research Agent runner export preflight: status={0} runs={1} cases={2} pass={3} fail={4} missing={5} average={6:N3}" -f `
    $summary.status,
    ($summary.runIds -join ","),
    $summary.eval.caseCount,
    $summary.eval.passCount,
    $summary.eval.failCount,
    $summary.eval.missingCount,
    [double]$summary.eval.averageScore)
if ($summary.status -eq "pass" -and $summary.next -and $summary.next.addSampleCommand) {
    Write-Host "Next AddSample command:"
    Write-Host $summary.next.addSampleCommand
    if ($summary.next.authorizationRedacted) {
        Write-Host "Authorization was redacted in the suggested command; replace <redacted> before running it."
    }
}
