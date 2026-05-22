/**
 * app.js
 * 
 * Elegant orchestrator coordinating:
 * 1. Synchronized Dropdown Select controls and Sidebar shortcut switch grids.
 * 2. Visual Theme Preset Selector {"Cyber Midnight", "Clean Studio", "Forest Emerald"} with context-aware Chart.js palette shifting.
 * 3. Real-time Firebase Firestore or LocalStorage saved Watchlist matching engine.
 * 4. Advanced mathematical asset correlation mapping visualizations.
 */

import { Chart, registerables } from "chart.js";
import { 
  ANCHOR_STOCKS, 
  COMPARISON_STOCKS, 
  generateStockTimeSeries, 
  calculateCorrelation, 
  getEducationalSignal 
} from "./stockData.js";
import { getDetailedRelationshipExplanation } from "./analytics.js";
import { 
  db, 
  auth, 
  googleProvider, 
  isFirebaseConfigured, 
  handleFirestoreError, 
  OperationType 
} from "./firebase.js";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  orderBy
} from "firebase/firestore";

// Register Chart.js models
Chart.register(...registerables);

// --- 1. Global Application State ---
let selectedAnchor = "NVDA";
let selectedComparison = "VST";
let timelineStart = 2020;
let watchlist = [];
let user = null;
let chartInstance = null;
let currentTheme = localStorage.getItem("symmetry_theme") || "cyber-midnight";

// --- 2. DOM Elements Mapping ---
const elements = {
  anchorSelect: document.getElementById("anchor-select"),
  comparisonSelect: document.getElementById("comparison-select"),
  themeSelector: document.getElementById("theme-selector"),
  
  anchorGroup: document.getElementById("anchor-buttons-group"),
  comparisonGroup: document.getElementById("comparison-buttons-group"),
  timelineBtn2020: document.getElementById("timeline-btn-2020"),
  timelineBtn2023: document.getElementById("timeline-btn-2023"),
  
  anchorProfileDesc: document.getElementById("anchor-profile-desc"),
  comparisonProfileDesc: document.getElementById("comparison-profile-desc"),
  normalizedTitle: document.getElementById("normalized-comparison-title"),
  tickerCombo: document.getElementById("active-ticker-combo"),
  statCorrelation: document.getElementById("stat-correlation"),
  statSignal: document.getElementById("stat-signal"),
  chartSubLabel: document.getElementById("chart-sub-label"),
  legendAnchorLabel: document.getElementById("legend-anchor-label"),
  legendCompLabel: document.getElementById("legend-comp-label"),
  addWatchlistBtn: document.getElementById("add-watchlist-btn"),
  dataPointsBadge: document.getElementById("data-points-count-badge"),
  timeframeText: document.getElementById("timeframe-timeline-text"),
  insightBox1: document.getElementById("insight-box-1"),
  insightBox2: document.getElementById("insight-box-2"),
  watchlistTableRoot: document.getElementById("watchlist-table-root"),
  authStatusContainer: document.getElementById("auth-status-container"),
  dbSyncBadge: document.getElementById("database-sync-mode-badge"),
  footerSyncBadge: document.getElementById("footer-sync-active-badge"),
  explainerRelationBadge: document.getElementById("explainer-relation-type-badge"),
  explainerWhyRelated: document.getElementById("explainer-why-related"),
  explainerCorrelationMeaning: document.getElementById("explainer-correlation-meaning"),
  explainerRisksList: document.getElementById("explainer-risks-list")
};

// --- 3. Dynamic Visual Theme Engine ---
function applyTheme(themeName) {
  currentTheme = themeName;
  localStorage.setItem("symmetry_theme", themeName);

  // Toggle body classes
  document.body.classList.remove("theme-cyber-midnight", "theme-clean-studio", "theme-forest-emerald");
  document.body.classList.add(`theme-${themeName}`);

  if (elements.themeSelector) {
    elements.themeSelector.value = themeName;
  }
}

// --- 4. Interactive Selector Renderers ---

