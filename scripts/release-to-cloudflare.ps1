# House of Verona: review branch to EXISTING Cloudflare Worker / D1.
# Run from a fresh checkout of hov/customer-policies-2026-11.
# No GitHub push, no account credentials stored here.
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)
function Invoke-HoVCommand([string[]]$Arguments) {
    & npm.cmd exec -- wrangler @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Wrangler command failed: $($Arguments -join ' ')" }
}
Write-Host "House of Verona production release preflight" -ForegroundColor Cyan
if (-not (Test-Path ".\sql\expansion.sql")) { throw "Missing additive D1 expansion schema." }
if (-not (Test-Path ".\public\assets\hov-emblem.webp")) { throw "Missing official HoV emblem." }
$config = Get-Content ".\wrangler.jsonc" -Raw | ConvertFrom-Json
if ($config.name -ne "house-of-verona") { throw "Worker name does not match the existing live service." }
if ($config.d1_databases[0].database_name -ne "hov-store") { throw "Wrong D1 database name." }
if ($config.d1_databases[0].database_id -ne "5afde4dd-7f21-4ea0-8ba3-f7a45f4cf716") { throw "Wrong production D1 database ID." }
if ($config.vars.SITE_URL -ne "https://houseofverona.in") { throw "Wrong SITE_URL." }
if ($config.vars.STORE_OPEN -ne "true") { throw "Store open state differs from current live site." }
if ($config.vars.MEMBERSHIP_PAYMENTS_ENABLED -eq "true") { throw "Cannot deploy with membership payments enabled before live payment verification." }
& npm.cmd test
if ($LASTEXITCODE -ne 0) { throw "Tests failed. Live Worker unchanged." }
Invoke-HoVCommand @("deploy", "--dry-run")
Write-Host "Backing up production D1 before additive schema migration..." -ForegroundColor Cyan
$backupDir = Join-Path $env:USERPROFILE "HoV-Website\backups"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$backup = Join-Path $backupDir ("hov-store-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".sql")
Invoke-HoVCommand @("d1", "export", "hov-store", "--remote", "--output", $backup)
if (-not (Test-Path $backup)) { throw "Database backup was not created. Stop without deploying." }
Write-Host "Database backup: $backup" -ForegroundColor Green
Write-Host "Applying additive franchise/membership schema..." -ForegroundColor Cyan
Invoke-HoVCommand @("d1", "execute", "hov-store", "--remote", "--file=./sql/expansion.sql")
Write-Host "Updating existing Cloudflare Worker, keeping website orders open and membership payments disabled..." -ForegroundColor Cyan
Invoke-HoVCommand @("deploy")
try {
    $response = Invoke-RestMethod -Uri "https://houseofverona.in/api/health" -TimeoutSec 20
    if ($response.healthy -ne $true -or $response.storeOpen -ne $true) { throw "Unexpected health response." }
    Write-Host "Health API passed." -ForegroundColor Green
} catch {
    Write-Warning "Health check did not verify. Inspect Cloudflare dashboard immediately: $($_.Exception.Message)"
}
Write-Host "Release finished. Franchise form needs a real submission/email test; Razorpay membership payments remain disabled." -ForegroundColor Yellow
Write-Host "Before enabling Razorpay: configure verified secret keys and webhook, test captured payment and refunds, then confirm authorisation." -ForegroundColor Yellow
