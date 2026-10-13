# AI Data Center Colocation Cost Calculator
### Malaysia NVIDIA B300 (HGX/DGX) AI Compute Cluster Feasibility Model

A minimalist, Material Design 3 interactive web application for modeling and underwriting large-scale AI data center colocation investments. Pre-loaded with research-backed defaults from the **1,024-server NVIDIA B300 (8,192 GPUs) Malaysian Colocation Feasibility Study** (Johor / Cyberjaya / Greater KL).

---

## 🚀 Quick Start (Zero Build Friction)

You can launch and use the app immediately via any of the following methods:

### Method 1: Instant Direct Launch (No Terminal Required)
Simply double-click `index.html` in your file browser (Finder on macOS) to open it directly in Safari, Chrome, Edge, or Firefox.

### Method 2: Local HTTP Server (Terminal)
```bash
# Using Python
python3 -m http.server 3000

# Or using npm
npm start
```
Then navigate to `http://localhost:3000` in your browser.

---

## 🎛️ Key Features & User Experience

1. **Minimalist Material Design 3 (M3) UI**:
   - Clean, elevated surface containers, responsive layout, subtle borders, and smooth transitions.
   - **Light & Dark Mode** with automatic local persistence (`localStorage`).
   - **Multi-Currency Support**: Switch between **USD** (Default), **SGD** (S$), and **MYR** (RM) with customizable conversion rates (e.g. 1 USD = 1.35 SGD, 1 USD = 4.25 MYR) via the header selector, key assumptions, or dedicated FX Settings dialog.
   - **Export / Print-Ready Format** designed for investment committee & board decks.

2. **One-Click Investment Scenario Presets**:
   - 🟢 **Base Case (Feasibility Study)**: ($550k @ 1,024 servers), $6.50/GPU-hr, 80% util, $105/kW-mo, PUE 1.30.
   - 🚀 **Bull Case (Optimistic)**: ($475k @ 1,024 servers), $8.00/GPU-hr, 90% util, 5% erosion, $95/kW-mo, PUE 1.20.
   - ⚠️ **Bear Case (Downside)**: ($625k @ 1,024 servers), $5.00/GPU-hr, 65% util, 20% erosion, $120/kW-mo, PUE 1.40.
   - 🚨 **Severe Downside**: ($650k @ 1,024 servers), $4.25/GPU-hr, 50% util, 30% erosion, $140/kW-mo, PUE 1.40.
   - 🎛️ **Custom Values**: Dedicated sandbox to test any server count (e.g. $550k @ 1,344 servers), server planning price (e.g. $500k), or compute price. Switching back to Base Case restores the 1,024-server benchmark, while your custom edits remain safely saved in Custom Values.
   - 🔄 **Quick Buttons**: 1-click shortcut buttons for scale (512, 1,024, 1,344, 1,536, 2,048 servers) and price ($475k, $500k, $550k, $600k, $625k, $650k).
   - 🔄 **Reset to Base Defaults**: Restores all values to the original study benchmark in one click.

3. **Instant Reactive Cost & Return Calculations**:
   - Every input has both a **slider** and an **exact numeric input** that stay perfectly in sync.
   - Changes recalculate all KPIs, tables, and charts instantly.

4. **Modular Tabs**:
   - **Interactive Summary & Controls**: Quick sliders for core variables, executive scorecard, and dynamic Chart.js breakdowns for CAPEX & OPEX.
   - **Detailed CAPEX**: Server BOM, 800G InfiniBand switches/optics, ~30PB storage, racks, secondary CDUs/liquid loops, deposits, and senior debt vs. equity breakdown.
   - **OPEX & Colocation Power**: Reserved IT MW, average loaded server power, Malaysian Tenaga Nasional Berhad (TNB) high-voltage electricity tariffs, demand charges, PUE, remote hands, cluster software licenses, and engineering staff.
   - **P&L, Unit Costs & 10-Year Cash Flow**: Full Year-1 P&L waterfall (EBITDA, EBIT, Net Profit), unit cost breakdown ($/GPU-hr & monthly $/server), cash EBITDA break-even vs. full-cost break-even, and 10-year projection incorporating a Year 5 platform refresh ($400M).
   - **Sensitivity Matrix**: 2D heat-mapped table comparing GPU price ($4.25 to $8.50/hr) vs. billable utilization (50% to 95%).

5. **Financeability & Underwriting Screen**:
   - Monitors the **$240M–$250M/year** minimum contracted take-or-pay threshold required by institutional lenders to support senior equipment debt.

---

## 📊 Base Case Benchmark Parameters

| Metric | Base Case Value | Notes / Industry Context |
| :--- | :--- | :--- |
| **Servers / GPUs** | 1,024 servers (8,192 GPUs) | HGX B300 (8 × Blackwell Ultra, ~2.1 TB HBM3e) |
| **Complete Server Price** | $550,000 / server | Reuters April 2026 US regular-market benchmark |
| **Total Landed Servers** | $571.6M | Includes 1.5% freight, insurance, and staging |
| **Network & Storage CAPEX** | $131.9M | 800G fabric (384 switches), optics, ~30PB storage |
| **Racks & DLC Cooling** | $22.0M | 320 racks, secondary CDUs, manifolds, leak detect |
| **Colo Deposit & Reserve** | $33.2M | $8.2M 3-month deposit + $25.0M initial liquidity |
| **Total Upfront Funding** | **$758.8M** | ~$725.6M installed IT CAPEX + deposits/reserves |
| **Contracted IT Capacity** | 16.5 MW | 12.98 MW avg IT load (11.5 kW/server + 1.2 MW infra) |
| **Colocation Rent** | $105 / kW-month | $1.73M/mo ($20.79M/yr) excluding power |
| **Facility PUE & Power** | PUE 1.30 (16.87 MW avg) | ~$1.56M/mo ($18.75M/yr) utility power bill |
| **Total Year-1 OPEX** | **$74.8M / year** | ~$6.23M / month |
| **Realized Compute Price** | **$6.50 / GPU-hour** | Equivalent to $52/server-hr or $37,960/server-mo |
| **Billable Utilization** | 80% (7,008 hrs/GPU-yr) | 57.41M annual billable GPU-hours |
| **Year-1 Revenue** | **$373.2M** | ~$31.1M / month |
| **Year-1 EBITDA** | **$298.4M (80.0% margin)** | Gross operating earnings |
| **Year-1 Net Profit** | **$71.2M** | After 4-yr straight-line deprec, debt interest & 24% tax |
| **Cash EBITDA Break-Even** | **$1.24 / GPU-hour** | Minimum cash OPEX cover |
| **Full-Cost Break-Even** | **$4.85 / GPU-hour** | Covers OPEX + depreciation ($172M) + interest ($32M) |
| **Project IRR / Equity IRR**| **12.5% / 15.6%** | Modeled across 10 years with Year 5 $400M refresh |
| **Payback Period** | **3.4 yrs (initial) / 5.7 yrs (sustained)** | Accounting for Year 5 hardware reinvestment |

---

## 🛠️ File Structure

- `index.html` — Accessible, semantic HTML5 structure with Material 3 components, tabs, SVG icons, and responsive layout.
- `styles.css` — Material Design 3 design system tokens, dark/light themes, elevation layers, input controls, custom sliders, responsive grid, and print rules.
- `app.js` — Reactive calculation engine, financial modeling logic (IRR, NPV, PMT debt amortization, 10-year cashflows), dynamic Chart.js rendering, and event handlers.
- `package.json` — Metadata and npm scripts.
- `README.md` — Project documentation and feasibility reference.
