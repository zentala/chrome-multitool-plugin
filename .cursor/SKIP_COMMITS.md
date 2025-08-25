# 🚀 Jak działa opcja pomijania pre-commit hooków

## 🎯 Szybkie omówienie

Zaimplementowałem system pozwalający na pomijanie automatycznych sprawdzeń (testów i lintingu) przed commitem. Jest to przydatne w sytuacjach awaryjnych lub podczas developmentu.

## ⚙️ Jak to działa

### 1. **Pre-commit Hook (`.husky/pre-commit`)**
- Automatycznie sprawdza każdy commit
- Uruchamia `pnpm run test` i `pnpm run lint`
- Jeśli znajdzie `[skip ci]` w wiadomości commita → wychodzi z kodem 0 (sukces)
- Jeśli testy/lint się nie powiedzie → blokuje commit

### 2. **PowerShell Script (`scripts/skip-commit.ps1`)**
- Pomocniczy skrypt do łatwego pomijania
- Automatycznie dodaje flagę `[skip ci]` do wiadomości
- Sprawdza czy są staged changes
- Pokazuje kolorowe komunikaty o statusie

### 3. **Ręczne metody**
- `git commit --no-verify` → całkowicie omija wszystkie hooki
- `git commit -m "message [skip ci]"` → hook sam się wyłączy

## 📋 Sytuacje kiedy używać

✅ **Dobrze:**
- Pilne hotfixy wymagające natychmiastowego deploya
- Commit podczas developmentu (WIP)
- Tymczasowo zepsute testy z powodu zewnętrznych czynników
- Szybkie aktualizacje dokumentacji

❌ **Źle:**
- Regularne commitowanie bez testów
- Ignorowanie ciągle failing testów
- Brak zrozumienia dlaczego coś się psuje

## 🔄 Przepływ pracy

### Normalny commit:
```bash
git add .
git commit -m "feat: new feature"
# → Uruchamiają się testy i lint
# → Jeśli wszystko OK → commit się udaje
```

### Commit z pominięciem:
```bash
.\scripts\skip-commit.ps1 -Message "fix: urgent hotfix" -AddAll
# → Bez uruchamiania testów/lintu
# → Natychmiastowy commit
```

## ⚠️ Ważne uwagi

- **Skipowane commity nadal są w historii**
- **CI/CD może nadal uruchamiać pełne testy**
- **Używaj oszczędnie** - preferuj pełne sprawdzenia
- **Jeśli to możliwe, uruchom testy ręcznie** przed skipowaniem

## 🎮 Przykłady użycia

```bash
# Pełne pominięcie dla pilnego fixu
.\scripts\skip-commit.ps1 -Message "fix: critical bug" -AddAll

# Tylko wybrane pliki bez dodawania wszystkich
git add src/fix.ts
.\scripts\skip-commit.ps1 "fix: targeted fix"

# Manualne z flagą
git commit -m "chore: update docs [skip ci]"
```

## 🔍 Sprawdzanie statusu

```bash
# Czy ostatni commit był skipnięty?
git log --oneline -1

# Sprawdź logi testów po niepowodzeniu
cat test.log
cat lint.log
```
