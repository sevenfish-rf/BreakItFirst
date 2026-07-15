# BreakItFirst — local BYOK baseline runner (PowerShell)
# Usage:  .\scripts\eval-baseline.ps1
# Optional: -Deep  -Only "01-marketplace-pet-sitting"

param(
  [switch]$Deep,
  [string]$Only = "",
  [string]$Locale = ""
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Ensure-Env([string]$Name, [string]$Prompt, [bool]$Secret = $false) {
  $existing = [Environment]::GetEnvironmentVariable($Name, "Process")
  if ($existing -and $existing.Trim().Length -gt 0) {
    return $existing.Trim()
  }
  if ($Secret) {
    $secure = Read-Host -Prompt $Prompt -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
      return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr).Trim()
    } finally {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
  }
  return (Read-Host -Prompt $Prompt).Trim()
}

Write-Host ""
Write-Host "BreakItFirst eval baseline" -ForegroundColor Cyan
Write-Host "Project: $Root"
Write-Host ""

$env:BIF_BASE_URL = Ensure-Env "BIF_BASE_URL" "Provider base URL (e.g. https://api.openai.com/v1)"
$env:BIF_API_KEY = Ensure-Env "BIF_API_KEY" "API key (empty OK for Ollama)" $true
$env:BIF_PASS1_MODEL = Ensure-Env "BIF_PASS1_MODEL" "Pass 1 model id"
$env:BIF_PASS2_MODEL = Ensure-Env "BIF_PASS2_MODEL" "Pass 2 model id"

if ($Locale) { $env:BIF_LOCALE = $Locale }
if ($Only) { $env:BIF_ONLY = $Only }
if ($Deep) {
  $env:BIF_DEEP = "1"
  Write-Host "Deep analysis ON (2x Pass 1)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Running: npm run eval:baseline" -ForegroundColor Green
npm run eval:baseline
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Done. Score manually with eval\rubric.md -> baselines\<run>\scores\" -ForegroundColor Cyan
