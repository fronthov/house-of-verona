# House of Verona: review branch to EXISTING Cloudflare Worker / D1.
# Run from a fresh checkout of hov/customer-policies-2026-11.
# No GitHub push, no account credentials stored here.
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)
function Invoke-HoVCommand([string[]]$Arguments) {
    & npm.cmd exec -- wrangler @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Wrangler command failed: $($Arguments -join ' ')" }
}
Write-Host "House of Verona — frozen Veronates public release preflight" -ForegroundColor Cyan
if (-not (Test-Path ".\sql\expansion.sql")) { throw "Missing additive D1 expansion schema." }
if (-not (Test-Path ".\sql\member-cards.sql")) { throw "Missing one-year member-card schema." }
if (-not (Test-Path ".\sql\admin-payment-test.sql")) { throw "Missing admin-only verification schema." }
if (-not (Test-Path ".\public\assets\hov-emblem.webp")) { throw "Missing official HoV emblem." }
if (-not (Test-Path ".\public\admin-payment-test.html")) { throw "Missing founder payment test page." }
$config = Get-Content ".\wrangler.jsonc" -Raw | ConvertFrom-Json
if ($config.name -ne "house-of-verona") { throw "Worker name does not match the existing live service." }
if ($config.d1_databases[0].database_name -ne "hov-store") { throw "Wrong D1 database name." }
if ($config.d1_databases[0].database_id -ne "5afde4dd-7f21-4ea0-8ba3-f7a45f4cf716") { throw "Wrong production D1 database ID." }
if ($config.vars.SITE_URL -ne "https://houseofverona.in") { throw "Wrong SITE_URL." }
if ($config.vars.STORE_OPEN -ne "true") { throw "Store open state differs from current live site." }
if ($config.keep_vars -ne $true) { throw "Wrangler must retain existing dashboard-managed Razorpay variables and secrets." }
# Fail closed: never ship payment credentials or webhook secrets as plain-text Wrangler vars.
$protectedKeys = @("RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET")
foreach ($key in $protectedKeys) {
    if ($config.vars.PSObject.Properties.Name -contains $key) { throw "$key must be a Cloudflare Secret, not a wrangler.jsonc vars entry." }
}
# Public membership activation is tracked in source after the controlled live pilot.
# Keep payment flags explicit, and continue deploying only to this same Worker.
if ($config.vars.MEMBERSHIP_PAYMENTS_ENABLED -ne "true") {
    throw "Membership payments must be explicitly enabled in the reviewed configuration."
}
if ($config.vars.MEMBERSHIP_LIVE_PILOT_ONLY -ne "false") { throw "Public release requires pilot-only false." }
if ($config.vars.ADMIN_ONE_RUPEE_TEST_ENABLED -ne "false") { throw "Public release requires founder INR 1 test disabled." }
& npm.cmd test
if ($LASTEXITCODE -ne 0) { throw "Tests failed. Live Worker unchanged." }
Invoke-HoVCommand -Arguments @("deploy", "--dry-run")
Write-Host "Backing up production D1 before additive schema migration..." -ForegroundColor Cyan
$backupDir = Join-Path $env:USERPROFILE "HoV-Website\backups"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$backup = Join-Path $backupDir ("hov-store-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".sql")
Invoke-HoVCommand -Arguments @("d1", "export", "hov-store", "--remote", "--output", $backup)
if (-not (Test-Path $backup)) { throw "Database backup was not created. Stop without deploying." }
Write-Host "Database backup: $backup" -ForegroundColor Green
Write-Host "Applying additive franchise/membership schema..." -ForegroundColor Cyan
Invoke-HoVCommand -Arguments @("d1", "execute", "hov-store", "--remote", "--file=./sql/expansion.sql")
Write-Host "Applying idempotent one-year member-card tables..." -ForegroundColor Cyan
Invoke-HoVCommand -Arguments @("d1", "execute", "hov-store", "--remote", "--file=./sql/member-cards.sql")
Write-Host "Applying isolated founder-only ₹1 verification table..." -ForegroundColor Cyan
Invoke-HoVCommand -Arguments @("d1", "execute", "hov-store", "--remote", "--file=./sql/admin-payment-test.sql")
Write-Host "Updating the existing Cloudflare Worker with configured membership access..." -ForegroundColor Cyan
Invoke-HoVCommand -Arguments @("deploy")
try {
    $response = Invoke-RestMethod -Uri "https://houseofverona.in/api/health" -TimeoutSec 20
    if ($response.healthy -ne $true -or $response.storeOpen -ne $true) { throw "Unexpected health response." }
    Write-Host "Health API passed." -ForegroundColor Green
} catch {
    Write-Warning "Health check did not verify. Inspect Cloudflare dashboard immediately: $($_.Exception.Message)"
}
Write-Host "Checking the deployed annual membership endpoints..." -ForegroundColor Cyan
try {
    $offer = Invoke-RestMethod -Uri "https://houseofverona.in/api/membership/offer" -TimeoutSec 25
    if ($offer.annual -ne $true -or $offer.price -ne 999 -or $offer.testMode -ne $false) {
        throw "Expected annual=true and introductory price=999 in membership offer."
    }
    if ($offer.checkoutEnabled -ne $true) {
        throw "PUBLIC membership checkout is not yet enabled for customers."
    }
    $cardPage = Invoke-WebRequest -Uri "https://houseofverona.in/membership-card.html" -UseBasicParsing -TimeoutSec 25
    if ($cardPage.StatusCode -ne 200 -or -not $cardPage.Content.Contains("VERONATES")) {
        throw "Membership card page did not render."
    }
    Write-Host "Annual membership offer and digital card page verified." -ForegroundColor Green
    $adminPage = Invoke-WebRequest -Uri ("https://houseofverona.in/admin-payment-test.html?deploycheck=" + [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()) -UseBasicParsing -TimeoutSec 25 -Headers @{"Cache-Control"="no-cache"}
    if ($adminPage.StatusCode -ne 200 -or
        -not $adminPage.Content.Contains('id="payOneRupee"') -or
        -not $adminPage.Content.Contains('src="/admin-payment-test.js"')) {
        throw "Live URL does not contain the founder ₹1 button. Check route / Cloudflare deployment."
    }
    $adminJs = Invoke-WebRequest -Uri ("https://houseofverona.in/admin-payment-test.js?deploycheck=" + [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()) -UseBasicParsing -TimeoutSec 25 -Headers @{"Cache-Control"="no-cache"}
    if ($adminJs.StatusCode -ne 200 -or -not $adminJs.Content.Contains("/api/admin/membership-test/checkout") -or
        -not $adminJs.Content.Contains("amount:100")) {
        throw "Live founder checkout JavaScript missing or stale. Check Cloudflare Worker and assets."
    }
    Write-Host "Live ₹1 founder page and checkout JavaScript verified at houseofverona.in." -ForegroundColor Green
} catch {
    Write-Warning "Live-site verification failed: $($_.Exception.Message)"
    throw "Deployment could not be confirmed on houseofverona.in. Do not proceed to Razorpay until this is fixed."
}
Write-Host "PUBLIC VERONATES RELEASE DEPLOYED: ₹999/year, real Razorpay payments, founder ₹1 checkout disabled." -ForegroundColor Green
Write-Host "Do not deploy unrelated changes without a tested code review. Check the first captured customer payment, card and email." -ForegroundColor Yellow
