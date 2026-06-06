param(
  [ValidateSet("install", "api", "desktop", "admin", "electron", "all")]
  [string]$Task = "all"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

function Resolve-Tool($Name, $PortablePath) {
  $Portable = Join-Path $Root $PortablePath
  if (Test-Path $Portable) {
    return $Portable
  }
  $Command = Get-Command $Name -ErrorAction SilentlyContinue
  if ($Command) {
    return $Command.Source
  }
  throw "$Name is not available. Run the portable Node bootstrap again or install Node.js LTS."
}

$Node = Resolve-Tool "node" ".tools\node\node.exe"
$Npm = Resolve-Tool "npm" ".tools\node\npm.cmd"
$env:PATH = "$(Split-Path -Parent $Node);$env:PATH"

if ($Task -eq "install") {
  & $Npm install
  exit
}

if (-not (Test-Path "node_modules")) {
  & $Npm install
}

switch ($Task) {
  "api" { & $Npm run dev:api }
  "desktop" { & $Npm run dev:desktop }
  "admin" { & $Npm run dev:admin }
  "electron" { & $Npm run electron }
  "all" { & $Npm run start:desktop }
}
