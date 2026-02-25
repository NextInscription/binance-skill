/**
 * Filters Library for Binance Screener
 * Provides filtering logic for technical indicators
 */

/**
 * Check if indicators match the specified filters
 * @param {Object} indicators - Indicator values from getLatestIndicators
 * @param {Object} filters - Filter criteria
 * @returns {boolean} True if all filters match
 */
export function matchesFilters(indicators, filters) {
  if (!filters || Object.keys(filters).length === 0) {
    return true; // No filters means everything matches
  }

  // RSI filters
  if (filters.rsi) {
    if (filters.rsi.below !== undefined && indicators.rsi >= filters.rsi.below) {
      return false;
    }
    if (filters.rsi.above !== undefined && indicators.rsi <= filters.rsi.above) {
      return false;
    }
    if (filters.rsi.between) {
      const [min, max] = filters.rsi.between;
      if (indicators.rsi < min || indicators.rsi > max) {
        return false;
      }
    }
  }

  // MACD filters
  if (filters.macd) {
    if (filters.macd.bullish && !indicators.crosses.macdBullish) {
      return false;
    }
    if (filters.macd.bearish && !indicators.crosses.macdBearish) {
      return false;
    }
    if (filters.macd.histogramPositive !== undefined) {
      const isPositive = indicators.macd.histogram > 0;
      if (filters.macd.histogramPositive && !isPositive) {
        return false;
      }
      if (!filters.macd.histogramPositive && isPositive) {
        return false;
      }
    }
  }

  // MA filters
  if (filters.ma) {
    if (filters.ma.goldenCross && !indicators.crosses.goldenCross) {
      return false;
    }
    if (filters.ma.deathCross && !indicators.crosses.deathCross) {
      return false;
    }
    if (filters.ma.above !== undefined) {
      // Check if price is above MA
      if (filters.ma.above === 20 && indicators.price <= indicators.ma20) {
        return false;
      }
      if (filters.ma.above === 50 && indicators.price <= indicators.ma50) {
        return false;
      }
    }
    if (filters.ma.below !== undefined) {
      // Check if price is below MA
      if (filters.ma.below === 20 && indicators.price >= indicators.ma20) {
        return false;
      }
      if (filters.ma.below === 50 && indicators.price >= indicators.ma50) {
        return false;
      }
    }
  }

  // Bollinger Bands filters
  if (filters.bollinger) {
    const { upper, middle, lower } = indicators.bollinger;

    if (filters.bollinger.touchUpper !== undefined) {
      const isTouching = indicators.price >= upper * 0.995;
      if (filters.bollinger.touchUpper && !isTouching) {
        return false;
      }
    }

    if (filters.bollinger.touchLower !== undefined) {
      const isTouching = indicators.price <= lower * 1.005;
      if (filters.bollinger.touchLower && !isTouching) {
        return false;
      }
    }

    if (filters.bollinger.belowLower !== undefined) {
      if (filters.bollinger.belowLower && indicators.price >= lower) {
        return false;
      }
    }

    if (filters.bollinger.aboveUpper !== undefined) {
      if (filters.bollinger.aboveUpper && indicators.price <= upper) {
        return false;
      }
    }

    if (filters.bollinger.narrow !== undefined) {
      // Check if bands are narrow (low volatility)
      const bandwidth = (upper - lower) / middle;
      if (filters.bollinger.narrow && bandwidth > 0.1) {
        return false; // Not narrow if bandwidth > 10%
      }
    }

    if (filters.bollinger.wide !== undefined) {
      // Check if bands are wide (high volatility)
      const bandwidth = (upper - lower) / middle;
      if (filters.bollinger.wide && bandwidth < 0.1) {
        return false; // Not wide if bandwidth < 10%
      }
    }
  }

  // Price filters
  if (filters.price) {
    if (filters.price.min !== undefined && indicators.price < filters.price.min) {
      return false;
    }
    if (filters.price.max !== undefined && indicators.price > filters.price.max) {
      return false;
    }
  }

  return true;
}

/**
 * Calculate a score for indicators based on filter criteria
 * Higher score means stronger match
 * @param {Object} indicators - Indicator values
 * @returns {number} Score from 0-100
 */
