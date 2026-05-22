/**
 * stockData.js
 * 
 * What this file does (for beginners):
 * This file is like a digital library of stock market history for our app.
 * It contains real historical price benchmarks (from 2020 to 2026) for major Artificial Intelligence
 * "Anchor" stocks (like NVIDIA and Microsoft) & comparative companion sector stocks (like Vistra nuclear power or Goldman Sachs banking).
 * 
 * It also defines:
 * 1. A simulated market trend generator (adding smooth, realistic weekly market fluctuations).
 * 2. The mathematical formula for Pearson Correlation Coefficient (r) to see how closely two stocks move together.
 * 3. The rule-based analyzer that deciphers if a lagging utility represents an "accumulation zone" or a "trend weakening".
 */

export const ANCHOR_STOCKS = [
  {
    ticker: "NVDA",
    name: "NVIDIA Corporation",
    sector: "Semiconductors & AI Hardware",
    description: "The leading designer of AI graphics processing units (GPUs) and CUDA software infrastructure."
  },
  {
    ticker: "MSFT",
    name: "Microsoft Corporation",
    sector: "Cloud & Productivity Software",
    description: "Cloud service provider (Azure) and enterprise AI software adapter via OpenAI integrations."
  },
  {
    ticker: "GOOGL",
    name: "Alphabet Inc.",
    sector: "Internet & AI Infrastructure",
    description: "Search, cloud computing, TPUs, and developer of Gemini large language models."
  },
  {
    ticker: "AMZN",
    name: "Amazon.com, Inc.",
    sector: "Cloud Services & E-Commerce",
    description: "AWS public cloud host, developer of custom Trainium/Inferentia chips, and AI search."
  },
  {
    ticker: "META",
    name: "Meta Platforms, Inc.",
    sector: "Social Media & Open-Source AI",
    description: "Owner of social graphs, designer of the open-source Llama model family and advanced AI ad targeting."
  }
];

export const COMPARISON_STOCKS = [
  {
    ticker: "GS",
    name: "Goldman Sachs Group",
    sector: "Investment Banking & Finance",
    description: "Global investment banking group representing traditional monetary capital velocity."
  },
  {
    ticker: "JPM",
    name: "JPMorgan Chase & Co.",
    sector: "Commercial Banking",
    description: "The largest US bank representing broad economic health benchmarks."
  },
  {
    ticker: "EQIX",
    name: "Equinix, Inc.",
    sector: "Real Estate (Data Centers)",
    description: "Global digital housing REIT providing structural interconnections and hosting physical AI servers."
  },
  {
    ticker: "DLR",
    name: "Digital Realty Trust",
    sector: "Real Estate (Data Centers)",
    description: "Data center REIT specializing in colocation facilities and physical site scaling for hyperscalers."
  },
  {
    ticker: "NEE",
    name: "NextEra Energy, Inc.",
    sector: "Utilities & Green Power",
    description: "The largest US producer of wind and solar electricity, critical for green-energy datacenters."
  },
  {
    ticker: "VST",
    name: "Vistra Corp.",
    sector: "Utilities & Independent Power",
    description: "Nuclear and gas utility leveraged heavily to provide constant electricity to hyperscalers."
  }
];

const STOCK_LANDMARKS = {
  NVDA: { 2020: 5.9, 2021: 13.1, 2022: 29.5, 2023: 14.3, 2024: 48.2, 2025: 110.0, 2026: 134.0 },
  MSFT: { 2020: 160.0, 2021: 215.0, 2022: 310.0, 2023: 235.0, 2024: 370.0, 2025: 420.0, 2026: 435.0 },
  GOOGL: { 2020: 67.0, 2021: 86.0, 2022: 145.0, 2023: 88.0, 2024: 140.0, 2025: 180.0, 2026: 176.0 },
  AMZN: { 2020: 94.0, 2021: 160.0, 2022: 168.0, 2023: 84.0, 2024: 150.0, 2025: 188.0, 2026: 184.0 },
  META: { 2020: 205.0, 2021: 260.0, 2022: 338.0, 2023: 120.0, 2024: 350.0, 2025: 565.0, 2026: 485.0 },
  GS: { 2020: 228.0, 2021: 260.0, 2022: 382.0, 2023: 343.0, 2024: 385.0, 2025: 520.0, 2026: 462.0 },
  JPM: { 2020: 138.0, 2021: 125.0, 2022: 162.0, 2023: 134.0, 2024: 170.0, 2025: 226.0, 2026: 202.0 },
  EQIX: { 2020: 580.0, 2021: 715.0, 2022: 790.0, 2023: 655.0, 2024: 805.0, 2025: 850.0, 2026: 790.0 },
  DLR: { 2020: 119.0, 2021: 138.0, 2022: 158.0, 2023: 98.0, 2024: 134.0, 2025: 168.0, 2026: 152.0 },
  NEE: { 2020: 59.0, 2021: 74.0, 2022: 84.0, 2023: 82.0, 2024: 58.0, 2025: 75.0, 2026: 72.0 },
  VST: { 2020: 18.2, 2021: 19.4, 2022: 21.8, 2023: 22.5, 2024: 38.0, 2025: 122.0, 2026: 116.0 }
};

