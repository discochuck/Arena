import React from 'react';
import { useEffect, useState } from 'react';
import { Treemap, ResponsiveContainer } from 'recharts';

interface Token {
  token_address: string;
  token_name: string;
  token_symbol: string;
  market_cap: number | string;
  price_usd: number | string;
  volume_24h: number | string;
  liquidity_usd: number | string;
  last_updated: string;
}

export default function MarketTreemap() {
  const [data, setData] = useState<Token[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/market-data')
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-8">Loading market data...</div>;
  if (!data || !Array.isArray(data) || data.length === 0) {
    return <div className="text-center py-8">No market data found.</div>;
  }

  // Sort by market cap desc, take top 15, aggregate the rest
  const sorted = [...data].sort((a, b) => Number(b.market_cap) - Number(a.market_cap));
  const top15 = sorted.slice(0, 15);
  const rest = sorted.slice(15);
  const restMarketCap = rest.reduce((sum, t) => sum + Number(t.market_cap || 0), 0);

  const treemapData = [
    ...top15.map(token => ({
      name: token.token_symbol,
      value: Number(token.market_cap),
      image: null, // add image if you have it
      url: `https://dexscreener.com/avalanche/${token.token_address}`,
    })),
    {
      name: `All Others (${rest.length})`,
      value: restMarketCap,
      image: null,
      url: null,
    }
  ];

  // Custom content for treemap nodes
  const renderCustomContent = (props: any) => {
    const { x, y, width, height, name, image, url, value } = props;
    const handleClick = () => {
      if (url) window.open(url, '_blank', 'noopener');
    };
    return (
      <g
        onClick={url ? handleClick : undefined}
        style={url ? { cursor: 'pointer' } : undefined}
      >
        <rect x={x} y={y} width={width} height={height} fill={url ? '#e5fbe5' : '#c8f7c5'} stroke="#222" />
        {image && url && <image href={image} x={x + 4} y={y + 4} width={32} height={32} style={{ pointerEvents: 'none' }} />}
        <text x={x + 8} y={y + 24} fontSize={16} fill="#222">{name}</text>
        <text x={x + 8} y={y + 48} fontSize={14} fill="#222">{value.toLocaleString()}</text>
      </g>
    );
  };

  return (
    <div className="w-full h-[600px] bg-arena-secondary rounded shadow p-4">
      <h2 className="text-xl font-bold mb-4 text-center">Top Tokens by Market Cap</h2>
      <ResponsiveContainer width="100%" height="90%">
        <Treemap
          data={treemapData}
          dataKey="value"
          stroke="#222"
          fill="#2ecc40"
          content={React.createElement(renderCustomContent)}
        />
      </ResponsiveContainer>
    </div>
  );
} 