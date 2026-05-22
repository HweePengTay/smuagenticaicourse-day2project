/**
 * analytics.js
 * 
 * What this file does (for beginners):
 * This is our analytical engine. It takes lists of stock prices and runs standard financial formulas 
 * like normalization, volatility, correlation, and drawdown, explaining the math step-by-step.
 */

/**
 * 1. normalizePrices
 * Scales an array of stock prices so they all start at the same base value (usually 100).
 * This lets us compare the rate of growth of a $5 stock side-by-side with a $500 stock!
 * 
 * @param {number[]} prices - Array of raw numerical stock prices
 * @param {number} [baseValue=100] - The starting index value (defaults to 100)
 * @returns {number[]} Array of normalized index values
 */
export function normalizePrices(prices, baseValue = 100) {
  if (!prices || prices.length === 0) return [];
  const firstPrice = prices[0];
  if (firstPrice === 0) return prices.map(() => 0);
  return prices.map(price => (price / firstPrice) * baseValue);
}

/**
 * 2. calculateDailyReturns
 * Measures the change in price from one period to the next as a percentage.
 * Positive returns mean the stock went up; negative means it declined.
 * 
 * @param {number[]} prices - Array of raw stock prices
 * @returns {number[]} Array of percentage changes (length is prices.length - 1)
 */
export function calculateDailyReturns(prices) {
  if (!prices || prices.length < 2) return [];
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    const previous = prices[i - 1];
    if (previous === 0) {
      returns.push(0);
    } else {
      const dailyReturn = ((prices[i] - previous) / previous) * 100;
      returns.push(dailyReturn);
    }
  }
  return returns;
}

/**
 * 3. calculateCorrelation
 * Computes the Pearson Correlation Coefficient (r) between two sets of numbers.
 * The output 'r' is always a value between -1.0 and +1.0:
 *  - Close to +1.0: Moving in perfect lockstep (highly symmetrical).
 *  - Close to 0.0: Moving randomly, no relationship.
 *  - Close to -1.0: Moving in opposite directions.
 * 
 * @param {number[]} arrayA - First numeric dataset
 * @param {number[]} arrayB - Second numeric dataset of equal length
 * @returns {number} The Pearson r score
 */
export function calculateCorrelation(arrayA, arrayB) {
  if (!arrayA || !arrayB || arrayA.length !== arrayB.length || arrayA.length === 0) return 0;
  const n = arrayA.length;
  
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;
  
  for (let i = 0; i < n; i++) {
    const x = arrayA[i];
    const y = arrayB[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }
  
  const numerator = (n * sumXY) - (sumX * sumY);
  const denominator = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));
  
  if (denominator === 0) return 0;
  return numerator / denominator;
}

/**
 * 4. calculateVolatility
 * Measures the dispersion of price returns. It represents the historical risk level.
 * High volatility means the price swings wildly, whereas low volatility means a steady ride.
 * Formula used: Standard Deviation of the daily/period returns.
 * 
 * @param {number[]} prices - Array of historical prices
 * @returns {number} Volatility percentage
 */
export function calculateVolatility(prices) {
  const returns = calculateDailyReturns(prices);
  if (returns.length === 0) return 0;
  
  // Calculate average (mean) return
  const sum = returns.reduce((acc, val) => acc + val, 0);
  const mean = sum / returns.length;
  
  // Calculate standard deviation
  const squaredDifferencesSum = returns.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
  const variance = squaredDifferencesSum / returns.length;
  
  return Math.sqrt(variance);
}

/**
 * 5. calculateMaxDrawdown
 * Calculates the worst-case scenario loss for an investor over the timeline.
 * It measures the biggest drop from a historical "peak" to the subsequent lowest "trough" point
 * before recovery.
 * 
 * @param {number[]} prices - Array of historical prices
 * @returns {number} Maximum drawdown as a negative offset percentage
 */
