import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = parseInt(searchParams.get('offset') || '0');
  const dateStart = searchParams.get('dateStart');
  const dateEnd = searchParams.get('dateEnd');
  const minMarketCap = searchParams.get('minMarketCap');
  const deployer = searchParams.get('deployer');

  try {
    const client = await pool.connect();
    
    try {
      let query = `
        SELECT 
          td.*,
          amd.market_cap,
          amd.price_usd,
          amd.volume_24h,
          amd.liquidity_usd
        FROM token_deployments td
        LEFT JOIN arena_market_data amd ON td.token_address = amd.token_address
        WHERE 1=1
      `;
      
      const params: any[] = [];
      let paramCount = 0;

      if (dateStart) {
        paramCount++;
        query += ` AND td.timestamp >= $${paramCount}`;
        params.push(dateStart);
      }

      if (dateEnd) {
        paramCount++;
        query += ` AND td.timestamp <= $${paramCount}`;
        params.push(dateEnd);
      }

      if (minMarketCap) {
        paramCount++;
        query += ` AND amd.market_cap >= $${paramCount}`;
        params.push(parseInt(minMarketCap));
      }

      if (deployer) {
        paramCount++;
        query += ` AND td.deployer_wallet = $${paramCount}`;
        params.push(deployer);
      }

      query += ` ORDER BY td.timestamp DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(limit, offset);

      const result = await client.query(query, params);
      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to fetch deployments' }, { status: 500 });
  }
}