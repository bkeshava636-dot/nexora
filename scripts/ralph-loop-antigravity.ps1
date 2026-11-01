param([Parameter(ValueFromRemainingArguments = $true)][string[]]$RalphArgs)

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $PSCommandPath
. (Join-Path $here "lib/RalphLoop.ps1")

$antigravityCmd = if ($env:AGY_CMD) {
    $env:AGY_CMD
} elseif (Get-Command agy.cmd -ErrorAction SilentlyContinue) {
    "agy.cmd"
} elseif (Get-Command agy -ErrorAction SilentlyContinue) {
    "agy"
} elseif ($env:GEMINI_CMD) {
    $env:GEMINI_CMD
} elseif (Get-Command gemini.cmd -ErrorAction SilentlyContinue) {
    "gemini.cmd"
} elseif (Get-Command gemini -ErrorAction SilentlyContinue) {
    "gemini"
} else {
    "agy"
}

$antigravityModel = if ($env:AGY_MODEL) { $env:AGY_MODEL } elseif ($env:GEMINI_MODEL) { $env:GEMINI_MODEL } else { "gemini-2.5-pro" }

Invoke-RalphLoop `
    -AgentName "Google Antigravity CLI" `
    -CommandName $antigravityCmd `
    -Model $antigravityModel `
    -YoloFlag "--yolo" `
    -BaseArgs @("-p", "", "-m", $antigravityModel) `
    -InvocationArgs $RalphArgs
