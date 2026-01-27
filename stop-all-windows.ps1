try {
  $root = Split-Path -Parent $MyInvocation.MyCommand.Definition
  $backPidFile = Join-Path $root '.backend.pid'
  $frontPidFile = Join-Path $root '.frontend.pid'
  $startAllFile = Join-Path $root '.start-all-pids'

  if (Test-Path $startAllFile) {
    Get-Content $startAllFile | ForEach-Object {
      if ($_ -match '^(.*?)=(\d+)$') {
        $name = $matches[1]
        $pid = [int]$matches[2]
        try { Stop-Process -Id $pid -ErrorAction SilentlyContinue } catch {}
      }
    }
    Remove-Item $startAllFile -ErrorAction SilentlyContinue
  }

  if (Test-Path $backPidFile) { Get-Content $backPidFile | ForEach-Object { try { Stop-Process -Id ([int]$_) -ErrorAction SilentlyContinue } catch {} } ; Remove-Item $backPidFile -ErrorAction SilentlyContinue }
  if (Test-Path $frontPidFile) { Get-Content $frontPidFile | ForEach-Object { try { Stop-Process -Id ([int]$_) -ErrorAction SilentlyContinue } catch {} } ; Remove-Item $frontPidFile -ErrorAction SilentlyContinue }

  Write-Host 'Stopped processes.'
} catch {
  Write-Error "Erro ao parar processos: $_"
  exit 1
}
