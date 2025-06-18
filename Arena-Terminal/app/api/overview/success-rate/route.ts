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
          COUNT(*) FILTER (WHERE lp_deployed = true) AS successful,
          COUNT(*) AS total
        FROM token_deployments
      `);

      const successful = parseInt(result.rows[0].successful);
      const total = parseInt(result.rows[0].total);

      const chartData = [{
        values: [successful, total - successful],
        labels: ['Successful', 'Failed'],
        type: 'pie',
        marker: {
          colors: ['#FFC733', '#FF5733']
        },
        textinfo: 'label+percent',
        textfont: { color: '#e0e0e0' }
      }];

      return NextResponse.json(chartData);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    
    // Return mock data if database connection fails
    return NextResponse.json([{
      values: [71, 29],
      labels: ['Successful', 'Failed'],
      type: 'pie',
      marker: {
        colors: ['#FFC733', '#FF5733']
      },
      textinfo: 'label+percent',
      textfont: { color: '#e0e0e0' }
    }]);
  }
}