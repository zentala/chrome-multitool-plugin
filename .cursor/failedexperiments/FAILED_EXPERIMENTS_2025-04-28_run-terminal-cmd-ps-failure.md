# Failed Experiments Log

## 2025-04-28 — Automatyzacja skryptów PowerShell za pomocą `run_terminal_cmd`

- **What we tried:** Próbowaliśmy użyć narzędzia AI Cursora `run_terminal_cmd` do automatycznego uruchamiania skryptów PowerShell `.ps1` (np. `gen-meta.ps1`, `gen-cursor-doc.ps1`) w środowisku Windows z PowerShell 7.5.1.
    - Konfigurowano profil terminala w `.vscode/settings.json` (wskazując ścieżkę do `pwsh.exe`, dodając flagę `-NoProfile`).
    - Modyfikowano skrypty `.ps1`, dodając `Remove-Module PSReadLine` na początku.
    - Używano prefiksu `Remove-Module PSReadLine;` przed poleceniem w `run_terminal_cmd`.
    - Próbowano uruchamiać skrypty `.ps1` przez `cmd.exe` za pomocą `pwsh -Command "..."` oraz `pwsh -Command "& {...}"`.

- **Why we thought it might work:** Zakładano, że narzędzie `run_terminal_cmd` będzie działać jak standardowy terminal zintegrowany, respektując konfigurację profilu lub że uda się obejść problemy z `PSReadLine` poprzez jego usunięcie lub zmianę sposobu wywołania.

- **Why it failed:** Środowisko terminala `run_terminal_cmd` w Cursorze na Windows okazało się fundamentalnie niestabilne w połączeniu z PowerShell 7.5.1 i `PSReadLine 2.3.6`. 
    - Ignorowało ustawienia profilu (w tym `-NoProfile`).
    - Generowało błędy `PSReadLine` (`IndexOutOfRangeException`, `ArgumentOutOfRangeException`) nawet po próbach usunięcia modułu lub wywołaniu przez `cmd.exe`.
    - Po wyłączeniu `oh-my-posh` w profilu użytkownika (co rozwiązało problemy w zewnętrznym terminalu), `run_terminal_cmd` zaczęło zwracać absurdalny błąd `param is not recognized`, wskazując na dalszą niestabilność środowiska.

- **What we learned:** Narzędzie `run_terminal_cmd` w obecnej wersji Cursora **nie nadaje się** do niezawodnego uruchamiania skryptów PowerShell `.ps1` w środowisku Windows z aktywnym `PSReadLine`. Wszelkie próby automatyzacji tych skryptów za pomocą AI muszą zostać porzucone na rzecz innych metod (np. ręczne uruchamianie, przepisanie logiki na Node.js, bezpośrednia edycja plików przez AI). Problem został udokumentowany w `.cursor/PWSH_ISSUES.md`. 