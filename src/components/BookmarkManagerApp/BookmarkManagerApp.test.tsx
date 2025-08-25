/// <reference types="chrome" />

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

import { BookmarkManagerApp } from './BookmarkManagerApp';

// Mock services
vi.mock('../../services/vectorStore', () => ({
  vectorStoreService: {
    searchBookmarks: vi.fn(),
    indexBookmarks: vi.fn(),
    deleteBookmark: vi.fn(),
  }
}));

vi.mock('../../services/ai.service', () => ({
  aiService: {
    processQuery: vi.fn(),
    generateSummary: vi.fn(),
  }
}));

vi.mock('../../services/settings.service', () => ({
  settingsService: {
    getSettings: vi.fn().mockResolvedValue({}),
    updateSettings: vi.fn().mockResolvedValue(undefined),
  }
}));

describe('BookmarkManagerApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search interface correctly', () => {
    render(<BookmarkManagerApp />);

    expect(screen.getByPlaceholderText(/Search bookmarks/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Search/i })).toBeInTheDocument();
  });

  it('displays loading state during search', async () => {
    const user = userEvent.setup();

    // Mock delayed response
    const { vectorStoreService } = await import('../../services/vectorStore');
    (vectorStoreService.searchBookmarks as any).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve([]), 100))
    );

    render(<BookmarkManagerApp />);

    const searchInput = screen.getByPlaceholderText(/Search bookmarks/i);
    const searchButton = screen.getByRole('button', { name: /Search/i });

    await user.type(searchInput, 'test query');
    await user.click(searchButton);

    // Should show loading state
    expect(screen.getByText(/Searching/i)).toBeInTheDocument();
  });

  it('displays search results', async () => {
    const user = userEvent.setup();
    const mockResults = [
      {
        bookmark: {
          id: '1',
          title: 'Test Bookmark',
          url: 'https://example.com',
          content: 'Test content',
          category: 'test'
        },
        score: 0.95
      }
    ];

    const { vectorStoreService } = await import('../../services/vectorStore');
    (vectorStoreService.searchBookmarks as any).mockResolvedValue(mockResults);

    render(<BookmarkManagerApp />);

    const searchInput = screen.getByPlaceholderText(/Search bookmarks/i);
    const searchButton = screen.getByRole('button', { name: /Search/i });

    await user.type(searchInput, 'test query');
    await user.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('Test Bookmark')).toBeInTheDocument();
      expect(screen.getByText('https://example.com')).toBeInTheDocument();
      expect(screen.getByText('95%')).toBeInTheDocument();
    });
  });

  it('handles search errors gracefully', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Search failed';

    const { vectorStoreService } = await import('../../services/vectorStore');
    (vectorStoreService.searchBookmarks as any).mockRejectedValue(new Error(errorMessage));

    render(<BookmarkManagerApp />);

    const searchInput = screen.getByPlaceholderText(/Search bookmarks/i);
    const searchButton = screen.getByRole('button', { name: /Search/i });

    await user.type(searchInput, 'test query');
    await user.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText(/Error/i)).toBeInTheDocument();
    });
  });

  it('searches on Enter key press', async () => {
    const user = userEvent.setup();

    const { vectorStoreService } = await import('../../services/vectorStore');
    (vectorStoreService.searchBookmarks as any).mockResolvedValue([]);

    render(<BookmarkManagerApp />);

    const searchInput = screen.getByPlaceholderText(/Search bookmarks/i);

    await user.type(searchInput, 'test query{enter}');

    expect(vectorStoreService.searchBookmarks).toHaveBeenCalledWith('test query', expect.any(Object));
  });

  it('shows empty state when no results', async () => {
    const user = userEvent.setup();

    const { vectorStoreService } = await import('../../services/vectorStore');
    (vectorStoreService.searchBookmarks as any).mockResolvedValue([]);

    render(<BookmarkManagerApp />);

    const searchInput = screen.getByPlaceholderText(/Search bookmarks/i);
    const searchButton = screen.getByRole('button', { name: /Search/i });

    await user.type(searchInput, 'nonexistent bookmark');
    await user.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText(/No bookmarks found/i)).toBeInTheDocument();
    });
  });
});

