import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { SimilaritySearchResult, EmbeddingsAdapter, BookmarkMetadataWithId } from '../types';
import { KeywordExtractor } from '../text/KeywordExtractor';

export class SimilaritySearch {
  private keywordExtractor: KeywordExtractor;

  constructor() {
    this.keywordExtractor = new KeywordExtractor();
  }

  /**
   * Compares two dates and returns true if they are the same (ignoring milliseconds)
   */
  compareLastModified(date1: number | undefined, date2: number | undefined): boolean {
    if (!date1 || !date2) {
      console.log('Brak daty lastModified:', { date1, date2 });
      return true;
    }
    // Konwertuj do liczb i porównaj tylko datę (bez milisekund)
    const d1 = Math.floor(Number(date1) / 1000);
    const d2 = Math.floor(Number(date2) / 1000);
    console.log('Porównanie lastModified:', {
      original1: date1,
      original2: date2,
      converted1: d1,
      converted2: d2,
      areEqual: d1 === d2
    });
    return d1 === d2;
  }

  /**
   * Performs similarity search with keyword matching and scoring
   */
  async similaritySearch(
    vectorStore: MemoryVectorStore,
    embeddings: EmbeddingsAdapter,
    query: string,
    k: number = 5
  ): Promise<SimilaritySearchResult[]> {
    console.log('\n=== ROZPOCZYNAM WYSZUKIWANIE ===');
    console.log('Zapytanie:', query);
    console.log('Liczba dokumentów w bazie:', vectorStore.memoryVectors?.length || 0);

    try {
      // Normalizuj zapytanie
      const normalizedQuery = query.toLowerCase().trim();
      console.log('Znormalizowane zapytanie:', normalizedQuery);

      // Generuj embedding dla zapytania
      if (!embeddings) {
        throw new Error('Embeddings service not initialized.');
      }
      const queryEmbedding = await embeddings.embedQuery(normalizedQuery);
      console.log('Długość wektora zapytania:', queryEmbedding.length);

      // Wykonaj wyszukiwanie z większą liczbą wyników do filtrowania
      console.log('\nWykonuję wyszukiwanie wektorowe...');
      const results = await vectorStore.similaritySearchVectorWithScore(
        queryEmbedding,
        k * 3 // Pobierz więcej wyników do filtrowania
      );

      // Filtruj i sortuj wyniki
      const filteredResults = results
        .map(([doc, vectorScore]) => {
          // Przekształć score wektorowy na wartość od 0 do 1 (im bliżej 1 tym lepiej)
          const normalizedVectorScore = 1 - vectorScore; // Odwracamy score, bo oryginalnie mniejsza wartość = lepsze dopasowanie

          // Oblicz score dla słów kluczowych z różnych pól
          const titleKeywordScore = this.keywordExtractor.calculateKeywordMatch(
            this.keywordExtractor.extractKeywordsFromText(query),
            this.keywordExtractor.extractKeywordsFromText(doc.metadata.title)
          );
          const urlKeywordScore = this.keywordExtractor.calculateKeywordMatch(
            this.keywordExtractor.extractKeywordsFromText(query),
            this.keywordExtractor.extractKeywordsFromUrl(doc.metadata.url)
          );
          const contentKeywordScore = this.keywordExtractor.calculateKeywordMatch(
            this.keywordExtractor.extractKeywordsFromText(query),
            doc.pageContent
          );

          // Połącz wszystkie score z odpowiednimi wagami
          const keywordScore = (
            titleKeywordScore * 0.5 +    // Tytuł ma największą wagę
            urlKeywordScore * 0.3 +      // URL też jest ważny
            contentKeywordScore * 0.2     // Reszta treści
          );

          // Połącz score wektorowy z keywordowym
          // Jeśli mamy dobre dopasowanie słów kluczowych, dajemy im większą wagę
          const keywordWeight = keywordScore > 0.5 ? 0.7 : 0.3;
          const vectorWeight = 1 - keywordWeight;

          const combinedScore = (
            normalizedVectorScore * vectorWeight +
            keywordScore * keywordWeight
          );

          return {
            doc,
            vectorScore: normalizedVectorScore,
            titleKeywordScore,
            urlKeywordScore,
            contentKeywordScore,
            keywordScore,
            combinedScore,
            weights: {
              keyword: keywordWeight,
              vector: vectorWeight
            }
          };
        })
        .sort((a, b) => b.combinedScore - a.combinedScore) // Sortuj malejąco po combinedScore
        .slice(0, k);

      // Loguj wyniki ze szczegółowymi score
      console.log('\nZnalezione dokumenty (z score):');
      filteredResults.forEach(({doc, vectorScore, titleKeywordScore, urlKeywordScore, contentKeywordScore, keywordScore, combinedScore, weights}, index) => {
        console.log(`\n[${index + 1}] Wyniki scoringu:`);
        console.log(`- Score wektorowy (znormalizowany): ${vectorScore.toFixed(4)} (waga: ${weights.vector.toFixed(2)})`);
        console.log(`- Score słów kluczowych:`);
        console.log(`  • Tytuł: ${titleKeywordScore.toFixed(4)}`);
        console.log(`  • URL: ${urlKeywordScore.toFixed(4)}`);
        console.log(`  • Treść: ${contentKeywordScore.toFixed(4)}`);
        console.log(`  • Łączny: ${keywordScore.toFixed(4)} (waga: ${weights.keyword.toFixed(2)})`);
        console.log(`- Score końcowy: ${combinedScore.toFixed(4)}`);
        console.log('Tytuł:', doc.metadata.title);
        console.log('URL:', doc.metadata.url);
        console.log('Folder:', doc.metadata.folderPath);
      });

      return filteredResults.map(result => ({
        pageContent: result.doc.pageContent,
        metadata: result.doc.metadata as BookmarkMetadataWithId,
        score: result.combinedScore,
        vectorScore: result.vectorScore,
        keywordScore: result.keywordScore,
        titleKeywordScore: result.titleKeywordScore,
        urlKeywordScore: result.urlKeywordScore,
        contentKeywordScore: result.contentKeywordScore
      }));
    } catch (error) {
      console.error('Błąd podczas wyszukiwania:', error);
      throw error;
    }
  }
}
