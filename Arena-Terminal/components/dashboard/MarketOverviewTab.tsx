'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PlotlyChart } from '../charts/PlotlyChart';
import { apiClient, MarketData } from '../../lib/api';
import MarketTreemap from '../charts/MarketTreemap';

export function MarketOverviewTab() {
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        setLoading(true);
        const data = await apiClient.getMarketData();
        // Sort by market_cap in descending order and take the top 20 for the treemap
        const topTokens = data.sort((a, b) => (Number(b.market_cap) || 0) - (Number(a.market_cap) || 0)).slice(0, 20);
        setMarketData(topTokens);
      } catch (err) {
        console.error('Error fetching market data for treemap:', err);
        setError('Failed to load market data.');
      } finally {
        setLoading(false);
      }
    };

    fetchMarketData();
  }, []);

  if (loading) {
    return (
      <div className="terminal-card p-8 text-center">
        <h2 className="text-2xl font-semibold mb-4">Loading Market Overview...</h2>
        <p className="text-arena-text-secondary">Fetching top tokens by market cap.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="terminal-card p-8 text-center text-red-500">
        <h2 className="text-2xl font-semibold mb-4">Error</h2>
        <p className="text-arena-text-secondary">{error}</p>
      </div>
    );
  }

  if (marketData.length === 0) {
    return (
      <div className="terminal-card p-8 text-center">
        <h2 className="text-2xl font-semibold mb-4">No Market Data Available</h2>
        <p className="text-arena-text-secondary">Please ensure your database has data in arena_market_data.</p>
      </div>
    );
  }

  const treemapData = [
    {
      type: 'treemap',
      labels: marketData.map(token => token.token_symbol),
      parents: Array(marketData.length).fill('Top Tokens'), // All directly under a common parent
      values: marketData.map(token => Number(token.market_cap) || 0),
      marker: {
        colorscale: 'Greens', // You can choose a different colorscale
      },
      textinfo: 'label+value',
      hoverinfo: 'text',
      text: marketData.map(token => {
        const marketCap = Number(token.market_cap) || 0;
        const priceUsd = Number(token.price_usd) || 0;
        return `<b>${token.token_symbol}</b><br>Market Cap: $${(marketCap / 1000000).toFixed(2)}M<br>Price: $${priceUsd.toFixed(4)}`;
      }),
      pathbar: { visible: false },
    },
  ];

  const treemapLayout = {
    title: {
      text: 'Top Tokens by Market Cap',
      font: { color: '#e0e0e0' },
    },
    paper_bgcolor: '#1a1a1a',
    plot_bgcolor: '#1a1a1a',
    font: { color: '#e0e0e0' },
    margin: { l: 0, r: 0, b: 0, t: 50 },
  };

  return (
    <div>
      {/* <MarketTreemap /> Removed to avoid duplicate treemaps */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="terminal-card p-6"
      >
        <PlotlyChart
          data={treemapData}
          layout={treemapLayout}
          className="w-full h-[600px]"
        />
      </motion.div>
    </div>
  );
}