'use client';

import { useState } from 'react';
import { Calendar, Filter, TrendingDown, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface FilterControlsProps {
  onFiltersChange?: (filters: FilterState) => void;
}

interface FilterState {
  dateRange: {
    start: string;
    end: string;
  };
  minDeployments: number;
  minSuccessRate: number;
  riskThreshold: number;
}

export function FilterControls({ onFiltersChange }: FilterControlsProps) {
  const [filters, setFilters] = useState<FilterState>({
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    minDeployments: 1,
    minSuccessRate: 0,
    riskThreshold: 50
  });

  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilters = (newFilters: Partial<FilterState>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    onFiltersChange?.(updated);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="terminal-card mb-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-arena-orange" />
          <h3 className="text-lg font-semibold">Filters</h3>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-arena-text-secondary hover:text-arena-text-primary transition-colors"
        >
          {isExpanded ? 'Hide' : 'Show'} Advanced
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Date Range */}
        <div>
          <label className="block text-sm text-arena-text-secondary mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Date Range
          </label>
          <div className="flex space-x-2">
            <input
              type="date"
              value={filters.dateRange.start}
              onChange={(e) => updateFilters({
                dateRange: { ...filters.dateRange, start: e.target.value }
              })}
              className="terminal-input text-sm flex-1"
            />
            <input
              type="date"
              value={filters.dateRange.end}
              onChange={(e) => updateFilters({
                dateRange: { ...filters.dateRange, end: e.target.value }
              })}
              className="terminal-input text-sm flex-1"
            />
          </div>
        </div>

        {/* Min Deployments */}
        <div>
          <label className="block text-sm text-arena-text-secondary mb-2">
            <TrendingUp className="w-4 h-4 inline mr-1" />
            Min Deployments
          </label>
          <input
            type="number"
            min="1"
            value={filters.minDeployments}
            onChange={(e) => updateFilters({ minDeployments: parseInt(e.target.value) || 1 })}
            className="terminal-input text-sm w-full"
          />
        </div>

        {/* Success Rate */}
        <div>
          <label className="block text-sm text-arena-text-secondary mb-2">
            Success Rate (%)
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={filters.minSuccessRate}
            onChange={(e) => updateFilters({ minSuccessRate: parseInt(e.target.value) })}
            className="w-full h-2 bg-arena-border rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="text-xs text-arena-text-muted mt-1">
            {filters.minSuccessRate}%+
          </div>
        </div>

        {/* Risk Threshold */}
        <div>
          <label className="block text-sm text-arena-text-secondary mb-2">
            <TrendingDown className="w-4 h-4 inline mr-1" />
            Risk Threshold
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={filters.riskThreshold}
            onChange={(e) => updateFilters({ riskThreshold: parseInt(e.target.value) })}
            className="w-full h-2 bg-arena-border rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="text-xs text-arena-text-muted mt-1">
            {filters.riskThreshold}% max risk
          </div>
        </div>
      </div>

      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="border-t border-arena-border pt-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-arena-text-secondary mb-2">
                Market Cap Range
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  className="terminal-input text-sm flex-1"
                />
                <input
                  type="number"
                  placeholder="Max"
                  className="terminal-input text-sm flex-1"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-arena-text-secondary mb-2">
                Volume (24h)
              </label>
              <input
                type="number"
                placeholder="Minimum volume"
                className="terminal-input text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-arena-text-secondary mb-2">
                Liquidity USD
              </label>
              <input
                type="number"
                placeholder="Minimum liquidity"
                className="terminal-input text-sm w-full"
              />
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex justify-end space-x-3 mt-4">
        <button
          onClick={() => {
            const resetFilters: FilterState = {
              dateRange: {
                start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0]
              },
              minDeployments: 1,
              minSuccessRate: 0,
              riskThreshold: 50
            };
            setFilters(resetFilters);
            onFiltersChange?.(resetFilters);
          }}
          className="px-4 py-2 text-sm text-arena-text-secondary hover:text-arena-text-primary border border-arena-border rounded-md hover:border-arena-text-muted transition-colors"
        >
          Reset
        </button>
        <button className="terminal-button text-sm">
          Apply Filters
        </button>
      </div>
    </motion.div>
  );
}