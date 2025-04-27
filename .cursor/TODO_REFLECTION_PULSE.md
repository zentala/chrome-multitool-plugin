# 🧠 Projekt: "Daily Reflection Pulse" — Wtyczka do Chrome lub Tray App na Windows

## 🎯 Cel
Wtyczka ma służyć jako **osobisty inspirator**.  
Nie przypomina o zadaniach.  
Nie narzuca zadań.  
**Przypomina mi, że istnieję poza obowiązkiem.**

Co kilka godzin (albo na żądanie) wyświetla **losowe pytanie** pomagające:

- Zatrzymać się w biegu.
- Złapać kontakt ze sobą.
- Prowadzić życie bardziej z ciekawości i wolności, nie z presji i powinności.

## 🛠️ Główne funkcje

- **Losowanie pytania** z bazy, na podstawie:
  - 🕰️ Pory dnia (`morning`, `afternoon`, `evening`)  
  - ❤️ Aktualnego stanu emocjonalnego (`stress`, `joy`, `boredom`)  
  - 🎲 Lub całkowicie losowo.
  
- **Sposób wyświetlania**:  
  - Popup w Chrome (np. małe powiadomienie / popup na klik).
  - Lub małe okienko tray app (Windows) z pytaniem, pojawiające się subtelnie.
  
- **Tryby działania**:
  - Automatyczny (losowe pytanie co X godzin).
  - Manualny (klikam i dostaję inspirację).

- **Opcjonalne funkcje rozszerzone** (mile widziane, ale nie wymagane na MVP):
  - Możliwość zapisu własnej odpowiedzi (do osobistego dziennika).
  - Przegląd historii zadanych pytań.
  - Wybranie kilku pytań i refleksja nad tym, które najbardziej "ciągnie".

## 📦 Struktura danych (JSON)

Przykład struktury JSON dla pytań:

```json
{
  "meta": {
    "title": "Self-Reflection Prompts",
    "description": "Questions organized by timing and emotional need to better support mindful living.",
    "version": "2.0",
    "author": "zentala"
  },
  "instructions": "Pick a random question based on timing ('morning', 'afternoon', 'evening') or emotional state ('stress', 'joy', 'boredom').",
  "categories": {
    "timing": {
      "morning": [
        "What would make today meaningful, no matter what happens?",
        "What gentle intention could guide me through this day?",
        "What am I genuinely curious about today?"
      ],
      "afternoon": [
        "Am I still connected to what matters most today?",
        "Is there a small joy I could allow myself right now?",
        "Do I need a pause, or a push?"
      ],
      "evening": [
        "What can I thank myself for today?",
        "What did I feel most alive doing today?",
        "Can I let go of any unfinished business for tonight?"
      ]
    },
    "emotion": {
      "stress": [
        "What can I let go of right now, just a little bit?",
        "If I could offer myself comfort, what would it be?",
        "Is it safe for me to breathe deeply and slow down?"
      ],
      "joy": [
        "How can I savor this feeling a little longer?",
        "What am I grateful for at this very moment?",
        "Where in my body do I feel this joy?"
      ],
      "boredom": [
        "What small experiment could make this moment more interesting?",
        "What would I explore if there were no wrong answers?",
        "Can I let boredom be an invitation to create, not to escape?"
      ]
    }
  }
}
```

## 🧩 Architektura (sugerowana)

-   Frontend:
    -   Chrome Extension Popup **lub**
    -   Tray App GUI (np. ElectronJS mini-app, lekkie React UI lub natywne mini-GUI).
        
-   Backend:
    -   Prosty lokalny storage (IndexedDB lub LocalStorage) do ewentualnego zapisu odpowiedzi.
    -   Brak backendu chmurowego na MVP — wszystko offline.
        
-   UX:
    -   **Wyjątkowo delikatne** powiadomienia (brak nachalności).
    -   Możliwość szybkiego ukrycia popupu ("Dismiss").
    -   Minimalistyczny styl: duże pytanie, zero rozpraszaczy.
        

## 📈 Opcje rozwoju w przyszłości (nie MVP, ale warto zapamiętać)

-   Dodanie własnych pytań przez użytkownika.
-   Tagi przy pytaniach (`self-compassion`, `curiosity`, `freedom`) i możliwość filtrowania po nich.
-   Prosty "tryb dziennika" (zapisywanie odpowiedzi do szyfrowanego pliku lokalnie).
    

* * *

# ✨ Podsumowanie

**Daily Reflection Pulse** to nie kolejna lista "musisz".  
To osobisty impuls:  
**"Masz prawo żyć, czuć i być — teraz."**

Minimalistyczne, ciepłe narzędzie dla kogoś, kto chce częściej wybierać **życie z wolności**, a nie z mechanicznego przymusu.





