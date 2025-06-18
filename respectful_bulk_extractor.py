#!/usr/bin/env python3
"""
Respectful Bulk Token Image Extractor
One-time bulk extraction with proper rate limiting and respectful practices
"""

import requests
import json
import psycopg2
import os
import time
import random
from typing import List, Dict, Optional
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class RespectfulBulkExtractor:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Referer': 'https://www.arenapro.io/'
        })
        self.base_url = "https://api.arenapro.io"
        
        # Respectful settings
        self.base_delay = 2.0  # Base delay between requests (seconds)
        self.batch_size = 50   # Tokens per request
        self.max_retries = 3   # Max retries for failed requests
        self.backoff_factor = 2.0  # Exponential backoff multiplier
        
        # Track progress
        self.total_fetched = 0
        self.total_mappings = 0
        self.session_start_time = time.time()

    def _get_db_connection(self):
        """Get PostgreSQL database connection"""
        try:
            return psycopg2.connect(
                dbname=os.getenv('DB_NAME'),
                user=os.getenv('DB_USER'),
                password=os.getenv('DB_PASSWORD'),
                host=os.getenv('DB_HOST'),
                port=os.getenv('DB_PORT')
            )
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            return None

    def respectful_delay(self, base_delay: Optional[float] = None):
        """
        Implement respectful delays with jitter
        """
        if base_delay is None:
            base_delay = self.base_delay
        
        # Add random jitter (±20%) to avoid thundering herd
        jitter = random.uniform(-0.2, 0.2) * base_delay
        delay = base_delay + jitter
        
        time.sleep(max(0.5, delay))  # Minimum 0.5 second delay

    def fetch_tokens_with_retry(self, limit: int, offset: int) -> List[Dict]:
        """
        Fetch tokens with exponential backoff retry logic
        """
        for attempt in range(self.max_retries):
            try:
                url = f"{self.base_url}/tokens"
                params = {
                    'order': 'create_time.desc',
                    'limit': limit,
                    'offset': offset,
                    'tokens_by_creator': 'lte.10'
                }
                
                logger.info(f"📡 Request {attempt + 1}/{self.max_retries}: offset={offset}, limit={limit}")
                
                response = self.session.get(url, params=params, timeout=15)
                
                # Handle rate limiting gracefully
                if response.status_code == 429:
                    retry_after = int(response.headers.get('Retry-After', 60))
                    logger.warning(f"⏳ Rate limited! Waiting {retry_after} seconds...")
                    time.sleep(retry_after)
                    continue
                
                response.raise_for_status()
                data = response.json()
                
                if isinstance(data, list):
                    logger.info(f"✅ Fetched {len(data)} tokens (attempt {attempt + 1})")
                    return data
                else:
                    logger.warning(f"⚠️ Unexpected response format: {type(data)}")
                    return []
                
            except requests.exceptions.RequestException as e:
                logger.warning(f"❌ Request failed (attempt {attempt + 1}): {e}")
                
                if attempt < self.max_retries - 1:
                    backoff_delay = self.base_delay * (self.backoff_factor ** attempt)
                    logger.info(f"⏳ Backing off for {backoff_delay:.1f} seconds...")
                    time.sleep(backoff_delay)
                else:
                    logger.error(f"💥 All retry attempts failed for offset {offset}")
                    return []
        
        return []

    def extract_image_mappings(self, tokens: List[Dict]) -> Dict[str, str]:
        """
        Extract token_address -> image_url mappings from arenapro data
        """
        mappings = {}
        
        for token in tokens:
            if not isinstance(token, dict):
                continue
            
            # Get token address
            token_address = token.get('token_contract_address')
            if not token_address:
                continue
            
            # Get image URL
            image_url = token.get('photo_url')
            if not image_url or 'static.starsarena.com' not in image_url:
                continue
            
            mappings[token_address] = image_url
            self.total_mappings += 1
        
        return mappings

    def save_progress(self, all_mappings: Dict[str, str], offset: int):
        """
        Save progress to file as backup
        """
        progress_data = {
            'offset': offset,
            'total_mappings': len(all_mappings),
            'timestamp': time.time(),
            'mappings': all_mappings
        }
        
        with open(f'extraction_progress_{int(time.time())}.json', 'w') as f:
            json.dump(progress_data, f, indent=2)
        
        logger.info(f"💾 Progress saved: {len(all_mappings)} mappings at offset {offset}")

    def update_database_batch(self, mappings: Dict[str, str]) -> int:
        """
        Update database with a batch of mappings
        """
        if not mappings:
            return 0
        
        conn = self._get_db_connection()
        if not conn:
            return 0
        
        updated_count = 0
        
        try:
            cursor = conn.cursor()
            
            # Use batch update for efficiency
            update_data = [(img_url, addr) for addr, img_url in mappings.items()]
            
            cursor.executemany("""
                UPDATE token_deployments 
                SET image_url = %s 
                WHERE token_address = %s 
                AND (image_url IS NULL OR image_url = '');
            """, update_data)
            
            updated_count = cursor.rowcount
            conn.commit()
            
            logger.info(f"✅ Updated {updated_count} database records")
            
        except Exception as e:
            logger.error(f"Database update failed: {e}")
            if conn:
                conn.rollback()
        finally:
            if conn:
                conn.close()
        
        return updated_count

    def estimate_total_available(self) -> int:
        """
        Estimate how many tokens are available in arenapro API
        """
        try:
            # Try to fetch with a very high offset to see the range
            test_offsets = [0, 1000, 5000, 10000, 25000, 50000]
            
            for offset in test_offsets:
                tokens = self.fetch_tokens_with_retry(limit=1, offset=offset)
                if not tokens:
                    logger.info(f"📊 Estimated total tokens available: ~{offset}")
                    return offset
                self.respectful_delay(1.0)  # Short delay for estimation
            
            return 50000  # Conservative estimate
            
        except Exception as e:
            logger.warning(f"Could not estimate total: {e}")
            return 10000  # Fallback estimate

    def bulk_extract_all_tokens(self) -> Dict[str, str]:
        """
        Respectfully extract ALL available tokens
        """
        all_mappings = {}
        offset = 0
        consecutive_empty = 0
        max_consecutive_empty = 3
        
        # Estimate total for progress tracking
        estimated_total = self.estimate_total_available()
        logger.info(f"📊 Estimated total tokens available: {estimated_total}")
        
        print(f"\n🚀 Starting respectful bulk extraction...")
        print(f"📋 Batch size: {self.batch_size} tokens")
        print(f"⏱️  Base delay: {self.base_delay}s between requests")
        print(f"🎯 Estimated total: {estimated_total} tokens")
        print(f"⏳ Estimated time: {(estimated_total / self.batch_size * self.base_delay / 60):.1f} minutes")
        
        while consecutive_empty < max_consecutive_empty:
            # Show progress
            progress_pct = (offset / estimated_total * 100) if estimated_total > 0 else 0
            elapsed_time = time.time() - self.session_start_time
            
            logger.info(f"🔄 Progress: {offset:,} tokens ({progress_pct:.1f}%) | "
                       f"Mappings: {len(all_mappings):,} | "
                       f"Elapsed: {elapsed_time/60:.1f}min")
            
            # Fetch batch
            tokens = self.fetch_tokens_with_retry(self.batch_size, offset)
            
            if not tokens:
                consecutive_empty += 1
                logger.warning(f"📭 Empty response {consecutive_empty}/{max_consecutive_empty}")
                if consecutive_empty >= max_consecutive_empty:
                    logger.info("🏁 Reached end of available data")
                    break
            else:
                consecutive_empty = 0
                self.total_fetched += len(tokens)
                
                # Extract mappings from this batch
                batch_mappings = self.extract_image_mappings(tokens)
                all_mappings.update(batch_mappings)
                
                if batch_mappings:
                    logger.info(f"📍 Found {len(batch_mappings)} new mappings in this batch")
            
            # Save progress every 1000 tokens
            if offset % 1000 == 0:
                self.save_progress(all_mappings, offset)
            
            # Update database every 500 mappings to avoid losing progress
            if len(all_mappings) % 500 == 0 and len(all_mappings) > 0:
                # Only update the new mappings since last DB update
                self.update_database_batch(batch_mappings)
            
            # Move to next batch
            offset += self.batch_size
            
            # Respectful delay before next request
            self.respectful_delay()
            
            # Safety check - don't run forever
            if offset > 100000:  # Max 100k tokens
                logger.warning("🛑 Reached safety limit of 100k tokens")
                break
        
        return all_mappings

