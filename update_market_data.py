import psycopg2
from dotenv import load_dotenv
import os
from datetime import datetime
from psycopg2.extras import RealDictCursor

import time
import logging
import schedule
import requests

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('market_updater.log'),
        logging.StreamHandler()
    ]
)

load_dotenv()

class MarketDataUpdater:
    def __init__(self):
        self.conn = None
        self.cur = None
        self._connect()
        self._ensure_columns()
    
    def _connect(self):
        """Establish database connection"""
        try:
            self.conn = psycopg2.connect(
                host=os.getenv('DB_HOST'),
                port=os.getenv('DB_PORT'),
                dbname=os.getenv('DB_NAME'),
                user=os.getenv('DB_USER'),
                password=os.getenv('DB_PASSWORD')
            )
            self.cur = self.conn.cursor()
            logging.info("Successfully connected to database")
        except Exception as e:
            logging.error(f"Database connection error: {str(e)}")
            raise
    
    def _ensure_columns(self):
        """Ensure all required columns exist in the table"""
        try:
            self.cur.execute("""
                CREATE TABLE IF NOT EXISTS arena_market_data (
                    token_address TEXT PRIMARY KEY,
                    token_name TEXT,
                    token_symbol TEXT,
                    market_cap BIGINT,
                    price_usd DECIMAL,
                    volume_24h DECIMAL,
                    liquidity_usd DECIMAL,
                    website TEXT,
                    last_updated TIMESTAMP
                )
            """)
            self.conn.commit()
            logging.info("Ensured table structure exists")
        except Exception as e:
            logging.error(f"Error ensuring table structure: {str(e)}")
            raise
    
    def _get_bonded_tokens(self):
        """Get list of bonded token addresses from token_deployments where lp_deployed = TRUE"""
        try:
            self.cur.execute("""
                SELECT token_address, token_name, token_symbol
                FROM token_deployments
                WHERE lp_deployed = TRUE
            """)
            rows = self.cur.fetchall()
            if not rows:
                logging.warning("No bonded tokens found")
                return []
            token_addresses = [row[0] for row in rows]
            logging.info(f"Found {len(token_addresses)} bonded tokens")
            return token_addresses
        except Exception as e:
            logging.error(f"Error getting bonded tokens: {str(e)}")
            return []
    
    def _get_market_data(self, token_addresses):
        """Fetch market data from Dexscreener API"""
        market_data = {}
        try:
            url = "https://api.dexscreener.com/latest/dex/tokens/"
            for address in token_addresses:
                try:
                    response = requests.get(url + address)
                    if response.status_code == 200:
                        data = response.json()
                        # Parse the data as needed for your schema
                        # This is a placeholder; adjust to your actual API response
                        market_data[address] = {
                            'name': data.get('name', 'Unknown'),
                            'symbol': data.get('symbol', 'Unknown'),
                            'market_cap': data.get('marketCap'),
                            'price_usd': data.get('priceUsd'),
                            'volume_24h': data.get('volume24h'),
                            'liquidity_usd': data.get('liquidityUsd'),
                            'website': data.get('website')
                        }
                    else:
                        logging.warning(f"API error for {address}: {response.status_code}")
                except Exception as e:
                    logging.error(f"Error fetching market data for {address}: {str(e)}")
            logging.info(f"Successfully fetched market data for {len(market_data)} tokens")
            return market_data
        except Exception as e:
            logging.error(f"Error fetching market data: {str(e)}")
            return {}
    
    def _update_database(self, market_data):
        """Update database with market data"""
        try:
            updated_count = 0
            inserted_count = 0
            
            for address, data in market_data.items():
                try:
                    # Extract data
                    token_name = data.get('name', 'Unknown')
                    token_symbol = data.get('symbol', 'Unknown')
                    market_cap = int(data.get('market_cap')) if data.get('market_cap') is not None else None
                    price_usd = data.get('price_usd')
                    volume_24h = data.get('volume_24h')
                    liquidity_usd = data.get('liquidity_usd')
                    website = data.get('website')
                    current_time = datetime.now()
                    
                    # Check if record exists
                    self.cur.execute("SELECT token_address FROM arena_market_data WHERE token_address = %s", (address,))
                    
                    if self.cur.fetchone():
                        # Update existing
                        self.cur.execute("""
                            UPDATE arena_market_data 
                            SET token_name = %s, token_symbol = %s, market_cap = %s,
                                price_usd = %s, volume_24h = %s, liquidity_usd = %s,
                                website = %s, last_updated = %s
                            WHERE token_address = %s
                        """, (token_name, token_symbol, market_cap, price_usd, 
                             volume_24h, liquidity_usd, website, current_time, address))
                        updated_count += 1
                    else:
                        # Insert new
                        self.cur.execute("""
                            INSERT INTO arena_market_data (
                                token_address, token_name, token_symbol, market_cap,
                                price_usd, volume_24h, liquidity_usd, website, last_updated
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """, (address, token_name, token_symbol, market_cap,
                             price_usd, volume_24h, liquidity_usd, website, current_time))
                        inserted_count += 1
                except Exception as e:
                    logging.error(f"Error updating/inserting data for token {address}: {str(e)}")
                    continue
            
            self.conn.commit()
            logging.info(f"Database update complete: {updated_count} records updated, {inserted_count} records inserted")
        except Exception as e:
            logging.error(f"Error updating database: {str(e)}")
            self.conn.rollback()
    
    def update_market_data(self):
        """Main update process"""
        logging.info("Starting market data update")
        try:
            token_addresses = self._get_bonded_tokens()
            if not token_addresses:
                logging.warning("No token addresses to update")
                return
                
            market_data = self._get_market_data(token_addresses)
            if not market_data:
                logging.warning("No market data to update")
                return
                
            self._update_database(market_data)
            logging.info("Market data update completed successfully")
        except Exception as e:
            logging.error(f"Error in update_market_data: {str(e)}")

def run_updater():
    """Run the market data updater"""
    try:
        updater = MarketDataUpdater()
        updater.update_market_data()
    except Exception as e:
        logging.error(f"Error running updater: {str(e)}")

if __name__ == "__main__":
    logging.info("Starting market data updater service")
    
    # Run immediately on startup
    run_updater()
    
    # Schedule to run every minute
    schedule.every(1).minutes.do(run_updater)
    
    # Keep the script running
    while True:
        try:
            schedule.run_pending()
            time.sleep(1)
        except KeyboardInterrupt:
            logging.info("Service stopped by user")
            break
        except Exception as e:
            logging.error(f"Error in main loop: {str(e)}")
            time.sleep(60)  # Wait a minute before retrying