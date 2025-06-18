'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Users, 
  DollarSign, 
  Shield, 
  Brain, 
  TrendingUp 
} from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const TABS: Tab[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: BarChart3,
    description: 'Key metrics and deployment trends'
  },
  {
    id: 'deployers',
    label: 'Deployer Analysis',
    icon: Users,
    description: 'Reputation scores and network analysis'
  },
  {
    id: 'economics',
    label: 'Token Economics',
    icon: DollarSign,
    description: 'Supply distribution and health indices'
  },
  {
    id: 'risk',
    label: 'Risk Assessment',
    icon: Shield,
    description: 'Rug pull risk and security analysis'
  },
  {
    id: 'intelligence',
    label: 'Market Intelligence',
    icon: Brain,
    description: 'Timing analysis and market patterns'
  },
  {
    id: 'market',
    label: 'Market Overview',
    icon: TrendingUp,
    description: 'Market cap analysis and favorites'
  }
];

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="border-b border-arena-border mb-8">
      <div className="flex overflow-x-auto">
        {TABS.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <motion.button
              key={tab.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center space-x-3 px-6 py-4 text-sm font-medium whitespace-nowrap
                border-b-2 transition-all duration-200 min-w-fit
                ${isActive 
                  ? 'border-arena-orange text-arena-text-primary bg-arena-orange/5' 
                  : 'border-transparent text-arena-text-secondary hover:text-arena-text-primary hover:border-arena-text-muted'
                }
              `}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-arena-orange' : ''}`} />
              <div className="text-left">
                <div className={isActive ? 'text-arena-text-primary' : ''}>{tab.label}</div>
                <div className="text-xs text-arena-text-muted hidden lg:block">
                  {tab.description}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}