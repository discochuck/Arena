import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10');

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          td.token_address,
          td.token_name,
          td.token_symbol,
          td.deployer_wallet,
          td.bonded_timestamp,
          td.timestamp,
          md.market_cap
        FROM token_deployments td
        LEFT JOIN arena_market_data md ON td.token_address = md.token_address
        ORDER BY md.market_cap DESC NULLS LAST, td.timestamp DESC
        LIMIT $1
      `, [limit]);
      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching recent deployments:', error);
    return NextResponse.json([], { status: 500 });
  }
} 