param(
  [switch]$NoInstall
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$NodeDir = Join-Path $Root ".tools\node"
$Npm = Join-Path $NodeDir "npm.cmd"
$Node = Join-Path $NodeDir "node.exe"
$ElectronDir = Join-Path $Root ".tools\electron"
$Electron = Join-Path $ElectronDir "electron.exe"
$LogDir = Join-Path $Root ".tools\logs"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

if (-not (Test-Path $Npm)) {
  throw "Portable Node is missing. Run .\scripts\dev.ps1 install after restoring .tools/node, or install Node.js LTS."
}

$env:PATH = "$NodeDir;$env:PATH"

if (-not $NoInstall -and -not (Test-Path "node_modules")) {
  & $Npm install
}

function Ensure-ElectronRuntime {
  if (Test-Path $Electron) {
    return
  }

  $Version = & $Node -e "try { console.log(require('./node_modules/electron/package.json').version) } catch { const p=require('./package.json'); console.log((p.devDependencies.electron || p.dependencies.electron).replace(/^[^0-9]*/, '')) }"
  $ZipUrl = "https://npmmirror.com/mirrors/electron/$Version/electron-v$Version-win32-x64.zip"
  $ZipPath = Join-Path $Root ".tools\electron-v$Version-win32-x64.zip"

  Remove-Item -LiteralPath $ElectronDir -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $ZipPath) | Out-Null
  Invoke-WebRequest $ZipUrl -OutFile $ZipPath
  if ((Get-Item $ZipPath).Length -lt 50000000) {
    throw "Downloaded Electron runtime is unexpectedly small."
  }
  Expand-Archive $ZipPath -DestinationPath $ElectronDir -Force
  Remove-Item -LiteralPath $ZipPath -Force
}

function Test-Port($Port) {
  return [bool](Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
}

function Start-NpmTask($Name, $Task) {
  $Out = Join-Path $LogDir "$Name.out.log"
  $Err = Join-Path $LogDir "$Name.err.log"
  return Start-Process -FilePath $Npm -ArgumentList @("run", $Task) -WorkingDirectory $Root -PassThru -WindowStyle Hidden -RedirectStandardOutput $Out -RedirectStandardError $Err
}

function Wait-Url($Url) {
  for ($i = 0; $i -lt 30; $i++) {
    try {
      Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 | Out-Null
      return
    } catch {
      Start-Sleep -Seconds 1
    }
  }
  throw "Timed out waiting for $Url"
}

Ensure-ElectronRuntime

$Started = @()
if (-not (Test-Port 8787)) {
  $Started += [pscustomobject]@{ name = "api"; pid = (Start-NpmTask "api" "dev:api").Id; url = "http://127.0.0.1:8787/health" }
}
if (-not (Test-Port 5173)) {
  $Started += [pscustomobject]@{ name = "desktop-web"; pid = (Start-NpmTask "desktop-web" "dev:desktop").Id; url = "http://127.0.0.1:5173" }
}

Wait-Url "http://127.0.0.1:8787/health"
Wait-Url "http://127.0.0.1:5173"

$env:DESKTOP_DEV_URL = "http://127.0.0.1:5173"
$ElectronProcess = Start-Process -FilePath $Electron -ArgumentList @("apps/desktop/electron/main.js") -WorkingDirectory $Root -PassThru -RedirectStandardOutput (Join-Path $LogDir "electron-portable.out.log") -RedirectStandardError (Join-Path $LogDir "electron-portable.err.log")
$Started += [pscustomobject]@{ name = "electron"; pid = $ElectronProcess.Id; url = "app://星火 AI" }

$PidFile = Join-Path $Root ".tools\dev-pids.json"
$Existing = @()
if (Test-Path $PidFile) {
  $Existing = @(Get-Content $PidFile | ConvertFrom-Json)
}
@($Existing + $Started) | ConvertTo-Json | Set-Content -Path $PidFile

Write-Host "星火 AI Electron dev app is running."
Write-Host "Desktop web: http://127.0.0.1:5173"
Write-Host "API:         http://127.0.0.1:8787/health"
