'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface HighRiskDeployer {
  deployer_wallet: string;
  total_deployments: number;
  successful_bonds: number;
  token_symbol?: string;
  token_address?: string;
  success_rate?: number;
}

export function RiskAssessmentTab() {
  const [deployers, setDeployers] = useState<HighRiskDeployer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/risk/high-risk-deployers');
        const data = await res.json();
        
        // Sort deployers: 1 bond first, 0 bonds last, then by total deployments descending
        const sortedData = data.sort((a: HighRiskDeployer, b: HighRiskDeployer) => {
          // 1. Put deployers with exactly 1 successful bond at the top
          if (a.successful_bonds === 1 && b.successful_bonds !== 1) return -1;
          if (b.successful_bonds === 1 && a.successful_bonds !== 1) return 1;

          // 2. Put deployers with 0 bonds at the bottom
          if (a.successful_bonds === 0 && b.successful_bonds !== 0) return 1;
          if (b.successful_bonds === 0 && a.successful_bonds !== 0) return -1;

          // 3. For the rest, sort by total deployments descending
          return b.total_deployments - a.total_deployments;
        });
        
        setDeployers(sortedData);
      } catch (err) {
        setError('Failed to load high-risk deployer data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="terminal-card p-8 text-center">
        <h2 className="text-2xl font-semibold mb-4">Loading High-Risk Deployers...</h2>
        <p className="text-arena-text-secondary">Analyzing deployers with high activity and low success rates.</p>
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

  // Pagination calculations
  const totalPages = Math.ceil(deployers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDeployers = deployers.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePrevious = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNext = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="terminal-card p-6"
    >
      <h2 className="text-xl font-semibold mb-4 text-arena-text-primary">High-Risk Deployers</h2>
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
            {currentDeployers.length > 0 ? (
              currentDeployers.map((deployer, index) => (
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
                    {deployer.success_rate !== undefined && deployer.success_rate !== null
                      ? `${Number(deployer.success_rate).toFixed(1)}%`
                      : 'N/A'}
                  </td>
                </motion.tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-8 text-center text-arena-text-muted">
                  No high-risk deployers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Controls */}
      {deployers.length > itemsPerPage && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-arena-border">
          <div className="text-sm text-arena-text-secondary">
            Showing {startIndex + 1}-{Math.min(endIndex, deployers.length)} of {deployers.length} deployers
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevious}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-arena-border rounded bg-arena-secondary/20 hover:bg-arena-secondary/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show first page, last page, current page, and pages around current
                const isVisible = 
                  page === 1 || 
                  page === totalPages || 
                  Math.abs(page - currentPage) <= 1;
                
                if (!isVisible) {
                  // Show ellipsis for gaps
                  if (page === 2 && currentPage > 4) {
                    return <span key={page} className="px-2 text-arena-text-muted">...</span>;
                  }
                  if (page === totalPages - 1 && currentPage < totalPages - 3) {
                    return <span key={page} className="px-2 text-arena-text-muted">...</span>;
                  }
                  return null;
                }
                
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-1 text-sm border rounded transition-colors ${
                      currentPage === page
                        ? 'bg-arena-orange text-white border-arena-orange'
                        : 'border-arena-border bg-arena-secondary/20 hover:bg-arena-secondary/40'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={handleNext}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-arena-border rounded bg-arena-secondary/20 hover:bg-arena-secondary/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}