function seededNoise(seed, index) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  const x = Math.sin(h + index * 1032.41) * 10000;
  return x - Math.floor(x);
}

export function generateStockTimeSeries(anchorTicker, comparisonTicker) {
  const points = [];
  const startDate = new Date(2020, 0, 15);
  const endDate = new Date(2026, 4, 15);

  const rawPoints = [];
  let index = 0;

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 14)) {
    const year = d.getFullYear();
    const nextYear = Math.min(2026, year + 1);

    const yearStartVal = d.getTime();
    const currentYearDate = new Date(year, 0, 1).getTime();
    const nextYearDate = new Date(nextYear, 0, 1).getTime();
    const t = nextYearDate === currentYearDate ? 0 : (yearStartVal - currentYearDate) / (nextYearDate - currentYearDate);

    const anchorLandmarkNow = STOCK_LANDMARKS[anchorTicker] ? STOCK_LANDMARKS[anchorTicker][year] : 50;
    const anchorLandmarkNext = STOCK_LANDMARKS[anchorTicker] ? STOCK_LANDMARKS[anchorTicker][nextYear] : 50;
    const anchorBase = (anchorLandmarkNow * (1 - t)) + (anchorLandmarkNext * t);

    const compLandmarkNow = STOCK_LANDMARKS[comparisonTicker] ? STOCK_LANDMARKS[comparisonTicker][year] : 50;
    const compLandmarkNext = STOCK_LANDMARKS[comparisonTicker] ? STOCK_LANDMARKS[comparisonTicker][nextYear] : 50;
    const comparisonBase = (compLandmarkNow * (1 - t)) + (compLandmarkNext * t);

    let covidEffect = 1;
    if (year === 2020 && d.getMonth() >= 2 && d.getMonth() <= 4) {
      const daysIntoYear = (d.getTime() - new Date(2020, 0, 1).getTime()) / (1000 * 3600 * 24);
      const dist = Math.abs(daysIntoYear - 80);
      covidEffect = 1.0 - Math.max(0, 0.28 * Math.exp(-0.002 * dist * dist));
    }

    const anchorNoise = 1.0 + (seededNoise(anchorTicker, index) - 0.5) * 0.08 + Math.sin(index * 0.15) * 0.04;
    const comparisonNoise = 1.0 + (seededNoise(comparisonTicker, index) - 0.5) * 0.08 + Math.sin(index * 0.12) * 0.04;

    const anchorPrice = Math.max(0.5, anchorBase * covidEffect * anchorNoise);
    const comparisonPrice = Math.max(0.5, comparisonBase * covidEffect * comparisonNoise);

    const dateStr = d.toISOString().split("T")[0];
    rawPoints.push({
      dateStr,
      anchorRaw: anchorPrice,
      comparisonRaw: comparisonPrice
    });

    index++;
  }

  if (rawPoints.length > 0) {
    const startAnchor = rawPoints[0].anchorRaw;
    const startComparison = rawPoints[0].comparisonRaw;

    for (const raw of rawPoints) {
      points.push({
        date: raw.dateStr,
        anchorRaw: raw.anchorRaw,
        comparisonRaw: raw.comparisonRaw,
        anchorNormalized: (raw.anchorRaw / startAnchor) * 100,
        comparisonNormalized: (raw.comparisonRaw / startComparison) * 100
      });
    }
  }

  return points;
}

export function calculateCorrelation(timeSeries) {
  const n = timeSeries.length;
  if (n === 0) return 0;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

  for (const p of timeSeries) {
    const x = p.anchorNormalized;
    const y = p.comparisonNormalized;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }

  const num = (n * sumXY) - (sumX * sumY);
  const den = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));

  if (den === 0) return 0;
  return num / den;
}

