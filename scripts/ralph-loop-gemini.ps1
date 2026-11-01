param([Parameter(ValueFromRemainingArguments = $true)][string[]]$RalphArgs)

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $PSCommandPath
. (Join-Path $here "lib/RalphLoop.ps1")

$geminiCmd = if ($env:AGY_CMD) {
    $env:AGY_CMD
} elseif ($env:GEMINI_CMD) {
    $env:GEMINI_CMD
} elseif (Get-Command agy.cmd -ErrorAction SilentlyContinue) {
    "agy.cmd"
} elseif (Get-Command agy -ErrorAction SilentlyContinue) {
    "agy"
} elseif (Get-Command gemini.cmd -ErrorAction SilentlyContinue) {
    "gemini.cmd"
} elseif (Get-Command gemini -ErrorAction SilentlyContinue) {
    "gemini"
} else {
    "gemini"
}

$geminiModel = if ($env:GEMINI_MODEL) { $env:GEMINI_MODEL } else { "gemini-2.5-pro" }

Invoke-RalphLoop `
    -AgentName "Google Antigravity / Gemini CLI" `
    -CommandName $geminiCmd `
    -Model $geminiModel `
    -YoloFlag "--yolo" `
    -BaseArgs @("-p", "", "-m", $geminiModel) `
    -InvocationArgs $RalphArgs
