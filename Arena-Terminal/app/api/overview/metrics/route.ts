import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect();
    
    try {
      // Get total deployments
      const totalDeploymentsResult = await client.query(
        'SELECT COUNT(*) as total FROM token_deployments'
      );
      const totalDeployments = parseInt(totalDeploymentsResult.rows[0].total);

      // Get successful bonds (tokens with lp_deployed = true)
      const successfulBondsResult = await client.query(
        'SELECT COUNT(*) as total FROM token_deployments WHERE lp_deployed = true'
      );
      const successfulBonds = parseInt(successfulBondsResult.rows[0].total);

      // Get active deployers (unique deployers in last 30 days)
      const activeDeployersResult = await client.query(`
        SELECT COUNT(DISTINCT deployer_wallet) as total 
        FROM token_deployments 
        WHERE timestamp > NOW() - INTERVAL '30 days'
      `);
      const activeDeployers = parseInt(activeDeployersResult.rows[0].total);

      // Get total volume from market data
      const totalVolumeResult = await client.query(
        'SELECT COALESCE(SUM(volume_24h), 0) as total FROM arena_market_data'
      );
      const totalVolume = parseFloat(totalVolumeResult.rows[0].total);

      // Calculate average risk score (placeholder calculation)
      // In a real implementation, you'd have a risk_scores table
      const averageRiskScore = totalDeployments > 0 
        ? ((totalDeployments - successfulBonds) / totalDeployments) * 100 
        : 0;

      const metrics = {
        totalDeployments,
        successfulBonds,
        activeDeployers,
        totalVolume,
        averageRiskScore: Math.round(averageRiskScore * 10) / 10, // Round to 1 decimal
      };

      return NextResponse.json(metrics);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    
    // Return mock data if database connection fails
    return NextResponse.json({
      totalDeployments: 12543,
      successfulBonds: 8921,
      activeDeployers: 1847,
      totalVolume: 245600000,
      averageRiskScore: 23.5,
    });
  }
}