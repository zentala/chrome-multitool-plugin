# .cursor/scripts/gen-cursor-doc.ps1

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('decision', 'mood', 'error', 'failed-experiment')]
    [string]$Type,

    [Parameter(Mandatory=$true)]
    [string]$Title
)

# Import shared functions
$LibPath = Join-Path $PSScriptRoot "lib\cursor-gen.psm1"
try {
    Import-Module $LibPath -Force -ErrorAction Stop
} catch {
    Write-Error "Failed to import shared module from '$LibPath'. Error: $($_.Exception.Message)"
    exit 1
}

# Get Project Root using the shared function
$ProjectRoot = Get-ProjectRoot -ScriptPath $PSScriptRoot
if (-not $ProjectRoot) {
    exit 1 # Error already written by Get-ProjectRoot
}

# Determine target directory and template based on type
$TargetSubDir = $null
$TemplateName = $null
$Filename = $null

switch ($Type) {
    'decision' {
        $TargetSubDir = 'decisions'
        $TemplateName = 'DECISION_TEMPLATE.md'
        $Filename = Get-DatedFilename -Title $Title
    }
    'mood' {
        $TargetSubDir = 'mood'
        $TemplateName = 'DEV_MOOD_ENTRY_TEMPLATE.md'
        # Title for mood is typically the week identifier itself, e.g., 'week-17-2025'
        # We will use a weekly filename generator
        $Filename = Get-WeeklyFilename -Prefix $Title # Expecting Title like 'YYYY-WW'
        # Basic validation for mood title format
        if ($Title -notmatch '^\d{4}-([0-4]\d|5[0-3])$') {
            Write-Warning "Expected mood title format 'YYYY-WW' (e.g., '2025-17'), but got '$Title'. Using it anyway for filename: $Filename"
        }
    }
    'error' {
        $TargetSubDir = 'errors'
        $TemplateName = 'ERROR_TEMPLATE.md'
        $Filename = Get-DatedFilename -Title $Title
    }
    'failed-experiment' {
        $TargetSubDir = 'failedexperiments'
        $TemplateName = 'FAILED_EXPERIMENT_TEMPLATE.md'
        $Filename = Get-DatedFilename -Title $Title
    }
    default {
        # Should not happen due to ValidateSet, but good practice
        Write-Error "Invalid type '$Type' specified."
        exit 1
    }
}

# Construct full destination path
$DestinationPath = Join-Path $ProjectRoot ".cursor\$TargetSubDir\$Filename"

# Use shared function to copy the template
if (Copy-Template -TemplateName $TemplateName -DestinationPath $DestinationPath -ProjectRoot $ProjectRoot) {
    Write-Host "✅ $Type document created successfully at $DestinationPath"
} else {
    # Error/Warning already written by Copy-Template
    exit 1
} 