// Render simple, quick-access badge shortcuts under the primary anchor dropdown
function renderAnchorButtons() {
  if (!elements.anchorGroup) return;
  elements.anchorGroup.innerHTML = "";

  ANCHOR_STOCKS.forEach(stock => {
    const isSelected = selectedAnchor === stock.ticker;
    const button = document.createElement("button");
    button.type = "button";
    
    // Dynamic theme sensitive shortcut pill styling
    let btnClass = "text-[10px] font-bold py-1 px-1.5 rounded border transition-all cursor-pointer text-center select-none ";
    if (isSelected) {
      btnClass += "bg-sky-500/10 border-sky-500/50 text-sky-500 font-extrabold";
    } else {
      if (currentTheme === "clean-studio") {
        btnClass += "bg-slate-100 border-slate-200 text-slate-500 hover:border-slate-400";
      } else if (currentTheme === "forest-emerald") {
        btnClass += "bg-emerald-950/40 border-emerald-800/40 text-teal-400 hover:border-teal-600";
      } else {
        btnClass += "bg-slate-900 border-slate-850 text-slate-450 hover:border-slate-700";
      }
    }

    button.className = btnClass;
    button.innerText = stock.ticker;

    button.addEventListener("click", () => {
      selectedAnchor = stock.ticker;
      if (elements.anchorSelect) {
        elements.anchorSelect.value = stock.ticker;
      }
      updateDashboardData();
    });

    elements.anchorGroup.appendChild(button);
  });
}

// Render simple quick-access badge shortcuts under companion dropdown
function renderComparisonButtons() {
  if (!elements.comparisonGroup) return;
  elements.comparisonGroup.innerHTML = "";

  COMPARISON_STOCKS.forEach(stock => {
    const isSelected = selectedComparison === stock.ticker;
    const button = document.createElement("button");
    button.type = "button";

    let btnClass = "text-[9px] font-bold py-1 px-1 rounded border transition-all cursor-pointer text-center select-none truncate ";
    if (isSelected) {
      btnClass += "bg-amber-500/15 border-amber-500/50 text-amber-550 font-extrabold dark:text-amber-400";
    } else {
      if (currentTheme === "clean-studio") {
        btnClass += "bg-slate-100 border-slate-200 text-slate-500 hover:border-slate-400";
      } else if (currentTheme === "forest-emerald") {
        btnClass += "bg-emerald-950/40 border-emerald-800/40 text-teal-400 hover:border-teal-600";
      } else {
        btnClass += "bg-slate-900 border-slate-850 text-slate-450 hover:border-slate-700";
      }
    }

    button.className = btnClass;
    button.innerText = stock.ticker;

    button.addEventListener("click", () => {
      selectedComparison = stock.ticker;
      if (elements.comparisonSelect) {
        elements.comparisonSelect.value = stock.ticker;
      }
      updateDashboardData();
    });

    elements.comparisonGroup.appendChild(button);
  });
}

// Render dynamic corporate profile context briefs
function renderProfiles() {
  const activeAnchor = ANCHOR_STOCKS.find(s => s.ticker === selectedAnchor) || ANCHOR_STOCKS[0];
  const activeComp = COMPARISON_STOCKS.find(s => s.ticker === selectedComparison) || COMPARISON_STOCKS[0];

  // Dynamic profile texts based on current selection
  elements.anchorProfileDesc.innerHTML = `
    <div class="flex items-center justify-between gap-2 mb-1.5 font-mono">
      <span class="font-bold text-sky-500 text-[10px] tracking-wider uppercase">${activeAnchor.ticker} Driver Profile</span>
      <span class="text-[9px] theme-surface px-1.5 py-0.5 rounded border theme-border uppercase font-medium">${activeAnchor.sector.split("&")[0].trim()}</span>
    </div>
    <div class="font-bold text-xs theme-text-main">${activeAnchor.name}</div>
    <p class="theme-text-muted text-[11px] mt-0.5 leading-relaxed font-mono">${activeAnchor.description}</p>
  `;

  elements.comparisonProfileDesc.innerHTML = `
    <div class="flex items-center justify-between gap-2 mb-1.5 font-mono">
      <span class="font-bold text-amber-500 text-[10px] tracking-wider uppercase">${activeComp.ticker} Companion Profile</span>
      <span class="text-[9px] theme-surface px-1.5 py-0.5 rounded border theme-border uppercase font-medium">${activeComp.sector.split("&")[0].trim()}</span>
    </div>
    <div class="font-bold text-xs theme-text-main">${activeComp.name}</div>
    <p class="theme-text-muted text-[11px] mt-0.5 leading-relaxed font-mono">${activeComp.description}</p>
  `;
}