export function calculateScore(indicators) {
  let score = 50; // Base score

  // RSI scoring (oversold/overbought)
  if (indicators.rsi < 30) {
    score += (30 - indicators.rsi); // Add up to 30 points for oversold
  } else if (indicators.rsi > 70) {
    score += (indicators.rsi - 70); // Add up to 30 points for overbought
  }

  // MACD bullish cross
  if (indicators.crosses.macdBullish) {
    score += 15;
  }

  // MA golden cross
  if (indicators.crosses.goldenCross) {
    score += 15;
  }

  // Bollinger Band position
  const { upper, lower } = indicators.bollinger;
  const bandWidth = upper - lower;
  const position = (indicators.price - lower) / bandWidth;

  // Near lower band (potential buy)
  if (position < 0.1) {
    score += 10;
  }
  // Near upper band (potential sell)
  if (position > 0.9) {
    score += 10;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Parse filter objects from command line arguments
 * @param {Object} args - Parsed command line arguments
 * @returns {Object} Filter criteria
 */
export function parseFiltersFromArgs(args) {
  const filters = {};

  // RSI filters
  if (args.rsiBelow !== undefined || args.rsiAbove !== undefined || args.rsiBetween !== undefined) {
    filters.rsi = {};
    if (args.rsiBelow !== undefined) {
      filters.rsi.below = args.rsiBelow;
    }
    if (args.rsiAbove !== undefined) {
      filters.rsi.above = args.rsiAbove;
    }
    if (args.rsiBetween !== undefined) {
      filters.rsi.between = args.rsiBetween.split(',').map(Number);
    }
  }

  // MACD filters
  if (args.macdBullish || args.macdBearish || args.macdHistogramPositive !== undefined) {
    filters.macd = {};
    if (args.macdBullish) {
      filters.macd.bullish = true;
    }
    if (args.macdBearish) {
      filters.macd.bearish = true;
    }
    if (args.macdHistogramPositive !== undefined) {
      filters.macd.histogramPositive = args.macdHistogramPositive === 'true';
    }
  }

  // MA filters
  if (args.maGoldenCross || args.maDeathCross || args.maAbove !== undefined || args.maBelow !== undefined) {
    filters.ma = {};
    if (args.maGoldenCross) {
      filters.ma.goldenCross = true;
    }
    if (args.maDeathCross) {
      filters.ma.deathCross = true;
    }
    if (args.maAbove !== undefined) {
      filters.ma.above = parseInt(args.maAbove);
    }
    if (args.maBelow !== undefined) {
      filters.ma.below = parseInt(args.maBelow);
    }
  }

  // Bollinger Bands filters
  if (args.bbLower || args.bbUpper || args.bdBelowLower || args.bbAboveUpper || args.bbNarrow || args.bbWide) {
    filters.bollinger = {};
    if (args.bbLower) {
      filters.bollinger.touchLower = true;
    }
    if (args.bbUpper) {
      filters.bollinger.touchUpper = true;
    }
    if (args.bdBelowLower) {
      filters.bollinger.belowLower = true;
    }
    if (args.bbAboveUpper) {
      filters.bollinger.aboveUpper = true;
    }
    if (args.bbNarrow) {
      filters.bollinger.narrow = true;
    }
    if (args.bbWide) {
      filters.bollinger.wide = true;
    }
  }

  // Price filters
  if (args.priceMin !== undefined || args.priceMax !== undefined) {
    filters.price = {};
    if (args.priceMin !== undefined) {
      filters.price.min = parseFloat(args.priceMin);
    }
    if (args.priceMax !== undefined) {
      filters.price.max = parseFloat(args.priceMax);
    }
  }

  return filters;
}

/**
 * Format filters for display
 * @param {Object} filters - Filter criteria
 * @returns {string} Formatted filter description
 */
export function formatFilters(filters) {
  const parts = [];

  if (filters.rsi) {
    if (filters.rsi.below !== undefined) {
      parts.push(`RSI < ${filters.rsi.below}`);
    }
    if (filters.rsi.above !== undefined) {
      parts.push(`RSI > ${filters.rsi.above}`);
    }
    if (filters.rsi.between) {
      parts.push(`RSI between ${filters.rsi.between[0]}-${filters.rsi.between[1]}`);
    }
  }

  if (filters.macd) {
    if (filters.macd.bullish) {
      parts.push('MACD bullish cross');
    }
    if (filters.macd.bearish) {
      parts.push('MACD bearish cross');
    }
  }

  if (filters.ma) {
    if (filters.ma.goldenCross) {
      parts.push('MA golden cross');
    }
    if (filters.ma.deathCross) {
      parts.push('MA death cross');
    }
  }

  if (filters.bollinger) {
    if (filters.bollinger.belowLower) {
      parts.push('Price below BB lower');
    }
    if (filters.bollinger.aboveUpper) {
      parts.push('Price above BB upper');
    }
    if (filters.bollinger.touchLower) {
      parts.push('Price touching BB lower');
    }
    if (filters.bollinger.touchUpper) {
      parts.push('Price touching BB upper');
    }
  }

  if (filters.price) {
    if (filters.price.min !== undefined) {
      parts.push(`Price >= $${filters.price.min}`);
    }
    if (filters.price.max !== undefined) {
      parts.push(`Price <= $${filters.price.max}`);
    }
  }

  return parts.length > 0 ? parts.join(', ') : 'No filters';
}
