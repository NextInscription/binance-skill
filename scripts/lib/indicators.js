/**
 * Technical Indicators Library for Binance Screener
 * Provides common technical analysis calculations
 */

/**
 * Calculate RSI (Relative Strength Index) using Wilder's smoothing
 * @param {number[]} closes - Array of closing prices
 * @param {number} period - RSI period (default: 14)
 * @returns {number[]} Array of RSI values
 */
export function calculateRSI(closes, period = 14) {
  if (closes.length < period + 1) {
    throw new Error(`Not enough data for RSI calculation. Need at least ${period + 1} data points.`);
  }

  const rsiValues = [];

  // Calculate price changes
  const changes = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  // Separate gains and losses
  const gains = changes.map(c => c > 0 ? c : 0);
  const losses = changes.map(c => c < 0 ? Math.abs(c) : 0);

  // Calculate initial average gain and loss using SMA
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // First RSI value
  if (avgLoss === 0) {
    rsiValues.push(100);
  } else {
    const rs = avgGain / avgLoss;
    rsiValues.push(100 - (100 / (1 + rs)));
  }

  // Calculate subsequent RSI values using Wilder's smoothing
  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

    if (avgLoss === 0) {
      rsiValues.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsiValues.push(100 - (100 / (1 + rs)));
    }
  }

  return rsiValues;
}

/**
 * Calculate SMA (Simple Moving Average)
 * @param {number[]} prices - Array of prices
 * @param {number} period - SMA period
 * @returns {number[]} Array of SMA values
 */
export function calculateSMA(prices, period) {
  if (prices.length < period) {
    throw new Error(`Not enough data for SMA calculation. Need at least ${period} data points.`);
  }

  const smaValues = [];

  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    smaValues.push(sum / period);
  }

  return smaValues;
}

/**
 * Calculate EMA (Exponential Moving Average)
 * @param {number[]} prices - Array of prices
 * @param {number} period - EMA period
 * @returns {number[]} Array of EMA values
 */