// Render active timeline boundary ranges
function renderTimelineButtons() {
  let activeClass = "";
  let idleClass = "";

  if (currentTheme === "clean-studio") {
    activeClass = "bg-sky-600 text-white font-black shadow-sm text-[10px] py-1.5 rounded-md font-mono uppercase tracking-wider text-center flex-1";
    idleClass = "text-slate-500 hover:text-slate-900 text-[10px] py-1.5 rounded-md font-mono uppercase tracking-wider text-center flex-1";
  } else if (currentTheme === "forest-emerald") {
    activeClass = "bg-teal-500 text-emerald-950 font-black shadow-sm text-[10px] py-1.5 rounded-md font-mono uppercase tracking-wider text-center flex-1";
    idleClass = "text-emerald-400 hover:text-emerald-100 text-[10px] py-1.5 rounded-md font-mono uppercase tracking-wider text-center flex-1";
  } else {
    activeClass = "bg-sky-500 text-black font-black shadow-sm text-[10px] py-1.5 rounded-md font-mono uppercase tracking-wider text-center flex-1";
    idleClass = "text-slate-500 hover:text-slate-200 text-[10px] py-1.5 rounded-md font-mono uppercase tracking-wider text-center flex-1";
  }

  if (timelineStart === 2020) {
    elements.timelineBtn2020.className = activeClass;
    elements.timelineBtn2023.className = idleClass;
  } else {
    elements.timelineBtn2020.className = idleClass;
    elements.timelineBtn2023.className = activeClass;
  }
}

