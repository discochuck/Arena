import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { TopNavigation } from '@/components/layout/TopNavigation';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: 'Arena Terminal - Crypto Analytics Dashboard',
  description: 'Professional crypto analytics platform for token deployments and market intelligence',
  keywords: 'crypto, analytics, terminal, arena, tokens, defi',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans bg-arena-dark text-arena-text-primary antialiased`}>
        <TopNavigation />
        <main className="pt-14">
          {children}
        </main>
      </body>
    </html>
  );
}