$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
# Same-origin Vite proxy to the isolated local backend, regardless of .env overrides.
$env:VITE_API_URL = '/'
$env:VITE_AI_URL = '/'
$env:VITE_MEDIA_BASE_URL = '/'
$env:VITE_DEMO_ENABLED = 'false'
$env:VITE_DEMO_MODE = 'false'
& npm.cmd run dev -- --host 127.0.0.1 --port 5175 --strictPort
exit $LASTEXITCODE
