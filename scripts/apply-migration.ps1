# Applies a supabase/migrations/*.sql file to the remote database.
#
# Usage:
#   cd c:\src\wtva-web-admin
#   .\scripts\apply-migration.ps1 -Migration 010
#   .\scripts\apply-migration.ps1 -Migration 010 -DbPassword 'your-db-password'
#
# Password: Supabase Dashboard -> Settings -> Database -> Database password

param(
    [Parameter(Mandatory = $true)]
    [string]$Migration,
    [string]$DbPassword,
    [string]$ProjectRef = "wabtknktqnrxnffkgpzh",
    [switch]$ClipboardOnly
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path $PSScriptRoot -Parent
$sqlFile = Join-Path $repoRoot "supabase\migrations\${Migration}_*.sql"
$resolved = Get-ChildItem -Path $sqlFile -ErrorAction SilentlyContinue | Select-Object -First 1

if (-not $resolved) {
    Write-Error "Migration file not found for prefix: $Migration (expected supabase/migrations/${Migration}_*.sql)"
}

if ($ClipboardOnly) {
    Get-Content $resolved.FullName -Raw | Set-Clipboard
    Start-Process "https://supabase.com/dashboard/project/$ProjectRef/sql/new"
    Write-Host "SQL copied to clipboard. Opened Supabase SQL Editor — paste (Ctrl+V) and click Run."
    exit 0
}

if (-not $DbPassword) {
    $DbPassword = $env:SUPABASE_DB_PASSWORD
}

if (-not $DbPassword) {
    Write-Error "Missing database password. Pass -DbPassword or set SUPABASE_DB_PASSWORD."
}

$encoded = [uri]::EscapeDataString($DbPassword)
$dbUrl = "postgresql://postgres:${encoded}@db.${ProjectRef}.supabase.co:5432/postgres"

Write-Host "Applying $($resolved.Name) to project $ProjectRef ..."
Write-Host ""

Push-Location $repoRoot
try {
    npx --yes supabase@latest db query --db-url $dbUrl -f $resolved.FullName
    if ($LASTEXITCODE -ne 0) {
        throw "Migration failed (exit $LASTEXITCODE). Check password and network."
    }
    Write-Host ""
    Write-Host "Migration applied successfully."
}
finally {
    Pop-Location
}
