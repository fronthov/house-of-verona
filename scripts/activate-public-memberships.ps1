# House of Verona: founder-authorized public Razorpay launch without requiring an earlier paid pilot.
# Do not paste or commit Razorpay API keys/webhook secrets. Uses Wrangler OAuth on user's PC.
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)
$configPath = Join-Path (Get-Location) "wrangler.jsonc"
$config = Get-Content $configPath -Raw | ConvertFrom-Json

if ($config.name -ne "house-of-verona") { throw "Wrong Worker configuration." }
if ($config.d1_databases[0].database_name -ne "hov-store") { throw "Wrong D1 database." }
if ($config.vars.STORE_OPEN -ne "true") { throw "Website store is not enabled." }
if ($config.keep_vars -ne $true) { throw "keep_vars needs to be true." }
if ($config.vars.MEMBERSHIP_PAYMENTS_ENABLED -ne "true") { throw "Pilot payment system is not configured as enabled." }
if ($config.vars.MEMBERSHIP_LIVE_PILOT_ONLY -ne "false") {
    throw "Expected PILOT_ONLY=false in source config. Download the latest GitHub public-release branch."
}
if ($config.vars.PSObject.Properties.Name -contains "RAZORPAY_KEY_SECRET" -or
    $config.vars.PSObject.Properties.Name -contains "RAZORPAY_WEBHOOK_SECRET" -or
    $config.vars.PSObject.Properties.Name -contains "RAZORPAY_KEY_ID") {
    throw "Never put payment credentials under vars."
}

Write-Host "Checking production annual-membership endpoints..." -ForegroundColor Cyan
$offer = Invoke-RestMethod -Uri "https://houseofverona.in/api/membership/offer" -TimeoutSec 25
if ($offer.annual -ne $true -or $offer.price -ne 999) {
    throw "Annual-member API is not live or the expected introductory price is missing. Deploy pilot release first."
}
if ($offer.checkoutEnabled -ne $false) {
    throw "Checkout is already open to anonymous visitors; stop to investigate."
}
$page = Invoke-WebRequest -Uri "https://houseofverona.in/membership-card.html" -UseBasicParsing -TimeoutSec 25
if ($page.StatusCode -ne 200 -or -not $page.Content.Contains("VERONATES")) {
    throw "The membership-card page is not live. Deploy pilot release first."
}

# Confirm the one-year card tables exist. No payment is created or processed here.
Write-Host "Checking production membership-card database tables..." -ForegroundColor Cyan
& npm.cmd exec -- wrangler d1 execute hov-store --remote --command "SELECT COUNT(*) AS total FROM hov_member_cards;"
if ($LASTEXITCODE -ne 0) { throw "The production one-year card table is missing or inaccessible; stop." }
& npm.cmd exec -- wrangler d1 execute hov-store --remote --command "SELECT COUNT(*) AS total FROM hov_member_card_requests;"
if ($LASTEXITCODE -ne 0) { throw "The production member name request table is missing or inaccessible; stop." }

Write-Warning "NO COMPLETED REAL PAYMENT HAS BEEN VERIFIED. Checkout branding and order creation were checked, but card generation, captured-payment webhook processing and email delivery remain untested end to end."
Write-Warning "This release may charge real customers INR 999. If a charge succeeds but a card does not arrive, investigate Razorpay capture and the webhook immediately. Never ask customers to pay twice."
Write-Host "Public activation will not alter any existing Razorpay secret or payment record." -ForegroundColor Cyan
$confirmation = Read-Host "Type OPEN UNVERIFIED to deploy live public checkout without a completed pilot (anything else cancels)"
if ($confirmation -cne "OPEN UNVERIFIED") { throw "Public activation cancelled. Pilot restriction remains unchanged." }

& npm.cmd test
if ($LASTEXITCODE -ne 0) { throw "Tests failed; public activation cancelled." }
# GitHub now tracks public state, so deploy the reviewed source config as-is.
# This does not touch or print the Cloudflare Razorpay API secrets.
& npm.cmd exec -- wrangler deploy --dry-run
if ($LASTEXITCODE -ne 0) { throw "Public Worker dry run failed" }
& npm.cmd exec -- wrangler deploy
if ($LASTEXITCODE -ne 0) { throw "Cloudflare Worker deploy failed. Check dashboard before repeating the command." }
Write-Host "Checking live public membership offer..." -ForegroundColor Cyan
$public = Invoke-RestMethod -Uri "https://houseofverona.in/api/membership/offer" -TimeoutSec 25
if ($public.annual -ne $true -or $public.checkoutEnabled -ne $true -or $public.price -ne 999 -or $public.testMode -ne $false) {
    throw "Deployed but not verified public. Inspect Cloudflare and pause public payments until corrected."
}
Write-Host "PUBLIC MEMBERSHIPS ARE NOW ENABLED. Real INR 999 annual membership checkout available." -ForegroundColor Green
Write-Host "Public access is now tracked in the GitHub Wrangler configuration for future releases." -ForegroundColor Green
