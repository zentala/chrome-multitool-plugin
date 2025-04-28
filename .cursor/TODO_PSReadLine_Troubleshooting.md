# TODO: Rozwiązywanie problemów z PSReadLine

Celem jest zidentyfikowanie przyczyny błędów `PSReadLine` (takich jak `IndexOutOfRangeException`, `ArgumentOutOfRangeException`) występujących podczas wykonywania skryptów PowerShell w środowisku Cursor i znalezienie rozwiązania lub stabilnego obejścia.

## Eksperymenty Diagnostyczne

- [x] **Sprawdzenie wersji:**
    - [x] Upewnij się, że używasz najnowszej stabilnej wersji PowerShell 7 (`pwsh --version`). (Wersja 7.4.7 - Wywołanie `pwsh --version` powoduje błąd PSReadLine, ale wersja jest widoczna w raporcie błędu).
    - [x] Upewnij się, że używasz najnowszej wersji `PSReadLine` (`Get-Module PSReadLine -ListAvailable`, `Update-Module PSReadLine`). (Wersja 2.3.6 - wydaje się najnowsza stabilna).
- [ ] **Test poza Cursorem:**
    - [ ] Uruchom problematyczne polecenia (np. `.\.cursor\scripts\gen-cursor-doc.ps1 -Type "failed-experiment" -Title "test"`, `Rename-Item` na folderze z myślnikiem, `git commit -m "test"`) w standardowym Terminalu Windows lub Windows PowerShell (nie `pwsh`) poza Cursorem. Czy błędy nadal występują?
    - [x] Uruchom te same polecenia w `pwsh` uruchomionym w standardowym Terminalu Windows (poza Cursorem). Czy błędy nadal występują? (Sprawdzono `pwsh --version` oraz skrypt `gen-cursor-doc.ps1` - działają poprawnie bez błędów PSReadLine poza Cursorem).
- [x] **Izolacja `oh-my-posh`:**
    - [x] Tymczasowo wyłącz `oh-my-posh`. Zazwyczaj robi się to przez zakomentowanie linii `oh-my-posh init pwsh | Invoke-Expression` (lub podobnej) w Twoim profilu PowerShell (`$PROFILE`). Zrestartuj sesję `pwsh` w Cursorze.
    - [x] Uruchom ponownie problematyczne polecenia w Cursorze bez `oh-my-posh`. Czy błędy nadal występują? (Nie, polecenie `gen-cursor-doc.ps1` działa poprawnie bez `oh-my-posh` w Cursorze).
    - [x] Jeśli błędy zniknęły, problem prawdopodobnie leży w interakcji `oh-my-posh` z `PSReadLine` lub terminalem Cursora. Spróbuj zaktualizować `oh-my-posh` (`winget upgrade JanDeDobbeleer.OhMyPosh`) lub przetestuj inny, prostszy motyw `oh-my-posh`. (Aktualizacja `pwsh` do 7.5.1 i `oh-my-posh` do 25.19.0 rozwiązała problem - polecenia działają teraz poprawnie z włączonym OMP w terminalu Cursora, który ładuje główny profil).
- [ ] **Izolacja profilu PowerShell:**
    - [ ] Uruchom `pwsh` w Cursorze z opcją `-NoProfile` (`pwsh -NoProfile`). Spowoduje to zignorowanie wszystkich skryptów w Twoim profilu (w tym `oh-my-posh` i innych modułów/ustawień).
    - [ ] Spróbuj uruchomić problematyczne polecenia. Czy błędy występują?
- [ ] **Opcje `PSReadLine`:**
    - [ ] Sprawdź aktualne opcje `PSReadLine` (`Get-PSReadLineOption`).
    - [ ] Spróbuj zmienić niektóre opcje, które mogą wpływać na renderowanie, np. `Set-PSReadLineOption -PredictionSource None`, `Set-PSReadLineOption -HistorySaveStyle SaveNothing`. Czy to coś zmienia?
- [ ] **Konfiguracja terminala Cursora:**
    - [ ] Sprawdź ustawienia terminala w Cursorze (jeśli są dostępne). Czy zmiana np. czcionki, renderowania GPU wpływa na problem?

## Potencjalne Rozwiązania/Obejścia

- [ ] **Aktualizacje:** Utrzymuj PowerShell, `PSReadLine` i `oh-my-posh` w najnowszych wersjach.
- [ ] **Obejście `Remove-Module`:** Jeśli inne metody zawiodą, używanie `Remove-Module PSReadLine;` przed problematycznymi poleceniami pozostaje ostatecznym, choć niewygodnym obejściem dla skryptów.
- [ ] **Inny motyw `oh-my-posh`:** Jeśli `oh-my-posh` jest winowajcą, wybierz prostszy motyw, który nie powoduje konfliktów.
- [ ] **Modyfikacja profilu:** Przejrzyj i uprość swój profil `$PROFILE`, usuwając potencjalnie konfliktowe moduły lub ustawienia.

## Dokumentacja

- [ ] Dodaj podsumowanie wyników tych eksperymentów do `.cursor/PWSH_ISSUES.md`.

---
**Rozwiązanie:** Problem został rozwiązany przez aktualizację PowerShell do wersji 7.5.1 oraz oh-my-posh do wersji 25.19.0. Po aktualizacjach polecenia działają poprawnie w terminalu Cursora z włączonym oh-my-posh (pod warunkiem, że terminal ładuje prawidłowy profil użytkownika, a nie np. pusty profil VSCode). 