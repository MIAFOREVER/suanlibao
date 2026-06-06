$ErrorActionPreference = "SilentlyContinue"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$PidFile = Join-Path $Root ".tools\dev-pids.json"

if (-not (Test-Path $PidFile)) {
  Write-Host "No dev pid file found."
  exit
}

$Pids = Get-Content $PidFile | ConvertFrom-Json
foreach ($Item in $Pids) {
  Stop-Process -Id $Item.pid -Force
  Write-Host "Stopped $($Item.name) pid=$($Item.pid)"
}

Remove-Item -LiteralPath $PidFile -Force
