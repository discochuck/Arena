"""
Arena.trade Token Image Scraper

This script scrapes token images from arena.trade for tokens in your database.
Since your database already has image URLs from StarSArena, this script:

1. Creates separate columns for arena.trade images (arena_image_url, etc.)
2. Preserves your existing StarSArena image URLs
3. Only scrapes arena.trade images for tokens that don't have them yet
4. Provides comparison between both image sources

New database columns added:
- arena_image_url: The arena.trade opengraph image URL
- arena_image_scraped_at: When the scraping occurred
- arena_image_file_path: Local file path for downloaded image
- arena_image_scrape_status: Success/failure status
"""

import asyncio
import aiohttp
import aiofiles
import sqlite3
import os
from datetime import datetime, timedelta
import logging
from urllib.parse import urljoin
from pathlib import Path
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class TokenImageScraper:
    def __init__(self, images_dir: str = "token_images"):
        # Get database path from environment
        self.db_path = os.getenv('DATABASE_PATH', 'database.db')
        self.images_dir = Path(images_dir)
        self.images_dir.mkdir(exist_ok=True)
        self.base_url = "https://arena.trade/token/{}/opengraph-image"
        
        # Rate limiting settings
        self.max_concurrent = 10  # Concurrent requests
        self.delay_between_batches = 1  # Seconds between batches
        self.request_timeout = 30  # Timeout per request
        
    async def setup_database(self):
        """Initialize database tables for tracking image scraping"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Add arena.trade specific columns since you already have image_url from starsarena
        try:
            cursor.execute('''
                ALTER TABLE token_deployments ADD COLUMN arena_image_url TEXT
            ''')
        except sqlite3.OperationalError:
            pass  # Column already exists
            
        try:
            cursor.execute('''
                ALTER TABLE token_deployments ADD COLUMN arena_image_scraped_at TIMESTAMP
            ''')
        except sqlite3.OperationalError:
            pass  # Column already exists
            
        try:
            cursor.execute('''
                ALTER TABLE token_deployments ADD COLUMN arena_image_file_path TEXT
            ''')
        except sqlite3.OperationalError:
            pass  # Column already exists
            
        try:
            cursor.execute('''
                ALTER TABLE token_deployments ADD COLUMN arena_image_scrape_status TEXT
            ''')
        except sqlite3.OperationalError:
            pass  # Column already exists
            
        conn.commit()
        conn.close()
        
    def get_tokens_to_scrape(self, limit: int = None, force_refresh: bool = False, skip_starsarena: bool = True):
        """Get token addresses that need image scraping"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        if force_refresh:
            # Re-scrape all tokens
            if skip_starsarena:
                # Only scrape tokens that don't have starsarena URLs
                query = """
                    SELECT token_address FROM token_deployments 
                    WHERE image_url IS NULL OR image_url NOT LIKE '%starsarena%'
                """
            else:
                query = "SELECT token_address FROM token_deployments"
        else:
            # Only scrape tokens that haven't been scraped with arena.trade URLs
            query = """
                SELECT token_address FROM token_deployments 
                WHERE arena_image_scraped_at IS NULL 
                OR arena_image_scrape_status = 'failed'
                OR arena_image_scraped_at < datetime('now', '-7 days')
                OR arena_image_url IS NULL
            """
            
            if skip_starsarena:
                query += " AND (image_url IS NULL OR image_url NOT LIKE '%starsarena%')"
        
        if limit:
            query += f" LIMIT {limit}"
            
        cursor.execute(query)
        tokens = [row[0] for row in cursor.fetchall()]
        conn.close()
        
        logger.info(f"Found {len(tokens)} tokens to scrape for arena.trade images")
        return tokens
    
    async def download_image(self, session: aiohttp.ClientSession, address: str):
        """Download a single token image"""
        url = self.base_url.format(address)
        file_path = self.images_dir / f"{address}.png"
        
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=self.request_timeout)) as response:
                if response.status == 200:
                    content = await response.read()
                    
                    # Save image file
                    async with aiofiles.open(file_path, 'wb') as f:
                        await f.write(content)
                    
                    # Update database with both the URL and local file path
                    self.update_token_image_status(address, 'success', url, str(file_path))
                    logger.info(f"✓ Downloaded image for {address}")
                    return True
                else:
                    logger.warning(f"✗ Failed to download {address}: HTTP {response.status}")
                    self.update_token_image_status(address, 'failed', None, None)
                    return False
                    
        except asyncio.TimeoutError:
            logger.warning(f"✗ Timeout downloading {address}")
            self.update_token_image_status(address, 'timeout', None, None)
            return False
        except Exception as e:
            logger.error(f"✗ Error downloading {address}: {str(e)}")
            self.update_token_image_status(address, 'error', None, None)
            return False
    
    def update_token_image_status(self, address: str, status: str, arena_image_url: str, file_path: str):
        """Update database with arena.trade scraping results"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE token_deployments 
            SET arena_image_scraped_at = ?, arena_image_scrape_status = ?, arena_image_url = ?, arena_image_file_path = ?
            WHERE token_address = ?
        ''', (datetime.now().isoformat(), status, arena_image_url, file_path, address))
        
        conn.commit()
        conn.close()
    
    async def scrape_batch(self, addresses: list):
        """Scrape a batch of token images concurrently"""
        connector = aiohttp.TCPConnector(limit=self.max_concurrent)
        timeout = aiohttp.ClientTimeout(total=60)
        
        async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
            tasks = [self.download_image(session, address) for address in addresses]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            successful = sum(1 for r in results if r is True)
            logger.info(f"Batch complete: {successful}/{len(addresses)} successful")
            
            return results
    
    def compare_image_sources(self, limit: int = 10):
        """Compare tokens that have both StarSArena and Arena.trade images"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT token_address, token_name, token_symbol, image_url, arena_image_url
            FROM token_deployments 
            WHERE image_url IS NOT NULL AND arena_image_url IS NOT NULL
            LIMIT ?
        """, (limit,))
        
        results = cursor.fetchall()
        conn.close()
        
        print(f"\nTokens with both image sources (showing {len(results)}):")
        for addr, name, symbol, starsarena_url, arena_url in results:
            print(f"  {symbol} ({name}):")
            print(f"    StarSArena: {starsarena_url}")
            print(f"    Arena.trade: {arena_url}")
            print()
    
    async def scrape_all_images(self, batch_size: int = 50, force_refresh: bool = False, skip_starsarena: bool = True):
        """Main method to scrape all token images"""
        await self.setup_database()
        
        tokens = self.get_tokens_to_scrape(force_refresh=force_refresh, skip_starsarena=skip_starsarena)
        
        if not tokens:
            logger.info("No tokens need arena.trade image scraping")
            return
        
        total_batches = (len(tokens) + batch_size - 1) // batch_size
        logger.info(f"Starting arena.trade image scrape of {len(tokens)} tokens in {total_batches} batches")
        
        for i in range(0, len(tokens), batch_size):
            batch = tokens[i:i + batch_size]
            batch_num = (i // batch_size) + 1
            
            logger.info(f"Processing batch {batch_num}/{total_batches} ({len(batch)} tokens)")
            
            await self.scrape_batch(batch)
            
            # Rate limiting delay between batches
            if i + batch_size < len(tokens):
                logger.info(f"Waiting {self.delay_between_batches}s before next batch...")
                await asyncio.sleep(self.delay_between_batches)
        
        logger.info("Arena.trade image scraping complete!")
    
    def get_scraping_stats(self):
        """Get statistics on scraping progress"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM token_deployments")
        total_tokens = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM token_deployments WHERE arena_image_scrape_status = 'success'")
        arena_successful = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM token_deployments WHERE arena_image_scrape_status = 'failed'")
        arena_failed = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM token_deployments WHERE arena_image_scraped_at IS NULL")
        arena_not_attempted = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM token_deployments WHERE arena_image_url IS NOT NULL")
        with_arena_urls = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM token_deployments WHERE image_url IS NOT NULL")
        with_starsarena_urls = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM token_deployments WHERE image_url LIKE '%starsarena%'")
        starsarena_count = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            'total_tokens': total_tokens,
            'arena_successful': arena_successful,
            'arena_failed': arena_failed,
            'arena_not_attempted': arena_not_attempted,
            'with_arena_urls': with_arena_urls,
            'with_starsarena_urls': with_starsarena_urls,
            'starsarena_count': starsarena_count,
            'arena_success_rate': (arena_successful / total_tokens * 100) if total_tokens > 0 else 0
        }
    
    def get_tokens_with_images(self):
        """Get all tokens that have successfully scraped arena.trade images"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT token_address, arena_image_url, arena_image_file_path, arena_image_scraped_at, 
                   token_name, token_symbol, image_url as starsarena_url
            FROM token_deployments 
            WHERE arena_image_scrape_status = 'success' AND arena_image_url IS NOT NULL
            ORDER BY arena_image_scraped_at DESC
        """)
        
        results = cursor.fetchall()
        conn.close()
        
        return [
            {
                'token_address': row[0],
                'arena_image_url': row[1], 
                'file_path': row[2],
                'scraped_at': row[3],
                'token_name': row[4],
                'token_symbol': row[5],
                'starsarena_url': row[6]
            }
            for row in results
        ]
    
    def cleanup_failed_images(self):
        """Remove image files for tokens that failed to scrape properly"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT token_address FROM token_deployments 
            WHERE arena_image_scrape_status != 'success' AND arena_image_file_path IS NOT NULL
        """)
        
        failed_tokens = cursor.fetchall()
        cleaned_count = 0
        
        for (token_address,) in failed_tokens:
            file_path = self.images_dir / f"{token_address}.png"
            if file_path.exists():
                file_path.unlink()
                cleaned_count += 1
                
        # Clear file paths for failed tokens
        cursor.execute("""
            UPDATE token_deployments 
            SET arena_image_file_path = NULL 
            WHERE arena_image_scrape_status != 'success'
        """)
        
        conn.commit()
        conn.close()
        
        logger.info(f"Cleaned up {cleaned_count} failed arena.trade image files")

