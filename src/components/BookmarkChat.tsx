import React, { useState, useRef, useEffect } from 'react';
import {
  Paper,
  TextField,
  IconButton,
  Typography,
  Box,
  CircularProgress,
  Button
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { settingsService } from '../services/settings.service';
import { BookmarkEntity } from '../types/bookmarks.types';
import { vectorStoreService } from '../services/vectorStore.service';
import { EmbeddingsConfirmDialog } from './EmbeddingsConfirmDialog';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isDebug?: boolean;
  isCollapsible?: boolean;
  isExpanded?: boolean;
}

interface BookmarkChatProps {
  bookmarks: BookmarkEntity[];
  onCommandReceived?: (command: string) => void;
}

const SYSTEM_PROMPT = `Jesteś asystentem pomagającym w przeszukiwaniu i organizacji zakładek.
Twoim zadaniem jest pomóc użytkownikowi znaleźć i zarządzać jego zakładkami.

Gdy otrzymasz zapytanie:
1. Przeanalizuj otrzymane zakładki pod kątem zapytania użytkownika
2. Zwróć szczególną uwagę na ścieżki folderów (folderPath) - pomagają one zrozumieć kontekst i lokalizację zakładki
3. Jeśli znajdziesz pasujące zakładki, przedstaw je w czytelny sposób:
   - Tytuł zakładki
   - URL
   - Ścieżka folderu
   - Opis (jeśli jest)
   - Tagi (jeśli są)

Jeśli użytkownik pyta o zawartość konkretnego folderu, sprawdź ścieżki folderów w metadanych.
Odpowiadaj zawsze w języku polskim i bądź pomocny.

Możesz używać następujących komend:
/search <query> - do wyszukiwania zakładek
/tag <bookmark_id> <tagi...> - do sugerowania tagów
/organize - do propozycji reorganizacji`;

