<#
.SYNOPSIS
Copies the newest server backup (Mongo archive + bucket) and the server's .env.prod to this Windows machine.

.EXAMPLE
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ops\pull-server-backup.ps1 -Server 203.0.113.10 -KeyPath $HOME\.ssh\id_ed25519 -Destination D:\Backups\under30ss-server
#>
param(
  [Parameter(Mandatory = $true)][string]$Server,
  [Parameter(Mandatory = $true)][string]$KeyPath,
  [Parameter(Mandatory = $true)][string]$Destination,
  [string]$User = 'root',
  [int]$Port = 22,
  [int]$KeepCount = 30,
  [string]$RemoteBackupDir = '/var/backups/under30ss',
  [string]$RemoteEnvFile = '/opt/under30ss/.env.prod'
)

$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $Destination | Out-Null
$logFile = Join-Path $Destination 'pull-server-backup.log'

function Write-Log([string]$message) {
  $line = '{0} {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $message
  Add-Content -Path $logFile -Value $line -Encoding utf8
  Write-Output $line
}

# Host key must already be in known_hosts: a changed key aborts instead of trusting a possible impostor.
$commonOptions = @('-i', $KeyPath, '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=20')
$sshArgs = $commonOptions + @('-p', $Port)
$scpArgs = $commonOptions + @('-P', $Port)
$target = "$User@$Server"

function Invoke-Remote([string]$command) {
  $output = & ssh.exe @sshArgs $target $command 2>$null
  if ($LASTEXITCODE -ne 0) { throw "Remote command failed (exit $LASTEXITCODE): $command" }
  return $output
}

$remoteTar = $null
try {
  $packScript = "set -e; d=`$(ls -1d $RemoteBackupDir/2* | tail -1); f=`$(mktemp /tmp/u30-backup-XXXXXX); " +
    "tar czf `$f -C `$d . -C `$(dirname $RemoteEnvFile) `$(basename $RemoteEnvFile); echo `$(basename `$d) `$f"
  $packed = (Invoke-Remote $packScript | Select-Object -Last 1).Trim().Split(' ')
  $backupName, $remoteTar = $packed[0], $packed[1]

  $localFile = Join-Path $Destination "under30ss-$backupName.tar.gz"
  if (Test-Path $localFile) {
    Write-Log "Already have $backupName, skipped"
  } else {
    $partial = "$localFile.partial"
    & scp.exe @scpArgs "${target}:$remoteTar" $partial 2>$null
    if ($LASTEXITCODE -ne 0) { throw "scp failed (exit $LASTEXITCODE)" }
    $entries = & tar.exe -tzf $partial
    if ($LASTEXITCODE -ne 0 -or -not ($entries -match 'mongo\.archive\.gz') -or -not ($entries -match '\.env\.prod')) {
      throw "Downloaded archive is incomplete: $partial"
    }
    Move-Item -Force $partial $localFile
    Write-Log ("Saved {0} ({1:N1} MB)" -f $localFile, ((Get-Item $localFile).Length / 1MB))
  }

  Get-ChildItem -Path $Destination -Filter 'under30ss-*.tar.gz' | Sort-Object Name -Descending |
    Select-Object -Skip $KeepCount | ForEach-Object { Remove-Item -Force $_.FullName; Write-Log "Pruned $($_.Name)" }
} catch {
  Write-Log "ERROR: $($_.Exception.Message)"
  exit 1
} finally {
  if ($remoteTar) { & ssh.exe @sshArgs $target "rm -f '$remoteTar'" 2>$null | Out-Null }
}
