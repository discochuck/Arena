'use client';

import { useState, useEffect } from 'react';
import { Search, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiClient } from '../../lib/api';

interface SearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
}

export function SearchBar({ onSearch, placeholder = "Search tokens, deployers, or addresses..." }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [popularTokens, setPopularTokens] = useState<{ symbol: string, address: string }[]>([]);

  useEffect(() => {
    const fetchPopularTokens = async () => {
      try {
        const data = await apiClient.getMarketData();
        // Sort by market_cap in descending order and take the top 6
        const topTokens = data
          .sort((a, b) => b.market_cap - a.market_cap)
          .slice(0, 6)
          .map(token => ({ symbol: token.token_symbol, address: token.token_address }));
        setPopularTokens(topTokens);
      } catch (error) {
        console.error('Error fetching popular tokens:', error);
        // Fallback to mock data if API call fails
        setPopularTokens(['PEPE', 'SHIB', 'DOGE', 'BONK', 'WIF', 'FLOKI']);
      }
    };

    fetchPopularTokens();
  }, []);

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    onSearch?.(searchQuery);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch?.(query);
    }
  };

  const handlePopularClick = (token: { symbol: string, address: string }) => {
    if (token.address) {
      window.open(`https://dexscreener.com/avalanche/${token.address}`, '_blank', 'noopener');
    } else {
      handleSearch(token.symbol);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto mb-8">
      {/* Main search bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`relative mb-6 transition-all duration-300 ${isFocused ? 'glow-orange' : ''}`}
      >
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-arena-text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="w-full bg-arena-secondary border border-arena-border rounded-xl pl-12 pr-6 py-4 text-lg text-arena-text-primary placeholder-arena-text-muted focus:border-arena-orange focus:outline-none transition-all duration-300"
        />
        {query && (
          <button
            onClick={() => handleSearch(query)}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 terminal-button text-sm"
          >
            Search
          </button>
        )}
      </motion.div>

      {/* Popular searches */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex items-center justify-center flex-wrap gap-3"
      >
        <div className="flex items-center text-arena-text-secondary text-sm mr-4">
          <TrendingUp className="w-4 h-4 mr-2" />
          Popular:
        </div>
        {popularTokens.map((token, index) => (
          <motion.button
            key={token.symbol}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            onClick={() => handlePopularClick(token)}
            className="px-4 py-2 bg-arena-secondary border border-arena-border rounded-full text-sm text-arena-orange hover:bg-arena-orange hover:text-white transition-all duration-200 hover:scale-105"
          >
            {token.symbol}
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}