#!/usr/bin/env node

/**
 * Binance Ticker Skill
 * A Claude Code Skill for fetching real-time cryptocurrency prices from Binance
 *
 * Usage:
 *   binance-ticker [symbol]      - Get price for a symbol (default: BTCUSDT)
 *   binance-ticker BTC           - Automatically appends USDT
 *   binance-ticker --list        - List popular trading pairs
 */

import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

const BASE_URL = 'https://api.binance.com/api/v3';

// Proxy configuration - can be overridden via environment variable
const PROXY_URL = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:7897';
const agent = new HttpsProxyAgent(PROXY_URL);

// Popular trading pairs for --list option
const POPULAR_PAIRS = [
  'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'MATIC',
  'DOT', 'AVAX', 'LINK', 'UNI', 'LTC', 'BCH', 'ATOM', 'ETC'
];

// Kline intervals
const INTERVALS = {
  '1m': '1 minute',
  '3m': '3 minutes',
  '5m': '5 minutes',
  '15m': '15 minutes',
  '30m': '30 minutes',
  '1h': '1 hour',
  '2h': '2 hours',
  '4h': '4 hours',
  '6h': '6 hours',
  '8h': '8 hours',
  '12h': '12 hours',
  '1d': '1 day',
  '3d': '3 days',
  '1w': '1 week',
  '1M': '1 month'
};

/**
 * Format price display
 */
function formatPrice(symbol, price, change = null) {
  const symbolUpper = symbol.toUpperCase();
  const priceNum = parseFloat(price);

  // Format based on price magnitude
  let formattedPrice;
  if (priceNum >= 1000) {
    formattedPrice = priceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else if (priceNum >= 1) {
    formattedPrice = priceNum.toFixed(2);
  } else if (priceNum >= 0.01) {
    formattedPrice = priceNum.toFixed(4);
  } else {
    formattedPrice = priceNum.toFixed(8);
  }

  let output = `\n${symbolUpper}`;
  output += `\n${'─'.repeat(symbolUpper.length)}`;
  output += `\n  Price: $${formattedPrice}`;

  if (change !== null) {
    const changeNum = parseFloat(change);
    const arrow = changeNum >= 0 ? '↑' : '↓';
    const color = changeNum >= 0 ? '+' : '';
    output += `\n  24h:  ${arrow} ${color}${changeNum.toFixed(2)}%`;
  }

  output += '\n';
  return output;
}

/**
 * Fetch single ticker price
 */
async function getTickerPrice(symbol) {
  // Normalize symbol - append USDT if no suffix provided
  let normalizedSymbol = symbol.toUpperCase();
  if (!normalizedSymbol.includes('USDT') && !normalizedSymbol.includes('BUSD') && !normalizedSymbol.includes('USDC')) {
    normalizedSymbol += 'USDT';
  }

  try {
    const response = await fetch(`${BASE_URL}/ticker/24hr?symbol=${normalizedSymbol}`, { agent });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.msg || `Symbol ${normalizedSymbol} not found`);
    }

    const data = await response.json();
    const priceChangePercent = parseFloat(data.priceChangePercent);

    console.log(formatPrice(data.symbol, data.lastPrice, priceChangePercent));
    return data;

  } catch (error) {
    console.error(`Error fetching ${normalizedSymbol}:`, error.message);
    process.exit(1);
  }
}

/**
 * Fetch multiple ticker prices
 */
