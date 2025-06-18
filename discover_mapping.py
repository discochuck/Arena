#!/usr/bin/env python3
"""
StarsArena UUID Mapping Discovery
Discovers how to map token addresses to UUID-timestamp image filenames
"""

import requests
import re
import json
import psycopg2
import os
import time
from typing import List, Dict, Optional
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class StarsArenaMappingDiscovery:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })

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

    def check_starsarena_api_endpoints(self) -> List[str]:
        """
        Try to discover StarsArena API endpoints that might provide token mappings
        """
        potential_endpoints = [
            "https://api.starsarena.com/uploads/"
        ]
        
        working_endpoints = []
        
        for endpoint in potential_endpoints:
            try:
                response = self.session.get(endpoint, timeout=5)
                if response.status_code == 200:
                    working_endpoints.append(endpoint)
                    logger.info(f"✅ Found working endpoint: {endpoint}")
                    
                    # Try to parse content
                    try:
                        data = response.json()
                        logger.info(f"📄 JSON Response preview: {str(data)[:200]}...")
                    except:
                        logger.info(f"📄 Text Response preview: {response.text[:200]}...")
                        
            except Exception as e:
                logger.debug(f"❌ {endpoint}: {e}")
                
        return working_endpoints

    def test_token_address_api_pattern(self, token_address: str) -> Optional[Dict]:
        """
        Test if there's an API endpoint that takes token address and returns image info
        """
        potential_patterns = [
            f"https://api.starsarena.com/token/{token_address}",
            f"https://starsarena.com/api/token/{token_address}",
            f"https://static.starsarena.com/token/{token_address}",
            f"https://static.starsarena.com/uploads/{token_address}.json",
            f"https://api.starsarena.com/image/{token_address}",
            f"https://starsarena.com/api/image/{token_address}"
        ]
        
        for pattern in potential_patterns:
            try:
                response = self.session.get(pattern, timeout=5)
                if response.status_code == 200:
                    logger.info(f"✅ Found working pattern: {pattern}")
                    try:
                        data = response.json()
                        return {
                            'endpoint': pattern,
                            'data': data
                        }
                    except:
                        return {
                            'endpoint': pattern, 
                            'data': response.text
                        }
            except Exception as e:
                logger.debug(f"❌ {pattern}: {e}")
                
        return None

    def try_reverse_engineer_uuid_pattern(self, image_url: str) -> Dict:
        """
        Analyze the UUID-timestamp pattern from a known working image URL
        """
        # Extract UUID and timestamp from: 1023b8d2-96e2-9505-67fc-5213a5a9e5ad1750199545322.jpeg
        filename = image_url.split('/')[-1].replace('.jpeg', '')
        
        analysis = {
            'filename': filename,
            'length': len(filename)
        }
        
        # Try to identify UUID vs timestamp parts
        if len(filename) > 40:  # UUID is 32 chars + 4 hyphens = 36, plus timestamp
            # Standard UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars)
            potential_uuid = filename[:36]
            potential_timestamp = filename[36:]
            
            analysis.update({
                'potential_uuid': potential_uuid,
                'potential_timestamp': potential_timestamp,
                'uuid_length': len(potential_uuid),
                'timestamp_length': len(potential_timestamp)
            })
            
            # Check if timestamp looks like Unix timestamp
            if potential_timestamp.isdigit():
                try:
                    timestamp_int = int(potential_timestamp)
                    if len(potential_timestamp) == 13:  # Milliseconds
                        timestamp_int = timestamp_int / 1000
                    readable_time = time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime(timestamp_int))
                    analysis['readable_timestamp'] = readable_time
                except:
                    pass
        
        return analysis

    def search_for_mapping_in_database(self) -> Optional[str]:
        """
        Check if our database already has any image URLs that follow this pattern
        """
        conn = self._get_db_connection()
        if not conn:
            return None
            
        try:
            cursor = conn.cursor()
            
            # Look for any existing image URLs with UUID pattern
            cursor.execute("""
                SELECT token_address, image_url, token_name, token_symbol 
                FROM token_deployments 
                WHERE image_url IS NOT NULL 
                AND image_url LIKE '%static.starsarena.com%'
                LIMIT 10;
            """)
            
            results = cursor.fetchall()
            if results:
                logger.info(f"✅ Found {len(results)} existing StarsArena image URLs in database!")
                for row in results:
                    logger.info(f"📄 {row[2]} ({row[3]}): {row[0]} -> {row[1]}")
                return "Found existing mappings in database"
            else:
                logger.info("❌ No existing StarsArena image URLs found in database")
                return None
                
        except Exception as e:
            logger.error(f"Database search failed: {e}")
            return None
        finally:
            if conn:
                conn.close()

    def discover_mapping_strategy(self, sample_token_addresses: List[str]) -> Dict:
        """
        Try multiple strategies to discover the token address -> UUID mapping
        """
        results = {
            'api_endpoints': [],
            'token_patterns': [],
            'existing_mappings': None,
            'uuid_analysis': None
        }
        
        # 1. Look for API endpoints
        logger.info("🔍 Step 1: Searching for API endpoints...")
        results['api_endpoints'] = self.check_starsarena_api_endpoints()
        
        # 2. Test token address patterns
        logger.info("🔍 Step 2: Testing token address API patterns...")
        if sample_token_addresses:
            for addr in sample_token_addresses[:3]:  # Test first 3
                pattern_result = self.test_token_address_api_pattern(addr)
                if pattern_result:
                    results['token_patterns'].append(pattern_result)
                    break  # Found working pattern
        
        # 3. Check existing database mappings
        logger.info("🔍 Step 3: Checking database for existing mappings...")
        results['existing_mappings'] = self.search_for_mapping_in_database()
        
        # 4. Analyze UUID pattern
        logger.info("🔍 Step 4: Analyzing UUID pattern...")
        sample_image = "https://static.starsarena.com/uploads/1023b8d2-96e2-9505-67fc-5213a5a9e5ad1750199545322.jpeg"
        results['uuid_analysis'] = self.try_reverse_engineer_uuid_pattern(sample_image)
        
        return results

