# scripts/gen-meta.ps1

param(
    [Parameter(Mandatory=$true)]
    [string]$TargetFolder
)

# Resolve paths using $PSScriptRoot for script location
$ScriptRoot = $PSScriptRoot
# Project root is two levels up from .cursor/scripts/
$CursorDir = Split-Path -Path $ScriptRoot -Parent
$ProjectRoot = Split-Path -Path $CursorDir -Parent

if (-not $ProjectRoot) {
    Write-Error "Could not determine project root from script path: $ScriptRoot"
    exit 1
}

$TemplatePath = Join-Path $ProjectRoot ".cursor\TEMPLATES\FOLDER_META_TEMPLATE.md"
$MetaFilePath = Join-Path $ProjectRoot $TargetFolder ".meta.md"

# Check existence
if (Test-Path $MetaFilePath) {
    Write-Warning "File already exists: $MetaFilePath"
    # Exit with non-zero code to indicate failure
    exit 1
}

# Ensure target directory exists
$TargetDirFullPath = Join-Path $ProjectRoot $TargetFolder
if (-not (Test-Path $TargetDirFullPath -PathType Container)) {
    Write-Error "Target folder does not exist: $TargetDirFullPath"
    exit 1
}

# Copy template
try {
    Copy-Item -Path $TemplatePath -Destination $MetaFilePath -Force -ErrorAction Stop
    Write-Host "✅ .meta.md created successfully at $MetaFilePath"
} catch {
    Write-Error "Failed to create .meta.md at $MetaFilePath. Error: $($_.Exception.Message)"
    exit 1
}
