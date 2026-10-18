# Script tự động chạy E2E tests
Set-Location "D:\FPT\SU26\EXE101\HistAR\FE"

# Kill any existing vite on port 5174
$viteProc = Get-NetTCPConnection -LocalPort 5174 -ErrorAction SilentlyContinue
if ($viteProc) {
    Stop-Process -Id (Get-Process -Id (Get-NetTCPConnection -LocalPort 5174).OwningProcess).Id -Force -ErrorAction SilentlyContinue
    Write-Host "Killed old Vite on port 5174"
}

Write-Host "Starting Playwright E2E tests..."
$env:VITE_DEMO_ENABLED = "true"
npx playwright test --project 3-fullstack-e2e 2>&1 | Tee-Object -FilePath "D:\FPT\SU26\EXE101\HistAR\FE\e2e-test-output.txt"
Write-Host "Tests complete. Check e2e-test-output.txt"