def main():
    """
    Main extraction function
    """
    extractor = RespectfulBulkExtractor()
    
    print("🏟️  Respectful Bulk Token Image Extractor")
    print("=" * 50)
    print("🤝 This tool respects arenapro.io with:")
    print("  • Rate limiting (2+ seconds between requests)")
    print("  • Exponential backoff on errors") 
    print("  • Random jitter to avoid server overload")
    print("  • Batch processing for efficiency")
    print("  • Progress saving for resumability")
    print("  • One-time extraction only")
    
    # Confirm with user
    confirm = input(f"\n🚀 Ready to start respectful bulk extraction? (y/n): ").lower()
    if confirm != 'y':
        print("❌ Extraction cancelled")
        return
    
    # Start extraction
    start_time = time.time()
    all_mappings = extractor.bulk_extract_all_tokens()
    end_time = time.time()
    
    # Final results
    print(f"\n🎉 Extraction Complete!")
    print(f"📊 Final Statistics:")
    print(f"  Total tokens fetched: {extractor.total_fetched:,}")
    print(f"  Image mappings found: {len(all_mappings):,}")
    print(f"  Success rate: {(len(all_mappings)/max(1, extractor.total_fetched)*100):.1f}%")
    print(f"  Total time: {(end_time - start_time)/60:.1f} minutes")
    print(f"  Average request rate: {extractor.total_fetched/max(1, end_time - start_time)*60:.1f} tokens/min")
    
    if all_mappings:
        # Final database update
        print(f"\n💾 Performing final database update...")
        final_updated = extractor.update_database_batch(all_mappings)
        
        # Save final backup
        with open('final_token_image_mappings.json', 'w') as f:
            json.dump(all_mappings, f, indent=2)
        
        print(f"✅ Final Results:")
        print(f"  Database records updated: {final_updated:,}")
        print(f"  Backup saved to: final_token_image_mappings.json")
        print(f"  Your Arena Terminal now has {len(all_mappings):,} token images! 🎯")
        
    else:
        print(f"❌ No mappings found - check API connectivity")

if __name__ == "__main__":
    main()