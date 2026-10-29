$Host.UI.RawUI.WindowTitle = "ICU Live Server"
Clear-Host
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "            CITY GENERAL HOSPITAL - LIVE PUBLIC SERVER                " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check MySQL
$mysql = Get-Process mysqld -ErrorAction SilentlyContinue
if (-not $mysql) {
    Write-Host "[1/3] Starting MySQL database..." -ForegroundColor Yellow
    if (Test-Path "C:\xampp\mysql_start.bat") {
        Start-Process "C:\xampp\mysql_start.bat" -WindowStyle Minimized
        Start-Sleep -Seconds 2
    }
} else {
    Write-Host "[1/3] MySQL database is running." -ForegroundColor Green
}

# 2. Start Django
Write-Host "[2/3] Starting Django backend..." -ForegroundColor Yellow
$djangoProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c run_server.bat" -WindowStyle Minimized -PassThru
Start-Sleep -Seconds 2

# 3. Start Cloudflare Tunnel & Extract URL
Write-Host "[3/3] Generating your live public link..." -ForegroundColor Yellow
$log = Join-Path $PSScriptRoot "tunnel.log"
if (Test-Path $log) { Remove-Item $log -Force -ErrorAction SilentlyContinue }

$tunnelProc = Start-Process -FilePath (Join-Path $PSScriptRoot "cloudflared.exe") -ArgumentList "tunnel --url http://127.0.0.1:8000 --logfile `"$log`"" -PassThru -WindowStyle Hidden

$url = $null
$attempts = 0
while ($attempts -lt 30 -and -not $url) {
    Start-Sleep -Milliseconds 500
    if (Test-Path $log) {
        $content = Get-Content $log -Raw -ErrorAction SilentlyContinue
        if ($content -match 'https://[a-zA-Z0-9-]+\.trycloudflare\.com') {
            $url = $Matches[0]
        }
    }
    $attempts++
}

try {
    if ($url) {
        Set-Clipboard $url
        Write-Host ""
        Write-Host "======================================================================" -ForegroundColor Green
        Write-Host "  SUCCESS! YOUR LIVE LINK IS READY:" -ForegroundColor Green
        Write-Host ""
        Write-Host "  $url" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  [+] Automatically copied to your clipboard! (Press Ctrl+V to paste)" -ForegroundColor Cyan
        Write-Host "  [+] Opening link in your browser now..." -ForegroundColor Cyan
        Write-Host "  [+] Send this EXACT link to other devices to open your project!" -ForegroundColor White
        Write-Host "======================================================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Keep this window open while sharing. Close this window to stop the server." -ForegroundColor Gray
        Start-Process $url
        Wait-Process -Id $tunnelProc.Id
    } else {
        Write-Host "Could not retrieve tunnel URL. Please check your internet connection." -ForegroundColor Red
        pause
    }
} finally {
    if ($tunnelProc -and -not $tunnelProc.HasExited) {
        Stop-Process -Id $tunnelProc.Id -Force -ErrorAction SilentlyContinue
    }
}
