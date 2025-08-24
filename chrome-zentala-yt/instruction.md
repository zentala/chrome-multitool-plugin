### Struktura rozszerzenia Chrome "zentala-yt"

Twoje rozszerzenie będzie napisane w TypeScript, kompilowane do JavaScript (użyj `tsc` do kompilacji). Nazwa to "zentala-yt". Łączy wszystkie elementy z Twojej rozmowy: pobieranie automatycznie generowanych napisów z YouTube, wstawianie bocznego panelu (sidebar) w stylu Glasp na stronach YouTube, oraz wysyłanie tekstu (np. promptu lub napisów) do ChatGPT poprzez otwarcie nowej karty i automatyczne wklejenie tekstu.

Rozszerzenie działa na:
- Stronach YouTube (`https://www.youtube.com/*`): Wstawia sidebar z przyciskami do pobierania napisów i wysyłania do ChatGPT.
- Stronach ChatGPT (`https://chat.openai.com/*`): Automatycznie wkleja prompt z localStorage.

**Uwagi:**
- Używa localStorage do przekazywania promptu (bezpieczne i proste).
- Pobieranie napisów działa tylko dla filmów z dostępnymi auto-generowanymi napisami (oznaczonymi jako 'asr' lub 'auto').
- Sidebar jest stały (fixed), z możliwością zamknięcia.
- Format napisów: VTT (łatwy do pobrania i odczytu).

### Krok po kroku: Jak stworzyć i zainstalować rozszerzenie

1. **Utwórz folder projektu:**
   - Stwórz nowy folder o nazwie `zentala-yt`.

2. **Zainstaluj TypeScript (jeśli nie masz):**
   - Otwórz terminal w folderze projektu.
   - Uruchom: `npm init -y` (inicjuje package.json).
   - Uruchom: `npm install --save-dev typescript`.
   - Utwórz plik `tsconfig.json` w folderze i wklej do niego:
     ```json
     {
       "compilerOptions": {
         "target": "ES6",
         "module": "commonjs",
         "strict": true,
         "esModuleInterop": true,
         "outDir": "./dist",
         "rootDir": "./src"
       }
     }
     ```
   - Utwórz podfolder `src` na pliki TypeScript.

3. **Utwórz pliki i foldery:**
   - W folderze `src` utwórz `content-script.ts` i `gpt-inject.ts`.
   - W głównym folderze projektu utwórz `manifest.json` i `content-style.css`.
   - Zmodyfikuj plik `package.json` i w sekcji `"scripts"` dodaj skrypt `build`:
     ```json
     "scripts": {
       "build": "npx tsc && copy manifest.json dist && copy content-style.css dist"
     }
     ```
     *Uwaga: W systemach Linux/macOS zamień `copy` na `cp`.*

4. **Wklej kod do plików (szczegóły poniżej).**

5. **Zbuduj rozszerzenie:**
   - W terminalu uruchom komendę: `npm run build`.
   - Ta komenda automatycznie skompiluje pliki TypeScript i skopiuje wszystkie potrzebne pliki (`manifest.json`, `content-style.css`) do folderu `dist`. Folder `dist` jest teraz kompletnym, gotowym do instalacji rozszerzeniem.

   Struktura projektu po zbudowaniu:
   ```
   zentala-yt/
   ├── dist/
   │   ├── manifest.json
   │   ├── content-script.js
   │   ├── gpt-inject.js
   │   └── content-style.css
   ├── src/
   │   ├── content-script.ts
   │   └── gpt-inject.ts
   ├── package.json
   ├── tsconfig.json
   └── ... (inne pliki)
   ```

6. **Zainstaluj rozszerzenie w Chrome:**
   - Otwórz Chrome i wejdź na `chrome://extensions/`.
   - Włącz "Tryb deweloperski" (prawy górny róg).
   - Kliknij "Załaduj rozpakowane" i wybierz folder `dist`.
   - Otwórz stronę YouTube – sidebar powinien się pojawić po prawej.

7. **Testowanie:**
   - Na YouTube: Otwórz film z auto-napisami (np. po polsku lub angielsku).
   - W sidebarze: Kliknij "Pobierz automatyczne napisy" – pobierze plik VTT.
   - Wpisz tekst w textarea i kliknij "Wyślij do ChatGPT" – otworzy nową kartę, prompt wklei się automatycznie.
   - Jeśli coś nie działa: Sprawdź konsolę deweloperską (F12) na błędach.

9. **Rozbudowa (opcjonalna):**
   - Dodaj wybór języka napisów (modyfikuj `findCaptionUrl`).
   - Automatycznie ładuj napisy do textarea po pobraniu (użyj FileReader).
   - Użyj React/Vue dla bardziej złożonego UI w sidebarze.

### Pełny kod

#### 1. manifest.json (w głównym folderze)
```json
{
  "manifest_version": 3,
  "name": "zentala-yt",
  "version": "1.0",
  "description": "Rozszerzenie do pobierania napisów z YT, sidebar w stylu Glasp i wysyłania do ChatGPT",
  "permissions": ["storage"],
  "content_scripts": [
    {
      "matches": ["https://www.youtube.com/*"],
      "js": ["content-script.js"],
      "css": ["content-style.css"]
    },
    {
      "matches": ["https://chat.openai.com/*"],
      "js": ["gpt-inject.js"]
    }
  ]
}
```

