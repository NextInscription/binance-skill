#!/usr/bin/env node

/**
 * Binance Technical Indicator Screener
 * Scans all USDT trading pairs and filters by technical indicators
 *
 * Usage:
 *   node binance-screener.js --rsi-below 30
 *   node binance-screener.js --macd-bullish --interval 4h
 *   node binance-screener.js --ma-golden-cross --json
 */

import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { getAllUSDTPairs, fetchKlinesBatch, parseKlines, fetchTickerBatch } from './lib/api.js';
import { getLatestIndicators } from './lib/indicators.js';
import { matchesFilters, parseFiltersFromArgs, formatFilters, calculateScore } from './lib/filters.js';

// Proxy configuration
const PROXY_URL = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:7897';
const agent = new HttpsProxyAgent(PROXY_URL);

// Valid intervals
const INTERVALS = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'];

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    interval: '4h',
    limit: 100,
    output: 'json',
    maxResults: 0,
    topVolume: 0
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '-i':
      case '--interval':
        parsed.interval = args[++i];
        break;

      case '-n':
      case '--limit':
        parsed.limit = parseInt(args[++i]);
        break;

      case '--rsi-below':
        parsed.rsiBelow = parseFloat(args[++i]);
        break;

      case '--rsi-above':
        parsed.rsiAbove = parseFloat(args[++i]);
        break;

      case '--rsi-between':
        parsed.rsiBetween = args[++i];
        break;

      case '--macd-bullish':
        parsed.macdBullish = true;
        break;

      case '--macd-bearish':
        parsed.macdBearish = true;
        break;

      case '--macd-histogram-positive':
        parsed.macdHistogramPositive = args[++i];
        break;

      case '--ma-golden-cross':
        parsed.maGoldenCross = true;
        break;

      case '--ma-death-cross':
        parsed.maDeathCross = true;
        break;

      case '--ma-above':
        parsed.maAbove = args[++i];
        break;

      case '--ma-below':
        parsed.maBelow = args[++i];
        break;

      case '--bb-lower':
        parsed.bbLower = true;
        break;

      case '--bb-upper':
        parsed.bbUpper = true;
        break;

      case '--bb-below-lower':
        parsed.bdBelowLower = true;
        break;

      case '--bb-above-upper':
        parsed.bbAboveUpper = true;
        break;

      case '--bb-narrow':
        parsed.bbNarrow = true;
        break;

      case '--bb-wide':
        parsed.bbWide = true;
        break;

      case '--price-min':
        parsed.priceMin = args[++i];
        break;

      case '--price-max':
        parsed.priceMax = args[++i];
        break;

      case '--max-results':
        parsed.maxResults = parseInt(args[++i]);
        break;

      case '--top-volume':
        parsed.topVolume = parseInt(args[++i]);
        break;

      case '-o':
      case '--output':
        parsed.output = args[++i];
        break;

      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;

      default:
        if (arg.startsWith('-')) {
          console.error(`Unknown option: ${arg}`);
          console.error('Use --help for usage information');
          process.exit(1);
        }
    }
  }

  return parsed;
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
Binance Technical Indicator Screener

Usage:
  node binance-screener.js [options]

Options:
  -i, --interval <interval>      Kline interval (default: 4h)
                                 Valid: 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M
  -n, --limit <count>            Number of candles to fetch (default: 100, max: 1000)

  RSI Filters:
  --rsi-below <value>            RSI below specified value (e.g., 30 for oversold)
  --rsi-above <value>            RSI above specified value (e.g., 70 for overbought)
  --rsi-between <min,max>        RSI between two values (e.g., 40,60)

  MACD Filters:
  --macd-bullish                 MACD bullish crossover (histogram crosses from negative to positive)
  --macd-bearish                 MACD bearish crossover (histogram crosses from positive to negative)
  --macd-histogram-positive      MACD histogram positive (true/false)

  Moving Average Filters:
  --ma-golden-cross              MA20 crosses above MA50 (golden cross)
  --ma-death-cross               MA20 crosses below MA50 (death cross)
  --ma-above <period>            Price above MA period (20 or 50)
  --ma-below <period>            Price below MA period (20 or 50)

  Bollinger Bands Filters:
  --bb-lower                     Price touching lower band
  --bb-upper                     Price touching upper band
  --bb-below-lower               Price below lower band
  --bb-above-upper               Price above upper band
  --bb-narrow                    Narrow bands (low volatility)
  --bb-wide                      Wide bands (high volatility)

  Price Filters:
  --price-min <value>            Minimum price
  --price-max <value>            Maximum price

  Output Options:
  --max-results <count>          Limit number of results
  --top-volume <count>           Only scan top N by volume
  -o, --output <format>          Output format: json (default), table
  --output-file <file>           Write output to file

