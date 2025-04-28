# TODO: Implementacja generowania dokumentacji

- [x] Utwórz wymaganą strukturę katalogów w `.cursor` (`TEMPLATES`, `scripts/lib`, `decisions`, `mood`, `errors`, `failedexperiments`).
- [x] Przenieś/zweryfikuj istnienie plików szablonów w `.cursor/TEMPLATES/`.
- [x] Zaimplementuj skrypt `.cursor/scripts/gen-meta.ps1`.
- [x] Zaimplementuj skrypt `.cursor/scripts/gen-usage.ps1`.
- [x] Zaimplementuj współdzielony moduł `.cursor/scripts/lib/cursor-gen.psm1`.
- [x] Zaimplementuj uniwersalny skrypt `.cursor/scripts/gen-cursor-doc.ps1`.
    - UWAGA: Zaktualizowano ścieżkę do `failedexperiments` po ręcznej zmianie nazwy folderu przez użytkownika.
- [x] Zaktualizuj `required_instructions` (always rules) o nowe polecenia generowania dokumentacji.
- [x] Przetestuj działanie skryptów przez wygenerowanie przykładowych plików.
    - UWAGA: `gen-cursor-doc.ps1 -Type "failed-experiment"` nadal powoduje błąd PSReadLine (nawet po zmianie nazwy folderu na `failedexperiments`) i nie tworzy pliku. Rekomendacja: tworzyć te pliki manualnie.
- [x] Zaktualizuj główny plik `.cursor/TODO.md` dodając link do tego pliku. 