export function calculateMaxDrawdown(prices) {
  if (!prices || prices.length === 0) return 0;
  let maxDrawdown = 0;
  let peak = prices[0];
  
  for (const price of prices) {
    if (price > peak) {
      peak = price;
    }
    if (peak > 0) {
      const drawdown = ((price - peak) / peak) * 100;
      if (drawdown < maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
  }
  return maxDrawdown; // e.g. -45.5 %
}

/**
 * 6. generateEducationalSignal
 * Examines current price spreads and general correlation scores to advise students 
 * on current valuation zones (Premium, Normal, Discount).
 * 
 * @param {number} correlation - Calculated Pearson r score
 * @param {string} anchorTicker - e.g. "NVDA"
 * @param {string} comparisonTicker - e.g. "VST"
 * @param {object[]} points - Historical price mapping intervals
 * @returns {object} { status: string, description: string }
 */
export function generateEducationalSignal(correlation, anchorTicker, comparisonTicker, points) {
  if (!points || points.length < 10) {
    return {
      status: "Analyzing",
      description: "Gathering minimum index history."
    };
  }
  
  const latest = points[points.length - 1];
  const oldIndex = Math.max(0, points.length - 10);
  const pastPoint = points[oldIndex];

  // Calculate rate of change of the comparison target over the recent period
  const compRawRecent = latest.comparisonRaw;
  const compRawPast = pastPoint.comparisonRaw;
  const compGainRecent = compRawPast > 0 ? (compRawRecent - compRawPast) / compRawPast : 0;
  
  // Calculate relative gap between normalized values (percentage basis)
  const recentGap = latest.anchorNormalized - latest.comparisonNormalized;

  if (correlation > 0.65) {
    if (recentGap > 40 && compGainRecent < 0.08) {
      return {
        status: "Accumulation zone",
        description: `Strong multi-year correlation detected (r = ${correlation.toFixed(2)}). However, ${comparisonTicker} is currently lagging behind ${anchorTicker}'s performance. This creates a relative lag gap which often resolves in an accumulation catch-up.`
      };
    }
    if (compGainRecent > 0.50 && recentGap < -15) {
      return {
        status: "Overextended",
        description: `${comparisonTicker} has accelerated faster than its AI Anchor model ${anchorTicker}. The index has exceeded standard symmetrical parameters and may experience a corrective period.`
      };
    }
    return {
      status: "Hold",
      description: `Solid co-movement confirmed (r = ${correlation.toFixed(2)}). Both assets are performing in symmetrical equilibrium, indicating high institutional sector pairing.`
    };
  }

  return {
    status: "Trend weakening",
    description: `Weak or disjointed correlation (r = ${correlation.toFixed(2)}). These assets are moving independently, suggesting ${comparisonTicker} is currently governed by isolated grid or supply-side dynamics.`
  };
}

/**
 *getDetailedRelationshipExplanation
 * Decodes the fundamental business relationships when comparing an AI Anchor stock with a sector companion.
 * Provides clear explanations of Direct/Indirect mechanics, Pearson coefficients, and structural risks.
 * 
 * @param {string} anchor - Anchor ticker (e.g. NVDA, MSFT)
 * @param {string} comp - Companion ticker (e.g. VST, EQIX, GS)
 * @param {number} rScore - The Pearson correlation r value
 * @returns {object} Highly structured explanation data
 */
export function getDetailedRelationshipExplanation(anchor, comp, rScore) {
  // Sector lookups
  const isUtility = ["VST", "NEE"].includes(comp);
  const isDataCenter = ["EQIX", "DLR"].includes(comp);
  const isBank = ["GS", "JPM"].includes(comp);

  let category = "Unknown Sector";
  let whyRelated = "";
  let relationType = "Indirect Relationship";
  let correlationInterpretation = "";
  let risks = [];

  // 1. Decipher the "Why Related" and "Relation Type"
  if (isUtility) {
    category = "Power Grid Utility";
    relationType = "Indirect / Supply Bottleneck";
    whyRelated = `High-performance Artificial Intelligence clusters demand unprecedented electricity. ${anchor === "NVDA" ? "NVIDIA GPUs" : anchor + "'s cloud datacenters"} cannot operate without steady baseload electrical force. Utility companies like ${comp === "VST" ? "Vistra" : "NextEra"} provide the vital power infrastructure that holds back or unleashes advanced AI computation speed.`;
    
    risks = [
      "Regulatory caps on electricity rates or environmental carbon limits.",
      "Transmission bottleneck failures and water shortage issues for nuclear/steam cooling systems.",
      "High capital expenditure debt to build new capacity before revenues are realized."
    ];
  } else if (isDataCenter) {
    category = "Digital Real Estate (REIT)";
    relationType = "Direct Physical Underpinning";
    whyRelated = `Before AI models can float on the public web, they must run on heavy physical server racks. REITs like ${comp === "EQIX" ? "Equinix" : "Digital Realty"} own and configure the secure, temperature-controlled concrete hangars, backup cooling loops, and high-frequency optic networks. This makes them a direct physical proxy for ${anchor}'s core architectural expansion.`;

    risks = [
      "Physical construction lag (zoning permits, transformer equipment delays can take years).",
      "Real estate pricing cycles, tenant concentration, and sensitivities to federal interest rates.",
      "High cost of maintaining energy security against natural weather extremes."
    ];
  } else if (isBank) {
    category = "Broad Capital Velocity & Banking";
    relationType = "Indirect Macroeconomic Link";
    whyRelated = `Underwriting massive corporate credit lines for hyperscalers, financing mergers, and managing general consumer market health require systemic banking liquidity. Institutions like ${comp === "GS" ? "Goldman Sachs" : "JPMorgan Chase"} act as capital velocity indicators. They are linked to ${anchor} through broad market capital cycles—rather than localized AI hardware lines.`;

    risks = [
      "Sensitivities to Federal Reserve interest rates, credit delinquencies, and commercial defaults.",
      "Cyclical economic downturns and geopolitical disruptions affecting investment fees.",
      "Strict government capital reserve standards that limit flexible utility leverage."
    ];
  }

  // 2. Translate Pearson score for absolute beginners
  const absR = Math.abs(rScore);
  if (rScore >= 0.70) {
    correlationInterpretation = `A strong positive match of ${rScore.toFixed(3)} indicates that Wall Street is pricing these assets as a single cohesive unit. When ${anchor} scales up, ${comp}'s business is treated as a critical link in the same value chain, moving in near total alignment.`;
  } else if (rScore >= 0.30) {
    correlationInterpretation = `A moderate positive match of ${rScore.toFixed(3)} suggests a loose economic connection. They share general tech-cycle momentum, but localized sector developments or unique operational hurdles frequently lead them to temporarily break apart.`;
  } else if (rScore >= -0.30 && rScore < 0.30) {
    correlationInterpretation = `A near-zero correlation of ${rScore.toFixed(3)} proves these assets move independently. Standard movements in ${anchor} have zero reliable predictive sway over ${comp}. They are governed by distinct, unrelated market dynamics.`;
  } else {
    correlationInterpretation = `An inverse relationship of ${rScore.toFixed(3)} means these stocks act as counter-balances. As tech valuations inflate, capitals might rotate away from safe-haven dividend options like ${comp}, and vice versa.`;
  }

  return {
    category,
    whyRelated,
    relationType,
    correlationInterpretation,
    risks
  };
}
