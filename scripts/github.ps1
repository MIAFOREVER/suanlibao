param(
  [string]$Repo = "suanlibao-lite",
  [string]$Owner = "",
  [switch]$Private = $true,
  [string]$RemoteUrl = ""
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$PortableGit = Join-Path $Root ".tools\git\cmd\git.exe"
$Git = if (Test-Path $PortableGit) { $PortableGit } else { "git" }

if ($RemoteUrl) {
  & $Git remote remove origin 2>$null
  & $Git remote add origin $RemoteUrl
  & $Git push -u origin main
  exit
}

$Gh = Get-Command gh -ErrorAction SilentlyContinue
if (-not $Gh) {
  Write-Host "GitHub CLI is not installed or not in PATH."
  Write-Host "Install it, run: gh auth login"
  Write-Host "Then run: .\scripts\github.ps1 -Owner YOUR_GITHUB_NAME -Repo $Repo"
  exit 1
}

$Visibility = if ($Private) { "--private" } else { "--public" }
$FullName = if ($Owner) { "$Owner/$Repo" } else { $Repo }

& gh repo create $FullName $Visibility --source . --remote origin --push
