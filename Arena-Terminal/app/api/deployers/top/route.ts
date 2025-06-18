import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    const client = await pool.connect();
    try {
      // Subquery to get the most recent token with lp_deployed = true for each deployer
      const result = await client.query(`
        WITH most_recent_success AS (
          SELECT DISTINCT ON (deployer_wallet)
            deployer_wallet,
            token_symbol,
            token_address,
            timestamp
          FROM token_deployments
          WHERE lp_deployed = true
          ORDER BY deployer_wallet, timestamp DESC
        )
        SELECT
          d.deployer_wallet,
          COUNT(*) AS total_deployments,
          COUNT(*) FILTER (WHERE d.lp_deployed = true) AS successful_bonds,
          mrs.token_symbol,
          mrs.token_address
        FROM token_deployments d
        LEFT JOIN most_recent_success mrs
          ON d.deployer_wallet = mrs.deployer_wallet
        GROUP BY d.deployer_wallet, mrs.token_symbol, mrs.token_address
        ORDER BY successful_bonds DESC, total_deployments DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);
      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching top deployers:', error);
    return NextResponse.json([], { status: 500 });
  }
}