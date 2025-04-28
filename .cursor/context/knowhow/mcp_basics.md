# Podstawy Model Context Protocol (MCP) dla Serwera @context

Ten plik zawiera podsumowanie kluczowych informacji o Model Context Protocol (MCP) zebranych podczas analizy, które będą przydatne przy budowie serwera `@context`. Katalog `knowhow` będzie zarządzany przez ten serwer do przechowywania podobnych notatek i odkryć.

## Co to jest MCP?

*   **Standardowy Protokół:** Otwarty standard (związany z Anthropic) do komunikacji między agentami AI (jak Cursor) a zewnętrznymi narzędziami/danymi.
*   **Cel:** Umożliwienie AI dynamicznego wywoływania narzędzi i korzystania z zewnętrznych zasobów w sposób ustandaryzowany i bezpieczny.
*   **Analogia:** MCP jest jak protokół USB dla AI, a serwery MCP to jak urządzenia USB (wg Cursor101.com).

## Mechanizmy Transportu

MCP wspiera dwa główne sposoby komunikacji:

1.  **Standard Input/Output (`stdio`)**
    *   **Zastosowanie:** Głównie dla lokalnych serwerów MCP uruchamianych jako procesy.
    *   **Jak działa:** Cursor uruchamia serwer (np. skrypt Node.js) i komunikuje się z nim przez standardowe wejście/wyjście procesu.
    *   **Konfiguracja w Cursor:** Typ `command`, podajemy komendę do uruchomienia serwera.
    *   **Nasz wybór:** Będziemy używać `stdio` dla serwera `@context`.

2.  **Server-Sent Events (`sse`)**
    *   **Zastosowanie:** Dla serwerów zdalnych, działających np. w chmurze.
    *   **Jak działa:** Komunikacja przez HTTP z wykorzystaniem Server-Sent Events.
    *   **Konfiguracja w Cursor:** Typ `sse`, podajemy URL serwera.

## Implementacja Serwera MCP (w Node.js)

*   **Niezależność Językowa:** Serwery można pisać w dowolnym języku obsługującym `stdio` lub `HTTP/SSE`.
*   **Oficjalne SDK Node.js:** Pakiet `@modelcontextprotocol/sdk` ułatwia tworzenie serwerów.
    *   `npm install @modelcontextprotocol/sdk` (lub `pnpm add`)
*   **Kluczowe Elementy SDK:**
    *   `McpServer`: Główna klasa do tworzenia serwera.
    *   `StdioServerTransport`: Klasa do obsługi komunikacji przez `stdio`.
    *   `server.tool(name, description, schema, handler)`: Metoda do definiowania dostępnych narzędzi (funkcji), które AI może wywołać.
*   **Walidacja Danych:** Zalecane jest użycie biblioteki `zod` do definiowania schematów i walidacji parametrów wejściowych narzędzi.
    *   `npm install zod` (lub `pnpm add`)

## Rejestracja Serwera w Cursor

1.  Przejdź do `Settings > Features > MCP`.
2.  Kliknij `+ Add New MCP Server`.
3.  Wypełnij formularz:
    *   `Name`: Dowolna nazwa (np. `@context`).
    *   `Type`: `command` (dla `stdio`) lub `sse`.
    *   `Command`/`URL`: Komenda uruchamiająca serwer (np. `node .cursor/mcp/context/index.js`) lub URL serwera SSE.
4.  Zapisz i odśwież listę narzędzi (może być wymagane).

## Przykładowy Kod (Weather Tool - na podstawie artykułu Medium)

```typescript
// Potrzebne importy
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod"; // Do walidacji

// Inicjalizacja serwera
const server = new McpServer({
  name: "weather-tool", // Nazwa serwera
  version: "1.0.0",
});

// Definicja narzędzia "get_alerts"
server.tool(
  "get_alerts",                                   // Nazwa narzędzia (jak AI je wywoła)
  "Get weather alerts for a state",              // Opis narzędzia (dla AI i użytkownika)
  {                                               // Schemat parametrów wejściowych (używając Zod)
    state: z.string().min(2).max(2).describe("Two-letter state code (e.g., CA, NY)"),
  },
  async ({ state }) => {                          // Funkcja obsługująca wywołanie narzędzia
    // Logika narzędzia (tutaj przykładowe dane)
    const alerts = {
      CA: ["Wildfire warning", "Heat advisory"],
      NY: ["Flood warning", "Thunderstorm watch"],
      // ... inne stany
    };
    const stateAlerts = alerts[state.toUpperCase()] || ["No current alerts"];

    // Zwracanie wyniku w formacie oczekiwanym przez MCP
    return {
      content: [
        {
          type: "text",
          text: `Weather Alerts for ${state.toUpperCase()}:\n${stateAlerts.join("\n")}`,
        },
      ],
    };
  }
);

// Główna funkcja uruchamiająca serwer
async function main() {
  const transport = new StdioServerTransport(); // Używamy transportu stdio
  await server.connect(transport);             // Łączymy serwer z transportem
  console.error("Weather MCP Tool running on stdio"); // Logowanie do stderr (nie zaśmieca stdout)
}

// Uruchomienie i obsługa błędów
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

```

## Najlepsze Praktyki (z artykułu Medium)

*   **Modularność:** Dziel większe funkcjonalności na mniejsze, reużywalne narzędzia.
*   **Opisowe Metadane:** Używaj jasnych nazw, opisów i schematów dla narzędzi i parametrów.
*   **Walidacja Wejść:** Zawsze waliduj dane wejściowe (np. za pomocą `zod`).
*   **Wydajność:** Unikaj długich operacji I/O; rozważ cache'owanie.
*   **Czyste Logowanie:** Używaj `console.error()` do debugowania, a `console.log()` oszczędnie (nie zaśmiecaj `stdout`). 