# scripts/gen-usage.ps1

param(
    [Parameter(Mandatory=$true)]
    [string]$TargetFile
)

# Resolve paths using $PSScriptRoot
$ScriptRoot = $PSScriptRoot
# Project root is two levels up from .cursor/scripts/
$CursorDir = Split-Path -Path $ScriptRoot -Parent
$ProjectRoot = Split-Path -Path $CursorDir -Parent

if (-not $ProjectRoot) {
    Write-Error "Could not determine project root from script path: $ScriptRoot"
    exit 1
}

$TemplatePath = Join-Path $ProjectRoot ".cursor\TEMPLATES\MODULE_USAGE_TEMPLATE.md"

# Construct the full path for the target file and the usage file
$TargetFileFullPath = Join-Path $ProjectRoot $TargetFile
$UsageFilePath = "$TargetFileFullPath.usage.md"

# Check if target file exists
if (-not (Test-Path $TargetFileFullPath -PathType Leaf)) {
    Write-Error "Target file does not exist: $TargetFileFullPath"
    exit 1
}

# Check if usage file already exists
if (Test-Path $UsageFilePath) {
    Write-Warning "Usage file already exists: $UsageFilePath"
    exit 1
}

# Copy template
try {
    Copy-Item -Path $TemplatePath -Destination $UsageFilePath -Force -ErrorAction Stop
    Write-Host "✅ Usage file created successfully at $UsageFilePath"
} catch {
    Write-Error "Failed to create usage file at $UsageFilePath. Error: $($_.Exception.Message)"
    exit 1
}
