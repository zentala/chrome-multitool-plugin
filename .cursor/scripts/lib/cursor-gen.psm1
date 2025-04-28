# .cursor/scripts/lib/cursor-gen.psm1

# Common functions for documentation generation scripts

function Get-ProjectRoot {
    param (
        [string]$ScriptPath = $PSScriptRoot
    )
    # Go up from the script path until we find the '.cursor' directory
    $CurrentPath = $ScriptPath
    while ($CurrentPath -ne $null -and (Split-Path $CurrentPath -Leaf) -ne '.cursor') {
        $CurrentPath = Split-Path $CurrentPath -Parent
    }

    if ($CurrentPath -ne $null -and (Split-Path $CurrentPath -Leaf) -eq '.cursor') {
        # If .cursor directory is found, its parent is the project root
        $ProjectRootPath = Split-Path $CurrentPath -Parent
        # Basic check if it looks like a project root (e.g., contains package.json)
        if (Test-Path (Join-Path $ProjectRootPath 'package.json')) {
             return $ProjectRootPath
        } else {
            Write-Warning "Found '.cursor' directory at '$CurrentPath', but parent '$ProjectRootPath' doesn't seem to be project root (missing package.json)."
            # Fallback to parent anyway, maybe package.json is missing
            return $ProjectRootPath
        }
    } else {
        # Fallback: If .cursor is not found by going up, check if $ScriptPath is already inside .cursor (e.g. running a script directly)
        # Or maybe we are running from the project root itself.
        $PotentialProjectRoot = $PWD.Path # Assume current working directory
        if (Test-Path (Join-Path $PotentialProjectRoot '.cursor') -PathType Container -and Test-Path (Join-Path $PotentialProjectRoot 'package.json')) {
             Write-Verbose "Could not find '.cursor' by traversing up from '$ScriptPath'. Assuming current directory '$PotentialProjectRoot' is project root."
             return $PotentialProjectRoot
        }

        Write-Error "Could not determine project root. Neither found '.cursor' directory by traversing up from '$ScriptPath', nor does the current directory '$($PWD.Path)' seem to be the project root."
        return $null
    }
}

function Get-DatedFilename {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Title,
        [Parameter(Mandatory=$false)]
        [string]$Prefix = (Get-Date -Format 'yyyy-MM-dd'),
        [Parameter(Mandatory=$false)]
        [string]$Extension = '.md'
    )
    # Sanitize title to be filename-friendly
    $SanitizedTitle = $Title -replace '[^a-zA-Z0-9_-]+', '-' -replace '-+', '-' -replace '^-|-$', ''
    return "$($Prefix)-$($SanitizedTitle)$($Extension)"
}

function Get-WeeklyFilename {
    param(
        [Parameter(Mandatory=$false)]
        [string]$Prefix = (Get-Date -Format 'yyyy-WW'), # Year-WeekNumber
        [Parameter(Mandatory=$false)]
        [string]$Extension = '.md'
    )
    return "$($Prefix)$($Extension)"
}


function Copy-Template {
    param(
        [Parameter(Mandatory=$true)]
        [string]$TemplateName, # e.g., 'DECISION_TEMPLATE.md'
        [Parameter(Mandatory=$true)]
        [string]$DestinationPath,
        [Parameter(Mandatory=$true)]
        [string]$ProjectRoot
    )

    $TemplatePath = Join-Path $ProjectRoot ".cursor\TEMPLATES\$TemplateName"

    if (-not (Test-Path $TemplatePath)) {
        Write-Error "Template file not found: $TemplatePath"
        return $false
    }

    # Ensure destination directory exists
    $DestinationDir = Split-Path $DestinationPath -Parent
    if (-not (Test-Path $DestinationDir -PathType Container)) {
        try {
            New-Item -Path $DestinationDir -ItemType Directory -Force -ErrorAction Stop | Out-Null
            Write-Verbose "Created directory: $DestinationDir"
        } catch {
            Write-Error "Failed to create destination directory '$DestinationDir'. Error: $($_.Exception.Message)"
            return $false
        }
    }

    # Check if destination file exists
    if (Test-Path $DestinationPath) {
        Write-Warning "Destination file already exists: $DestinationPath"
        # In this shared function, we treat existing file as a failure condition for the caller to decide.
        return $false
    }

    try {
        Copy-Item -Path $TemplatePath -Destination $DestinationPath -Force -ErrorAction Stop
        Write-Verbose "Template '$TemplateName' copied successfully to '$DestinationPath'"
        return $true
    } catch {
        Write-Error "Failed to copy template '$TemplateName' to '$DestinationPath'. Error: $($_.Exception.Message)"
        return $false
    }
}

# Export functions to be used by other scripts
Export-ModuleMember -Function Get-ProjectRoot, Get-DatedFilename, Get-WeeklyFilename, Copy-Template
