# Verify Vercel /__/auth proxy + apex->www + BE Google endpoint (no secrets).
$ErrorActionPreference = 'Stop'

function Get-BodySnippet([string]$Url, [int]$Max = 180) {
  $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 30
  $body = $resp.Content
  [pscustomobject]@{
    Url                 = $Url
    StatusCode          = [int]$resp.StatusCode
    LooksLikeFirebase   = ($body -match 'handler\.js|firebase-auth-helper|iframe\.js')
    LooksLikeSpaShell   = ($body -match 'id="root"|vite\.svg|/assets/index-')
    Snippet             = if ($body.Length -gt $Max) { $body.Substring(0, $Max) } else { $body }
  }
}

Write-Host '== Firebase auth proxy (www) ==' -ForegroundColor Cyan
$handler = Get-BodySnippet 'https://www.timelens.asia/__/auth/handler'
$iframe = Get-BodySnippet 'https://www.timelens.asia/__/auth/iframe'
$handler | Format-List Url, StatusCode, LooksLikeFirebase, LooksLikeSpaShell
$iframe | Format-List Url, StatusCode, LooksLikeFirebase, LooksLikeSpaShell

if (-not $handler.LooksLikeFirebase -or $handler.LooksLikeSpaShell) {
  throw 'FAIL: /__/auth/handler is not proxied to Firebase (check vercel.json deploy).'
}
if (-not $iframe.LooksLikeFirebase) {
  throw 'FAIL: /__/auth/iframe is not proxied to Firebase.'
}
Write-Host 'OK: www /__/auth proxy -> Firebase' -ForegroundColor Green

Write-Host '== Apex -> www ==' -ForegroundColor Cyan
$curlOut = & curl.exe -sI -o NUL -w 'code=%{http_code} redirect=%{redirect_url}' 'https://timelens.asia/login'
Write-Host $curlOut
if ($curlOut -notmatch 'code=30[178]' -or $curlOut -notmatch 'www\.timelens\.asia') {
  throw "FAIL: apex does not redirect to www.timelens.asia ($curlOut)"
}
Write-Host 'OK: apex -> www' -ForegroundColor Green

Write-Host '== BE Google endpoint ==' -ForegroundColor Cyan
$bodyJson = '{"idToken":"invalid"}'
try {
  Invoke-WebRequest -Uri 'https://histar-postgre.onrender.com/api/auth/google' `
    -Method POST -ContentType 'application/json' -Body $bodyJson `
    -UseBasicParsing -TimeoutSec 60 | Out-Null
  throw 'FAIL: expected 4xx from BE'
} catch {
  $code = [int]$_.Exception.Response.StatusCode
  Write-Host "POST /api/auth/google -> $code"
  if ($code -ne 422 -and $code -ne 400 -and $code -ne 401) {
    throw "FAIL: unexpected status $code (is Render awake / Firebase enabled?)"
  }
  Write-Host 'OK: BE accepts /api/auth/google (rejects invalid token)' -ForegroundColor Green
}

Write-Host ''
Write-Host 'Next (manual): Google Cloud OAuth Web client - docs/GOOGLE_OAUTH_CONSOLE_CHECKLIST.md' -ForegroundColor Yellow
Write-Host 'Mobile Safari: https://www.timelens.asia/login -> Continue to www.timelens.asia' -ForegroundColor Yellow
