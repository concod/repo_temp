/**
 * Geolocation Service
 * Handles IP geolocation lookups with caching
 */

// ==================== Types ====================

export interface GeoLocationData {
  ip: string;
  city: string | null;
  region: string | null;
  country: string | null;
  org: string | null;
  loc: string | null;
}

interface CacheEntry {
  timestamp: number;
  data: GeoLocationData;
}

// ==================== Cache ====================

const geoCache = new Map<string, CacheEntry>();
const CACHE_TTL = 600000; // 10 minutes in milliseconds
const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY = 1000; // milliseconds

// ==================== Rate Limiting ====================

let rateLimitErrorCount = 0;
const MAX_RATE_LIMIT_ERRORS = 20;
let rateLimitExceeded = false;

/**
 * Reset rate limit counter - for testing purposes
 */
export const resetRateLimitCounter = (): void => {
  rateLimitErrorCount = 0;
  rateLimitExceeded = false;
};

/**
 * Clear expired cache entries
 */
const clearExpiredCache = (): void => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  geoCache.forEach((entry, key) => {
    if (now - entry.timestamp >= CACHE_TTL) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => geoCache.delete(key));
};

// ==================== Service Methods ====================

/**
 * Retry utility with exponential backoff
 * @param fn - Function to retry
 * @param maxAttempts - Maximum number of retry attempts
 * @param baseDelay - Base delay in milliseconds
 * @returns Promise with the result
 */
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = MAX_RETRY_ATTEMPTS,
  baseDelay: number = INITIAL_RETRY_DELAY
): Promise<T> => {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on last attempt
      if (attempt === maxAttempts - 1) {
        break;
      }
      
      // Calculate exponential backoff delay: baseDelay * 2^attempt
      const delay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 100; // Add jitter to prevent thundering herd
      
      console.warn(`[GeoLocation] Attempt ${attempt + 1}/${maxAttempts} failed, retrying in ${delay + jitter}ms...`, error);
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }
  }
  
  throw lastError || new Error('Retry failed');
};

/**
 * Fetch geolocation data from API with retry logic
 * @param url - API URL
 * @returns Promise with geo data
 */
const fetchGeoDataWithRetry = async (url: string): Promise<unknown> => {
  return retryWithBackoff(async () => {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    // Handle rate limiting specifically
    if (response.status === 429) {
      // Increment rate limit error counter
      rateLimitErrorCount++;
      
      // If we've hit the threshold, mark rate limiting as exceeded
      if (rateLimitErrorCount >= MAX_RATE_LIMIT_ERRORS) {
        rateLimitExceeded = true;
      }
      
      const error = new Error('Rate limit exceeded');
      error.name = 'RateLimitError';
      throw error;
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  });
};

/**
 * Create US geo data fallback
 */
const createUSGeoData = (ip: string): GeoLocationData => ({
  ip,
  city: null,
  region: null,
  country: 'US',
  org: null,
  loc: null,
});

/**
 * Get geolocation data for an IP address
 * Uses caching to minimize API calls
 */
export const getGeoLocation = async (ip: string): Promise<GeoLocationData> => {
  try {
    const now = Date.now();
    const cacheKey = `loc:${ip}`;
    
    // Clear expired entries periodically
    if (Math.random() < 0.1) {
      clearExpiredCache();
    }
    
    // Check cache
    const cached = geoCache.get(cacheKey);
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      return cached.data;
    }
    
    // If rate limiting has been exceeded, return US as default country
    if (rateLimitExceeded) {
      return createUSGeoData(ip);
    }
    
    // Fetch from ipinfo.io with retry logic
    //const url = `https://ipinfo.io/${ip}/json`;
    //curl https://api.ipinfo.io/lite/8.8.8.8?token=41adaf8029e134
    const url = `https://ipinfo.io/${ip}/json?token=41adaf8029e134`;
    
    try {
      const data = await fetchGeoDataWithRetry(url) as {
        ip?: string;
        city?: string;
        region?: string;
        country?: string;
        org?: string;
        loc?: string;
      };
      
      return processGeoData(data, ip, cacheKey, now);
      
    } catch (error) {
      console.warn(`[GeoLocation] Failed to fetch for IP ${ip} after retries:`, error);
      return createEmptyGeoData(ip);
    }
    
  } catch (error) {
    console.error('[GeoLocation] Error:', error);
    return createEmptyGeoData(ip);
  }
};

/**
 * Process and cache geo data
 */
const processGeoData = (data: {
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  org?: string;
  loc?: string;
}, ip: string, cacheKey: string, timestamp: number): GeoLocationData => {
  const result: GeoLocationData = {
    ip: data.ip || ip,
    city: data.city || null,
    region: data.region || null,
    country: data.country || null,
    org: data.org || null,
    loc: data.loc || null,
  };
  
  // Cache the result
  geoCache.set(cacheKey, { timestamp, data: result });
  
  return result;
};

/**
 * Create empty geo data fallback
 */
const createEmptyGeoData = (ip: string): GeoLocationData => ({
  ip,
  city: null,
  region: null,
  country: null,
  org: null,
  loc: null,
});

/**
 * Batch process multiple IPs
 */
export const batchGetGeoLocation = async (ips: string[]): Promise<Map<string, GeoLocationData>> => {
  const uniqueIps = [...new Set(ips)];
  const results = new Map<string, GeoLocationData>();
  
  // Process in batches to avoid overwhelming the API
  const batchSize = 5;
  for (let i = 0; i < uniqueIps.length; i += batchSize) {
    const batch = uniqueIps.slice(i, i + batchSize);
    const promises = batch.map(ip => getGeoLocation(ip));
    const batchResults = await Promise.all(promises);
    
    batch.forEach((ip, index) => {
      results.set(ip, batchResults[index]);
    });
    
    // Add a small delay between batches
    if (i + batchSize < uniqueIps.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return results;
};

/**
 * Aggregate geo data by country
 */
export const aggregateByCountry = (geoDataMap: Map<string, GeoLocationData>): Array<[string, number]> => {
  const countryCount = new Map<string, number>();
  
  geoDataMap.forEach(geo => {
    const country = geo.country;
    // Skip entries without country data
    if (country && country.trim() !== '') {
      countryCount.set(country, (countryCount.get(country) || 0) + 1);
    }
  });
  
  return Array.from(countryCount.entries())
    .sort((a, b) => b[1] - a[1]);
};

/**
 * Geolocation Service - exported as default
 */
export const geolocationService = {
  getGeoLocation,
  batchGetGeoLocation,
  aggregateByCountry,
  resetRateLimitCounter,
};

export default geolocationService;
