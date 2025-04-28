# PowerShell (pwsh) Issues Log

Lista zidentyfikowanych problemów i błędów napotkanych podczas używania PowerShell (pwsh) w tym projekcie, szczególnie w środowisku Cursor.

**Plan rozwiązania problemów:** Zobacz [.cursor/TODO_PSReadLine_Troubleshooting.md](.cursor/TODO_PSReadLine_Troubleshooting.md)

## Problem with `git commit -m "..."`

- **Date:** 2024-08-23
- **Command:** `git commit -m "<commit message>"`
- **Environment:** PowerShell 7.4.7 on Windows 11 (OS Build 26100), PSReadLine 2.3.6, within Cursor environment.
- **Observed Behavior:**
    - Executing `git commit -m` with both long multi-line messages (using `-m` multiple times or embedding newlines - which is invalid syntax, corrected later) and short single-line messages triggers console rendering errors.
    - Errors observed:
        - `System.IndexOutOfRangeException: Index was outside the bounds of the array.` in `PSConsoleReadLine.ConvertOffsetToPoint`.
        - `System.InvalidOperationException: Cannot locate the offset in the rendered text...` in `PSConsoleReadLine.RecomputeInitialCoords`.
- **Hypothesis:** An issue with `PSReadLine` rendering logic when processing the output or arguments of the `git commit` command, potentially exacerbated by the terminal emulator or interaction within the Cursor environment. The issue occurred even after correcting the commit message format.
- **Workaround/Recommendation:**
    - Use extremely short commit messages with `-m`.
    - Execute `git commit` without `-m` to open the default Git editor (less ideal for automation/scripting).
    - Investigate potential updates to `PSReadLine` or alternative terminal configurations if the issue persists. 

## `q^C: q: The term 'q' is not recognized as a name of a cmdlet`

```powershell
q: The term 'q' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
```

╭─   Lenovo  ~  code  chrome-multitool-plugin   main ↑10   ?12 ~3   93ms   23:05:47 
╰─ $

## IndexOutOfRangeException during script execution (`gen-meta.ps1`)

- **Date:** 2024-08-27
- **Command:** `.\.cursor\scripts\gen-meta.ps1 "src/utils"`
- **Environment:** PowerShell 7.4.7 on Windows 11 (OS Build 26100), PSReadLine 2.3.6, within Cursor environment.
- **Observed Behavior:**
    - Executing the script directly resulted in `System.IndexOutOfRangeException: Index was outside the bounds of the array.` originating from `PSConsoleReadLine.ConvertOffsetToPoint`.
    - This is similar to the errors observed with `git commit -m`.
- **Workaround Attempted:** Running the command prefixed with `Remove-Module PSReadLine;`.

## ArgumentOutOfRangeException during script execution (`gen-cursor-doc.ps1`)

- **Date:** 2024-08-27
- **Command:** `.\.cursor\scripts\gen-cursor-doc.ps1 -Type "failed-experiment" -Title "test-eksperymentu"`
- **Environment:** PowerShell 7.4.7 on Windows 11 (OS Build 26100), PSReadLine 2.3.6, within Cursor environment.
- **Observed Behavior:**
    - Executing the script directly resulted in `System.ArgumentOutOfRangeException: The value must be greater than or equal to zero and less than the console's buffer size in that dimension. (Parameter 'top')` originating from `System.ConsolePal.SetCursorPosition` called by `PSConsoleReadLine`.
- **Workaround Attempted:** Retry with `Remove-Module PSReadLine;` prefix.

## Issues with renaming directories containing hyphens

- **Date:** 2024-08-27
- **Command:** `Rename-Item -Path .\.cursor\failed-experiments -NewName failedexperiments` (also tried with `Remove-Module PSReadLine;`)
- **Environment:** PowerShell 7.4.7 on Windows 11 (OS Build 26100), PSReadLine 2.3.6, within Cursor environment.
- **Observed Behavior:**
    - Both attempts (with and without `Remove-Module`) resulted in PSReadLine errors (`ArgumentOutOfRangeException` or `IndexOutOfRangeException`).
    - The directory renaming failed.
- **Conclusion:** PSReadLine errors might be triggered by operations involving paths with hyphens in this specific environment, preventing reliable scripting for such paths.

## Problem: Błędy PSReadLine (IndexOutOfRangeException, ArgumentOutOfRangeException) w terminalu Cursora

**Data:** 2025-04-28

**Problem:**
Podczas używania terminala `pwsh` zintegrowanego z Cursorem, z aktywnym modułem `oh-my-posh`, występowały częste błędy `PSReadLine`, takie jak `IndexOutOfRangeException` i `ArgumentOutOfRangeException`. Błędy pojawiały się podczas wykonywania różnych poleceń, w tym skryptów PowerShell (np. generujących dokumentację), `git commit`, a nawet prostych poleceń jak `pwsh --version` czy `winget`.

**Środowisko:**
- OS: Windows 11
- PowerShell: Początkowo 7.4.x, później zaktualizowany do 7.5.1
- PSReadLine: 2.3.6
- oh-my-posh: Wersja przed 25.19.0, później zaktualizowana do 25.19.0
- Inne moduły w profilu: `posh-git`, `Terminal-Icons`, `ZLocation`
- Terminal: Zintegrowany terminal Cursora

**Diagnoza:**
- Problem **nie występował** podczas uruchamiania tych samych poleceń w standardowym terminalu `pwsh` poza Cursorem.
- Problem **nie występował** w terminalu Cursora po tymczasowym wyłączeniu (zakomentowaniu) inicjalizacji `