export const BookmarkChat: React.FC<BookmarkChatProps> = ({ bookmarks, onCommandReceived }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedProvider, setSelectedProvider] = useState<'openai' | 'anthropic'>('openai');
  const [chatModel, setChatModel] = useState<ChatOpenAI | ChatAnthropic | null>(null);
  const [confirmDialogData, setConfirmDialogData] = useState<{
    open: boolean;
    bookmarks: BookmarkEntity[];
    resolve: ((value: boolean) => void) | null;
  }>({
    open: false,
    bookmarks: [],
    resolve: null
  });

  useEffect(() => {
    const initChat = async () => {
      try {
        console.log('Inicjalizacja chatu...');
        const provider = await settingsService.getSetting('selected_provider') || 'openai';
        const typedProvider = provider as 'openai' | 'anthropic';
        setSelectedProvider(typedProvider);

        // Zawsze potrzebujemy klucza OpenAI do embeddingów
        const openAIApiKey = await settingsService.getSetting('openai_api_key') || '';
        
        if (!openAIApiKey) {
          console.error('Brak klucza OpenAI - nie można zainicjalizować bazy wektorowej');
          return;
        }

        // Ustawienie callbacka potwierdzenia przed inicjalizacją
        vectorStoreService.setConfirmCallback(async (bookmarksToProcess) => {
          return new Promise((resolve) => {
            setConfirmDialogData({
              open: true,
              bookmarks: bookmarksToProcess,
              resolve
            });
          });
        });

        // Inicjalizacja bazy wektorowej
        await vectorStoreService.initialize(openAIApiKey, typedProvider);
        
        // Inicjalizacja modelu czatu
        if (typedProvider === 'openai') {
          const model = new ChatOpenAI({ 
            openAIApiKey: openAIApiKey,
            modelName: "gpt-3.5-turbo",
            temperature: 0.7
          });
          setChatModel(model);
        } else {
          const anthropicApiKey = await settingsService.getSetting('anthropic_api_key') || '';
          if (anthropicApiKey) {
            const model = new ChatAnthropic({
              apiKey: anthropicApiKey,
              model: "claude-3-sonnet-20240229"
            });
            setChatModel(model);
          }
        }

        // Dodawanie zakładek do bazy
        if (bookmarks.length > 0) {
          await vectorStoreService.addBookmarks(bookmarks);
        }

      } catch (error) {
        console.error('Błąd podczas inicjalizacji:', error);
      }
    };

    initChat();
  }, [bookmarks]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addDebugMessage = (content: string) => {
    setMessages(prev => [...prev, {
      role: 'system',
      content,
      isDebug: true
    }]);
  };

  const handleSend = async () => {
    if (!input.trim() || !chatModel || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage
    }]);

    try {
      addDebugMessage(`🔍 Wyszukiwanie dla zapytania: "${userMessage}"`);
      const similarBookmarks = await vectorStoreService.similaritySearch(userMessage);
      
      addDebugMessage(`📚 Znalezione zakładki (${similarBookmarks.length}):`);
      const formattedBookmarks = similarBookmarks.map(doc => ({
        title: doc.metadata.title,
        url: doc.metadata.url,
        description: doc.metadata.description,
        tags: doc.metadata.tags,
        folderPath: doc.metadata.folderPath
      }));

      // Dodaj szczegółowe wyniki jako zwijalną wiadomość
      setMessages(prev => [...prev, {
        role: 'system',
        content: JSON.stringify(formattedBookmarks, null, 2),
        isDebug: true,
        isCollapsible: true,
        isExpanded: false
      }]);

      const response = await chatModel.invoke([
        new SystemMessage(SYSTEM_PROMPT),
        new HumanMessage(`Zapytanie użytkownika: "${userMessage}"

Znalezione zakładki:
${JSON.stringify(formattedBookmarks, null, 2)}

Pomóż użytkownikowi znaleźć odpowiednie zakładki lub zaproponuj organizację.`)
      ]);
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.content.toString()
      }]);

      if (response.content.toString().startsWith('/')) {
        onCommandReceived?.(response.content.toString());
      }
    } catch (error: any) {
      console.error('Błąd w chacie:', error);
      addDebugMessage(`❌ Błąd: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDialogClose = () => {
    if (confirmDialogData.resolve) {
      confirmDialogData.resolve(false);
    }
    setConfirmDialogData({
      open: false,
      bookmarks: [],
      resolve: null
    });
  };

  const handleConfirmDialogConfirm = () => {
    if (confirmDialogData.resolve) {
      confirmDialogData.resolve(true);
    }
    setConfirmDialogData({
      open: false,
      bookmarks: [],
      resolve: null
    });
  };

  return (
    <Paper sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      p: 2,
      maxWidth: '400px'
    }}>
      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
        <Button 
          onClick={() => {
            const debug = vectorStoreService.getDebugInfo();
            console.log('Debug info:', debug);
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `Informacje debugowania:
1. Status:
   - Zainicjalizowana: ${debug.isInitialized}
   - Provider: ${debug.provider}
   - Embeddings: ${debug.embeddingsStatus}
   - VectorStore: ${debug.vectorStoreStatus}

2. Dokumenty:
   - Liczba: ${debug.documentsCount}
   - Przykładowe (5):
     ${JSON.stringify(debug.sampleDocuments, null, 2)}

3. Struktura folderów:
${JSON.stringify(debug.folderStructure, null, 2)}
`
            }]);
          }}
          size="small"
          variant="outlined"
        >
          Debug Szczegółowy
        </Button>
        <Button
          onClick={async () => {
            try {
              await vectorStoreService.regenerateEmbeddings();
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Embeddingi zostały zregenerowane'
              }]);
            } catch (error) {
              console.error('Błąd regeneracji:', error);
            }
          }}
          size="small"
          variant="outlined"
          color="secondary"
        >
          Regeneruj Embeddingi
        </Button>
      </Box>
      <Box sx={{ 
        flexGrow: 1, 
        overflowY: 'auto',
        mb: 2,
        gap: 2,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {messages.map((message, index) => (
          <Box
            key={index}
            sx={{
              alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
              backgroundColor: message.isDebug 
                ? 'grey.300'
                : message.role === 'user' 
                  ? 'primary.main' 
                  : 'grey.100',
              color: message.role === 'user' ? 'white' : 'text.primary',
              p: 1,
              borderRadius: 1,
              maxWidth: '80%',
              fontFamily: message.isDebug ? 'monospace' : 'inherit',
              fontSize: message.isDebug ? '0.9em' : 'inherit',
              cursor: message.isCollapsible ? 'pointer' : 'default'
            }}
            onClick={() => {
              if (message.isCollapsible) {
                setMessages(prev => prev.map((m, i) => 
                  i === index ? { ...m, isExpanded: !m.isExpanded } : m
                ));
              }
            }}
          >
            {message.isCollapsible && !message.isExpanded ? (
              <Typography variant="body2">
                📋 Kliknij aby zobaczyć szczegóły ({message.content.length} znaków)
              </Typography>
            ) : (
              <Typography 
                variant="body2" 
                sx={{ 
                  whiteSpace: message.isDebug ? 'pre-wrap' : 'normal',
                  opacity: message.isDebug ? 0.8 : 1
                }}
              >
                {message.content}
              </Typography>
            )}
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          variant="outlined"
          size="small"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          disabled={isLoading}
          placeholder={isLoading ? 'Czekam na odpowiedź...' : 'Wpisz wiadomość...'}
          InputProps={{
            endAdornment: isLoading && (
              <CircularProgress size={20} sx={{ mr: 1 }} />
            )
          }}
        />
        <IconButton 
          color="primary" 
          onClick={handleSend}
          disabled={isLoading}
        >
          {isLoading ? <CircularProgress size={24} /> : <SendIcon />}
        </IconButton>
      </Box>
      <EmbeddingsConfirmDialog
        open={confirmDialogData.open}
        bookmarksToProcess={confirmDialogData.bookmarks}
        onClose={handleConfirmDialogClose}
        onConfirm={handleConfirmDialogConfirm}
      />
    </Paper>
  );
}; 