# TODO: Rozwój Serwera MCP @context

Lista zadań i pomysłów na ulepszenie serwera MCP `@context` do zarządzania kontekstem.

## Priorytety (Kolejność Wdrażania)

1.  **[x] Wprowadzenie Metadanych (YAML Front Matter)**
    *   [x] Dodać zależność `js-yaml` (`pnpm add js-yaml`). (Implicitly used by gray-matter)
    *   [x] Dodać zależność `gray-matter` (`pnpm add gray-matter`).
    *   [x] Zmodyfikować `create_entry`:
        *   [x] Akceptowanie opcjonalnych metadanych (np. `tags`, `status`, `priority`, `related`).
        *   [x] Automatyczne generowanie i dodawanie pól `createdAt`, `updatedAt`.
        *   [x] Dodawanie bloku YAML Front Matter na początku pliku.
    *   [x] Zmodyfikować `read_entry`:
        *   [x] Parsowanie YAML Front Matter przy odczycie (w tym obsługa pustych bloków).
        *   [x] Zwracanie zarówno sparsowanych metadanych, jak i treści głównej.
    *   [x] Zmodyfikować `search_entries`:
        *   [x] Dodanie możliwości filtrowania po polach metadanych (np. `--tags=`, `--status=`).
        *   [x] Parsowanie metadanych podczas wyszukiwania.
    *   [x] Zmodyfikować `list_entries`, aby zwracało podstawowe metadane.

2.  **[x] Pełne Zarządzanie Wpisami (CRUD)**
    *   [x] Dodać narzędzie `update_entry(type, id, content?, metadata?)`:
        *   [x] Aktualizacja treści i/lub metadanych.
        *   [x] Automatyczna aktualizacja pola `updatedAt`.
    *   [x] Dodać narzędzie `delete_entry(type, id)` do usuwania plików.

3.  **[ ] Ulepszone Wyszukiwanie**
    *   [ ] Zwracanie fragmentów tekstu (kontekstu) w wynikach `search_entries`.
    *   [ ] (Opcjonalnie) Wsparcie dla bardziej zaawansowanych zapytań (operatory logiczne, regex).

4.  **[x] Powiązania Między Wpisami**
    *   [x] Dodać narzędzie `get_related_entries(type, id)` wykorzystujące pole `related` w metadanych.
    *   [x] Dodać testy jednostkowe dla `get_related_entries`.

5.  **[x] Szablony**
    *   [x] Dodać narzędzie `create_from_template(type, template_name, variables?)` do tworzenia wpisów na podstawie szablonów Markdown (podstawowa wersja istnieje).
    *   [x] Zastępowanie zmiennych `{{placeholder}}` również w metadanych szablonu.
    *   [ ] Rozważyć użycie silnika szablonów (np. Handlebars) dla bardziej zaawansowanej logiki.
    *   [x] Lepsza obsługa niezastąpionych placeholderów (pozostawiane zamiast usuwania).
    *   [x] Dodać/zweryfikować testy jednostkowe dla `create_from_template` (pokrycie podstawowe i przypadki błędów).

6.  **[ ] Strukturyzacja Treści**
    *   [ ] Rozważyć mechanizmy sugerowania/wymuszania struktury Markdown dla określonych typów kontekstu.

## Inne Pomysły

*   [ ] Optymalizacja wydajności wyszukiwania przy dużej liczbie plików (np. cache'owanie, indeksowanie).
*   [ ] Lepsza walidacja i obsługa błędów (częściowo zrobione, ale można ulepszyć).
*   [ ] Możliwość konfiguracji (np. domyślne tagi, format daty).
*   [ ] Narzędzie do zmiany nazwy/przenoszenia wpisów. 