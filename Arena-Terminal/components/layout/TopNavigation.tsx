'use client';

import { useState } from 'react';
import { Search, Terminal, Settings, Bell, User } from 'lucide-react';
import Link from 'next/link';

export function TopNavigation() {
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-b border-arena-border">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left section */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <Terminal className="w-6 h-6 text-arena-orange" />
              <span className="text-xl font-bold text-gradient">
                Arena Terminal
              </span>
            </Link>
            
            <div className="hidden md:flex items-center space-x-6">
              <Link href="/explore" className="text-arena-text-secondary hover:text-arena-text-primary transition-colors">
                Explorer
              </Link>
              <Link href="/analytics" className="text-arena-text-secondary hover:text-arena-text-primary transition-colors">
                Analytics
              </Link>
              <Link href="/deployers" className="text-arena-text-secondary hover:text-arena-text-primary transition-colors">
                Deployers
              </Link>
              <Link href="/risks" className="text-arena-text-secondary hover:text-arena-text-primary transition-colors">
                Risk Assessment
              </Link>
            </div>
          </div>

          {/* Center search */}
          <div className="flex-1 max-w-xl mx-8">
            <div className={`relative transition-all duration-300 ${isSearchFocused ? 'glow-orange' : ''}`}>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-arena-text-muted" />
              <input
                type="text"
                placeholder="Search tokens, deployers, or addresses..."
                className="w-full bg-arena-secondary border border-arena-border rounded-lg pl-10 pr-4 py-2 text-sm focus:border-arena-orange focus:outline-none transition-colors"
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
              />
            </div>
          </div>

          {/* Right section */}
          <div className="flex items-center space-x-4">
            <button className="p-2 text-arena-text-secondary hover:text-arena-text-primary transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <button className="p-2 text-arena-text-secondary hover:text-arena-text-primary transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            <button className="p-2 text-arena-text-secondary hover:text-arena-text-primary transition-colors">
              <User className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}