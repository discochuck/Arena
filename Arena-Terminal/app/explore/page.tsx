'use client';

import { useCallback } from 'react';
import { ColumnSection } from '../../components/explore/ColumnSection';
import { FaShieldAlt } from 'react-icons/fa';

export default function ExplorePage() {
  // Quick buy handler
  const handleQuickBuy = useCallback((token: any) => {
    console.log('Quick buy triggered for:', token.name);
    
    const details = `
🚀 QUICK BUY: ${token.name} (${token.symbol})

💰 Price: ${token.price ? `$${token.price.toFixed(6)}` : 'N/A'}
📊 Market Cap: ${token.marketCap ? `$${token.marketCap.toLocaleString()}` : 'N/A'}
📈 Progress: ${token.progress ? `${(token.progress * 100).toFixed(1)}%` : 'N/A'}
👥 Holders: ${token.holders || 'N/A'}
💎 Volume: ${token.volume ? `$${token.volume.toLocaleString()}` : 'N/A'}

📍 Contract: ${token.tokenAddress}

⚡ Ready to buy?
    `;
    
    alert(details);
  }, []);

  return (
    <div className="min-h-screen bg-arena-dark text-arena-text-primary">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Compact Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-bold text-gradient">
              Arena Terminal
            </h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-arena-text-muted">
                <FaShieldAlt className="text-green-400" />
                <span>Secure Connection</span>
              </div>
              <button className="px-4 py-2 bg-arena-orange hover:bg-arena-orange/80 rounded-lg text-sm font-medium transition-colors text-white">
                Connect Wallet
              </button>
            </div>
          </div>
          
          <div className="text-arena-text-secondary text-sm">
            Real-time token discovery and trading dashboard
          </div>
        </div>

        {/* Main Content Grid - Fixed Height Issue */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ColumnSection
            title="NEW PAIRS"
            apiEndpoint="/api/explore/new-pairs"
            onQuickBuy={handleQuickBuy}
            headerClassName="bg-green-900/20 border-green-500/20"
            className="h-[600px]"
          />
          <ColumnSection
            title="FINAL STRETCH"
            apiEndpoint="/api/explore/final-stretch"
            onQuickBuy={handleQuickBuy}
            headerClassName="bg-yellow-900/20 border-yellow-500/20"
            className="h-[600px]"
          />
          <ColumnSection
            title="MIGRATED"
            apiEndpoint="/api/explore/migrated"
            onQuickBuy={handleQuickBuy}
            headerClassName="bg-blue-900/20 border-blue-500/20"
            className="h-[600px]"
          />
        </div>
      </div>
    </div>
  );
}