def main():
    """
    Main discovery function
    """
    discovery = StarsArenaMappingDiscovery()
    
    print("🔍 StarsArena UUID Mapping Discovery")
    print("=" * 50)
    
    # Get some sample token addresses from database
    conn = discovery._get_db_connection()
    sample_addresses = []
    
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT token_address FROM token_deployments LIMIT 5;")
            sample_addresses = [row[0] for row in cursor.fetchall()]
            print(f"📋 Using {len(sample_addresses)} sample token addresses from database")
        except Exception as e:
            print(f"❌ Could not get sample addresses: {e}")
        finally:
            conn.close()
    
    # Run discovery
    results = discovery.discover_mapping_strategy(sample_addresses)
    
    # Report findings
    print(f"\n🎯 Discovery Results:")
    print("=" * 30)
    
    if results['api_endpoints']:
        print(f"✅ Found {len(results['api_endpoints'])} working API endpoints!")
        for endpoint in results['api_endpoints']:
            print(f"  📡 {endpoint}")
    
    if results['token_patterns']:
        print(f"✅ Found {len(results['token_patterns'])} working token patterns!")
        for pattern in results['token_patterns']:
            print(f"  🎯 {pattern['endpoint']}")
    
    if results['existing_mappings']:
        print(f"✅ {results['existing_mappings']}")
    
    if results['uuid_analysis']:
        analysis = results['uuid_analysis']
        print(f"🔍 UUID Analysis:")
        print(f"  📄 Filename: {analysis['filename']}")
        if 'potential_uuid' in analysis:
            print(f"  🆔 UUID: {analysis['potential_uuid']}")
            print(f"  ⏰ Timestamp: {analysis['potential_timestamp']}")
            if 'readable_timestamp' in analysis:
                print(f"  📅 Date: {analysis['readable_timestamp']}")
    
    # Recommendations
    print(f"\n💡 Next Steps:")
    if results['api_endpoints'] or results['token_patterns']:
        print("✅ Found API endpoints! We can build a mapping system.")
    elif results['existing_mappings']:
        print("✅ Found existing mappings! We can analyze the pattern.")
    else:
        print("❌ No direct API found. Need to investigate the other website you mentioned.")
        print("🤔 What website were you using that successfully shows these images?")
        print("   We can analyze how they're getting the UUID mappings.")

if __name__ == "__main__":
    main()