# Run on your Windows laptop to set up (or update) the server in one go:
#   powershell -ExecutionPolicy Bypass -File deploy\deploy.ps1 -ServerIp 1.2.3.4 -KeyPath C:\Users\you\Downloads\ssh-key.key
# It fixes the key's file permissions (OpenSSH refuses keys others can read), uploads
# deploy/server-setup.sh and runs it interactively on the server.
param(
  [Parameter(Mandatory = $true)][string]$ServerIp,
  [Parameter(Mandatory = $true)][string]$KeyPath,
  [string]$User = "ubuntu"
)
$ErrorActionPreference = "Stop"

if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
  Write-Host "OpenSSH is missing. Install it: Settings > System > Optional features > OpenSSH Client" -ForegroundColor Yellow
  exit 1
}
if (-not (Test-Path $KeyPath)) { Write-Host "Key file not found: $KeyPath" -ForegroundColor Yellow; exit 1 }

# Only you may read the private key.
icacls $KeyPath /inheritance:r | Out-Null
icacls $KeyPath /grant:r "$($env:USERNAME):(R)" | Out-Null

$script = Join-Path $PSScriptRoot "server-setup.sh"
Write-Host "==> Uploading the setup script to $User@$ServerIp" -ForegroundColor Green
scp -i $KeyPath -o StrictHostKeyChecking=accept-new $script "$($User)@$($ServerIp):~/server-setup.sh"
if ($LASTEXITCODE -ne 0) { Write-Host "Upload failed. Check the IP address, the key and that the server is running." -ForegroundColor Yellow; exit 1 }

Write-Host "==> Running it on the server (answer the questions; the first run takes about 20 minutes)" -ForegroundColor Green
ssh -t -i $KeyPath "$($User)@$($ServerIp)" "sed -i 's/\r$//' ~/server-setup.sh && bash ~/server-setup.sh"