#### 2. src/content-script.ts (dla YouTube: sidebar, pobieranie napisów, wysyłanie do ChatGPT)
```typescript
// Funkcja do znajdowania URL napisów auto-generowanych
function findCaptionUrl(): string | null {
  // @ts-ignore
  const playerResponse = (window as any).ytInitialPlayerResponse;
  if (!playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks) return null;

  const tracks = playerResponse.captions.playerCaptionsTracklistRenderer.captionTracks;
  const autoTrack = tracks.find((t: any) => t.kind === 'asr' || t.name?.simpleText?.toLowerCase().includes('auto'));
  return autoTrack ? autoTrack.baseUrl : null;
}

// Funkcja do pobierania napisów
function downloadAutoSub() {
  const captionUrl = findCaptionUrl();
  if (!captionUrl) {
    alert("Nie znaleziono automatycznych napisów!");
    return;
  }
  const vttUrl = captionUrl + '&fmt=vtt';
  const a = document.createElement('a');
  a.href = vttUrl;
  a.download = 'napisy.vtt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Funkcja do wstawiania sidebaru
function injectSidebar() {
  if (document.getElementById('zentala-sidebar')) return;

  const sidebar = document.createElement('div');
  sidebar.id = 'zentala-sidebar';
  sidebar.style.position = 'fixed';
  sidebar.style.top = '60px';
  sidebar.style.right = '0';
  sidebar.style.width = '320px';
  sidebar.style.height = 'calc(100vh - 60px)';
  sidebar.style.background = '#fff';
  sidebar.style.boxShadow = '0 0 16px rgba(0,0,0,0.13)';
  sidebar.style.zIndex = '9999';
  sidebar.style.borderLeft = '1px solid #eee';
  sidebar.style.display = 'flex';
  sidebar.style.flexDirection = 'column';
  sidebar.innerHTML = `
    <div style="padding: 16px; border-bottom: 1px solid #eee;">
      <strong>zentala-yt</strong>
      <button id="zentala-close-btn" style="float:right">×</button>
    </div>
    <div style="padding: 16px; flex:1;">
      <button id="download-subs-btn" style="width:100%; margin-bottom:12px;">Pobierz automatyczne napisy</button>
      <textarea id="zentala-prompt" style="width:100%; height:120px;" placeholder="Wpisz prompt lub wklej napisy"></textarea>
      <button id="send-to-gpt" style="margin-top:12px; width:100%;">Wyślij do ChatGPT</button>
    </div>
  `;
  document.body.appendChild(sidebar);

  document.getElementById('zentala-close-btn')?.addEventListener('click', () => {
    sidebar.remove();
  });

  document.getElementById('download-subs-btn')?.addEventListener('click', () => {
    downloadAutoSub();
  });

  document.getElementById('send-to-gpt')?.addEventListener('click', () => {
    const promptElement = document.getElementById('zentala-prompt') as HTMLTextAreaElement;
    const prompt = promptElement.value.trim();
    if (!prompt) {
      alert('Wpisz prompt!');
      return;
    }
    localStorage.setItem('zentala-gpt-prompt', prompt);
    window.open("https://chat.openai.com/?zentala=1", "_blank");
  });
}

// Automatyczne wstawienie sidebaru na YT
injectSidebar();
```

#### 3. src/gpt-inject.ts (dla ChatGPT: automatyczne wklejanie promptu)
```typescript
window.addEventListener('load', () => {
  const prompt = localStorage.getItem('zentala-gpt-prompt');
  if (prompt) {
    const tryInject = () => {
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement | null;
      if (textarea) {
        textarea.value = prompt;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        localStorage.removeItem('zentala-gpt-prompt');
        // Opcjonalnie: Automatyczne wysłanie (odkomentuj jeśli chcesz)
        // setTimeout(() => {
        //   const submitBtn = textarea.form?.querySelector('button[type="submit"]') as HTMLButtonElement | null;
        //   submitBtn?.click();
        // }, 500);
        return true;
      }
      return false;
    };

    let tries = 0;
    const interval = setInterval(() => {
      if (tryInject() || ++tries > 10) clearInterval(interval);
    }, 500);
  }
});
```

#### 4. content-style.css (w głównym folderze, opcjonalny)
```css
#zentala-sidebar textarea {
  font-family: inherit;
  font-size: 15px;
  padding: 8px;
  border-radius: 6px;
  border: 1px solid #ccc;
  resize: vertical;
}
#zentala-sidebar button {
  font-size: 15px;
  background: #10a37f;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 0;
  cursor: pointer;
}
#zentala-sidebar button:hover {
  background: #0e8465;
}
```

To jest kompletny kod. Jeśli potrzebujesz zmian (np. dodanie wyboru języka napisów lub automatycznego ładowania napisów do textarea), daj znać!