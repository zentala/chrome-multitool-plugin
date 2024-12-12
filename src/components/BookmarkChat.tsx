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

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface BookmarkChatProps {
  bookmarks: BookmarkEntity[];
  onCommandReceived?: (command: string) => void;
}

const SYSTEM_PROMPT = `Jesteś asystentem pomagającym w organizacji zakładek.
Będziesz otrzymywać wyniki wyszukiwania najbardziej pasujących zakładek do zapytania użytkownika.
Odpowiadaj w języku polskim i sugeruj akcje używając komend:
/search <query> - wyszukiwanie
/tag <bookmark_id> - sugestia tagów
/organize - propozycja reorganizacji
`;

export const BookmarkChat: React.FC<BookmarkChatProps> = ({ bookmarks, onCommandReceived }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedProvider, setSelectedProvider] = useState<'openai' | 'anthropic'>('openai');
  const [chatModel, setChatModel] = useState<ChatOpenAI | ChatAnthropic | null>(null);

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

  const handleSend = async () => {
    if (!input.trim() || !chatModel) return;

    try {
      const similarBookmarks = await vectorStoreService.similaritySearch(input);
      
      const response = await chatModel.invoke([
        new SystemMessage(SYSTEM_PROMPT),
        new HumanMessage(JSON.stringify({ 
          query: input,
          relevantBookmarks: similarBookmarks 
        }))
      ]);
      
      const responseContent = response.content.toString();
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: responseContent
      };
      
      setMessages(prev => [...prev, assistantMessage]);

      if (responseContent.startsWith('/')) {
        onCommandReceived?.(responseContent);
      }
    } catch (error: any) {
      console.error('Błąd w chacie:', error);
      const errorMessage = error.error?.error?.message || error.message || 'Nieznany błąd';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Wystąpił błąd: ${errorMessage}`
      }]);
    } finally {
      setIsLoading(false);
    }
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
            const stats = vectorStoreService.getStats();
            console.log('Stan bazy wektorowej:', stats);
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `Stan bazy wektorowej:\n` +
                      `Zainicjalizowana: ${stats.isInitialized}\n` +
                      `Liczba dokumentów: ${stats.documentsCount}\n` +
                      `Przykładowy dokument: ${JSON.stringify(stats.documents[0], null, 2)}`
            }]);
          }}
          size="small"
          variant="outlined"
        >
          Debug Vector Store
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
              backgroundColor: message.role === 'user' ? 'primary.main' : 'grey.100',
              color: message.role === 'user' ? 'white' : 'text.primary',
              p: 1,
              borderRadius: 1,
              maxWidth: '80%'
            }}
          >
            <Typography variant="body2">{message.content}</Typography>
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
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          disabled={isLoading}
        />
        <IconButton 
          color="primary" 
          onClick={handleSend}
          disabled={isLoading}
        >
          {isLoading ? <CircularProgress size={24} /> : <SendIcon />}
        </IconButton>
      </Box>
    </Paper>
  );
}; 