// Render dynamic interactive correlation watchlists with database connection status
function renderWatchlistTable() {
  if (watchlist.length === 0) {
    elements.watchlistTableRoot.innerHTML = `
      <div class="border border-dashed theme-border rounded-xl p-8 text-center bg-slate-950/10 dark:bg-black/10">
        <svg class="w-8 h-8 theme-text-muted mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 3.75V16.5L12 14.25L7.5 16.5V3.75m9 0H18A2.25 2.25 0 0120.25 6v12A2.25 2.25 0 0118 20.25H6A2.25 2.25 0 013.75 18V6A2.25 2.25 0 016 3.75h1.5m9 0h-9" />
        </svg>
        <p class="text-xs font-black theme-text-main">No research pairs saved to matrix</p>
        <p class="text-[11px] theme-text-muted mt-1 max-w-sm mx-auto font-mono">
          Align any driver stock vs utility counterpart above, then click &quot;Save Pair&quot; to bookmark alignment vectors.
        </p>
      </div>
    `;
    return;
  }

  let rowsHtml = "";
  watchlist.forEach(item => {
    const isSelected = selectedAnchor === item.anchorStock && selectedComparison === item.comparisonStock;
    
    let rowClass = "border-b theme-border text-xs transition-all hover:bg-slate-500/5 cursor-pointer ";
    if (isSelected) {
      if (currentTheme === "clean-studio") {
        rowClass += "bg-sky-50 border-l-4 border-l-sky-600 font-bold";
      } else if (currentTheme === "forest-emerald") {
        rowClass += "bg-teal-950/40 border-l-4 border-l-teal-500 font-bold";
      } else {
        rowClass += "bg-sky-500/5 border-l-4 border-l-sky-500 font-bold";
      }
    }

    // Set signal badges corresponding to active levels
    let badgeClass = "theme-text-muted bg-slate-100 dark:bg-slate-900 border theme-border";
    const activeSignal = item.signal || item.signalType || "";
    if (activeSignal === "Accumulation zone") badgeClass = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-500/20";
    if (activeSignal === "Overextended") badgeClass = "bg-amber-500/10 text-amber-600 dark:text-amber-450 border border-amber-500/20";
    if (activeSignal === "Relative strength") badgeClass = "bg-cyan-500/10 text-cyan-600 dark:text-cyan-450 border border-cyan-500/20";
    if (activeSignal === "Trend weakening") badgeClass = "bg-rose-500/10 text-rose-600 dark:text-rose-450 border border-rose-500/20";
    if (activeSignal === "Hold / monitor") badgeClass = "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/25";

    const formattedDate = new Date(item.createdAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });

    rowsHtml += `
      <tr class="${rowClass}" data-anchor="${item.anchorStock}" data-comp="${item.comparisonStock}">
        <td class="py-3 px-4 font-mono select-none align-middle">
          <span class="bg-sky-500/10 border border-sky-500/25 text-sky-500 px-1.5 py-0.5 rounded font-black text-[10px]">${item.anchorStock}</span>
          <span class="theme-text-muted mx-1 text-[10px]">vs</span>
          <span class="bg-amber-500/10 border border-amber-500/25 text-amber-500 px-1.5 py-0.5 rounded font-black text-[10px]">${item.comparisonStock}</span>
        </td>
        <td class="py-3 px-4 font-mono font-black text-xs align-middle">
          ${item.correlationScore.toFixed(3)}
        </td>
        <td class="py-3 px-4 align-middle">
          <span class="text-[9px] uppercase tracking-wider font-mono font-bold px-2 py-0.5 rounded border ${badgeClass}">
            ${activeSignal}
          </span>
        </td>
        <td class="py-3 px-4 theme-text-muted text-[10px] font-mono align-middle">${formattedDate}</td>
        <td class="py-3 px-4 text-right align-middle">
          <button 
            type="button" 
            data-delete-id="${item.id}"
            class="theme-text-muted hover:text-red-500 p-1.5 rounded hover:bg-slate-500/10 transition-all cursor-pointer font-bold inline-flex items-center justify-center"
            title="Delete Bookmark"
          >
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </td>
      </tr>
    `;
  });

  elements.watchlistTableRoot.innerHTML = `
    <table class="w-full text-left border-collapse min-w-[500px]">
      <thead>
        <tr class="border-b theme-border text-[9px] font-mono theme-text-muted uppercase tracking-widest bg-slate-500/5">
          <th class="py-3 px-4 select-none">Comparative Vector</th>
          <th class="py-3 px-4 select-none">Pearson Ratio (r)</th>
          <th class="py-3 px-4 select-none">Market State</th>
          <th class="py-3 px-4 select-none">Saved Period</th>
          <th class="py-3 px-4 text-right select-none">Delete</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;

  // Register interactive watchlist row click selectors
  const rows = elements.watchlistTableRoot.querySelectorAll("tr[data-anchor]");
  rows.forEach(row => {
    const anchor = row.getAttribute("data-anchor");
    const comp = row.getAttribute("data-comp");
    row.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      selectedAnchor = anchor;
      selectedComparison = comp;
      
      if (elements.anchorSelect) elements.anchorSelect.value = anchor;
      if (elements.comparisonSelect) elements.comparisonSelect.value = comp;

      updateDashboardData();
    });
  });

  // Register interactive delete buttons
  const deleteButtons = elements.watchlistTableRoot.querySelectorAll("button[data-delete-id]");
  deleteButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.getAttribute("data-delete-id");
      handleDeleteWatchlist(id);
    });
  });
}

// --- 5. Custom Themed Charting Canvas Overlay ---
function drawInteractiveChart(timeSeries) {
  const chartCanvas = document.getElementById("symmetry-line-chart");
  if (!chartCanvas) return;
  const ctx = chartCanvas.getContext("2d");

  // Avoid active graphic overlaps
  if (chartInstance) {
    chartInstance.destroy();
  }

  // Filter timeframe price indices
  const filteredData = timeSeries.filter(p => {
    const year = parseInt(p.date.split("-")[0]);
    return year >= timelineStart;
  });

  const dates = filteredData.map(p => {
    const dateObj = new Date(p.date);
    return dateObj.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  });

  const baseAnchor = filteredData[0] ? filteredData[0].anchorRaw : 1;
  const baseComp = filteredData[0] ? filteredData[0].comparisonRaw : 1;
  const anchorLine = filteredData.map(p => (p.anchorRaw / baseAnchor) * 100);
  const compLine = filteredData.map(p => (p.comparisonRaw / baseComp) * 100);

  // Setup visual ranges
  elements.dataPointsBadge.innerText = `Matching Intervals: ${filteredData.length}`;
  elements.timeframeText.innerText = timelineStart === 2020 ? "Jan 2020 — May 2026" : "Jan 2023 — May 2026";

  // Dynamic Theme Color Mappings for high contrast accuracy
  let anchorColor = "#38bdf8"; // Sky Blue (cyber theme)
  let compColor = "#f59e0b"; // Amber Yellow (cyber theme)
  let gridColor = "rgba(148, 163, 184, 0.08)";
  let ticksColor = "#64748b";

  if (currentTheme === "clean-studio") {
    anchorColor = "#0284c7"; // Royal blue for crisp white contrast
    compColor = "#ea580c"; // Warm dark amber
    gridColor = "rgba(15, 23, 42, 0.06)";
    ticksColor = "#475569";
  } else if (currentTheme === "forest-emerald") {
    anchorColor = "#10b981"; // Bright Emerald
    compColor = "#f59e0b"; // Golden honey yellow
    gridColor = "rgba(45, 212, 191, 0.08)";
    ticksColor = "#2dd4bf";
  }

  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: dates,
      datasets: [
        {
          label: `${selectedAnchor} Index`,
          data: anchorLine,
          borderColor: anchorColor,
          backgroundColor: currentTheme === "clean-studio" ? "rgba(2, 132, 199, 0.02)" : "rgba(56, 189, 248, 0.03)",
          borderWidth: currentTheme === "clean-studio" ? 3 : 2.5,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: anchorColor,
          tension: 0.12,
          fill: true
        },
        {
          label: `${selectedComparison} Index`,
          data: compLine,
          borderColor: compColor,
          backgroundColor: "transparent",
          borderWidth: currentTheme === "clean-studio" ? 3 : 2.5,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: compColor,
          tension: 0.12,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: currentTheme === "clean-studio" ? "rgba(255, 255, 255, 0.98)" : "rgba(11, 15, 25, 0.98)",
          borderColor: currentTheme === "clean-studio" ? "#cbd5e1" : "rgba(148, 163, 184, 0.15)",
          borderWidth: 1,
          padding: 11,
          titleFont: {
            family: '"JetBrains Mono", monospace',
            size: 11,
            weight: "700"
          },
          bodyFont: {
            family: '"Inter", sans-serif',
            size: 11
          },
          titleColor: currentTheme === "clean-studio" ? "#475569" : "#94a3b8",
          bodyColor: currentTheme === "clean-studio" ? "#020617" : "#f8fafc",
          callbacks: {
            label: function(context) {
              return ` ${context.dataset.label.split(" ")[0]} Index: ${context.parsed.y.toFixed(1)}%`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            font: {
              family: '"JetBrains Mono", monospace',
              size: 9
            },
            color: ticksColor,
            maxTicksLimit: 8
          }
        },
        y: {
          grid: {
            color: gridColor
          },
          ticks: {
            font: {
              family: '"JetBrains Mono", monospace',
              size: 9
            },
            color: ticksColor,
            callback: function(value) {
              return value + "%";
            }
          }
        }
      }
    }
  });
}

// --- 6. Model Alignment Updater ---
function updateDashboardData() {
  const fullTimeSeries = generateStockTimeSeries(selectedAnchor, selectedComparison);
  const timeSeries = fullTimeSeries.filter(p => {
    const year = parseInt(p.date.split("-")[0]);
    return year >= timelineStart;
  });
  const correlation = calculateCorrelation(timeSeries);
  const signal = getEducationalSignal(correlation, selectedAnchor, selectedComparison, timeSeries);

  // Sync state variables list to UI
  if (elements.anchorSelect) elements.anchorSelect.value = selectedAnchor;
  if (elements.comparisonSelect) elements.comparisonSelect.value = selectedComparison;

  // Redraw shortcuts & briefs
  renderAnchorButtons();
  renderComparisonButtons();
  renderProfiles();
  renderTimelineButtons();

  // Redraw core metrics
  elements.normalizedTitle.innerText = `Normalized to Base 100 on Jan ${timelineStart}`;
  elements.tickerCombo.innerHTML = `${selectedAnchor} <span class="theme-text-muted font-light text-base md:text-lg select-none">vs</span> ${selectedComparison}`;
  elements.statCorrelation.innerText = correlation.toFixed(3);
  elements.statSignal.innerText = signal.status;

  // Dynamic status badges styling
  elements.statSignal.className = "text-xl md:text-3xl font-black uppercase tracking-tight ";
  if (signal.status === "Accumulation zone") {
    elements.statSignal.className += "text-emerald-500 dark:text-emerald-450";
  } else if (signal.status === "Overextended") {
    elements.statSignal.className += "text-amber-500 dark:text-amber-400";
  } else if (signal.status === "Relative strength") {
    elements.statSignal.className += "text-cyan-500 dark:text-cyan-400";
  } else if (signal.status === "Trend weakening") {
    elements.statSignal.className += "text-rose-500 dark:text-rose-450";
  } else {
    elements.statSignal.className += "text-slate-400 dark:text-slate-350";
  }

  // Header and Legends labels setup
  elements.legendAnchorLabel.innerText = `${selectedAnchor} (Anchor AI)`;
  elements.legendCompLabel.innerText = `${selectedComparison} (Sector Target)`;

  // Update study narratives
  elements.insightBox1.innerText = signal.description;
  elements.insightBox2.innerHTML = `Multi-year direction patterns align around <strong class="text-sky-500 font-mono font-bold">${correlation.toFixed(3)}</strong>. Symmetrical intervals fluctuate proportionally based on data center infrastructure demand variables.`;

  // Update Sector Relationship Explainer Panel dynamically
  const explainerData = getDetailedRelationshipExplanation(selectedAnchor, selectedComparison, correlation);
  if (explainerData) {
    if (elements.explainerRelationBadge) {
      elements.explainerRelationBadge.innerText = explainerData.relationType;
      
      // Update color scheme of badge based on relation type
      if (explainerData.relationType.includes("Direct")) {
        elements.explainerRelationBadge.className = "text-[9px] font-mono font-black uppercase tracking-wider px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20 select-none animate-pulse";
      } else if (explainerData.relationType.includes("Supply") || explainerData.relationType.includes("Bottleneck")) {
        elements.explainerRelationBadge.className = "text-[9px] font-mono font-black uppercase tracking-wider px-2.5 py-1 rounded bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20 select-none";
      } else {
        elements.explainerRelationBadge.className = "text-[9px] font-mono font-black uppercase tracking-wider px-2.5 py-1 rounded bg-sky-500/10 text-sky-500 border border-sky-500/20 select-none";
      }
    }
    if (elements.explainerWhyRelated) {
      elements.explainerWhyRelated.innerText = explainerData.whyRelated;
    }
    if (elements.explainerCorrelationMeaning) {
      elements.explainerCorrelationMeaning.innerText = explainerData.correlationInterpretation;
    }
    if (elements.explainerRisksList) {
      elements.explainerRisksList.innerHTML = explainerData.risks.map(risk => `
        <li class="flex items-start gap-2.5 transition-all hover:translate-x-1 duration-200">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5"></span>
          <span class="theme-text-muted leading-relaxed">${risk}</span>
        </li>
      `).join("");
    }
  }

  // Draw chart curves
  drawInteractiveChart(timeSeries);

  // Reflect row selected-state styles inside Watchlist table
  renderWatchlistTable();
}

// --- 7. Watchlist Persistence Actions ---

// Save stock pairing
async function handleAddToWatchlist() {
  const fullTimeSeries = generateStockTimeSeries(selectedAnchor, selectedComparison);
  const timeSeries = fullTimeSeries.filter(p => {
    const year = parseInt(p.date.split("-")[0]);
    return year >= timelineStart;
  });
  const correlation = calculateCorrelation(timeSeries);
  const signal = getEducationalSignal(correlation, selectedAnchor, selectedComparison, timeSeries);

  const newEntry = {
    anchorStock: selectedAnchor,
    comparisonStock: selectedComparison,
    correlationScore: correlation,
    signal: signal.status,
    createdAt: Date.now()
  };

  // Prevent duplicates
  const exists = watchlist.some(item => 
    item.anchorStock === selectedAnchor && item.comparisonStock === selectedComparison
  );
  if (exists) {
    elements.addWatchlistBtn.innerText = "Conflict!";
    elements.addWatchlistBtn.className = "px-5 py-2.5 bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-sm";
    setTimeout(() => {
      elements.addWatchlistBtn.innerHTML = `
        <svg class="w-3.5 h-3.5 inline mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg> Save Pair`;
      elements.addWatchlistBtn.className = "px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-black text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-md flex items-center gap-1.5 cursor-pointer select-none active:scale-95";
    }, 1200);
    return;
  }

  if (user && isFirebaseConfigured) {
    try {
      const qCol = collection(db, "watchlists");
      const completeDoc = {
        ...newEntry,
        userId: user.uid
      };
      await addDoc(qCol, completeDoc);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "watchlists");
    }
  } else {
    // Guest localStorage simulation
    const localSaved = JSON.parse(localStorage.getItem("symmetry_watchlist") || "[]");
    const offlineEntry = {
      ...newEntry,
      id: "local_" + Date.now()
    };
    localSaved.push(offlineEntry);
    localStorage.setItem("symmetry_watchlist", JSON.stringify(localSaved));
    watchlist = localSaved;
    renderWatchlistTable();
  }

  // Flash positive button feedback state
  elements.addWatchlistBtn.innerText = "Saved!";
  elements.addWatchlistBtn.className = "px-5 py-2.5 bg-emerald-500 text-black text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-sm";
  setTimeout(() => {
    elements.addWatchlistBtn.innerHTML = `
      <svg class="w-3.5 h-3.5 inline mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg> Save Pair`;
    elements.addWatchlistBtn.className = "px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-black text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-md flex items-center gap-1.5 cursor-pointer select-none active:scale-95";
  }, 1000);
}

