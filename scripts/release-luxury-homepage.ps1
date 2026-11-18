# House of Verona visual-only release - November 18, 2026
# Run from a fresh clone of release/hov-luxury-homepage-2026-11-18.
# IMPORTANT: this script NEVER changes D1 schema, pricing, or payment secrets.
# It refuses to deploy if the active site is not already on the same release-generation backend.
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)
function Run-Wrangler([string[]]$Argv) {
  & npm.cmd exec -- wrangler @Argv
  if ($LASTEXITCODE -ne 0) { throw "Wrangler failed: $($Argv -join ' ')" }
}
$cfg = Get-Content .\wrangler.jsonc -Raw | ConvertFrom-Json
if ($cfg.name -ne 'house-of-verona' -or $cfg.d1_databases[0].database_id -ne '5afde4dd-7f21-4ea0-8ba3-f7a45f4cf716' -or $cfg.vars.SITE_URL -ne 'https://houseofverona.in') {
  throw "Unexpected Cloudflare Worker, domain or database; no deployment attempted."
}
if ($cfg.keep_vars -ne $true -or $cfg.vars.STORE_OPEN -ne 'true' -or $cfg.vars.MEMBERSHIP_PAYMENTS_ENABLED -ne 'true') {
  throw "Release backend configuration differs; no deployment attempted."
}
Write-Host "Checking existing live functionality before visual deployment..." -ForegroundColor Cyan
try {
  $health = Invoke-RestMethod 'https://houseofverona.in/api/health' -TimeoutSec 20
  $offer = Invoke-RestMethod 'https://houseofverona.in/api/membership/offer' -TimeoutSec 20
  $franchise = Invoke-WebRequest 'https://houseofverona.in/franchise.html' -UseBasicParsing -TimeoutSec 20
} catch { throw "Live release-generation services could not be verified: $($_.Exception.Message). Deployment cancelled." }
# This restriction prevents a design release from accidentally turning membership payments ON.
if ($health.healthy -ne $true -or $health.storeOpen -ne $true -or $offer.annual -ne $true -or $offer.checkoutEnabled -ne $true -or $franchise.StatusCode -ne 200) {
  throw "Existing site does not match the protected release baseline (or membership payments aren't already open). STOP. The live site has NOT been changed."
}
Write-Host "Protected release baseline confirmed." -ForegroundColor Green
& npm.cmd test
if ($LASTEXITCODE -ne 0) { throw "Tests failed. No deployment." }
Run-Wrangler -Argv @('deploy','--dry-run')
$backupDir=Join-Path $env:USERPROFILE 'HoV-Website\backups'
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$backup=Join-Path $backupDir ("hov-before-luxury-release-"+(Get-Date -Format 'yyyyMMdd-HHmmss')+".sql")
Run-Wrangler -Argv @('d1','export','hov-store','--remote','--output',$backup)
if (!(Test-Path $backup) -or (Get-Item $backup).Length -lt 10) { throw "Production D1 backup missing or unexpectedly small. Stop." }
Write-Host "DB backup written to $backup" -ForegroundColor Green
Write-Host "Publishing visual-only design release to existing House of Verona Worker..." -ForegroundColor Cyan
Run-Wrangler -Argv @('deploy')
Write-Host "Checking published homepage and official brand identity..." -ForegroundColor Cyan
$homepage=Invoke-WebRequest 'https://houseofverona.in/?hov-design-check=20261118' -UseBasicParsing -TimeoutSec 25 -Headers @{'Cache-Control'='no-cache'}
$brand=Invoke-WebRequest 'https://houseofverona.in/brand.html?hov-design-check=20261118' -UseBasicParsing -TimeoutSec 25 -Headers @{'Cache-Control'='no-cache'}
$afterOffer=Invoke-RestMethod 'https://houseofverona.in/api/membership/offer' -TimeoutSec 25
if ($homepage.StatusCode -ne 200 -or !$homepage.Content.Contains('A Taste of India,') -or !$homepage.Content.Contains('franchiseBtn') -or $brand.StatusCode -ne 200 -or $afterOffer.checkoutEnabled -ne $true) {
  throw "Deployment uploaded but live verification failed. Do NOT take further payment action. Check Cloudflare Worker Deployments for rollback immediately."
}
Write-Host "Verified: House of Verona luxury homepage and brand page are live; franchise and membership checkout unchanged." -ForegroundColor Green
