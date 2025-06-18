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
      const result = await client.query(`
        SELECT
          d.deployer_wallet,
          COUNT(*) AS total_deployments,
          COUNT(*) FILTER (WHERE d.lp_deployed = true) AS successful_bonds,
          mrt.token_symbol,
          mrt.token_address,
          ROUND(
            100.0 * COUNT(*) FILTER (WHERE d.lp_deployed = true) / NULLIF(COUNT(*), 0),
            1
          ) AS success_rate
        FROM token_deployments d
        LEFT JOIN (
          SELECT DISTINCT ON (deployer_wallet)
            deployer_wallet,
            token_symbol,
            token_address,
            timestamp
          FROM token_deployments
          ORDER BY deployer_wallet, timestamp DESC
        ) mrt ON d.deployer_wallet = mrt.deployer_wallet
        GROUP BY d.deployer_wallet, mrt.token_symbol, mrt.token_address
        HAVING COUNT(*) > 10 AND (
          (COUNT(*) FILTER (WHERE d.lp_deployed = true) * 1.0 / NULLIF(COUNT(*), 0)) <= 0.1
          OR COUNT(*) FILTER (WHERE d.lp_deployed = true) = 0
        )
        ORDER BY 
          (COUNT(*) FILTER (WHERE d.lp_deployed = true) = 1) DESC,
          (COUNT(*) FILTER (WHERE d.lp_deployed = true) = 0) DESC,
          total_deployments DESC
        LIMIT 50
      `);
      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching high-risk deployers:', error);
    return NextResponse.json([], { status: 500 });
  }
} 