export function calculateEMA(prices, period) {
  if (prices.length < period) {
    throw new Error(`Not enough data for EMA calculation. Need at least ${period} data points.`);
  }

  const emaValues = [];
  const multiplier = 2 / (period + 1);

  // Start with SMA for the first EMA value
  const firstSMA = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  emaValues.push(firstSMA);

  // Calculate subsequent EMA values
  for (let i = period; i < prices.length; i++) {
    const ema = (prices[i] - emaValues[emaValues.length - 1]) * multiplier + emaValues[emaValues.length - 1];
    emaValues.push(ema);
  }

  return emaValues;
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 * @param {number[]} closes - Array of closing prices
 * @param {number} fast - Fast EMA period (default: 12)
 * @param {number} slow - Slow EMA period (default: 26)
 * @param {number} signal - Signal line EMA period (default: 9)
 * @returns {Object} MACD data with macdLine, signalLine, and histogram arrays
 */
export function calculateMACD(closes, fast = 12, slow = 26, signal = 9) {
  if (closes.length < slow + signal) {
    throw new Error(`Not enough data for MACD calculation. Need at least ${slow + signal} data points.`);
  }

  // Calculate fast and slow EMAs
  const fastEMA = calculateEMA(closes, fast);
  const slowEMA = calculateEMA(closes, slow);

  // Align arrays (slowEMA starts later)
  const offset = slow - fast;
  const macdLine = [];
  for (let i = 0; i < slowEMA.length; i++) {
    macdLine.push(fastEMA[i + offset] - slowEMA[i]);
  }

  // Calculate signal line (EMA of MACD line)
  const signalLine = calculateEMA(macdLine, signal);

  // Calculate histogram
  const histogram = [];
  const signalOffset = macdLine.length - signalLine.length;
  for (let i = 0; i < signalLine.length; i++) {
    histogram.push(macdLine[i + signalOffset] - signalLine[i]);
  }

  return {
    macdLine,
    signalLine,
    histogram
  };
}

/**
 * Calculate Bollinger Bands
 * @param {number[]} prices - Array of prices
 * @param {number} period - Period for middle band (SMA) (default: 20)
 * @param {number} stdDev - Standard deviation multiplier (default: 2)
 * @returns {Object} Bollinger Bands with upper, middle, lower arrays
 */
export function calculateBollingerBands(prices, period = 20, stdDev = 2) {
  if (prices.length < period) {
    throw new Error(`Not enough data for Bollinger Bands calculation. Need at least ${period} data points.`);
  }

  const middle = calculateSMA(prices, period);
  const upper = [];
  const lower = [];

  for (let i = 0; i < middle.length; i++) {
    // Calculate standard deviation for the current window
    const slice = prices.slice(i, i + period);
    const mean = middle[i];
    const squaredDiffs = slice.map(p => Math.pow(p - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
    const stdDeviation = Math.sqrt(variance);

    upper.push(mean + stdDev * stdDeviation);
    lower.push(mean - stdDev * stdDeviation);
  }

  return {
    upper,
    middle,
    lower
  };
}

/**
 * Check for golden cross (MA crossover bullish signal)
 * @param {number[]} maFast - Faster moving average
 * @param {number[]} maSlow - Slower moving average
 * @returns {boolean} True if golden cross detected
 */
export function isGoldenCross(maFast, maSlow) {
  if (maFast.length < 2 || maSlow.length < 2) {
    return false;
  }

  // Get the last two values
  const fastPrev = maFast[maFast.length - 2];
  const fastCurr = maFast[maFast.length - 1];
  const slowPrev = maSlow[maSlow.length - 2];
  const slowCurr = maSlow[maSlow.length - 1];

  // Golden cross: fast was below slow, now above slow
  return fastPrev <= slowPrev && fastCurr > slowCurr;
}

/**
 * Check for death cross (MA crossover bearish signal)
 * @param {number[]} maFast - Faster moving average
 * @param {number[]} maSlow - Slower moving average
 * @returns {boolean} True if death cross detected
 */
export function isDeathCross(maFast, maSlow) {
  if (maFast.length < 2 || maSlow.length < 2) {
    return false;
  }

  // Get the last two values
  const fastPrev = maFast[maFast.length - 2];
  const fastCurr = maFast[maFast.length - 1];
  const slowPrev = maSlow[maSlow.length - 2];
  const slowCurr = maSlow[maSlow.length - 1];

  // Death cross: fast was above slow, now below slow
  return fastPrev >= slowPrev && fastCurr < slowCurr;
}

/**
 * Check for MACD bullish crossover
 * @param {number[]} histogram - MACD histogram values
 * @returns {boolean} True if bullish crossover detected
 */
export function isMACDBullishCross(histogram) {
  if (histogram.length < 2) {
    return false;
  }

  const prev = histogram[histogram.length - 2];
  const curr = histogram[histogram.length - 1];

  // Bullish cross: histogram was negative, now positive
  return prev < 0 && curr > 0;
}

/**
 * Check for MACD bearish crossover
 * @param {number[]} histogram - MACD histogram values
 * @returns {boolean} True if bearish crossover detected
 */
export function isMACDBearishCross(histogram) {
  if (histogram.length < 2) {
    return false;
  }

  const prev = histogram[histogram.length - 2];
  const curr = histogram[histogram.length - 1];

  // Bearish cross: histogram was positive, now negative
  return prev > 0 && curr < 0;
}

/**
 * Get latest indicator values for a symbol
 * @param {number[]} closes - Array of closing prices
 * @param {number[]} highs - Array of high prices
 * @param {number[]} lows - Array of low prices
 * @returns {Object} Latest indicator values
 */
export function getLatestIndicators(closes, highs, lows) {
  // Calculate RSI (period 14)
  const rsiValues = calculateRSI(closes, 14);

  // Calculate EMAs for MACD
  const macdData = calculateMACD(closes, 12, 26, 9);

  // Calculate MAs for golden cross detection
  const ma20 = calculateSMA(closes, 20);
  const ma50 = calculateSMA(closes, 50);

  // Calculate Bollinger Bands
  const bbData = calculateBollingerBands(closes, 20, 2);

  const currentPrice = closes[closes.length - 1];

  return {
    rsi: rsiValues[rsiValues.length - 1],
    macd: {
      value: macdData.macdLine[macdData.macdLine.length - 1],
      signal: macdData.signalLine[macdData.signalLine.length - 1],
      histogram: macdData.histogram[macdData.histogram.length - 1]
    },
    ma20: ma20[ma20.length - 1],
    ma50: ma50[ma50.length - 1],
    bollinger: {
      upper: bbData.upper[bbData.upper.length - 1],
      middle: bbData.middle[bbData.middle.length - 1],
      lower: bbData.lower[bbData.lower.length - 1]
    },
    price: currentPrice,
    // Cross detection flags
    crosses: {
      goldenCross: isGoldenCross(ma20, ma50),
      deathCross: isDeathCross(ma20, ma50),
      macdBullish: isMACDBullishCross(macdData.histogram),
      macdBearish: isMACDBearishCross(macdData.histogram)
    }
  };
}
