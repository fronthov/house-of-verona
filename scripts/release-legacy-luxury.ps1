# Release HoV design with the existing live backend, not the annual Razorpay release.
$ErrorActionPreference='Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
function Wrangler([string[]]$A){ & npm.cmd exec -- wrangler @A; if($LASTEXITCODE -ne 0){throw "Wrangler command failed: $($A -join ' ')"} }
$c=Get-Content '.\wrangler.jsonc' -Raw | ConvertFrom-Json
if($c.name -ne 'house-of-verona' -or $c.d1_databases[0].database_id -ne '5afde4dd-7f21-4ea0-8ba3-f7a45f4cf716' -or $c.vars.STORE_OPEN -ne 'true' -or $c.keep_vars -ne $true){ throw 'Production Worker/config does not match expected; no deployment.' }
Write-Host 'Verifying OLD live checkout backend before release...' -ForegroundColor Cyan
$health=Invoke-RestMethod 'https://houseofverona.in/api/health' -TimeoutSec 20
if($health.healthy -ne $true -or $health.storeOpen -ne $true){throw 'Live store is not healthy/open. No deployment.'}
$offerCode=0
try{$r=Invoke-WebRequest 'https://houseofverona.in/api/membership/offer' -UseBasicParsing -TimeoutSec 20 -ErrorAction Stop;$offerCode=[int]$r.StatusCode}catch{if(!$_.Exception.Response){throw};$offerCode=[int]$_.Exception.Response.StatusCode}
if($offerCode -ne 404){throw "Live membership endpoint is no longer legacy (HTTP $offerCode). Stop to avoid changing newer backend."}
$brand=Invoke-WebRequest 'https://houseofverona.in/brand.html' -UseBasicParsing -TimeoutSec 20
if($brand.StatusCode -ne 200){throw 'Existing official brand page not accessible.'}
$catalog=Invoke-RestMethod 'https://houseofverona.in/api/catalog' -TimeoutSec 20
if($catalog.storeOpen -ne $true -or !($catalog.products.Count -gt 0)){throw 'Existing catalog is not available.'}
Write-Host 'Matching live-compatible backend confirmed; proceeding with tests.' -ForegroundColor Green
& npm.cmd test
if($LASTEXITCODE -ne 0){throw 'Tests failed; no deployment.'}
Wrangler -A @('deploy','--dry-run')
# D1 production databases provide Time Travel recovery even when a SQL export fails.
# For this code-only redesign, record the current recovery bookmark before deployment.
# Never call a restore command here: a restore would overwrite later orders.
$backupDir=Join-Path $env:USERPROFILE 'HoV-Website\backups'
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
Write-Host 'Recording a Cloudflare D1 Time Travel recovery bookmark...' -ForegroundColor Cyan
$recoveryText = (& npm.cmd exec -- wrangler d1 time-travel info hov-store 2>&1 | Out-String)
if($LASTEXITCODE -ne 0){
  Write-Host $recoveryText
  throw 'D1 Time Travel recovery checkpoint failed. No deployment attempted. Share the error above.'
}
Write-Host $recoveryText
$bookmark=$null
if($recoveryText -match '(?i)\b[0-9a-f]{8}-[0-9a-f]{8}-[0-9a-f]{8}-[0-9a-f]{32}\b'){
  $bookmark=$Matches[0]
}
if([string]::IsNullOrWhiteSpace($bookmark)){
  throw 'Could not validate the current D1 recovery bookmark. No deployment attempted.'
}
$checkpoint=Join-Path $backupDir ('hov-time-travel-before-luxury-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.txt')
$utcTime=[DateTime]::UtcNow.ToString('o')
@("Database: hov-store","Database ID: 5afde4dd-7f21-4ea0-8ba3-f7a45f4cf716","Captured (UTC): $utcTime","Recovery bookmark: $bookmark","Cloudflare D1 Time Travel is time-limited; this is NOT a standalone SQL backup.","WARNING: Restoring would overwrite database changes after this bookmark.") | Set-Content -LiteralPath $checkpoint -Encoding UTF8
if(!(Test-Path -LiteralPath $checkpoint) -or (Get-Item -LiteralPath $checkpoint).Length -lt 100){
  throw 'D1 checkpoint file not saved. No deployment attempted.'
}
Write-Host 'Cloudflare D1 recovery bookmark saved:' $checkpoint -ForegroundColor Green
Write-Host 'Deploying existing storefront backend with visual improvements...' -ForegroundColor Cyan
Wrangler -A @('deploy')
$home=Invoke-WebRequest ('https://houseofverona.in/?verona-release='+[DateTimeOffset]::UtcNow.ToUnixTimeSeconds()) -UseBasicParsing -TimeoutSec 25 -Headers @{'Cache-Control'='no-cache'}
$fr=Invoke-WebRequest 'https://houseofverona.in/franchise.html' -UseBasicParsing -TimeoutSec 25
$br=Invoke-WebRequest 'https://houseofverona.in/brand.html' -UseBasicParsing -TimeoutSec 25
$check=Invoke-RestMethod 'https://houseofverona.in/api/health' -TimeoutSec 25
if($home.StatusCode -ne 200 -or !$home.Content.Contains('A Taste of India,') -or $fr.StatusCode -ne 200 -or $br.StatusCode -ne 200 -or $check.storeOpen -ne $true){throw 'Deploy uploaded, but live verification failed. Check Cloudflare deployment history for rollback.'}
Write-Host 'House of Verona luxury homepage published, franchise and brand pages confirmed.' -ForegroundColor Green
