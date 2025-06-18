import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT token_address, token_name, token_symbol, market_cap, price_usd, volume_24h, liquidity_usd, last_updated FROM arena_market_data ORDER BY market_cap DESC'
      );
      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching market data:', error);
    return NextResponse.json({ message: 'Failed to fetch market data', error: (error as Error).message }, { status: 500 });
  }
} 