param(
  [string]$AlphaMinerDir = "C:\Users\kee\Downloads\AlphaMiner-Pearl-Windows",
  [string]$LolMinerDir = "C:\Users\kee\Downloads\lolMiner_v1.98_Win64\1.98",
  [string]$AlphaMinerUrl = "https://pearl.alphapool.tech/downloads/alpha-miner-windows.exe",
  [string]$LolMinerUrl = "https://github.com/Lolliedieb/lolMiner-releases/releases/download/1.98/lolMiner_v1.98_Win64.zip",
  [switch]$SkipDownload
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$DownloadRoot = Join-Path $Root ".downloads\miners"
New-Item -ItemType Directory -Force -Path $DownloadRoot | Out-Null

function Get-FileOrDownload {
  param(
    [string]$Path,
    [string]$Url,
    [string]$TargetFile
  )

  if (Test-Path $Path) {
    return $Path
  }

  if ($SkipDownload) {
    throw "Missing required miner file and download is disabled: $Path"
  }

  $TargetPath = Join-Path $DownloadRoot $TargetFile
  Write-Host "Downloading $Url"
  Invoke-WebRequest -Uri $Url -OutFile $TargetPath
  return $TargetPath
}

function Expand-LolMinerArchive {
  param([string]$ArchivePath)

  $ExpandDir = Join-Path $DownloadRoot "lolMiner_v1.98_Win64"
  if (Test-Path $ExpandDir) {
    Remove-Item -LiteralPath $ExpandDir -Recurse -Force
  }
  New-Item -ItemType Directory -Force -Path $ExpandDir | Out-Null
  Expand-Archive -LiteralPath $ArchivePath -DestinationPath $ExpandDir -Force

  $Exe = Get-ChildItem -LiteralPath $ExpandDir -Recurse -Filter "lolMiner.exe" | Select-Object -First 1
  if (-not $Exe) {
    throw "Downloaded lolMiner archive does not contain lolMiner.exe"
  }
  return $Exe.DirectoryName
}

function Find-RuntimeDll {
  param(
    [string]$Name,
    [string[]]$PreferredDirs = @()
  )

  foreach ($Dir in $PreferredDirs) {
    if (-not $Dir) { continue }
    $Candidate = Join-Path $Dir $Name
    if (Test-Path $Candidate) {
      return $Candidate
    }
  }

  foreach ($Dir in @("$env:WINDIR\System32", "$env:WINDIR\Sysnative", "$env:WINDIR\SysWOW64")) {
    $Candidate = Join-Path $Dir $Name
    if (Test-Path $Candidate) {
      return $Candidate
    }
  }

  throw "Missing runtime DLL: $Name. Install Microsoft Visual C++ Runtime or provide it beside the miner binaries."
}

function Copy-RuntimeDll {
  param(
    [string]$Name,
    [string[]]$PreferredDirs,
    [string[]]$Targets
  )

  $Source = Find-RuntimeDll -Name $Name -PreferredDirs $PreferredDirs
  foreach ($Target in $Targets) {
    Copy-Item -LiteralPath $Source -Destination (Join-Path $Target $Name) -Force
  }
}

$AlphaExe = Join-Path $AlphaMinerDir "alpha-miner-windows.exe"
$LolExe = Join-Path $LolMinerDir "lolMiner.exe"
$LolDll = Join-Path $LolMinerDir "msvcp140.dll"

$AlphaExe = Get-FileOrDownload -Path $AlphaExe -Url $AlphaMinerUrl -TargetFile "alpha-miner-windows.exe"

if (-not (Test-Path $LolExe)) {
  if ($SkipDownload) {
    throw "Missing required miner file: $LolExe"
  }
  $LolArchive = Get-FileOrDownload -Path (Join-Path $DownloadRoot "lolMiner_v1.98_Win64.zip") -Url $LolMinerUrl -TargetFile "lolMiner_v1.98_Win64.zip"
  $LolMinerDir = Expand-LolMinerArchive -ArchivePath $LolArchive
  $LolExe = Join-Path $LolMinerDir "lolMiner.exe"
  $LolDll = Join-Path $LolMinerDir "msvcp140.dll"
}

foreach ($RequiredPath in @($AlphaExe, $LolExe, $LolDll)) {
  if (-not (Test-Path $RequiredPath)) {
    throw "Missing required miner file: $RequiredPath"
  }
}

$AlphaTarget = Join-Path $Root "apps\desktop\electron\miners\alpha-miner"
$LolTarget = Join-Path $Root "apps\desktop\electron\miners\lolminer"
New-Item -ItemType Directory -Force -Path $AlphaTarget, $LolTarget | Out-Null

Copy-Item -LiteralPath $AlphaExe -Destination (Join-Path $AlphaTarget "alpha-miner-windows.exe") -Force
Copy-Item -LiteralPath $LolExe -Destination (Join-Path $LolTarget "lolMiner.exe") -Force
Copy-Item -LiteralPath $LolDll -Destination (Join-Path $LolTarget "msvcp140.dll") -Force

foreach ($RuntimeDll in "msvcp140.dll", "vcruntime140.dll", "vcruntime140_1.dll") {
  Copy-RuntimeDll -Name $RuntimeDll -PreferredDirs @($LolMinerDir, $AlphaMinerDir) -Targets @($AlphaTarget, $LolTarget)
}

foreach ($Optional in "license.txt", "readme.txt") {
  $Source = Join-Path $LolMinerDir $Optional
  if (Test-Path $Source) {
    Copy-Item -LiteralPath $Source -Destination (Join-Path $LolTarget $Optional) -Force
  }
}

Write-Host "Imported alpha-miner to $AlphaTarget"
Write-Host "Imported lolMiner to $LolTarget"
