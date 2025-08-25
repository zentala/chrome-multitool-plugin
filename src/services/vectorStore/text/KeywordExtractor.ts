export class KeywordExtractor {
  /**
   * Extracts keywords from URL
   */
  extractKeywordsFromUrl(url: string | undefined): string {
    // Use a separate function to process the URL safely
    const processUrl = (inputUrl: string): string => {
      try {
        // Usuń protokół i parametry
        const cleanUrl = inputUrl.replace(/^https?:\/\//, '').split('?')[0];
        // Podziel na części i usuń rozszerzenia plików
        return cleanUrl
          .split(/[/.-]/)
          .map(part => part.replace(/\.(html|php|aspx|jsp)$/i, ''))
          .filter(part => part.length > 2) // tylko części dłuższe niż 2 znaki
          .join(' ');
      } catch (error) {
        console.error('Błąd podczas ekstrakcji słów kluczowych z URL:', error);
        return '';
      }
    };

    // Early return for null/undefined
    if (!url) return '';

    // Early return for non-string types
    if (typeof url !== 'string') return '';

    // Now call the processing function with the guaranteed string
    return processUrl(url);
  }

  /**
   * Extracts keywords from text content
   */
  extractKeywordsFromText(text: string | undefined): string {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/[^a-ząćęłńóśźż\s]/g, ' ') // zostaw tylko litery i spacje
      .split(/\s+/)
      .filter(word => word.length > 2) // tylko słowa dłuższe niż 2 znaki
      .join(' ');
  }

  /**
   * Calculates keyword match score between query and document keywords
   */
  calculateKeywordMatch(queryKeywords: string, docKeywords: string): number {
    const queryWords = new Set(queryKeywords.toLowerCase().split(/\s+/));
    const docWords = new Set(docKeywords.toLowerCase().split(/\s+/));

    if (queryWords.size === 0 || docWords.size === 0) return 0;

    let exactMatches = 0;
    let partialMatches = 0;

    for (const queryWord of queryWords) {
      // Sprawdź dokładne dopasowania
      if (docWords.has(queryWord)) {
        exactMatches++;
        continue;
      }

      // Sprawdź częściowe dopasowania
      for (const docWord of docWords) {
        if (docWord.includes(queryWord) || queryWord.includes(docWord)) {
          partialMatches++;
          break;
        }
      }
    }

    // Oblicz końcowy wynik
    const exactScore = exactMatches / queryWords.size;
    const partialScore = partialMatches / queryWords.size * 0.5; // Częściowe dopasowania mają mniejszą wagę

    return Math.min(1, exactScore + partialScore); // Maksymalnie 1.0
  }
}