async function getMultiplePrices(symbols) {
  const normalizedSymbols = symbols.map(s => {
    const upper = s.toUpperCase();
    if (!upper.includes('USDT') && !upper.includes('BUSD') && !upper.includes('USDC')) {
      return upper + 'USDT';
    }
    return upper;
  });

  try {
    // Fetch each symbol individually for better error handling
    const results = await Promise.allSettled(
      normalizedSymbols.map(async (symbol) => {
        const response = await fetch(`${BASE_URL}/ticker/24hr?symbol=${symbol}`, { agent });
        if (!response.ok) {
          throw new Error(`Failed to fetch ${symbol}`);
        }
        return response.json();
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const ticker = result.value;
        const priceChangePercent = parseFloat(ticker.priceChangePercent);
        console.log(formatPrice(ticker.symbol, ticker.lastPrice, priceChangePercent));
      } else {
        console.error(`  Error: ${result.reason.message}`);
      }
    }

  } catch (error) {
    console.error('Error fetching prices:', error.message);
    process.exit(1);
  }
}

/**
 * Fetch Kline (candlestick) data
 * @param {string} symbol - Trading symbol
 * @param {string} interval - Kline interval (e.g., '15m', '1h', '1d')
 * @param {number} limit - Number of candles to fetch (max 1000)
 */
async function getKlines(symbol, interval = '15m', limit = 96) {
  // Normalize symbol
  let normalizedSymbol = symbol.toUpperCase();
  if (!normalizedSymbol.includes('USDT') && !normalizedSymbol.includes('BUSD') && !normalizedSymbol.includes('USDC')) {
    normalizedSymbol += 'USDT';
  }

  // Validate interval
  if (!INTERVALS[interval]) {
    console.error(`Invalid interval: ${interval}`);
    console.error(`Available intervals: ${Object.keys(INTERVALS).join(', ')}`);
    process.exit(1);
  }

  // Limit max 1000
  limit = Math.min(limit, 1000);

  try {
    const response = await fetch(
      `${BASE_URL}/klines?symbol=${normalizedSymbol}&interval=${interval}&limit=${limit}`,
      { agent }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.msg || `Failed to fetch klines for ${normalizedSymbol}`);
    }

    const klines = await response.json();

    // Kline data format: [openTime, open, high, low, close, volume, closeTime, ...]
    // Calculate statistics
    const opens = klines.map(k => parseFloat(k[1]));
    const highs = klines.map(k => parseFloat(k[2]));
    const lows = klines.map(k => parseFloat(k[3]));
    const closes = klines.map(k => parseFloat(k[4]));
    const volumes = klines.map(k => parseFloat(k[5]));

    const highPrice = Math.max(...highs);
    const lowPrice = Math.min(...lows);
    const totalVolume = volumes.reduce((a, b) => a + b, 0);
    const firstOpen = opens[0];
    const lastClose = closes[closes.length - 1];
    const change = ((lastClose - firstOpen) / firstOpen) * 100;

    // Format output
    console.log(`\n${normalizedSymbol} - ${INTERVALS[interval]} Kline Data (${klines.length} candles)`);
    console.log('═'.repeat(60));
    console.log(`  Period:     ${formatTimestamp(klines[0][0])} → ${formatTimestamp(klines[klines.length - 1][6])}`);
    console.log(`  Open:       $${formatPriceValue(firstOpen)}`);
    console.log(`  Close:      $${formatPriceValue(lastClose)} (${change >= 0 ? '+' : ''}${change.toFixed(2)}%)`);
    console.log(`  High:       $${formatPriceValue(highPrice)}`);
    console.log(`  Low:        $${formatPriceValue(lowPrice)}`);
    console.log(`  Volume:     ${formatVolume(totalVolume)}`);
    console.log();

    // Show recent candles
    const showCount = Math.min(5, klines.length);
    console.log(`  Recent ${showCount} candles:`);
    console.log('  ' + '─'.repeat(50));

    for (let i = klines.length - showCount; i < klines.length; i++) {
      const k = klines[i];
      const open = parseFloat(k[1]);
      const high = parseFloat(k[2]);
      const low = parseFloat(k[3]);
      const close = parseFloat(k[4]);
      const candleChange = ((close - open) / open) * 100;

      const time = new Date(k[0]).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });

      const arrow = close >= open ? '🟢' : '🔴';
      console.log(`    ${time}  O:${formatPriceValue(open)} H:${formatPriceValue(high)} L:${formatPriceValue(low)} C:${formatPriceValue(close)} ${arrow} ${candleChange >= 0 ? '+' : ''}${candleChange.toFixed(2)}%`);
    }
    console.log();

    return klines;

  } catch (error) {
    console.error(`Error fetching klines:`, error.message);
    process.exit(1);
  }
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format price value based on magnitude
 */
