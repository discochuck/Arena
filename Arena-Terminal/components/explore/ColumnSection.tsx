'use client';

import { useEffect, useState, useCallback } from 'react';
import { TokenRow } from './TokenRow';

interface Token {
  logo: string;
  name: string;
  symbol: string;
  timeAgo: string;
  socials: {
    x?: string;
    telegram?: string;
    website?: string;
  };
  percentChange: number;
  price: number;
  marketCap: number;
  txCount: number;
  progress: number;
  tokenAddress: string;
  holders: number;
  volume: number;
  description?: string;
  tags?: string[];
  totalBonded?: number;
  bondingRatio?: number;
  blockNumber?: number;
  timestamp?: number;
  createdAt?: string;
  creator?: string;
  tokenId?: string;
}

export function ColumnSection({ 
  title, 
  apiEndpoint, 
  onQuickBuy,
  className = '', 
  headerClassName = '' 
}: { 
  title: string; 
  apiEndpoint: string; 
  onQuickBuy?: (token: Token) => void;
  className?: string; 
  headerClassName?: string; 
}) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let interval: NodeJS.Timeout;

    const fetchTokens = async () => {
      try {
        const res = await fetch(apiEndpoint);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        
        if (isMounted) {
          setTokens(Array.isArray(data) ? data : []);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        console.error(`Error fetching ${title} tokens:`, err);
        if (isMounted) {
          setError('Failed to load tokens');
          setLoading(false);
        }
      }
    };

    fetchTokens();
    interval = setInterval(fetchTokens, 30000); // Refresh every 30 seconds
    
    return () => { 
      isMounted = false; 
      clearInterval(interval); 
    };
  }, [apiEndpoint, title]);

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className={`bg-arena-secondary border border-arena-border rounded-lg h-full ${className}`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b border-arena-border ${headerClassName}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-arena-orange uppercase tracking-wide">
            {title}
          </h3>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${error ? 'bg-red-400' : 'bg-green-400 animate-pulse'}`}></div>
            <span className="text-xs text-arena-text-muted">
              {error ? 'Error' : 'Live'}
            </span>
          </div>
        </div>
        
        {/* Stats */}
        {tokens.length > 0 && (
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-arena-text-muted text-xs">Tokens</div>
              <div className="font-bold text-arena-text-primary">{tokens.length}</div>
            </div>
            <div>
              <div className="text-arena-text-muted text-xs">Total MC</div>
              <div className="font-bold text-green-400">
                ${formatNumber(tokens.reduce((sum, t) => sum + (t.marketCap || 0), 0))}
              </div>
            </div>
            <div>
              <div className="text-arena-text-muted text-xs">Total TXs</div>
              <div className="font-bold text-blue-400">
                {tokens.reduce((sum, t) => sum + (t.txCount || 0), 0)}
              </div>
            </div>
            <div>
              <div className="text-arena-text-muted text-xs">Holders</div>
              <div className="font-bold text-purple-400">
                {formatNumber(tokens.reduce((sum, t) => sum + (t.holders || 0), 0))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="h-96 overflow-y-auto p-4">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-arena-border/10 rounded-lg p-4 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-arena-border rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-arena-border rounded w-1/3" />
                    <div className="h-3 bg-arena-border rounded w-1/4" />
                  </div>
                  <div className="w-16 h-8 bg-arena-border rounded" />
                </div>
                <div className="h-2 bg-arena-border rounded w-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-32 text-red-400 text-sm">
            {error}
          </div>
        ) : tokens.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-arena-text-muted text-sm">
            <div className="text-center">
              <div>No tokens found</div>
              <div className="text-xs mt-1">Waiting for new launches...</div>
            </div>
          </div>
        ) : (
          <div>
            {tokens.slice(0, 10).map((token) => (
              <TokenRow 
                key={`${token.tokenAddress}-${token.tokenId || token.timeAgo}`} 
                token={token} 
                onQuickBuy={onQuickBuy}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-arena-border text-xs text-arena-text-muted">
        Updated {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}