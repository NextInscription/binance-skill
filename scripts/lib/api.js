/**
 * Binance API Wrapper with Rate Limiting
 * Provides API access functions with built-in rate limiting
 */

import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

const BASE_URL = 'https://api.binance.com/api/v3';

// Proxy configuration
const PROXY_URL = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:7897';
const agent = new HttpsProxyAgent(PROXY_URL);

// Rate limiting configuration
const BATCH_SIZE = 20; // Number of symbols per batch
const BATCH_DELAY = 1000; // Delay between batches (ms)
const REQUEST_DELAY = 100; // Delay between requests (ms)

/**
 * Delay utility for rate limiting
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
export async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get all USDT trading pairs from Binance
 * @returns {Promise<string[]>} Array of symbol names (e.g., ['BTCUSDT', 'ETHUSDT'])
 */
export async function getAllUSDTPairs() {
  try {
    const response = await fetch(`${BASE_URL}/exchangeInfo`, { agent });

    if (!response.ok) {
      throw new Error(`Failed to fetch exchange info: ${response.statusText}`);
    }

    const data = await response.json();

    // Filter for USDT pairs that are currently trading
    const usdtPairs = data.symbols
      .filter(symbol =>
        symbol.quoteAsset === 'USDT' &&
        symbol.status === 'TRADING' &&
        !symbol.symbol.includes('UP') &&
        !symbol.symbol.includes('DOWN') &&
        !symbol.symbol.includes('BULL') &&
        !symbol.symbol.includes('BEAR')
      )
      .map(symbol => symbol.symbol);

    return usdtPairs.sort();

  } catch (error) {
    console.error('Error fetching USDT pairs:', error.message);
    throw error;
  }
}

/**
 * Fetch kline data for a single symbol
 * @param {string} symbol - Trading symbol
 * @param {string} interval - Kline interval
 * @param {number} limit - Number of candles
 * @returns {Promise<Array|null>} Kline data or null if failed
 */
export async function fetchKlines(symbol, interval = '4h', limit = 100) {
  try {
    const url = `${BASE_URL}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const response = await fetch(url, { agent });

    if (!response.ok) {
      console.error(`Failed to fetch klines for ${symbol}: ${response.statusText}`);
      return null;
    }

    return await response.json();

  } catch (error) {
    console.error(`Error fetching klines for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Fetch kline data for multiple symbols in batches with rate limiting
 * @param {string[]} symbols - Array of trading symbols
 * @param {string} interval - Kline interval
 * @param {number} limit - Number of candles
 * @param {Function} progressCallback - Optional progress callback
 * @returns {Promise<Map<string, Array>>} Map of symbol to kline data
 */
export async function fetchKlinesBatch(symbols, interval = '4h', limit = 100, progressCallback = null) {
  const results = new Map();
  const totalSymbols = symbols.length;
  let processed = 0;

  // Process symbols in batches
  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const batch = symbols.slice(i, Math.min(i + BATCH_SIZE, symbols.length));

    // Fetch klines for each symbol in the batch
    for (const symbol of batch) {
      const klines = await fetchKlines(symbol, interval, limit);
      if (klines && klines.length > 0) {
        results.set(symbol, klines);
      }

      processed++;
      if (progressCallback) {
        progressCallback(processed, totalSymbols, symbol);
      }

      // Delay between requests
      await delay(REQUEST_DELAY);
    }

    // Delay between batches (except for the last batch)
    if (i + BATCH_SIZE < symbols.length) {
      await delay(BATCH_DELAY);
    }
  }

  return results;
}

/**
 * Fetch current price for a single symbol
 * @param {string} symbol - Trading symbol
 * @returns {Promise<number|null>} Current price or null if failed
 */
export async function fetchPrice(symbol) {
  try {
    const response = await fetch(`${BASE_URL}/ticker/price?symbol=${symbol}`, { agent });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return parseFloat(data.price);

  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Fetch 24hr ticker data for a single symbol
 * @param {string} symbol - Trading symbol
 * @returns {Promise<Object|null>} Ticker data or null if failed
 */
export async function fetchTicker24hr(symbol) {
  try {
    const response = await fetch(`${BASE_URL}/ticker/24hr?symbol=${symbol}`, { agent });

    if (!response.ok) {
      return null;
    }

    return await response.json();

  } catch (error) {
    console.error(`Error fetching ticker for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Fetch 24hr ticker data for multiple symbols in batches
 * @param {string[]} symbols - Array of trading symbols
 * @returns {Promise<Map<string, Object>>} Map of symbol to ticker data
 */
export async function fetchTickerBatch(symbols) {
  const results = new Map();

  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const batch = symbols.slice(i, Math.min(i + BATCH_SIZE, symbols.length));

    const promises = batch.map(async (symbol) => {
      const ticker = await fetchTicker24hr(symbol);
      if (ticker) {
        results.set(symbol, ticker);
      }
    });

    await Promise.all(promises);

    if (i + BATCH_SIZE < symbols.length) {
      await delay(BATCH_DELAY);
    }
  }

  return results;
}

/**
 * Parse kline data into OHLC arrays
 * @param {Array} klines - Raw kline data from Binance
 * @returns {Object} Object with opens, highs, lows, closes, volumes arrays
 */
export function parseKlines(klines) {
  return {
    opens: klines.map(k => parseFloat(k[1])),
    highs: klines.map(k => parseFloat(k[2])),
    lows: klines.map(k => parseFloat(k[3])),
    closes: klines.map(k => parseFloat(k[4])),
    volumes: klines.map(k => parseFloat(k[5]))
  };
}