Examples:
  # Find oversold coins (RSI < 30)
  node binance-screener.js --rsi-below 30

  # Find bullish MACD crossover
  node binance-screener.js --macd-bullish --interval 4h

  # Find golden cross with RSI between 40-60
  node binance-screener.js --ma-golden-cross --rsi-between 40,60

  # Find coins below Bollinger lower band
  node binance-screener.js --bb-below-lower --interval 1h

  # Find oversold coins in top 100 by volume
  node binance-screener.js --rsi-below 30 --top-volume 100

  # Output to file
  node binance-screener.js --rsi-below 30 --output-file results.json
`);
}

/**
 * Format price for display
 */
function formatPrice(price) {
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
 * Scan symbols and apply filters
 */
async function scanSymbols(args) {
  console.log(`Fetching USDT trading pairs...`);

  // Get all USDT pairs
  let symbols = await getAllUSDTPairs();
  console.log(`Found ${symbols.length} USDT trading pairs`);

  // Filter by volume if specified
  if (args.topVolume > 0) {
    console.log(`Fetching top ${args.topVolume} by volume...`);
    const tickers = await fetchTickerBatch(symbols);

    // Sort by volume and get top N
    const sorted = Array.from(tickers.entries())
      .sort((a, b) => parseFloat(b[1].quoteVolume) - parseFloat(a[1].quoteVolume))
      .slice(0, args.topVolume);

    symbols = sorted.map(([symbol]) => symbol);
    console.log(`Selected top ${symbols.length} by volume`);
  }

  // Parse filters
  const filters = parseFiltersFromArgs(args);
  console.log(`Filters: ${formatFilters(filters)}`);
  console.log(`Interval: ${args.interval}, Candles: ${args.limit}`);
  console.log(`Scanning ${symbols.length} symbols...`);
  console.log();

  // Fetch klines with progress indicator
  let lastProgress = 0;
  const klinesMap = await fetchKlinesBatch(
    symbols,
    args.interval,
    args.limit,
    (processed, total, symbol) => {
      const progress = Math.floor((processed / total) * 100);
      if (progress % 10 === 0 && progress !== lastProgress) {
        process.stdout.write(`\rProgress: ${progress}% (${processed}/${total})`);
        lastProgress = progress;
      }
    }
  );

  console.log(`\rProgress: 100% (${klinesMap.size}/${symbols.length})`);
  console.log();

  // Analyze symbols
  const results = [];
  let scanned = 0;

  for (const [symbol, klines] of klinesMap) {
    scanned++;

    // Need at least 100 candles for MA50
    if (klines.length < 100) {
      continue;
    }

    const { opens, highs, lows, closes } = parseKlines(klines);

    try {
      const indicators = getLatestIndicators(closes, highs, lows);

      if (matchesFilters(indicators, filters)) {
        results.push({
          symbol,
          price: indicators.price,
          indicators: {
            rsi: indicators.rsi,
            macd: indicators.macd,
            ma20: indicators.ma20,
            ma50: indicators.ma50,
            bollinger: indicators.bollinger
          },
          crosses: indicators.crosses,
          score: calculateScore(indicators)
        });
      }
    } catch (error) {
      // Skip symbols with calculation errors
      continue;
    }
  }

  // Sort by score
  results.sort((a, b) => b.score - a.score);

  // Limit results
  const finalResults = args.maxResults > 0
    ? results.slice(0, args.maxResults)
    : results;

  return {
    timestamp: new Date().toISOString(),
    interval: args.interval,
    filters,
    results: finalResults,
    totalScanned: scanned,
    matchedCount: results.length
  };
}

/**
 * Output results as JSON
 */
async function outputJSON(data, outputFile) {
  // Format for output - remove internal crosses/score fields if not needed
  const output = {
    timestamp: data.timestamp,
    interval: data.interval,
    filters: data.filters,
    results: data.results.map(r => ({
      symbol: r.symbol,
      price: r.price,
      indicators: r.indicators
    })),
    totalScanned: data.totalScanned,
    matchedCount: data.matchedCount
  };

  const json = JSON.stringify(output, null, 2);

  if (outputFile) {
    const fs = await import('fs');
    fs.writeFileSync(outputFile, json);
    console.log(`Results written to ${outputFile}`);
  } else {
    console.log(json);
  }
}

/**
 * Output results as table
 */
function outputTable(data) {
  console.log(`\n═══════════════════════════════════════════════════════════════`);
  console.log(`  Screener Results - ${data.interval} | ${formatFilters(data.filters)}`);
  console.log(`═══════════════════════════════════════════════════════════════`);
  console.log(`  Scanned: ${data.totalScanned} | Matched: ${data.matchedCount}`);
  console.log(`═══════════════════════════════════════════════════════════════`);

  if (data.results.length === 0) {
    console.log(`  No matches found`);
    console.log(`═══════════════════════════════════════════════════════════════\n`);
    return;
  }

  for (const r of data.results.slice(0, 20)) {
    console.log(`\n  ${r.symbol}`);
    console.log(`  ───────────────────────────────────────────────────────────`);
    console.log(`  Price:    $${formatPrice(r.price)}`);
    console.log(`  RSI(14):  ${r.indicators.rsi.toFixed(1)}`);
    console.log(`  MACD:     ${r.indicators.macd.value.toFixed(2)} | Signal: ${r.indicators.macd.signal.toFixed(2)} | Hist: ${r.indicators.macd.histogram.toFixed(2)}`);
    console.log(`  MA20:     $${formatPrice(r.indicators.ma20)} | MA50: $${formatPrice(r.indicators.ma50)}`);
    console.log(`  BB:       Upper: $${formatPrice(r.indicators.bollinger.upper)} | Mid: $${formatPrice(r.indicators.bollinger.middle)} | Lower: $${formatPrice(r.indicators.bollinger.lower)}`);

    const signals = [];
    if (r.crosses.goldenCross) signals.push('Golden Cross');
    if (r.crosses.deathCross) signals.push('Death Cross');
    if (r.crosses.macdBullish) signals.push('MACD Bullish');
    if (r.crosses.macdBearish) signals.push('MACD Bearish');

    if (signals.length > 0) {
      console.log(`  Signals:  ${signals.join(', ')}`);
    }
  }

  if (data.results.length > 20) {
    console.log(`\n  ... and ${data.results.length - 20} more`);
  }

  console.log(`\n═══════════════════════════════════════════════════════════════\n`);
}

/**
 * Main function
 */
async function main() {
  const args = parseArgs();

  // Validate interval
  if (!INTERVALS.includes(args.interval)) {
    console.error(`Invalid interval: ${args.interval}`);
    console.error(`Valid intervals: ${INTERVALS.join(', ')}`);
    process.exit(1);
  }

  // Validate limit
  if (args.limit < 50 || args.limit > 1000) {
    console.error(`Limit must be between 50 and 1000`);
    process.exit(1);
  }

  // Check if any filters are specified
  const hasFilters = parseFiltersFromArgs(args);
  if (Object.keys(hasFilters).length === 0) {
    console.error(`Please specify at least one filter. Use --help for options.`);
    process.exit(1);
  }

  // Check for output file argument
  let outputFile = null;
  const outputIndex = process.argv.indexOf('--output-file');
  if (outputIndex !== -1 && outputIndex + 1 < process.argv.length) {
    outputFile = process.argv[outputIndex + 1];
  }

  const startTime = Date.now();

  try {
    const data = await scanSymbols(args);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Scan completed in ${elapsed}s`);

    if (args.output === 'table') {
      outputTable(data);
    } else {
      outputJSON(data, outputFile);
    }

  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
