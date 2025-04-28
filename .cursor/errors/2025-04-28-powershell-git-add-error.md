# Errors and Issues Log

## [YYYY-MM-DD] — [Short Description]

- **Problem:**  
- **How discovered:**  
- **Solution/Workaround:**  
- **Notes for future:**  

# Error: powershell-git-add-error

**Date:** 2025-04-28

## Problem Description

Running `git add .` or `git add <list of files>` in PowerShell 7 (specifically version 7.5.1 on Windows 10.0.26100) using PSReadLine 2.3.6 causes a `System.ArgumentOutOfRangeException` related to `ConsolePal.SetCursorPosition`.

The error message indicates an issue with cursor positioning within the console buffer, potentially triggered by the output or interaction of `git add` with PSReadLine.

This prevents staging files for commit through the integrated terminal when using these commands directly.

## Error Log / Screenshot

```powershell
PS C:\Users\Lenovo\code\chrome-multitool-plugin> git add .
Oops, something went wrong.
Please report this bug with ALL the details below, including both the 'Environment' and 'Exception' sections.
Please report on GitHub: https://github.com/PowerShell/PSReadLine/issues/new?template=Bug_Report.yaml
Thank you!

### Environment
PSReadLine: 2.3.6+d2e770f93b7a53d8660a6402eb29d1ae1c35e767
PowerShell: 7.5.1
OS: Microsoft Windows 10.0.26100
BufferWidth: 101
BufferHeight: 1

Last 200 Keys:
...

### Exception

System.ArgumentOutOfRangeException: The value must be greater than or equal to zero and less than the console's buffer size in that dimension. (Parameter 'top')
Actual value was 5.
   at System.ConsolePal.SetCursorPosition(Int32 left, Int32 top)
   at Microsoft.PowerShell.PSConsoleReadLine.WriteBlankLines(Int32 top, Int32 count)
   at Microsoft.PowerShell.PSConsoleReadLine.PredictionInlineView.Clear(Boolean cursorAtEol)
   at Microsoft.PowerShell.PSConsoleReadLine.AcceptLineImpl(Boolean validate)
   at Microsoft.PowerShell.PSConsoleReadLine.AcceptLine(Nullable`1 key, Object arg)
   at Microsoft.PowerShell.PSConsoleReadLine.ProcessOneKey(PSKeyInfo key, Dictionary`2 dispatchTable, Boolean ignoreIfNoAction, Object arg)
   at Microsoft.PowerShell.PSConsoleReadLine.InputLoop()
   at Microsoft.PowerShell.PSConsoleReadLine.ReadLine(Runspace runspace, EngineIntrinsics engineIntrinsics, CancellationToken cancellationToken, Nullable`1 lastRunStatus)
```

## Workarounds That Work

*   Using a different terminal (like Git Bash or Command Prompt).
*   Using a GUI Git client (like GitKraken, Sourcetree, VS Code Source Control panel).
*   Potentially updating PSReadLine or PowerShell might resolve the issue (untested).

## Best Practices Recommended

*   Given the integration issue, using the VS Code Source Control panel for staging files might be the most reliable workaround within the editor environment.
*   Keep PowerShell and PSReadLine updated.
