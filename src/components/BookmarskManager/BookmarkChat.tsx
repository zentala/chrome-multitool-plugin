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
import { settingsService } from '../../services/settings.service';
import { BookmarkEntity } from '../../types/bookmarks.types';
import { vectorStoreService } from '../../services/vectorStore';
import { EmbeddingsConfirmDialog } from './EmbeddingsConfirmDialog';
import { SearchResults, SearchResult } from './SearchResults';
import { DebugPanel } from '../FavouritiesAllegro/components/DebugPanel'

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string | React.ReactNode;
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

        // Zawsze potrzebujemy klucza OpenAI do embeddingów
        const openAIApiKey = await settingsService.getSetting('openai_api_key') || '';
        
        if (!openAIApiKey) {
          console.error('Brak klucza OpenAI - nie można zainicjalizować bazy wektorowej');
          return;
        }

        // Ustawienie callbacka potwierdzenia przed inicjalizacją
        vectorStoreService.setConfirmCallback(async (bookmarksToProcess: BookmarkEntity[]) => {
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
          console.log('[BookmarkChat] Stan debug mode przed dodaniem zakładek:', 
            await vectorStoreService.getDebugInfo());
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
      // Jeśli to jest komenda wyszukiwania
      if (userMessage.toLowerCase().includes('znajdz') || userMessage.toLowerCase().includes('szukaj')) {
        addDebugMessage(`🔍 Wyszukiwanie dla zapytania: "${userMessage}"`);
        const similarBookmarks = await vectorStoreService.similaritySearch(userMessage);
        
        // Dodaj wyniki wyszukiwania jako komponent React
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: <SearchResults results={similarBookmarks as SearchResult[]} />
        }]);
      } else {
        // Standardowa odpowiedź z chata
        const response = await chatModel.invoke([
          new SystemMessage(SYSTEM_PROMPT),
          new HumanMessage(userMessage)
        ]);

        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.content.toString()
        }]);

        if (response.content.toString().startsWith('/')) {
          onCommandReceived?.(response.content.toString());
        }
      }
    } catch (error: unknown) {
      console.error('Błąd w chacie:', error);
      if (error instanceof Error) {
        addDebugMessage(`❌ Błąd: ${error.message}`);
      } else {
        addDebugMessage(`❌ Błąd: ${String(error)}`);
      }
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
      overflow: 'hidden',
    }}>
      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
        <Button 
          onClick={() => {
            const debug = vectorStoreService.getDebugInfo();
            console.log('Debug info:', debug);
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: <DebugPanel debugInfo={debug as any} />
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
        overflowY: 'scroll',
        mb: 2,
        gap: 2,
        display: 'flex', 
        flexDirection: 'column',
        maxHeight: 'calc(100% - 100px)',
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
              p: 2,
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
                📋 Kliknij aby zobaczyć szczegóły
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