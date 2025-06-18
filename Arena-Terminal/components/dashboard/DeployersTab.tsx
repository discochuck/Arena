'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { apiClient } from '../../lib/api';

interface DeployerStats {
  deployer_wallet: string;
  total_deployments: number;
  successful_bonds: number;
  token_symbol?: string;
  token_address?: string;
}

const PAGE_SIZE = 10;

export function DeployersTab() {
  const [deployers, setDeployers] = useState<DeployerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const fetchDeployerData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/deployers/top?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`);
        const data = await res.json();
        setDeployers(data);
      } catch (err) {
        setError('Failed to load deployer data.');
      } finally {
        setLoading(false);
      }
    };
    fetchDeployerData();
  }, [page]);

  const handlePrev = () => setPage((p) => Math.max(0, p - 1));
  const handleNext = () => setPage((p) => p + 1);

  if (loading) {
    return (
      <div className="terminal-card p-8 text-center">
        <h2 className="text-2xl font-semibold mb-4">Loading Deployer Data...</h2>
        <p className="text-arena-text-secondary">Analyzing deployer wallets and their bond history.</p>
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="terminal-card p-6"
    >
      <h2 className="text-xl font-semibold mb-4 text-arena-text-primary">Top Deployers by Successful Bonds</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left table-auto">
          <thead>
            <tr className="border-b border-arena-border">
              <th className="py-3 px-4 font-semibold text-arena-text-secondary">Deployer Wallet</th>
              <th className="py-3 px-4 font-semibold text-arena-text-secondary">Token</th>
              <th className="py-3 px-4 font-semibold text-arena-text-secondary">Total Deployments</th>
              <th className="py-3 px-4 font-semibold text-arena-text-secondary">Successful Bonds</th>
              <th className="py-3 px-4 font-semibold text-arena-text-secondary">Success Rate</th>
            </tr>
          </thead>
          <tbody className="font-mono text-sm">
            {deployers.length > 0 ? (
              deployers.map((deployer, index) => (
                <motion.tr
                  key={deployer.deployer_wallet + (deployer.token_address || '')}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="border-b border-arena-border/50 hover:bg-arena-secondary/30 transition-colors"
                >
                  <td className="py-3 px-4 text-arena-orange">
                    <a
                      href={`https://intel.arkm.com/explorer/address/${deployer.deployer_wallet}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {deployer.deployer_wallet.substring(0, 6)}...{deployer.deployer_wallet.slice(-4)}
                    </a>
                  </td>
                  <td className="py-3 px-4 text-arena-orange">
                    {deployer.token_symbol && deployer.token_address ? (
                      <a
                        href={`https://dexscreener.com/avalanche/${deployer.token_address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {deployer.token_symbol}
                      </a>
                    ) : (
                      <span className="text-arena-text-muted">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-arena-text-primary">{deployer.total_deployments}</td>
                  <td className="py-3 px-4 text-arena-text-primary">{deployer.successful_bonds}</td>
                  <td className="py-3 px-4 text-arena-text-primary">
                    {deployer.total_deployments > 0
                      ? ((deployer.successful_bonds / deployer.total_deployments) * 100).toFixed(1) + '%'
                      : 'N/A'}
                  </td>
                </motion.tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-8 text-center text-arena-text-muted">
                  No deployer data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Pagination Controls */}
      <div className="flex justify-end mt-4 gap-2">
        <button
          onClick={handlePrev}
          disabled={page === 0}
          className="terminal-button disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={handleNext}
          disabled={deployers.length < PAGE_SIZE}
          className="terminal-button disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </motion.div>
  );
} 