'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MetricCard } from './MetricCard';
import { PlotlyChart } from '../charts/PlotlyChart';
import { 
  Activity, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Shield, 
  Zap 
} from 'lucide-react';
import { apiClient } from '../../lib/api';

interface OverviewData {
  totalDeployments: number;
  successfulBonds: number;
  activeDeployers: number;
  totalVolume: number;
  averageRiskScore: number;
  deploymentTrend: any[];
  successRateData: any[];
}

export function OverviewTab() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentDeployments, setRecentDeployments] = useState<any[]>([]);

  useEffect(() => {
    const fetchAllOverviewData = async () => {
      try {
        // Fetch metrics
        const overviewMetrics = await apiClient.getOverviewMetrics();
        const deploymentTrend = await apiClient.getDeploymentTrend();
        const successRateData = await apiClient.getSuccessRateData();

        setData({
          totalDeployments: overviewMetrics.totalDeployments,
          successfulBonds: overviewMetrics.successfulBonds,
          activeDeployers: overviewMetrics.activeDeployers,
          totalVolume: overviewMetrics.totalVolume,
          averageRiskScore: overviewMetrics.averageRiskScore,
          deploymentTrend,
          successRateData,
        });

        // Fetch recent deployments
        const res = await fetch('/api/deployments/recent?limit=10');
        const recent = await res.json();
        setRecentDeployments(recent);
      } catch (error) {
        console.error('Error fetching overview data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllOverviewData(); // Initial fetch

    const interval = setInterval(fetchAllOverviewData, 15000); // 15 seconds

    return () => clearInterval(interval); // Cleanup
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="terminal-card h-32 animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const successRate = ((data.successfulBonds / data.totalDeployments) * 100).toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Total Deployments"
          value={data.totalDeployments}
          change="+12.3%"
          changeType="positive"
          icon={Activity}
        />
        <MetricCard
          title="Success Rate"
          value={`${successRate}%`}
          change="+2.1%"
          changeType="positive"
          icon={TrendingUp}
        />
        <MetricCard
          title="Active Deployers"
          value={data.activeDeployers}
          change="+5.7%"
          changeType="positive"
          icon={Users}
        />
        <MetricCard
          title="Total Volume"
          value={`$${(data.totalVolume / 1000000).toFixed(1)}M`}
          change="+18.4%"
          changeType="positive"
          icon={DollarSign}
        />
        <MetricCard
          title="Avg Risk Score"
          value={data.averageRiskScore}
          change="-3.2%"
          changeType="positive"
          icon={Shield}
        />
        <MetricCard
          title="24h Activity"
          value="1,247"
          change="+25.6%"
          changeType="positive"
          icon={Zap}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Deployment Trend */}
        <div className="terminal-card">
          <h3 className="text-xl font-semibold mb-4 text-arena-text-primary">
            Weekly Deployment Trend
          </h3>
          <PlotlyChart
            data={data.deploymentTrend}
            layout={{
              title: {
                text: '',
                font: { color: '#e0e0e0' }
              },
              xaxis: { title: 'Day' },
              yaxis: { title: 'Deployments' },
              barmode: 'overlay'
            }}
            className="h-80"
          />
        </div>

        {/* Success Rate Pie Chart */}
        <div className="terminal-card">
          <h3 className="text-xl font-semibold mb-4 text-arena-text-primary">
            Deployment Success Rate
          </h3>
          <PlotlyChart
            data={data.successRateData}
            layout={{
              title: {
                text: '',
                font: { color: '#e0e0e0' }
              },
              showlegend: true
            }}
            className="h-80"
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="terminal-card">
        <h3 className="text-xl font-semibold mb-4 text-arena-text-primary">
          Recent Deployments
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-arena-border">
                <th className="text-left py-3 px-4 font-semibold text-arena-text-secondary">Token</th>
                <th className="text-left py-3 px-4 font-semibold text-arena-text-secondary">Deployer</th>
                <th className="text-left py-3 px-4 font-semibold text-arena-text-secondary">Market Cap</th>
                <th className="text-left py-3 px-4 font-semibold text-arena-text-secondary">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-arena-text-secondary">Time</th>
              </tr>
            </thead>
            <tbody className="font-mono text-sm">
              {recentDeployments.length > 0 ? recentDeployments.map((item, index) => {
                const status = item.bonded_timestamp ? 'Bonded' : 'Active';
                const marketCap = item.market_cap ? `$${(item.market_cap / 1_000_000).toFixed(2)}M` : 'N/A';
                const deployer = item.deployer_wallet ? `${item.deployer_wallet.substring(0, 6)}...${item.deployer_wallet.slice(-4)}` : '';
                const time = item.timestamp ? new Date(item.timestamp).toLocaleString() : '';
                return (
                  <motion.tr
                    key={item.token_address + item.deployer_wallet}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="border-b border-arena-border/50 hover:bg-arena-secondary/30 transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold text-arena-orange">{item.token_symbol || item.token_name}</td>
                    <td className="py-3 px-4 text-arena-text-secondary">{deployer}</td>
                    <td className="py-3 px-4 text-arena-text-primary">{marketCap}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${status === 'Bonded' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-arena-text-muted">{time}</td>
                  </motion.tr>
                );
              }) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-arena-text-muted">
                    No recent deployments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}