export function getEducationalSignal(correlation, anchorTicker, comparisonTicker, points) {
  if (!points || points.length < 15) {
    return {
      status: "Hold / monitor",
      description: "Establishing initial index correlation. Maintain research tracking."
    };
  }

  // 1. Extract raw numerical price values for calculations
  const compPrices = points.map(p => p.comparisonRaw);
  const latestPrice = compPrices[compPrices.length - 1];

  // 2. Calculate 50-day Moving Average (4 bi-weekly periods ≈ 56 days)
  const window50 = Math.min(4, compPrices.length);
  let sum50 = 0;
  for (let i = 0; i < window50; i++) {
    sum50 += compPrices[compPrices.length - 1 - i];
  }
  const ma50 = sum50 / window50;

  // 3. Calculate 200-day Moving Average (14 bi-weekly periods ≈ 196 days)
  const window200 = Math.min(14, compPrices.length);
  let sum200 = 0;
  for (let i = 0; i < window200; i++) {
    sum200 += compPrices[compPrices.length - 1 - i];
  }
  const ma200 = sum200 / window200;

  // 4. Calculate Recent Drawdown (percentage drop from peak of last 12 periods ≈ 168 days)
  const drawBackPeriod = Math.min(12, compPrices.length);
  let recentPeak = -Infinity;
  for (let i = 0; i < drawBackPeriod; i++) {
    const price = compPrices[compPrices.length - 1 - i];
    if (price > recentPeak) {
      recentPeak = price;
    }
  }
  const recentDrawdown = recentPeak > 0 ? ((latestPrice - recentPeak) / recentPeak) * 100 : 0;

  // 5. Calculate Volatility (standard deviation of the historical returns over last 15 periods)
  const recentVolPeriod = Math.min(15, compPrices.length);
  const returns = [];
  for (let i = compPrices.length - recentVolPeriod; i < compPrices.length - 1; i++) {
    if (i >= 0 && compPrices[i] > 0) {
      const ret = ((compPrices[i + 1] - compPrices[i]) / compPrices[i]) * 150; // annualizing factor approximation
      returns.push(ret);
    }
  }
  let volatility = 0;
  if (returns.length > 0) {
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const squaredDiffs = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0);
    volatility = Math.sqrt(squaredDiffs / returns.length);
  }

  // 6. Educational Signal Logic Rules
  let status = "Hold / monitor";
  let explanation = "";

  const isAbove50 = latestPrice > ma50;
  const isAbove200 = latestPrice > ma200;
  const ma50Above200 = ma50 > ma200;

  if (correlation >= 0.40) {
    // Symmetrical connection is active.
    if (recentDrawdown <= -9.0 && !isAbove50 && isAbove200) {
      status = "Accumulation zone";
      explanation = `Sincerity indicators suggest a healthy long-term structural symmetry but temporary downward market pressure. The price of $${latestPrice.toFixed(2)} represents a discount below its 50-day MA ($${ma50.toFixed(2)}), resting near its 200-day MA ($${ma200.toFixed(2)}) support line. This is classically considered a potential accumulation zone.`;
    } else if (latestPrice > ma50 * 1.12 && ma50Above200) {
      status = "Overextended";
      explanation = `The asset has staged a vertical momentum rally, pushing the price of $${latestPrice.toFixed(2)} significantly above its 50-day moving average benchmark of $${ma50.toFixed(2)}. This suggests temporary overextension above historical price balance points.`;
    } else if (isAbove50 && isAbove200 && ma50Above200 && recentDrawdown > -6.0) {
      status = "Relative strength";
      explanation = `The comparison stock displays high healthy momentum, trading in a clear uptrend above both its 50-day ($${ma50.toFixed(2)}) and 200-day ($${ma200.toFixed(2)}) moving averages with a shallow recent pullback of only ${recentDrawdown.toFixed(1)}%. This shows strong alignment with the general AI market cycle.`;
    } else if (!isAbove200 || !ma50Above200) {
      status = "Trend weakening";
      explanation = `The comparison target shows cooling investor demand, with its price of $${latestPrice.toFixed(2)} sliding beneath its 200-day moving average ($${ma200.toFixed(2)}). This breakdown signals a weakening underlying trend support structure.`;
    } else {
      status = "Hold / monitor";
      explanation = `The price actions show balanced consolidation. The assets are tracking securely inside historical limits with a moderate recent volatility of ${volatility.toFixed(1)}% and a standard Pearson correlation coefficient of ${correlation.toFixed(3)}.`;
    }
  } else {
    // Low or independent correlation score
    if (!isAbove200) {
      status = "Trend weakening";
      explanation = `Underlying correlation is disjointed (r = ${correlation.toFixed(3)}) while price is dragging beneath its 200-day moving average of $${ma200.toFixed(2)}, pointing to structural trend weakening.`;
    } else {
      status = "Hold / monitor";
      explanation = `Independent price activity is present. The assets are trading with low correlation (r = ${correlation.toFixed(3)}), so they must be monitored separately rather than treated as a symmetrical pair.`;
    }
  }

  // 7. Assemble the final educational indicators summary with clear disclaimers
  const disclaimer = "\n\nDisclaimer: These mathematical calculations are for educational and analysis exercises only. They are not direct investment directives, transaction recommendations, or formal financial advice.";
  
  const formattedDetails = `📊 TECHNICAL INDEX DRILLDOWN:\n` +
    `• Last Traded Price: $${latestPrice.toFixed(2)}\n` +
    `• 50-Day Moving Average: $${ma50.toFixed(2)}\n` +
    `• 200-Day Moving Average: $${ma200.toFixed(2)}\n` +
    `• Recent Trough Drawdown: ${recentDrawdown.toFixed(2)}%\n` +
    `• Volatility Standard Deviation: ${volatility.toFixed(2)}%\n` +
    `• Co-efficiency Alignment: r = ${correlation.toFixed(3)}\n\n` + 
    explanation + disclaimer;

  return {
    status: status,
    description: formattedDetails
  };
}
