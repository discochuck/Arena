'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: LucideIcon;
  loading?: boolean;
}

export function MetricCard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral', 
  icon: Icon,
  loading = false 
}: MetricCardProps) {
  const getChangeColor = () => {
    switch (changeType) {
      case 'positive': return 'text-green-400';
      case 'negative': return 'text-red-400';
      default: return 'text-arena-text-secondary';
    }
  };

  const getChangePrefix = () => {
    if (!change) return '';
    if (changeType === 'positive') return '+';
    if (changeType === 'negative') return '';
    return '';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="metric-card group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm text-arena-text-secondary mb-2 font-medium">
            {title}
          </p>
          {loading ? (
            <div className="h-8 bg-arena-border animate-pulse rounded"></div>
          ) : (
            <p className="text-3xl font-bold text-white font-mono">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
          )}
          {change && !loading && (
            <p className={`text-sm mt-2 ${getChangeColor()}`}>
              {getChangePrefix()}{change}
            </p>
          )}
        </div>
        {Icon && (
          <div className="p-2 bg-arena-orange/10 rounded-lg group-hover:bg-arena-orange/20 transition-colors">
            <Icon className="w-6 h-6 text-arena-orange" />
          </div>
        )}
      </div>
    </motion.div>
  );
}