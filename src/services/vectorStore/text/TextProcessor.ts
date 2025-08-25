import { BookmarkEntity } from '../../../types/bookmarks.types';

export class TextProcessor {
  /**
   * Normalizes content by removing extra whitespace and converting to lowercase
   */
  normalizeContent(content: string): string {
    // Usuń nadmiarowe spacje i ujednolicaj wcięcia
    return content
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      .trim()
      .toLowerCase(); // Dodajemy konwersję na małe litery
  }

  /**
   * Builds page content for a bookmark with all relevant information
   */
  buildPageContent(bookmark: BookmarkEntity): string {
    const folderPath = bookmark.metadata?.folderPath || '';
    const description = bookmark.extended?.description || '';
    const tags = bookmark.extended?.tags || [];
    const folderKeywords = folderPath.split('/').join(' ');

    // Dodajemy więcej kontekstu do treści dokumentu
    return this.normalizeContent(`
      Tytuł: ${bookmark.title}
      URL: ${bookmark.url || ''}
      Ścieżka folderu: ${folderPath}
      Słowa kluczowe folderu: ${folderKeywords}
      Opis: ${description}
      Tagi: ${tags.join(', ')}
      Słowa kluczowe: ${this.extractKeywords(bookmark.title)} ${this.extractKeywords(description)} ${this.extractKeywords(folderKeywords)}
    `);
  }

  /**
   * Extracts keywords from text content
   */
  extractKeywords(text: string): string {
    if (!text) return '';

    // Usuń znaki specjalne i podziel na słowa
    const words = text.toLowerCase()
      .replace(/[^a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2) // tylko słowa dłuższe niż 2 znaki
      .filter(word => !this.isStopWord(word)); // usuń stop words

    // Usuń duplikaty
    return [...new Set(words)].join(' ');
  }

  /**
   * Checks if a word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'and', 'the', 'dla', 'jest', 'sie', 'nie', 'czy', 'jak',
      'co', 'to', 'tak', 'na', 'w', 'z', 'ze', 'do', 'od', 'za'
    ]);
    return stopWords.has(word);
  }
}