// Delete saved stock pairing
async function handleDeleteWatchlist(id) {
  if (user && isFirebaseConfigured) {
    try {
      const docRef = doc(db, "watchlists", id);
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `watchlists/${id}`);
    }
  } else {
    const localSaved = JSON.parse(localStorage.getItem("symmetry_watchlist") || "[]");
    const updated = localSaved.filter(item => item.id !== id);
    localStorage.setItem("symmetry_watchlist", JSON.stringify(updated));
    watchlist = updated;
    renderWatchlistTable();
  }
}

// Watchlist Sync listeners setup
let unsubscribeWatchlist = null;
function setupWatchlistListener() {
  if (unsubscribeWatchlist) {
    unsubscribeWatchlist();
    unsubscribeWatchlist = null;
  }

  if (user && isFirebaseConfigured) {
    elements.dbSyncBadge.innerText = "Cloud Sync Online";
    elements.dbSyncBadge.className = "text-[9px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 select-none";
    elements.footerSyncBadge.innerText = "Cloud Sync Adapter Active";

    const q = query(
      collection(db, "watchlists"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    unsubscribeWatchlist = onSnapshot(q, (snapshot) => {
      watchlist = [];
      snapshot.forEach(docSnap => {
        watchlist.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });
      renderWatchlistTable();
    }, (err) => {
      console.error("Watchlist network stream failed, resetting to sandbox fallback:", err);
    });
  } else {
    // Guest fallback modes
    elements.dbSyncBadge.innerText = "Local Sandbox Mode";
    elements.dbSyncBadge.className = "text-[9px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded theme-surface border theme-border select-none";
    elements.footerSyncBadge.innerText = "Sandbox Active";
    watchlist = JSON.parse(localStorage.getItem("symmetry_watchlist") || "[]");
    renderWatchlistTable();
  }
}

// --- 8. OAuth Sync Core Authentication ---
function handleAuthToggle() {
  if (user) {
    signOut(auth).catch(err => console.error("SignOut state error:", err));
  } else {
    signInWithPopup(auth, googleProvider).catch(err => {
      console.warn("Popup cancelled or restricted in sandbox iframe; launching sandbox guest flow:", err);
    });
  }
}

function initAuth() {
  if (!isFirebaseConfigured) {
    elements.authStatusContainer.innerHTML = `
      <span class="text-[10px] theme-surface border theme-border theme-text-muted px-2.5 py-1.5 rounded font-mono select-none">
        Guest Sandbox Mode
      </span>
    `;
    setupWatchlistListener();
    return;
  }

  onAuthStateChanged(auth, (firebaseUser) => {
    user = firebaseUser;
    if (user) {
      const cleanName = user.email ? user.email.split("@")[0] : "Researcher";
      elements.authStatusContainer.innerHTML = `
        <div class="flex items-center gap-2.5">
          <div class="text-right select-none hidden sm:block leading-none">
            <span class="text-[11px] font-bold block theme-text-main">${cleanName}</span>
            <span class="text-[8px] text-sky-500 font-bold uppercase tracking-wider block mt-0.5">Sync Operator</span>
          </div>
          <button
            id="auth-toggle-btn"
            type="button"
            class="bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg border theme-border text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer select-none"
          >
            Exit Sync
          </button>
        </div>
      `;
    } else {
      elements.authStatusContainer.innerHTML = `
        <button
          id="auth-toggle-btn"
          type="button"
          class="bg-sky-500 hover:bg-sky-450 text-black px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm cursor-pointer select-none active:scale-95"
        >
          Sign In
        </button>
      `;
    }

    const tBtn = document.getElementById("auth-toggle-btn");
    if (tBtn) {
      tBtn.addEventListener("click", handleAuthToggle);
    }

    setupWatchlistListener();
    updateDashboardData();
  });
}

// --- 9. App Bootloader Initializer ---
function initializeApp() {
  // 1. Load active saved theme setting
  applyTheme(currentTheme);

  // 2. Bind Active Select Dropdowns (Dropdown state updating values)
  if (elements.anchorSelect) {
    elements.anchorSelect.value = selectedAnchor;
    elements.anchorSelect.addEventListener("change", (e) => {
      selectedAnchor = e.target.value;
      updateDashboardData();
    });
  }

  if (elements.comparisonSelect) {
    elements.comparisonSelect.value = selectedComparison;
    elements.comparisonSelect.addEventListener("change", (e) => {
      selectedComparison = e.target.value;
      updateDashboardData();
    });
  }

  // 3. Bind Visual Theme Select Changes
  if (elements.themeSelector) {
    elements.themeSelector.value = currentTheme;
    elements.themeSelector.addEventListener("change", (e) => {
      applyTheme(e.target.value);
      updateDashboardData();
    });
  }

  // 4. Bind static range timelines
  if (elements.timelineBtn2020) {
    elements.timelineBtn2020.addEventListener("click", () => {
      timelineStart = 2020;
      updateDashboardData();
    });
  }

  if (elements.timelineBtn2023) {
    elements.timelineBtn2023.addEventListener("click", () => {
      timelineStart = 2023;
      updateDashboardData();
    });
  }

  if (elements.addWatchlistBtn) {
    elements.addWatchlistBtn.addEventListener("click", handleAddToWatchlist);
  }

  // Start Auth and boot matrix calculation
  initAuth();
  updateDashboardData();
}

document.addEventListener("DOMContentLoaded", initializeApp);
window.addEventListener("resize", () => {
  if (chartInstance) {
    chartInstance.resize();
  }
});
