'use client';

import { FaTwitter, FaTelegram, FaGlobe, FaBolt, FaUsers, FaCopy, FaExternalLinkAlt } from 'react-icons/fa';
import { useState } from 'react';

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
  creator?: string;
  tokenId?: string;
}

export function TokenRow({ token, onQuickBuy }: { token: Token; onQuickBuy?: (token: Token) => void }) {
  const [copied, setCopied] = useState(false);
  const [imageError, setImageError] = useState(false);

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
    return `$${num.toFixed(0)}`;
  };

  const formatPrice = (price: number) => {
    if (price >= 1) return `$${price.toFixed(4)}`;
    if (price >= 0.001) return `$${price.toFixed(6)}`;
    return `$${price.toExponential(2)}`;
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(token.tokenAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  const openBlockExplorer = () => {
    window.open(`https://snowtrace.io/token/${token.tokenAddress}`, '_blank');
  };

  const price = token.price || 0;
  const percentChange = token.percentChange || 0;
  const progress = Math.min(1, Math.max(0, token.progress || 0));

  return (
    <div className="bg-arena-secondary/50 border border-arena-border/30 rounded-lg p-4 mb-3 hover:border-arena-orange/50 transition-all duration-200 cursor-pointer">
      {/* Top Row */}
      <div className="flex items-center justify-between mb-3">
        {/* Left: Token Info */}
        <div className="flex items-center gap-3">
          <img 
            src={imageError ? '/placeholder-token.png' : token.logo} 
            alt={token.name}
            className="w-10 h-10 rounded-lg border border-arena-border bg-arena-border object-cover" 
            onError={() => setImageError(true)}
          />
          
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-arena-text-primary text-sm">
                {token.name || 'Unknown'}
              </span>
              <span className="text-arena-text-muted text-xs font-mono uppercase">
                {token.symbol || '???'}
              </span>
              <span className="text-arena-text-muted text-xs">
                {token.timeAgo}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-arena-text-muted">MC</span>
              <span className="text-xs font-mono text-green-400">{formatNumber(token.marketCap || 0)}</span>
              
              <span className="text-xs text-arena-text-muted ml-2">Vol</span>
              <span className="text-xs font-mono text-blue-400">{formatNumber(token.volume || 0)}</span>
              
              <div className="flex items-center gap-1 ml-2">
                <FaUsers className="text-xs text-purple-400" />
                <span className="text-xs font-mono text-purple-400">{token.holders || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Price & Change */}
        <div className="text-right">
          <div className="font-bold text-arena-text-primary mb-1">
            {formatPrice(price)}
          </div>
          <div 
            className={`text-sm font-bold px-2 py-1 rounded ${
              percentChange > 0 
                ? 'text-green-400 bg-green-400/10' 
                : percentChange < 0 
                ? 'text-red-400 bg-red-400/10' 
                : 'text-arena-text-muted bg-arena-border/20'
            }`}
          >
            {percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%
          </div>
        </div>

        {/* Quick Buy Button */}
        <button
          className={`ml-4 p-2 rounded-lg transition-all duration-200 hover:scale-110 ${
            progress >= 1 
              ? 'bg-green-500 hover:bg-green-600' 
              : 'bg-arena-orange hover:bg-arena-orange/80'
          } text-white`}
          onClick={(e) => { 
            e.stopPropagation(); 
            onQuickBuy?.(token); 
          }}
          title={progress >= 1 ? 'Trade on DEX' : 'Quick Buy'}
        >
          <FaBolt className="text-sm" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-arena-text-muted">Bonding Curve</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-arena-text-primary">
              {(progress * 100).toFixed(1)}%
            </span>
            {progress >= 0.9 && progress < 1 && (
              <span className="text-xs text-yellow-400 font-medium">🔥 Almost ready for DEX!</span>
            )}
          </div>
        </div>
        
        <div className="w-full h-2 bg-arena-border/30 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              progress >= 1 
                ? 'bg-green-400' 
                : progress >= 0.75 
                ? 'bg-yellow-400' 
                : 'bg-arena-orange'
            }`}
            style={{ width: `${Math.min(100, progress * 100)}%` }}
          />
        </div>
        
        <div className="flex items-center justify-between text-xs text-arena-text-muted">
          <span>{token.txCount} transactions</span>
          {token.totalBonded && (
            <span>{token.totalBonded.toFixed(1)} AVAX bonded</span>
          )}
        </div>
      </div>

      {/* Bottom Row: Social Links & Address */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-arena-border/20">
        <div className="flex items-center gap-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              copyAddress();
            }}
            className="flex items-center gap-1 text-xs text-arena-text-muted hover:text-arena-orange transition-colors"
            title={copied ? 'Copied!' : 'Copy address'}
          >
            <FaCopy className={`text-xs ${copied ? 'text-green-400' : ''}`} />
            <span className="font-mono">{token.tokenAddress.slice(0, 6)}...{token.tokenAddress.slice(-4)}</span>
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              openBlockExplorer();
            }}
            className="text-arena-text-muted hover:text-arena-orange transition-colors"
            title="View on Snowtrace"
          >
            <FaExternalLinkAlt className="text-xs" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {token.socials?.x && (
            <a 
              href={token.socials.x} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-arena-text-muted hover:text-blue-400 transition-colors"
            >
              <FaTwitter className="text-xs" />
            </a>
          )}
          {token.socials?.telegram && (
            <a 
              href={token.socials.telegram} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-arena-text-muted hover:text-blue-500 transition-colors"
            >
              <FaTelegram className="text-xs" />
            </a>
          )}
          {token.socials?.website && (
            <a 
              href={token.socials.website} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-arena-text-muted hover:text-green-400 transition-colors"
            >
              <FaGlobe className="text-xs" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}