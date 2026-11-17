# Deprecated entry point retained for operators with older instructions.
# Use the reviewed public production release script; it backs up the production D1 database,
# verifies safe flags, runs tests and deploys to the existing Cloudflare Worker.
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)
$cfg = Get-Content ".\wrangler.jsonc" -Raw | ConvertFrom-Json
if ($cfg.vars.MEMBERSHIP_LIVE_PILOT_ONLY -ne "false" -or
    $cfg.vars.ADMIN_ONE_RUPEE_TEST_ENABLED -ne "false") {
    throw "Download the latest frozen public release. ₹1 founder checkout must be disabled and ₹999 customer checkout enabled."
}
Write-Host "This opens real ₹999 one-year Veronates membership checkout to all signed-in users." -ForegroundColor Yellow
Write-Host "The ₹1 live founder payment tested capture/card/email plumbing but did not exercise a paid ₹999 entitlement. Monitor the first paid membership." -ForegroundColor Yellow
$confirmation = Read-Host "Type PUBLIC to deploy the production membership release (anything else cancels)"
if ($confirmation -cne "PUBLIC") { throw "Public release cancelled." }
& powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\release-to-cloudflare.ps1"
if ($LASTEXITCODE -ne 0) { throw "Public production release script failed. Inspect its output before proceeding." }
