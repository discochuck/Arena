'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { SearchBar } from '@/components/dashboard/SearchBar';
import { TabNavigation } from '@/components/dashboard/TabNavigation';
import { FilterControls } from '@/components/dashboard/FilterControls';
import { OverviewTab } from '@/components/dashboard/OverviewTab';
import { MarketOverviewTab } from '@/components/dashboard/MarketOverviewTab';
import { DeployersTab } from '@/components/dashboard/DeployersTab';
import { RiskAssessmentTab } from '@/components/dashboard/RiskAssessmentTab';

export default function Home() {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // TODO: Implement search functionality
    console.log('Searching for:', query);
  };

  const handleFiltersChange = (filters: any) => {
    // TODO: Implement filter functionality
    console.log('Filters changed:', filters);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'deployers':
        return <DeployersTab />;
      case 'economics':
        return (
          <div className="terminal-card p-8 text-center">
            <h2 className="text-2xl font-semibold mb-4">Token Economics</h2>
            <p className="text-arena-text-secondary">Coming soon - Supply distribution and health indices</p>
          </div>
        );
      case 'risk':
        return <RiskAssessmentTab />;
      case 'intelligence':
        return (
          <div className="terminal-card p-8 text-center">
            <h2 className="text-2xl font-semibold mb-4">Market Intelligence</h2>
            <p className="text-arena-text-secondary">Coming soon - Timing analysis and market patterns</p>
          </div>
        );
      case 'market':
        return <MarketOverviewTab />;
      default:
        return <OverviewTab />;
    }
  };

  return (
    <div className="min-h-screen bg-arena-dark text-arena-text-primary flex flex-col">
      <div className="w-full py-8 flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gradient">Arena Terminal</span>
          </h1>
        </motion.div>

        <SearchBar onSearch={handleSearch} />

        <FilterControls onFiltersChange={handleFiltersChange} />

        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {renderTabContent()}
        </motion.div>
      </div>
    </div>
  );
}