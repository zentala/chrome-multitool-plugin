#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Commit with skipping pre-commit hooks
.DESCRIPTION
    Allows committing changes while bypassing pre-commit checks (tests and linting)
.PARAMETER Message
    Commit message
.PARAMETER AddAll
    Add all changes before committing
.EXAMPLE
    .\scripts\skip-commit.ps1 -Message "fix: urgent hotfix" -AddAll
.EXAMPLE
    .\scripts\skip-commit.ps1 "feat: new feature"
#>

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$Message,

    [Parameter()]
    [switch]$AddAll
)

# Add all changes if requested
if ($AddAll) {
    git add .
    Write-Host "📁 Added all changes to staging" -ForegroundColor Green
}

# Check if there are staged changes
$stagedChanges = git diff --cached --name-only
if (-not $stagedChanges) {
    Write-Host "⚠️  No staged changes found. Use -AddAll to add all changes." -ForegroundColor Yellow
    exit 1
}

# Commit with skip flag
git commit -m "$Message [skip ci]"
Write-Host "✅ Committed with pre-commit checks skipped" -ForegroundColor Green
Write-Host "💡 Use 'git log --oneline -1' to verify the skip flag" -ForegroundColor Cyan
