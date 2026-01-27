<#
.SYNOPSIS
  Inicia backend e frontend em janelas separadas no Windows.

  Uso: clique no arquivo start-all-windows.bat (recomendado) ou execute este script com PowerShell:
    powershell -NoProfile -ExecutionPolicy Bypass -File start-all-windows.ps1 [-Install]

  Opcional: -Install para rodar `npm install` em backend e frontend antes de iniciar.
#>

param(
  [switch]$Install
)

try {
  $root = Split-Path -Parent $MyInvocation.MyCommand.Definition
  # If root is a UNC path (starts with \\), map to a temporary PSDrive so cmd.exe can use it as working dir
  $tempDrive = $null
  if ($root -like '\\\\*') {
    $driveLetter = 'Z'
    # find an unused drive letter starting from Z backwards
    for ($c = [int][char]'Z'; $c -ge [int][char]'D'; $c--) {
      $letter = [char]$c
      if (-not (Get-PSDrive -Name $letter -ErrorAction SilentlyContinue)) {
        $driveLetter = $letter
        break
      }
    }
    $tempDriveName = "$driveLetter`$"
    New-PSDrive -Name $driveLetter -PSProvider FileSystem -Root $root -ErrorAction SilentlyContinue | Out-Null
    $tempDrive = $driveLetter
    $root = "$driveLetter:`"
  }
  $backend = Join-Path $root 'backend'
  $frontend = Join-Path $root 'frontend'

  if ($Install) {
    Write-Host 'Installing dependencies (backend)...'
    Push-Location $backend
    npm install
    Pop-Location

    Write-Host 'Installing dependencies (frontend)...'
    Push-Location $frontend
    npm install
    Pop-Location
  }

  Write-Host "Starting backend in new window (working dir: $backend)"
  $backArgs = "/k cd /d `"$backend`" && npm run dev"
  $backProc = Start-Process -FilePath 'cmd.exe' -ArgumentList $backArgs -WorkingDirectory $backend -PassThru

  Write-Host "Starting frontend in new window (working dir: $frontend)"
  $frontArgs = "/k cd /d `"$frontend`" && npm run dev"
  $frontProc = Start-Process -FilePath 'cmd.exe' -ArgumentList $frontArgs -WorkingDirectory $frontend -PassThru

  # Save PIDs so we can stop them later
  $backPidFile = Join-Path $root '.backend.pid'
  $frontPidFile = Join-Path $root '.frontend.pid'
  $startAllFile = Join-Path $root '.start-all-pids'

  $backProc.Id | Out-File -FilePath $backPidFile -Encoding ascii
  $frontProc.Id | Out-File -FilePath $frontPidFile -Encoding ascii
  @("backend=$($backProc.Id)", "frontend=$($frontProc.Id)") | Out-File -FilePath $startAllFile -Encoding ascii

  Write-Host "Started backend (PID $($backProc.Id)), frontend (PID $($frontProc.Id))."
  Write-Host "PID files written: $backPidFile, $frontPidFile"
  Write-Host "Close the opened windows to stop the servers, or run stop-all-windows.ps1"
} catch {
  Write-Error "Erro ao iniciar serviços: $_"
  exit 1
}
finally {
  if ($tempDrive) {
    try { Remove-PSDrive -Name $tempDrive -Force -ErrorAction SilentlyContinue } catch {}
  }
}