function formatPriceValue(price) {
  const num = parseFloat(price);
  if (num >= 1000) {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else if (num >= 1) {
    return num.toFixed(2);
  } else if (num >= 0.01) {
    return num.toFixed(4);
  } else {
    return num.toFixed(8);
  }
}

/**
 * Format volume for display
 */
function formatVolume(volume) {
  if (volume >= 1e9) {
    return (volume / 1e9).toFixed(2) + 'B';
  } else if (volume >= 1e6) {
    return (volume / 1e6).toFixed(2) + 'M';
  } else if (volume >= 1e3) {
    return (volume / 1e3).toFixed(2) + 'K';
  }
  return volume.toFixed(2);
}

/**
 * List popular trading pairs with current prices
 */
async function listPopularPairs() {
  const symbols = POPULAR_PAIRS.map(p => p + 'USDT');

  try {
    // Fetch all symbols individually for simplicity
    const prices = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const res = await fetch(`${BASE_URL}/ticker/price?symbol=${symbol}`, { agent });
          return await res.json();
        } catch {
          return null;
        }
      })
    );

    console.log('\n📊 Popular Binance Trading Pairs');
    console.log('═'.repeat(40));

    for (const price of prices.filter(Boolean)) {
      const priceNum = parseFloat(price.price);
      let formatted;
      if (priceNum >= 1) {
        formatted = '$' + priceNum.toFixed(2);
      } else {
        formatted = '$' + priceNum.toFixed(6);
      }
      console.log(`  ${price.symbol.padEnd(10)} ${formatted}`);
    }
    console.log();

  } catch (error) {
    console.error('Error listing pairs:', error.message);
    process.exit(1);
  }
}

/**
 * Show help
 */
function showHelp() {
  console.log(`
Binance Ticker Skill - Real-time Cryptocurrency Prices

Usage:
  binance-ticker [symbol]              Get price for a trading pair
  binance-ticker <symbol1> <symbol2>... Get multiple prices
  binance-ticker --list                List popular trading pairs
  binance-ticker --klines <symbol>     Get kline data (default: 15m, 96 candles)
  binance-ticker --klines <symbol> -i <interval> -n <count>
  binance-ticker --help                Show this help

Kline Intervals:
  1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M

Examples:
  binance-ticker BTC                  Get BTC price
  binance-ticker ETH SOL              Get multiple prices
  binance-ticker --klines BTC          Get BTC 15m klines (1 day)
  binance-ticker --klines ETH -i 1h -n 24  Get ETH 1h klines (24 hours)
  binance-ticker --klines SOL -i 1d -n 7  Get SOL daily klines (1 week)

Note: Symbol automatically appends USDT if no quote currency specified.
`);
}

// Main CLI handler
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    return;
  }

  if (args[0] === '--list') {
    await listPopularPairs();
    return;
  }

  // Handle --klines option
  if (args[0] === '--klines') {
    let symbol = 'BTC';  // default
    let interval = '15m'; // default
    let limit = 96;       // default (1 day of 15m candles)

    // Parse args: --klines BTC -i 15m -n 100
    for (let i = 1; i < args.length; i++) {
      if (args[i] === '-i' && i + 1 < args.length) {
        interval = args[i + 1];
        i++;
      } else if (args[i] === '-n' && i + 1 < args.length) {
        limit = parseInt(args[i + 1]);
        i++;
      } else if (!args[i].startsWith('-')) {
        symbol = args[i];
      }
    }

    await getKlines(symbol, interval, limit);
    return;
  }

  // Get prices for provided symbols
  if (args.length === 1) {
    await getTickerPrice(args[0]);
  } else {
    await getMultiplePrices(args);
  }
}

main().catch(console.error);
