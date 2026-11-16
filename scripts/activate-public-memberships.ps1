# House of Verona: activate public paid memberships ONLY after a real successful pilot.
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
if ($config.vars.MEMBERSHIP_LIVE_PILOT_ONLY -ne "true") {
    throw "Expected PILOT_ONLY=true in source config. Public rollout may already be activated; inspect live dashboard."
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

Write-Host "Checking production D1 for a real, completed, emailed one-year pilot membership..." -ForegroundColor Cyan
$sql = "SELECT COUNT(*) AS verified_count FROM hov_member_cards c INNER JOIN hov_membership_payments p ON p.razorpay_order_id = c.razorpay_order_id AND p.razorpay_payment_id = c.razorpay_payment_id WHERE p.status = 'paid' AND p.currency = 'INR' AND p.amount_paise = 99900 AND c.email_sent_at IS NOT NULL AND c.revoked_at IS NULL AND c.expires_at > CAST(strftime('%s','now') AS INTEGER)"
$raw = (& npm.cmd exec -- wrangler d1 execute hov-store --remote --command $sql --json 2>&1 | Out-String)
if ($LASTEXITCODE -ne 0) { throw "D1 check failed. Stop: $raw" }
try {
    $parsed = ConvertFrom-Json -InputObject $raw
    $first = @($parsed)[0]
    $verified = [int]$first.results[0].verified_count
} catch { throw "Could not parse D1 verification. Do not enable public payments. $($_.Exception.Message)" }
if ($verified -lt 1) {
    throw "No successfully captured and emailed live INR 999 annual membership found in D1. Run and verify a real pilot first. Public payments stay restricted."
}
Write-Host "Verified annual card record found in production D1." -ForegroundColor Green
Write-Host "Before continuing, confirm you personally received the pilot membership card email." -ForegroundColor Yellow
Write-Host "This change exposes real INR 999 membership purchases to ALL signed-in customers." -ForegroundColor Yellow
$confirmation = Read-Host "Type OPEN to enable public memberships (anything else cancels)"
if ($confirmation -cne "OPEN") { throw "Public activation cancelled; live pilot restriction remains." }

& npm.cmd test
if ($LASTEXITCODE -ne 0) { throw "Tests failed; public activation cancelled." }
$config.vars.MEMBERSHIP_LIVE_PILOT_ONLY = "false"
$originalConfig = Get-Content $configPath -Raw
try {
    $updatedConfig = $config | ConvertTo-Json -Depth 30
    [System.IO.File]::WriteAllText($configPath, $updatedConfig + [Environment]::NewLine)
    & npm.cmd exec -- wrangler deploy --dry-run
    if ($LASTEXITCODE -ne 0) { throw "Public Worker dry run failed" }
    & npm.cmd exec -- wrangler deploy
    if ($LASTEXITCODE -ne 0) { throw "Cloudflare Worker deploy failed. Check dashboard before repeating the command." }
} catch {
    [System.IO.File]::WriteAllText($configPath, $originalConfig)
    throw
}
Write-Host "Checking live public membership offer..." -ForegroundColor Cyan
$public = Invoke-RestMethod -Uri "https://houseofverona.in/api/membership/offer" -TimeoutSec 25
if ($public.annual -ne $true -or $public.checkoutEnabled -ne $true -or $public.price -ne 999) {
    throw "Deployed but not verified public. Inspect Cloudflare and pause public payments until corrected."
}
Write-Host "PUBLIC MEMBERSHIPS ARE NOW ENABLED. Real INR 999 annual membership checkout available." -ForegroundColor Green
Write-Host "Save the updated local wrangler.jsonc to GitHub before your next release to avoid re-enabling pilot restrictions." -ForegroundColor Yellow