# Example usage and scheduling
async def main():
    scraper = TokenImageScraper('token_images')
    
    # Show database overview
    conn = sqlite3.connect(scraper.db_path)
    cursor = conn.cursor()
    
    # Get overview stats
    cursor.execute("SELECT COUNT(*) FROM token_deployments")
    total_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM token_deployments WHERE image_url IS NOT NULL")
    starsarena_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM token_deployments WHERE arena_image_url IS NOT NULL")
    arena_count = cursor.fetchone()[0]
    
    cursor.execute("""
        SELECT token_address, token_name, token_symbol, image_url 
        FROM token_deployments 
        WHERE arena_image_url IS NULL AND (image_url IS NULL OR image_url NOT LIKE '%starsarena%')
        LIMIT 5
    """)
    sample_tokens = cursor.fetchall()
    conn.close()
    
    print(f"\nDatabase Overview:")
    print(f"  Total tokens: {total_count}")
    print(f"  With StarSArena images: {starsarena_count}")
    print(f"  With Arena.trade images: {arena_count}")
    print(f"  Need Arena.trade scraping: {total_count - arena_count}")
    
    if sample_tokens:
        print(f"\nSample tokens to be scraped for arena.trade images:")
        for addr, name, symbol, existing_url in sample_tokens:
            existing_status = "has StarSArena" if existing_url else "no image"
            print(f"  {symbol} ({name}) - {existing_status}")
    
    # Initial scrape (or catch up on missing images)
    await scraper.scrape_all_images(batch_size=20)
    
    # Print detailed stats
    stats = scraper.get_scraping_stats()
    print(f"\nDetailed Scraping Stats:")
    print(f"  Total tokens: {stats['total_tokens']}")
    print(f"  Arena.trade successful: {stats['arena_successful']}")
    print(f"  Arena.trade failed: {stats['arena_failed']}")
    print(f"  Arena.trade not attempted: {stats['arena_not_attempted']}")
    print(f"  Arena.trade success rate: {stats['arena_success_rate']:.1f}%")
    print(f"  StarSArena images: {stats['starsarena_count']}")
    print(f"  Total with any image: {stats['with_starsarena_urls'] + stats['with_arena_urls']}")
    
    # Show sample of successfully scraped arena.trade tokens
    scraped_tokens = scraper.get_tokens_with_images()
    if scraped_tokens:
        print(f"\nRecently scraped arena.trade images (first 3):")
        for token in scraped_tokens[:3]:
            starsarena_status = "also has StarSArena" if token['starsarena_url'] else "arena.trade only"
            print(f"  {token['token_symbol']} ({token['token_name']}) - {starsarena_status}")
            print(f"    Arena URL: {token['arena_image_url']}")
    
    # Cleanup any failed image files
    scraper.cleanup_failed_images()
    
    # Show comparison if we have both types of images
    scraper.compare_image_sources(limit=3)

def schedule_daily_update():
    """Run this daily to keep images updated"""
    import schedule
    
    def run_scraper():
        asyncio.run(main())
    
    # Schedule daily at 3 AM
    schedule.every().day.at("03:00").do(run_scraper)
    
    print("Scheduler started - will run daily at 3:00 AM")
    while True:
        schedule.run_pending()
        time.sleep(3600)  # Check every hour

async def scrape_new_tokens_only():
    """Quick function to only scrape tokens that have never been attempted for arena.trade"""
    scraper = TokenImageScraper('token_images')
    
    conn = sqlite3.connect(scraper.db_path)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT COUNT(*) FROM token_deployments 
        WHERE arena_image_scraped_at IS NULL
    """)
    new_count = cursor.fetchone()[0]
    conn.close()
    
    if new_count > 0:
        logger.info(f"Found {new_count} tokens without arena.trade images")
        await scraper.scrape_all_images(batch_size=30)
    else:
        logger.info("All tokens already have arena.trade images or have been attempted")

if __name__ == "__main__":
    # Run initial scrape
    asyncio.run(main())
    
    # Uncomment to run scheduled updates
    # schedule_daily_update()
    
    # Uncomment to only scrape new tokens
    # asyncio.run(scrape_new_tokens_only())