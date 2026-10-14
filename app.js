/**
 * Malaysia NVIDIA B300 Colocation Cost & Investment Calculator
 * Complete Reactive Financial Engine & Material 3 UI Logic
 */

// Base Case Benchmark Defaults (Official Study Parameters)
const BASE_DEFAULTS = {
  // Cluster Architecture
  numServers: 1024,
  gpusPerServer: 8,
  serverPrice: 550000,
  freightPct: 1.5,

  // Additional Infrastructure CAPEX ($M)
  fabricSwitchesCapex: 46.08,
  opticsFiberCapex: 36.86,
  mgmtEthCapex: 5.00,
  fabricSwCapex: 2.00,
  storageCapex: 18.00,
  mgmtNodesCapex: 3.00,
  cyberAppCapex: 3.00,
  integrationCapex: 8.00,
  sparesPoolCapex: 10.00,
  networkStorageCapex: 131.94,

  // Racks & Liquid Cooling Breakdown ($M)
  computeRacksCapex: 5.12,
  netStorageRacksCapex: 2.88,
  cduSystemsCapex: 7.20,
  manifoldsCapex: 3.00,
  leakDetectionCapex: 0.80,
  loopCommissioningCapex: 3.00,
  racksCoolingCapex: 22.00,
  coloDeposit: 8.20,
  liquidityReserve: 25.00,

  // Financing
  customerPrepay: 0.0,
  debtPct: 47.5,
  debtRate: 9.0,
  debtTerm: 4,
  taxRate: 24.0,
  discountRate: 12.0,
  refreshCapexYr5: 400.0,
  terminalResaleProceeds: 0.0,

  // Power & Colocation (Engineering Load Model)
  reservedItMw: 16.5,
  serverAvgKw: 11.5,
  maxServerKw: 14.0,
  netStorageAvgKw: 1.20,
  netStorageMaxMw: 1.50,
  pue: 1.30,
  coloRatePerKwMo: 105,
  elecRatePerKwh: 0.1141,
  demandRatePerKwMo: 7.63,

  // Commercial & Revenue
  gpuPricePerHour: 6.50,
  utilizationPct: 80,
  salesMktgPct: 1.25,
  annualPriceErosion: 10.0,

  // Annual Fixed OPEX items ($M)
  hwMaint: 8.45,
  swLicenses: 4.00,
  opsEng: 3.50,
  internetWan: 3.00,
  custSupport: 1.50,
  remoteHands: 0.60,
  corpStaff: 2.00,
  insurance: 3.00,
  cyberSecurity: 2.00,
  legalCompliance: 1.00,
  adminAudit: 1.50
};

// Global State
const state = {
  currency: 'USD', // 'USD' (default), 'SGD', or 'MYR'
  fxRates: {
    USD: 1.0,
    SGD: 1.35, // default 1 USD = 1.35 SGD (configurable)
    MYR: 4.25  // default 1 USD = 4.25 MYR (configurable)
  },
  currentScenario: 'base',
  activeTab: 'summary',
  customParams: null, // Stores user's custom edits across scenario switches
  pnlHorizon: 10,     // 1, 3, 5, or 10 years
  pnlViewMode: 'columns', // 'columns' (Year-by-Year) or 'cumulative'
  params: { ...BASE_DEFAULTS }
};

// Initialize saved settings from localStorage
try {
  const savedCur = localStorage.getItem('dc_currency');
  if (savedCur && ['USD', 'SGD', 'MYR'].includes(savedCur)) {
    state.currency = savedCur;
  }
  const savedRates = localStorage.getItem('dc_fx_rates');
  if (savedRates) {
    const parsed = JSON.parse(savedRates);
    if (parsed.SGD && !isNaN(parsed.SGD) && parsed.SGD > 0) state.fxRates.SGD = parseFloat(parsed.SGD);
    if (parsed.MYR && !isNaN(parsed.MYR) && parsed.MYR > 0) state.fxRates.MYR = parseFloat(parsed.MYR);
  }
} catch (e) {
  // fallback to defaults safely
}

// Preset Scenarios (Full parameter sets so switching always resets cleanly)
const PRESETS = {
  severe: {
    ...BASE_DEFAULTS,
    serverPrice: 650000,
    gpuPricePerHour: 4.25,
    utilizationPct: 50,
    annualPriceErosion: 30.0,
    coloRatePerKwMo: 140,
    pue: 1.40,
    debtRate: 12.0,
    name: 'Severe',
    desc: 'Commoditized stress test ($650k @ 1,024 servers, $4.25/GPU-hr, 50% util, 30% erosion, PUE 1.40)'
  },
  bear: {
    ...BASE_DEFAULTS,
    serverPrice: 625000,
    gpuPricePerHour: 5.00,
    utilizationPct: 65,
    annualPriceErosion: 20.0,
    coloRatePerKwMo: 120,
    pue: 1.40,
    debtRate: 10.5,
    name: 'Bear',
    desc: 'Cautious procurement ($625k @ 1,024 servers, $5.00/GPU-hr, 65% util, PUE 1.40)'
  },
  base: {
    ...BASE_DEFAULTS,
    name: 'Base',
    desc: 'Market benchmark ($550k @ 1,024 servers, $6.50/GPU-hr, 80% util, 16.5MW colo)'
  },
  bull: {
    ...BASE_DEFAULTS,
    serverPrice: 475000,
    gpuPricePerHour: 8.00,
    utilizationPct: 90,
    annualPriceErosion: 5.0,
    coloRatePerKwMo: 95,
    pue: 1.20,
    debtRate: 8.0,
    name: 'Bull',
    desc: 'Discount procurement ($475k @ 1,024 servers, $8.00/GPU-hr, 90% util, PUE 1.20)'
  },
  custom: {
    name: 'Custom Values',
    desc: 'Interactive user-customized parameters'
  }
};

// Restore saved custom scenario and parameters from localStorage
try {
  const savedCustom = localStorage.getItem('dc_custom_params');
  if (savedCustom) {
    const parsedCustom = JSON.parse(savedCustom);
    if (parsedCustom && typeof parsedCustom === 'object') {
      state.customParams = { ...BASE_DEFAULTS, ...parsedCustom };
    }
  }
  const savedScenario = localStorage.getItem('dc_current_scenario');
  if (savedScenario) {
    if (savedScenario === 'custom' && state.customParams) {
      state.currentScenario = 'custom';
      state.params = { ...state.customParams };
    } else if (PRESETS[savedScenario]) {
      state.currentScenario = savedScenario;
      state.params = { ...PRESETS[savedScenario] };
    }
  }
} catch (e) {
  // fallback safely
}

// Currency Information Helper
function getCurrencyInfo() {
  const cur = state.currency || 'USD';
  const rate = state.fxRates[cur] || 1.0;
  let sym = '$';
  let name = 'US Dollar';
  if (cur === 'MYR') {
    sym = 'RM ';
    name = 'Malaysian Ringgit';
  } else if (cur === 'SGD') {
    sym = 'S$ ';
    name = 'Singapore Dollar';
  } else {
    sym = '$';
    name = 'US Dollar';
  }
  return { code: cur, rate, sym, name };
}

// Format Helpers
function formatCurrency(valInUSD, decimals = 1, forceMillions = true) {
  const { sym, rate } = getCurrencyInfo();
  const val = valInUSD * rate;

  if (forceMillions) {
    return `${sym}${val.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}M`;
  }
  return `${sym}${val.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function formatRawNumber(num, decimals = 0) {
  return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// Main Financial Model Engine
function calculateFinancials() {
  const p = state.params;
  const totalGpus = p.numServers * p.gpusPerServer;

  // 1. CAPEX Calculations
  const serverPurchaseM = (p.numServers * p.serverPrice) / 1_000_000;
  const serverFreightM = serverPurchaseM * (p.freightPct / 100);
  const landedServerCostM = serverPurchaseM + serverFreightM;

  // Calculate 800G fabric & storage subtotal from 9 editable line items
  const fabricSwitchesCapex = typeof p.fabricSwitchesCapex === 'number' ? p.fabricSwitchesCapex : 46.08;
  const opticsFiberCapex = typeof p.opticsFiberCapex === 'number' ? p.opticsFiberCapex : 36.86;
  const mgmtEthCapex = typeof p.mgmtEthCapex === 'number' ? p.mgmtEthCapex : 5.00;
  const fabricSwCapex = typeof p.fabricSwCapex === 'number' ? p.fabricSwCapex : 2.00;
  const storageCapex = typeof p.storageCapex === 'number' ? p.storageCapex : 18.00;
  const mgmtNodesCapex = typeof p.mgmtNodesCapex === 'number' ? p.mgmtNodesCapex : 3.00;
  const cyberAppCapex = typeof p.cyberAppCapex === 'number' ? p.cyberAppCapex : 3.00;
  const integrationCapex = typeof p.integrationCapex === 'number' ? p.integrationCapex : 8.00;
  const sparesPoolCapex = typeof p.sparesPoolCapex === 'number' ? p.sparesPoolCapex : 10.00;

  const networkStorageSubtotal = fabricSwitchesCapex + opticsFiberCapex + mgmtEthCapex + 
                                fabricSwCapex + storageCapex + mgmtNodesCapex + 
                                cyberAppCapex + integrationCapex + sparesPoolCapex;

  p.networkStorageCapex = networkStorageSubtotal;

  // Calculate Racks & Liquid Cooling subtotal from 6 editable line items
  const computeRacksCapex = typeof p.computeRacksCapex === 'number' ? p.computeRacksCapex : 5.12;
  const netStorageRacksCapex = typeof p.netStorageRacksCapex === 'number' ? p.netStorageRacksCapex : 2.88;
  const cduSystemsCapex = typeof p.cduSystemsCapex === 'number' ? p.cduSystemsCapex : 7.20;
  const manifoldsCapex = typeof p.manifoldsCapex === 'number' ? p.manifoldsCapex : 3.00;
  const leakDetectionCapex = typeof p.leakDetectionCapex === 'number' ? p.leakDetectionCapex : 0.80;
  const loopCommissioningCapex = typeof p.loopCommissioningCapex === 'number' ? p.loopCommissioningCapex : 3.00;

  const racksCoolingSubtotal = computeRacksCapex + netStorageRacksCapex + cduSystemsCapex + 
                              manifoldsCapex + leakDetectionCapex + loopCommissioningCapex;

  p.racksCoolingCapex = racksCoolingSubtotal;

  const installedItCapexM = landedServerCostM + networkStorageSubtotal + racksCoolingSubtotal;
  const totalUpfrontM = installedItCapexM + p.coloDeposit + p.liquidityReserve;

  // Financing
  const effectivePrepayM = Math.min(p.customerPrepay, totalUpfrontM);
  const netRequiredM = Math.max(0, totalUpfrontM - effectivePrepayM);
  const seniorDebtM = netRequiredM * (p.debtPct / 100);
  const equityRequiredM = netRequiredM * (1 - p.debtPct / 100);

  // Debt Amortization (PMT)
  const rDebt = p.debtRate / 100;
  const nDebt = p.debtTerm;
  const annualDebtServiceM = (seniorDebtM > 0 && rDebt > 0)
    ? (seniorDebtM * rDebt) / (1 - Math.pow(1 + rDebt, -nDebt)) 
    : (seniorDebtM > 0 ? seniorDebtM / nDebt : 0);
  const year1InterestM = seniorDebtM * rDebt;

  // 2. Power & Load Calculations (Engineering Load Model)
  const maxServerKw = typeof p.maxServerKw === 'number' ? p.maxServerKw : 14.0;
  const serverAvgKw = typeof p.serverAvgKw === 'number' ? p.serverAvgKw : 11.5;
  const netStorageAvgKw = typeof p.netStorageAvgKw === 'number' ? p.netStorageAvgKw : 1.20;
  const netStorageMaxMw = typeof p.netStorageMaxMw === 'number' ? p.netStorageMaxMw : 1.50;

  const serverAvgLoadMw = (p.numServers * serverAvgKw) / 1000;
  const totalAvgItLoadMw = serverAvgLoadMw + netStorageAvgKw;
  const serverMaxLoadMw = (p.numServers * maxServerKw) / 1000;
  const totalMaxItLoadMw = serverMaxLoadMw + netStorageMaxMw;

  const facilityAvgLoadMw = totalAvgItLoadMw * p.pue;
  const facilityMaxEquivalentMw = totalMaxItLoadMw * p.pue;

  // 3. Colocation & Electricity OPEX
  // Capacity rent based on Facility maximum equivalent at PUE (peak facility capacity)
  const monthlyColoRentM = (facilityMaxEquivalentMw * 1000 * p.coloRatePerKwMo) / 1_000_000;
  const annualColoRentM = monthlyColoRentM * 12;

  // Electricity: (Facility Avg MW * 1000 * 730 hrs * kWh rate) + (Facility Max Equivalent MW * 1000 * demand rate)
  const monthlyEnergyM = (facilityAvgLoadMw * 1000 * 730 * p.elecRatePerKwh) / 1_000_000;
  const annualEnergyM = monthlyEnergyM * 12;
  const monthlyDemandM = (facilityMaxEquivalentMw * 1000 * p.demandRatePerKwMo) / 1_000_000;
  const annualDemandM = monthlyDemandM * 12;
  const monthlyElecTotalM = monthlyEnergyM + monthlyDemandM;
  const annualElecTotalM = monthlyElecTotalM * 12;

  // Fixed SG&A and Operations (all 11 line items directly editable by user)
  const fixedOpexM = p.hwMaint + p.swLicenses + p.opsEng + p.internetWan + 
                     p.custSupport + p.remoteHands + p.corpStaff + p.insurance + 
                     p.cyberSecurity + p.legalCompliance + p.adminAudit;

  // 4. Commercial & Revenue Model
  const hoursPerYear = 8760;
  const billableHoursPerGpu = hoursPerYear * (p.utilizationPct / 100);
  const totalAnnualGpuHours = totalGpus * billableHoursPerGpu;
  const annualRevenueM = (totalAnnualGpuHours * p.gpuPricePerHour) / 1_000_000;
  const monthlyRevenueM = annualRevenueM / 12;

  const serverHourPrice = p.gpuPricePerHour * p.gpusPerServer;
  const serverMonthlyRev = serverHourPrice * 730;

  // Variable Sales & Marketing
  const salesMktgM = annualRevenueM * (p.salesMktgPct / 100);
  const totalYear1OpexM = annualColoRentM + annualElecTotalM + fixedOpexM + salesMktgM;

  // 5. Profitability & Margins (Year 1)
  const ebitdaM = annualRevenueM - totalYear1OpexM;
  const ebitdaMargin = annualRevenueM > 0 ? (ebitdaM / annualRevenueM) * 100 : 0;

  const salvagePct = 0.05; // 5% terminal residual value per feasibility report
  const depreciationM = (installedItCapexM * (1 - salvagePct)) / p.debtTerm; // 4-year straight line (~$172.3M)
  const ebitM = ebitdaM - depreciationM;
  const ebtM = ebitM - year1InterestM;
  const taxM = ebtM > 0 ? ebtM * (p.taxRate / 100) : 0;
  const netProfitM = ebtM - taxM;
  const netMargin = annualRevenueM > 0 ? (netProfitM / annualRevenueM) * 100 : 0;

  // 6. Unit Costs & Break-even
  const cashOpexPerGpuHour = totalAnnualGpuHours > 0 ? (totalYear1OpexM * 1_000_000) / totalAnnualGpuHours : 0;
  const cashEbitdaBreakevenPrice = totalAnnualGpuHours > 0 
    ? ((annualColoRentM + annualElecTotalM + fixedOpexM) * 1_000_000) / (totalAnnualGpuHours * (1 - p.salesMktgPct / 100))
    : 0;
  
  // Full cost break-even including depreciation and interest
  const fullCostYear1M = totalYear1OpexM + depreciationM + year1InterestM;
  const fullCostPerGpuHour = totalAnnualGpuHours > 0 ? (fullCostYear1M * 1_000_000) / totalAnnualGpuHours : 0;

  const monthlyOpexPerServer = p.numServers > 0 ? (totalYear1OpexM * 1_000_000) / (p.numServers * 12) : 0;
  const monthlyFullCostPerServer = p.numServers > 0 ? (fullCostYear1M * 1_000_000) / (p.numServers * 12) : 0;
  const monthlyElecTotalPerServer = p.numServers > 0 ? (monthlyElecTotalM * 1_000_000) / p.numServers : 0;
  const monthlyColoRentPerServer = p.numServers > 0 ? (monthlyColoRentM * 1_000_000) / p.numServers : 0;
  const monthlyFixedOpexPerServer = p.numServers > 0 ? (fixedOpexM * 1_000_000) / (p.numServers * 12) : 0;

  // 7. 10-Year Cash Flow & IRR/NPV Model
  const tenYearModel = calculate10YearCashflows({
    totalUpfrontM,
    netRequiredM,
    effectivePrepayM,
    installedItCapexM,
    seniorDebtM,
    annualDebtServiceM,
    debtTerm: p.debtTerm,
    baseRevenueM: annualRevenueM,
    baseOpexM: totalYear1OpexM,
    priceErosionPct: p.annualPriceErosion,
    refreshCapexYr5M: p.refreshCapexYr5,
    terminalResaleProceeds: typeof p.terminalResaleProceeds === 'number' && p.terminalResaleProceeds >= 0 ? p.terminalResaleProceeds : 0.0,
    taxRate: p.taxRate / 100,
    deprecYears: p.debtTerm,
    equityRequiredM,
    discountRate: p.discountRate / 100,
    coloDepositM: p.coloDeposit,
    liquidityReserveM: p.liquidityReserve
  });

  return {
    totalGpus,
    serverPurchaseM,
    serverFreightM,
    landedServerCostM,
    networkStorageSubtotal,
    racksCoolingSubtotal,
    installedItCapexM,
    totalUpfrontM,
    netRequiredM,
    seniorDebtM,
    equityRequiredM,
    effectivePrepayM,
    annualDebtServiceM,
    year1InterestM,
    maxServerKw,
    serverAvgKw,
    serverAvgLoadMw,
    serverMaxLoadMw,
    netStorageAvgKw,
    netStorageMaxMw,
    totalAvgItLoadMw,
    totalMaxItLoadMw,
    facilityAvgLoadMw,
    facilityMaxEquivalentMw,
    monthlyColoRentM,
    annualColoRentM,
    monthlyEnergyM,
    annualEnergyM,
    monthlyDemandM,
    annualDemandM,
    monthlyElecTotalM,
    annualElecTotalM,
    fixedOpexM,
    salesMktgM,
    totalYear1OpexM,
    totalAnnualGpuHours,
    annualRevenueM,
    monthlyRevenueM,
    serverHourPrice,
    serverMonthlyRev,
    ebitdaM,
    ebitdaMargin,
    depreciationM,
    ebitM,
    ebtM,
    taxM,
    netProfitM,
    netMargin,
    cashOpexPerGpuHour,
    cashEbitdaBreakevenPrice,
    fullCostPerGpuHour,
    monthlyOpexPerServer,
    monthlyFullCostPerServer,
    monthlyElecTotalPerServer,
    monthlyColoRentPerServer,
    monthlyFixedOpexPerServer,
    tenYearModel
  };
}

// 10-Year Projection Engine
function calculate10YearCashflows(inputs) {
  const netOutlayM = inputs.netRequiredM !== undefined ? inputs.netRequiredM : inputs.totalUpfrontM;
  const cashflows = [-netOutlayM]; // Year 0 net investor capital outlay (after customer prepayment)
  const equityCashflows = [-inputs.equityRequiredM];
  const yearlyData = [];
  let cumulativeProjectCash = -netOutlayM;
  let initialPaybackYear = null;
  let sustainedPaybackYear = null;

  let currentPriceFactor = 1.0;
  let debtBalance = inputs.seniorDebtM;
  let accumDeprec = 0;
  let accumNetIncome = 0;

  // Independent Direct Cash Roll-Forward State (Opening Cash Yr 0 = $0)
  let runningCash = 0;
  let prevAr = 0;
  let prevAp = 0;

  // Prepayment amortization term (e.g. 4 years or debtTerm)
  const prepayAmortYears = Math.min(inputs.debtTerm || 4, 4);
  const annualPrepayAmort = (inputs.effectivePrepayM && prepayAmortYears > 0) ? (inputs.effectivePrepayM / prepayAmortYears) : 0;

  for (let year = 1; year <= 10; year++) {
    // Hardware refresh at Year 5
    let refreshCapex = (year === 5) ? inputs.refreshCapexYr5M : 0;
    // Modeled annual maintenance capex reserve (~$8M baseline)
    let maintCapex = 8.0 * Math.pow(1.02, year - 1);
    
    // Revenue erosion modeling
    if (year > 1 && year <= 4) {
      currentPriceFactor *= (1 - inputs.priceErosionPct / 100);
    } else if (year === 5) {
      // Refresh resets to high performance tier pricing ($5.00/GPU-hr benchmark)
      currentPriceFactor = 5.00 / state.params.gpuPricePerHour;
    } else if (year > 5) {
      currentPriceFactor *= (1 - inputs.priceErosionPct / 100);
    }

    const yearRevenue = inputs.baseRevenueM * currentPriceFactor;
    // Colo and power escalate 2.5% annually
    const opexEscalator = Math.pow(1.025, year - 1);
    const yearOpex = inputs.baseOpexM * opexEscalator;
    const yearEbitda = Math.max(0, yearRevenue - yearOpex);

    // Depreciation (with 5% residual terminal salvage)
    let yearDeprec = 0;
    if (year <= 4) {
      yearDeprec = (inputs.installedItCapexM * 0.95) / 4;
    } else if (year >= 5 && year <= 8) {
      yearDeprec = (inputs.refreshCapexYr5M * 0.95) / 4;
    }
    accumDeprec += yearDeprec;

    // Debt service
    let interest = 0;
    let debtPrincipal = 0;
    if (year <= inputs.debtTerm && debtBalance > 0) {
      interest = debtBalance * (state.params.debtRate / 100);
      debtPrincipal = Math.min(debtBalance, Math.max(0, inputs.annualDebtServiceM - interest));
      debtBalance = Math.max(0, debtBalance - debtPrincipal);
    }

    const ebit = yearEbitda - yearDeprec;
    const ebt = ebit - interest;
    const tax = ebt > 0 ? ebt * inputs.taxRate : 0;
    const netIncome = ebt - tax;
    accumNetIncome += netIncome;

    // Free Cash Flow to Firm (Unlevered Project Cash Flow)
    // EBITDA - Tax - Maint Capex - Refresh Capex
    const projectFcf = yearEbitda - tax - maintCapex - refreshCapex;
    cumulativeProjectCash += projectFcf;

    // Levered Cash Flow to Equity
    const equityFcf = yearEbitda - (interest + debtPrincipal) - tax - maintCapex - refreshCapex;

    cashflows.push(projectFcf);
    equityCashflows.push(equityFcf);

    // Payback checks
    if (initialPaybackYear === null && cumulativeProjectCash >= 0) {
      initialPaybackYear = (year - 1) + (Math.abs(cumulativeProjectCash - projectFcf) / projectFcf);
    }
    if (year > 5 && cumulativeProjectCash >= 0 && sustainedPaybackYear === null) {
      sustainedPaybackYear = (year - 1) + (Math.abs(cumulativeProjectCash - projectFcf) / projectFcf);
    }

    // Balance Sheet Accounts
    const grossPpe = inputs.totalUpfrontM + (year >= 5 ? inputs.refreshCapexYr5M : 0) + (8.0 * year);
    const netPpe = Math.max(0, grossPpe - accumDeprec);
    const ar = (yearRevenue / 365) * 20; // 20 days DSO receivables
    const ap = yearOpex / 12; // 30 days operating trade payables

    // Working Capital Movements (GAAP/IFRS Direct Method)
    const deltaAr = ar - prevAr;
    const deltaAp = ap - prevAp;
    const deltaNwc = deltaAr - deltaAp;

    // Direct Cash Flow Line Items
    const accrualCfo = yearEbitda - interest - tax;
    const cashOperatingCfo = accrualCfo - deltaNwc;
    const netCfi = -(maintCapex + refreshCapex);
    const netCff = -debtPrincipal;
    const netCashChange = cashOperatingCfo + netCfi + netCff;

    const openingCash = runningCash;
    runningCash += netCashChange; // Direct cash roll-forward (no Math.max(0, ...) floor)
    const closingCash = runningCash;

    prevAr = ar;
    prevAp = ap;

    // Deferred customer prepayment balance
    const deferredPrepay = Math.max(0, (inputs.effectivePrepayM || 0) - (annualPrepayAmort * year));
    const seniorDebt = debtBalance;
    const totalLiabilities = seniorDebt + deferredPrepay + ap;

    const contributedEquity = inputs.equityRequiredM;
    const retainedEarnings = accumNetIncome;
    const totalEquity = contributedEquity + retainedEarnings;

    const totalLiabEquity = totalLiabilities + totalEquity;
    // Direct balance sheet asset calculation (unplugged)
    const totalAssets = closingCash + netPpe + ar;
    const balanceDiff = Math.abs(totalAssets - totalLiabEquity);

    yearlyData.push({
      year,
      // P&L
      revenue: yearRevenue,
      opex: yearOpex,
      ebitda: yearEbitda,
      ebitdaMargin: yearRevenue > 0 ? (yearEbitda / yearRevenue) * 100 : 0,
      deprec: yearDeprec,
      ebit,
      interest,
      tax,
      netIncome,
      netMargin: yearRevenue > 0 ? (netIncome / yearRevenue) * 100 : 0,
      debtService: year <= inputs.debtTerm ? inputs.annualDebtServiceM : 0,
      refreshCapex,
      // Balance Sheet
      cash: closingCash,
      ar,
      grossPpe,
      accumDeprec,
      netPpe,
      totalAssets,
      seniorDebt,
      deferredPrepay,
      ap,
      totalLiabilities,
      contributedEquity,
      retainedEarnings,
      totalEquity,
      totalLiabEquity,
      balanceDiff,
      // Cash Flow Statement (Direct Roll-Forward)
      openingCash,
      cfoEbitda: yearEbitda,
      cfoInterest: interest,
      cfoTax: tax,
      accrualCfo,
      deltaAr,
      deltaAp,
      deltaNwc,
      netCfo: cashOperatingCfo, // Cash Operating CFO
      cashOperatingCfo,
      maintCapex,
      netCfi,
      debtPrincipal,
      netCff,
      netCashChange,
      projectFcf,
      equityFcf,
      cumulativeProjectCash
    });
  }

  // Year-5 GPU Hardware Refresh Funding & Liquidity Assessment
  const refreshCost = inputs.refreshCapexYr5M || 400.0;
  const year4Data = yearlyData[3]; // Year 4
  const year5Data = yearlyData[4]; // Year 5

  const year4ClosingCash = year4Data ? year4Data.cash : 0;
  // Note: The $8.20M colocation deposit was paid at Year 0 from initial project financing, capitalized in gross PP&E,
  // and was never part of operating cash. The operational liquidity buffer to maintain is strictly the $25.00M reserve.
  const restrictedColoDeposit = typeof inputs.coloDepositM === 'number' ? inputs.coloDepositM : 8.20;
  const restrictedLiquidityReserve = typeof inputs.liquidityReserveM === 'number' ? inputs.liquidityReserveM : 25.00;
  const liquidityBuffer = restrictedLiquidityReserve; // $25.00M operating buffer
  const totalRestrictedCash = restrictedLiquidityReserve; // Corrected: $25.00M (excludes Yr-0 deposit)

  // Scenario 1: Reserve Maintained (保留储备金)
  const availableCashReserveMaintained = year4ClosingCash - liquidityBuffer; // $398.17M
  const day1GapReserveMaintained = availableCashReserveMaintained - refreshCost; // -$1.83M

  // Scenario 2: Reserve Available (储备金可动用 - Subject to Commercial Confirmation)
  const availableCashReserveAvailable = year4ClosingCash; // $423.17M
  const day1SurplusReserveAvailable = availableCashReserveAvailable - refreshCost; // +$23.17M

  // Backwards compatibility aliases
  const unrestrictedCashDay1 = availableCashReserveMaintained;
  const day1SurplusGap = day1GapReserveMaintained;
  const day1SurplusWithReserve = day1SurplusReserveAvailable;

  const year5OperatingCashCfo = year5Data ? year5Data.cashOperatingCfo : 0; // +$173.29M
  const year5MaintCapex = year5Data ? year5Data.maintCapex : 0; // -$8.66M
  const year5NetOperatingCash = year5OperatingCashCfo - year5MaintCapex; // +$164.63M

  // Phased milestones across Year 5:
  const month1OperatingCash = year5OperatingCashCfo / 12; // +$14.44M
  const month1SurplusGap = day1GapReserveMaintained + month1OperatingCash; // +$12.61M (recovered in ~4 days)

  // Mid-Year (Month 6) phased milestone delivery under Scenario 1:
  const midYearSurplus = (availableCashReserveMaintained + (0.5 * year5NetOperatingCash)) - refreshCost; // +$80.49M

  // End of Year (Day 365) closing cash:
  const year5ClosingCash = year5Data ? year5Data.cash : 0; // $187.80M
  const year5EndingUnrestrictedCash = year5ClosingCash - liquidityBuffer; // $162.80M

  // Funding Status Classification (SUFFICIENT, CONDITIONAL, SHORTFALL, UNDETERMINED)
  let refreshFundingStatus = 'CONDITIONAL';
  let refreshStatusLabel = 'CONDITIONAL (Subject to Supplier Milestones & Reserve Availability)';
  let capitalCallRequired = false;

  if (day1GapReserveMaintained >= 0) {
    refreshFundingStatus = 'SUFFICIENT';
    refreshStatusLabel = 'SUFFICIENT (Day-1 Cash Covers Refresh)';
  } else if (day1SurplusReserveAvailable >= 0 || year5ClosingCash >= liquidityBuffer) {
    refreshFundingStatus = 'CONDITIONAL';
    refreshStatusLabel = 'CONDITIONAL (Subject to Supplier Milestones & Reserve Availability)';
  } else if (year5ClosingCash >= 0) {
    refreshFundingStatus = 'CONDITIONAL';
    refreshStatusLabel = 'CONDITIONAL (Requires Reserve Release)';
  } else {
    refreshFundingStatus = 'SHORTFALL';
    refreshStatusLabel = 'SHORTFALL (Liquidity Deficit)';
    capitalCallRequired = true;
  }

  const year5RefreshFunding = {
    refreshCost,
    year4ClosingCash,
    restrictedColoDeposit,
    restrictedLiquidityReserve,
    liquidityBuffer,
    totalRestrictedCash,
    availableCashReserveMaintained,
    availableCashReserveAvailable,
    unrestrictedCashDay1,
    day1SurplusGap,
    day1GapReserveMaintained,
    day1SurplusWithReserve,
    day1SurplusReserveAvailable,
    month1OperatingCash,
    month1SurplusGap,
    midYearSurplus,
    year5OperatingCashCfo,
    year5MaintCapex,
    year5NetOperatingCash,
    year5ClosingCash,
    year5EndingUnrestrictedCash,
    refreshFundingStatus,
    refreshStatusLabel,
    capitalCallRequired,
    reserveAssumption: 'Reserve Availability Subject to Confirmation',
    managementInterpretation: 'Year-5 GPU Refresh is conditionally self-funded, subject to supplier payment milestones and reserve availability.'
  };


  const terminalProceeds = typeof inputs.terminalResaleProceeds === 'number' && inputs.terminalResaleProceeds >= 0 
    ? inputs.terminalResaleProceeds 
    : 0.0;

  // Calculate Project IRR and Equity IRR (Method 1: Cash-Only Return - 10-Year Base)
  const projectIrr = computeIRR(cashflows);
  const equityIrr = computeIRR(equityCashflows);

  // Cash-Only NPV at Discount Rate
  let npv = cashflows[0];
  for (let t = 1; t < cashflows.length; t++) {
    npv += cashflows[t] / Math.pow(1 + inputs.discountRate, t);
  }

  // Calculate Method 2: Asset-Inclusive Returns (10-Year Horizon with User Net Terminal Resale Proceeds)
  const assetProjectCashflows = [...cashflows];
  assetProjectCashflows[10] += terminalProceeds;
  const assetEquityCashflows = [...equityCashflows];
  assetEquityCashflows[10] += terminalProceeds;

  const assetProjectIrr = computeIRR(assetProjectCashflows);
  const assetEquityIrr = computeIRR(assetEquityCashflows);

  let assetNpv = assetProjectCashflows[0];
  for (let t = 1; t <= 10; t++) {
    assetNpv += assetProjectCashflows[t] / Math.pow(1 + inputs.discountRate, t);
  }

  // Calculate Horizon-Specific Returns (1-Yr, 3-Yr, 5-Yr, 10-Yr)
  const returnsByHorizon = {};
  [1, 3, 5, 10].forEach(h => {
    const pCf = [...cashflows.slice(0, h + 1)];
    const eCf = [...equityCashflows.slice(0, h + 1)];

    let hNpv = cashflows[0];
    for (let t = 1; t <= h; t++) {
      hNpv += cashflows[t] / Math.pow(1 + inputs.discountRate, t);
    }

    const pIrr = computeIRR(pCf);
    const eIrr = computeIRR(eCf);

    if (h === 10) {
      returnsByHorizon[h] = {
        projectIrr: projectIrr !== null ? projectIrr * 100 : null,
        equityIrr: equityIrr !== null ? equityIrr * 100 : null,
        npv,
        assetProjectIrr: assetProjectIrr !== null ? assetProjectIrr * 100 : null,
        assetEquityIrr: assetEquityIrr !== null ? assetEquityIrr * 100 : null,
        assetNpv
      };
    } else {
      returnsByHorizon[h] = {
        projectIrr: pIrr !== null ? pIrr * 100 : null,
        equityIrr: eIrr !== null ? eIrr * 100 : null,
        npv: hNpv,
        assetProjectIrr: null,
        assetEquityIrr: null,
        assetNpv: null
      };
    }
  });

  // Year 0 Inception Snapshot
  const year0 = {
    year: 0,
    cash: 0,
    ar: 0,
    grossPpe: inputs.totalUpfrontM,
    accumDeprec: 0,
    netPpe: inputs.totalUpfrontM,
    totalAssets: inputs.totalUpfrontM,
    seniorDebt: inputs.seniorDebtM,
    deferredPrepay: inputs.effectivePrepayM || 0,
    ap: 0,
    totalLiabilities: (inputs.seniorDebtM + (inputs.effectivePrepayM || 0)),
    contributedEquity: inputs.equityRequiredM,
    retainedEarnings: 0,
    totalEquity: inputs.equityRequiredM,
    totalLiabEquity: inputs.totalUpfrontM,
    balanceDiff: 0,
    projectFcf: -netOutlayM,
    cumulativeProjectCash: -netOutlayM
  };

  return {
    year0,
    yearlyData,
    returnsByHorizon,
    year5RefreshFunding,
    terminalResaleProceeds: terminalProceeds,
    // Method 1: Cash-Only Returns
    projectIrr: projectIrr !== null ? projectIrr * 100 : null,
    equityIrr: equityIrr !== null ? equityIrr * 100 : null,
    npv,
    // Method 2: Asset-Inclusive Returns (Including User-Defined Terminal Proceeds)
    assetProjectIrr: assetProjectIrr !== null ? assetProjectIrr * 100 : null,
    assetEquityIrr: assetEquityIrr !== null ? assetEquityIrr * 100 : null,
    assetNpv,
    initialPaybackYear: initialPaybackYear !== null ? initialPaybackYear : null,
    sustainedPaybackYear: sustainedPaybackYear !== null ? sustainedPaybackYear : (cumulativeProjectCash >= 0 ? initialPaybackYear : null)
  };
}

// Financial IRR Helper using Newton-Raphson with multiple starting guesses
function computeIRR(cashflows, initialGuess = 0.12) {
  const guesses = [initialGuess, 0.05, 0.20, 0.01, -0.05, 0.35, -0.15];
  for (const guess of guesses) {
    let rate = guess;
    const maxIter = 250;
    const precision = 1e-5;

    for (let i = 0; i < maxIter; i++) {
      let npv = 0;
      let dNpv = 0;

      for (let t = 0; t < cashflows.length; t++) {
        const denom = Math.pow(1 + rate, t);
        npv += cashflows[t] / denom;
        if (t > 0) {
          dNpv -= (t * cashflows[t]) / Math.pow(1 + rate, t + 1);
        }
      }

      if (Math.abs(npv) < precision) return rate;
      if (Math.abs(dNpv) < 1e-9) break;

      const newRate = rate - npv / dNpv;
      if (isNaN(newRate) || !isFinite(newRate) || newRate <= -0.99) break;
      rate = newRate;
    }
  }
  return null;
}

// ==========================================================================
// Currency & Foreign Exchange (FX) Logic
// ==========================================================================

function setCurrency(curCode) {
  if (!['USD', 'SGD', 'MYR'].includes(curCode)) return;
  state.currency = curCode;
  try {
    localStorage.setItem('dc_currency', curCode);
  } catch (e) {}

  updateCurrencyUI();
  renderApp();
}

function updateCurrencyUI() {
  const cur = state.currency;
  // Update header and Tab 1 segmented pills
  document.querySelectorAll('[data-set-currency]').forEach(pill => {
    pill.classList.toggle('active', pill.getAttribute('data-set-currency') === cur);
  });

  // Update modal radio cards
  document.querySelectorAll('input[name="modalCurrencyRadio"]').forEach(radio => {
    radio.checked = radio.value === cur;
  });
  document.querySelectorAll('.currency-radio-card').forEach(card => {
    const radio = card.querySelector('input[type="radio"]');
    if (radio) card.classList.toggle('active', radio.value === cur);
  });

  // Update badge in Tab 1
  const badge = document.getElementById('badgeActiveCurrency');
  if (badge) {
    const { sym } = getCurrencyInfo();
    badge.textContent = `${cur} (${sym.trim()})`;
  }

  // Update header FX button text
  const fxBtnText = document.getElementById('fxSettingsBtnText');
  if (fxBtnText) {
    fxBtnText.textContent = `FX: ${cur}`;
  }

  // Update mobile currency dropdown button text
  const mobCurrencyText = document.getElementById('mobileCurrencyText');
  if (mobCurrencyText) {
    const { sym } = getCurrencyInfo();
    mobCurrencyText.textContent = `${cur} (${sym.trim()})`;
  }
}

function syncFxInputs() {
  // Sync Tab 1 inputs
  const inputSgd = document.getElementById('inputFxRateSgd');
  const inputMyr = document.getElementById('inputFxRateMyr');
  if (inputSgd) inputSgd.value = state.fxRates.SGD.toFixed(4);
  if (inputMyr) inputMyr.value = state.fxRates.MYR.toFixed(4);

  // Sync Modal inputs
  const modalSgd = document.getElementById('modalRateSgd');
  const modalMyr = document.getElementById('modalRateMyr');
  if (modalSgd) modalSgd.value = state.fxRates.SGD.toFixed(4);
  if (modalMyr) modalMyr.value = state.fxRates.MYR.toFixed(4);

  // Sync Live Preview
  const previewSgd = document.getElementById('previewSgd');
  const previewMyr = document.getElementById('previewMyr');
  if (previewSgd) previewSgd.innerHTML = `<strong>S$ ${(100 * state.fxRates.SGD).toFixed(2)}</strong> SGD`;
  if (previewMyr) previewMyr.innerHTML = `<strong>RM ${(100 * state.fxRates.MYR).toFixed(2)}</strong> MYR`;
}

// ==========================================================================
// UI Rendering & Event Handling
// ==========================================================================

let capexChartInstance = null;
let opexChartInstance = null;
let cashflowChartInstance = null;

function renderApp() {
  const calc = calculateFinancials();
  const p = state.params;
  const { sym, rate: fx } = getCurrencyInfo();

  // 1. Update Executive KPI Cards
  document.getElementById('kpiUpfront').textContent = formatCurrency(calc.totalUpfrontM);
  if (calc.effectivePrepayM > 0) {
    document.getElementById('kpiUpfrontSub').textContent = `Net: ${formatCurrency(calc.netRequiredM)} (after ${formatCurrency(calc.effectivePrepayM)} Prepay)`;
  } else {
    document.getElementById('kpiUpfrontSub').textContent = `Servers: ${formatCurrency(calc.landedServerCostM)} + Infra`;
  }

  const upfrontSum = document.getElementById('tdTotalUpfrontSummary');
  if (upfrontSum) {
    upfrontSum.textContent = calc.effectivePrepayM > 0
      ? `${formatCurrency(calc.totalUpfrontM)} (Net: ${formatCurrency(calc.netRequiredM)})`
      : formatCurrency(calc.totalUpfrontM);
  }

  const kpiRevenueEl = document.getElementById('kpiRevenue');
  if (kpiRevenueEl) kpiRevenueEl.textContent = formatCurrency(calc.annualRevenueM);
  const kpiRevenueSubEl = document.getElementById('kpiRevenueSub');
  if (kpiRevenueSubEl) {
    kpiRevenueSubEl.textContent = `${formatCurrency(calc.monthlyRevenueM)} / mo (${p.utilizationPct}% util)`;
  }

  document.getElementById('kpiOpex').textContent = formatCurrency(calc.totalYear1OpexM);
  document.getElementById('kpiOpexSub').textContent = `${formatCurrency(calc.totalYear1OpexM / 12)} / month`;

  const opexSum = document.getElementById('tdTotalOpexSummary');
  if (opexSum) opexSum.textContent = `${formatCurrency(calc.totalYear1OpexM)} / yr`;

  document.getElementById('kpiEbitda').textContent = formatCurrency(calc.ebitdaM);
  document.getElementById('kpiEbitdaMargin').textContent = `${calc.ebitdaMargin.toFixed(1)}% margin`;

  document.getElementById('kpiBreakeven').textContent = `${sym}${(calc.fullCostPerGpuHour * fx).toFixed(2)}/GPU-h`;
  document.getElementById('kpiCashBreakeven').textContent = `Cash Break-Even: ${sym}${(calc.cashEbitdaBreakevenPrice * fx).toFixed(2)}`;

  const irrVal = calc.tenYearModel.projectIrr;
  const assetIrrVal = calc.tenYearModel.assetProjectIrr;
  const npvVal = calc.tenYearModel.npv;
  const assetNpvVal = calc.tenYearModel.assetNpv;
  const tvProceeds = calc.tenYearModel.terminalResaleProceeds || 0;

  const irrText = irrVal !== null ? `${irrVal.toFixed(1)}%` : 'N/A';
  document.getElementById('kpiIrr').textContent = irrText;

  const kpiIrrAssetEl = document.getElementById('kpiIrrAsset');
  if (kpiIrrAssetEl) {
    kpiIrrAssetEl.textContent = assetIrrVal !== null ? `${assetIrrVal.toFixed(1)}%` : 'N/A';
  }

  const statusBadge = document.getElementById('kpiDecisionBadge');
  if (statusBadge) {
    if (irrVal >= p.discountRate && calc.annualRevenueM >= 250) {
      statusBadge.className = 'kpi-tag tag-success';
      statusBadge.textContent = 'CONDITIONAL GO';
    } else if (irrVal > 0) {
      statusBadge.className = 'kpi-tag tag-warning';
      statusBadge.textContent = 'HIGH RISK / MARGINAL';
    } else {
      statusBadge.className = 'kpi-tag tag-danger';
      statusBadge.textContent = 'NEGATIVE NPV / NO-GO';
    }
  }

  const kpiNpvText = document.getElementById('kpiNpvText');
  if (kpiNpvText) {
    if (tvProceeds > 0) {
      kpiNpvText.textContent = `Cash: ${formatCurrency(npvVal)} | Resale: ${formatCurrency(assetNpvVal)}`;
    } else {
      kpiNpvText.textContent = `NPV @ ${p.discountRate.toFixed(1)}%: ${formatCurrency(npvVal)}`;
    }
  }

  // 2. Update Financeability Screen Alert
  const bankableAlert = document.getElementById('bankabilityScreen');
  if (calc.annualRevenueM >= 250) {
    bankableAlert.className = 'material-banner banner-success';
    bankableAlert.innerHTML = `
      <div class="banner-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      </div>
      <div class="banner-content">
        <h4>Financeability Screen: SATISFIED ($${calc.annualRevenueM.toFixed(1)}M / year >= $250M recommendation)</h4>
        <p>Projected revenue comfortably covers debt service requirements (~2.4× DSCR) and satisfies bank underwriting thresholds.</p>
      </div>
    `;
  } else if (calc.annualRevenueM >= 240) {
    bankableAlert.className = 'material-banner banner-warning';
    bankableAlert.innerHTML = `
      <div class="banner-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <div class="banner-content">
        <h4>Financeability Screen: MARGINAL ($${calc.annualRevenueM.toFixed(1)}M / year)</h4>
        <p>Meets the $240M bare minimum screen, but falls below the recommended $250M threshold. Lenders may require higher equity or stricter parent guarantee.</p>
      </div>
    `;
  } else {
    bankableAlert.className = 'material-banner banner-warning';
    bankableAlert.innerHTML = `
      <div class="banner-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <div class="banner-content">
        <h4>Financeability Alert: BELOW UNDERWRITING SCREEN ($${calc.annualRevenueM.toFixed(1)}M < $250M requirement)</h4>
        <p>Projected revenue is insufficient to underwrite 47.5% debt. Secure higher take-or-pay volume or adjust GPU realized pricing.</p>
      </div>
    `;
  }

  // 3. Update Detailed Tables
  updateCapexTable(calc);
  updateOpexTable(calc);
  updatePnLTable(calc);
  updateSensitivityTable(calc);
  updateCharts(calc);
  updateQuickButtonsActive();
  updateCustomChipLabel();
  updateScenarioChipStyles();
  updateCurrencyUI();
  syncFxInputs();
  updateTabContextBanners(calc);
}

// Update CAPEX Table
function updateCapexTable(c) {
  const { sym, rate: fx } = getCurrencyInfo();
  const tdServerPurchaseTitle = document.getElementById('tdServerPurchaseTitle');
  if (tdServerPurchaseTitle) {
    tdServerPurchaseTitle.innerHTML = `<strong>${formatRawNumber(state.params.numServers, 0)} B300 Servers Purchase</strong>`;
  }
  const tdServerPurchaseDesc = document.getElementById('tdServerPurchaseDesc');
  if (tdServerPurchaseDesc) {
    tdServerPurchaseDesc.textContent = `${formatRawNumber(state.params.numServers, 0)} servers × ${sym}${formatRawNumber(state.params.serverPrice * fx, 0)}`;
  }
  document.getElementById('tdServerPurchase').textContent = formatCurrency(c.serverPurchaseM);
  document.getElementById('tdServerFreight').textContent = formatCurrency(c.serverFreightM);
  document.getElementById('tdLandedServer').textContent = formatCurrency(c.landedServerCostM);
  document.getElementById('tdNetStorage').textContent = formatCurrency(state.params.networkStorageCapex);
  document.getElementById('tdRacksCooling').textContent = formatCurrency(state.params.racksCoolingCapex);
  document.getElementById('tdInstalledIt').textContent = formatCurrency(c.installedItCapexM);
  document.getElementById('tdColoDeposit').textContent = formatCurrency(state.params.coloDeposit);
  document.getElementById('tdLiquidity').textContent = formatCurrency(state.params.liquidityReserve);
  document.getElementById('tdTotalUpfront').textContent = formatCurrency(c.totalUpfrontM);

  // Prepayment & Net Funding in CAPEX table
  const trCapexPrepay = document.getElementById('trCapexPrepayRow');
  const tdCapexPrepay = document.getElementById('tdCapexPrepay');
  const tdCapexNet = document.getElementById('tdCapexNetFunding');
  if (trCapexPrepay && tdCapexPrepay && tdCapexNet) {
    if (c.effectivePrepayM > 0) {
      trCapexPrepay.style.display = 'table-row';
      tdCapexPrepay.textContent = `-${formatCurrency(c.effectivePrepayM)}`;
      tdCapexNet.textContent = formatCurrency(c.netRequiredM);
    } else {
      trCapexPrepay.style.display = 'none';
      tdCapexNet.textContent = formatCurrency(c.totalUpfrontM);
    }
  }

  // Funding Structure Table
  const rowFundingPrepay = document.getElementById('rowFundingPrepay');
  const tdPrepayPct = document.getElementById('tdPrepayPct');
  const tdPrepayAmount = document.getElementById('tdPrepayAmount');
  if (rowFundingPrepay && tdPrepayPct && tdPrepayAmount) {
    if (c.effectivePrepayM > 0) {
      rowFundingPrepay.style.display = 'table-row';
      const prepayShare = c.totalUpfrontM > 0 ? (c.effectivePrepayM / c.totalUpfrontM) * 100 : 0;
      tdPrepayPct.textContent = `${prepayShare.toFixed(1)}%`;
      tdPrepayAmount.textContent = formatCurrency(c.effectivePrepayM);
    } else {
      rowFundingPrepay.style.display = 'none';
    }
  }

  const tdSeniorDebtPct = document.getElementById('tdSeniorDebtPct');
  if (tdSeniorDebtPct) {
    const debtShareOfTotal = c.totalUpfrontM > 0 ? (c.seniorDebtM / c.totalUpfrontM) * 100 : 0;
    tdSeniorDebtPct.textContent = c.effectivePrepayM > 0 
      ? `${state.params.debtPct}% (${debtShareOfTotal.toFixed(1)}% tot)` 
      : `${state.params.debtPct}%`;
  }
  const elSeniorDebt = document.getElementById('tdSeniorDebt');
  if (elSeniorDebt) elSeniorDebt.textContent = formatCurrency(c.seniorDebtM);

  const tdEquityPct = document.getElementById('tdEquityPct');
  if (tdEquityPct) {
    const equityShareOfTotal = c.totalUpfrontM > 0 ? (c.equityRequiredM / c.totalUpfrontM) * 100 : 0;
    tdEquityPct.textContent = c.effectivePrepayM > 0 
      ? `${(100 - state.params.debtPct).toFixed(1)}% (${equityShareOfTotal.toFixed(1)}% tot)` 
      : `${(100 - state.params.debtPct).toFixed(1)}%`;
  }
  const elEquity = document.getElementById('tdEquity');
  if (elEquity) elEquity.textContent = formatCurrency(c.equityRequiredM);

  const tdTotalSources = document.getElementById('tdTotalSources');
  if (tdTotalSources) tdTotalSources.textContent = formatCurrency(c.totalUpfrontM);

  const elDebtService = document.getElementById('tdDebtService');
  if (elDebtService) {
    elDebtService.textContent = `${formatCurrency(c.annualDebtServiceM)} / yr (4 yrs @ ${state.params.debtRate}%)`;
  }

  const noteDebtPct = document.getElementById('noteDebtPct');
  if (noteDebtPct) {
    if (c.effectivePrepayM > 0) {
      noteDebtPct.textContent = `Modeled leverage on net capital: ${state.params.debtPct}% debt (${formatCurrency(c.seniorDebtM)}) vs ${(100 - state.params.debtPct).toFixed(1)}% equity (${formatCurrency(c.equityRequiredM)}) after ${formatCurrency(c.effectivePrepayM)} customer prepayment.`;
    } else {
      noteDebtPct.textContent = `Base modeled leverage: ${state.params.debtPct}% debt (${formatCurrency(c.seniorDebtM)}) vs ${(100 - state.params.debtPct).toFixed(1)}% equity (${formatCurrency(c.equityRequiredM)}).`;
    }
  }

  // Update 800G Fabric & Storage breakdown line items (respecting active FX rate and inputs)
  const breakdownSubtotal = c.networkStorageSubtotal !== undefined ? c.networkStorageSubtotal : state.params.networkStorageCapex;
  const tdBreakdownSubtotal = document.getElementById('tdBreakdownSubtotal');
  if (tdBreakdownSubtotal) {
    tdBreakdownSubtotal.textContent = `${sym}${formatRawNumber(breakdownSubtotal * fx, 2)}M`;
  }

  // Update input values if not currently focused
  const updateBreakdownInput = (id, val) => {
    const el = document.getElementById(id);
    if (el && document.activeElement !== el && val !== undefined) {
      el.value = Number(val).toFixed(2);
    }
  };
  updateBreakdownInput('inputFabricSwitches', state.params.fabricSwitchesCapex);
  updateBreakdownInput('inputOpticsFiber', state.params.opticsFiberCapex);
  updateBreakdownInput('inputMgmtEth', state.params.mgmtEthCapex);
  updateBreakdownInput('inputFabricSw', state.params.fabricSwCapex);
  updateBreakdownInput('inputStorage', state.params.storageCapex);
  updateBreakdownInput('inputMgmtNodes', state.params.mgmtNodesCapex);
  updateBreakdownInput('inputCyberApp', state.params.cyberAppCapex);
  updateBreakdownInput('inputIntegration', state.params.integrationCapex);
  updateBreakdownInput('inputSparesPool', state.params.sparesPoolCapex);

  // Update Racks & Liquid Cooling breakdown line items (respecting active FX rate and inputs)
  const racksSubtotal = c.racksCoolingSubtotal !== undefined ? c.racksCoolingSubtotal : state.params.racksCoolingCapex;
  document.getElementById('tdRacksCooling').textContent = formatCurrency(racksSubtotal);

  const tdRacksBreakdownSubtotal = document.getElementById('tdRacksBreakdownSubtotal');
  if (tdRacksBreakdownSubtotal) {
    tdRacksBreakdownSubtotal.textContent = `${sym}${formatRawNumber(racksSubtotal * fx, 2)}M`;
  }

  updateBreakdownInput('inputComputeRacks', state.params.computeRacksCapex);
  updateBreakdownInput('inputNetStorageRacks', state.params.netStorageRacksCapex);
  updateBreakdownInput('inputCduSystems', state.params.cduSystemsCapex);
  updateBreakdownInput('inputManifolds', state.params.manifoldsCapex);
  updateBreakdownInput('inputLeakDetection', state.params.leakDetectionCapex);
  updateBreakdownInput('inputLoopCommissioning', state.params.loopCommissioningCapex);
}

// Update OPEX Table
function updateOpexTable(c) {
  const p = state.params;
  const { sym, rate: fx } = getCurrencyInfo();

  // 1. Colocation Capacity Rent
  const tdColoRentMo = document.getElementById('tdColoRentMo');
  const tdColoRentYr = document.getElementById('tdColoRentYr');
  if (tdColoRentMo) tdColoRentMo.textContent = formatCurrency(c.monthlyColoRentM, 2);
  if (tdColoRentYr) tdColoRentYr.textContent = formatCurrency(c.annualColoRentM, 2);

  const tdColoRentFormula = document.getElementById('tdColoRentFormula');
  if (tdColoRentFormula) {
    tdColoRentFormula.textContent = `${c.facilityMaxEquivalentMw.toFixed(2)} MW @ ${sym}${formatRawNumber(p.coloRatePerKwMo * fx, 0)}/kW-mo (Facility Max @ PUE ${p.pue.toFixed(2)})`;
  }

  // 2. Electricity Energy Consumption
  const tdElecEnergyMo = document.getElementById('tdElecEnergyMo');
  const tdElecEnergyYr = document.getElementById('tdElecEnergyYr');
  if (tdElecEnergyMo) tdElecEnergyMo.textContent = formatCurrency(c.monthlyEnergyM, 2);
  if (tdElecEnergyYr) tdElecEnergyYr.textContent = formatCurrency(c.annualEnergyM, 2);

  const tdElecEnergyFormula = document.getElementById('tdElecEnergyFormula');
  if (tdElecEnergyFormula) {
    tdElecEnergyFormula.textContent = `${c.facilityAvgLoadMw.toFixed(2)} MW @ ${sym}${(p.elecRatePerKwh * fx).toFixed(4)}/kWh (730h/mo avg load)`;
  }

  // 3. Utility Capacity Demand Charge
  const tdElecDemandMo = document.getElementById('tdElecDemandMo');
  const tdElecDemandYr = document.getElementById('tdElecDemandYr');
  if (tdElecDemandMo) tdElecDemandMo.textContent = formatCurrency(c.monthlyDemandM, 2);
  if (tdElecDemandYr) tdElecDemandYr.textContent = formatCurrency(c.annualDemandM, 2);

  const tdElecDemandFormula = document.getElementById('tdElecDemandFormula');
  if (tdElecDemandFormula) {
    tdElecDemandFormula.textContent = `${c.facilityMaxEquivalentMw.toFixed(2)} MW @ ${sym}${(p.demandRatePerKwMo * fx).toFixed(2)}/kW-mo (Facility Max @ PUE ${p.pue.toFixed(2)})`;
  }

  // Subtotal: Power & Colocation Facility
  const tdElecMo = document.getElementById('tdElecMo');
  const tdElecYr = document.getElementById('tdElecYr');
  const subtotalColoPowerMo = c.monthlyColoRentM + c.monthlyElecTotalM;
  const subtotalColoPowerYr = c.annualColoRentM + c.annualElecTotalM;
  if (tdElecMo) tdElecMo.textContent = formatCurrency(subtotalColoPowerMo, 2);
  if (tdElecYr) tdElecYr.textContent = formatCurrency(subtotalColoPowerYr, 2);

  // 4. All 11 User-Editable Fixed OPEX Line Items
  const setLine = (idPrefix, valAnnual) => {
    const moEl = document.getElementById(`${idPrefix}Mo`);
    const yrEl = document.getElementById(`${idPrefix}Yr`);
    if (moEl) moEl.textContent = formatCurrency(valAnnual / 12, 2);
    if (yrEl) yrEl.textContent = formatCurrency(valAnnual, 2);
  };

  setLine('tdHwMaint', p.hwMaint);
  setLine('tdSwLicenses', p.swLicenses);
  setLine('tdInternetWan', p.internetWan);
  setLine('tdRemoteHands', p.remoteHands);
  setLine('tdOpsEng', p.opsEng);
  setLine('tdCustSupport', p.custSupport);
  setLine('tdCorpStaff', p.corpStaff);
  setLine('tdInsurance', p.insurance);
  setLine('tdCyberSecurity', p.cyberSecurity);
  setLine('tdLegalCompliance', p.legalCompliance);
  setLine('tdAdminAudit', p.adminAudit);

  // Subtotal: Total Fixed Overhead & SG&A
  const tdFixedOpexMo = document.getElementById('tdFixedOpexMo');
  const tdFixedOpexYr = document.getElementById('tdFixedOpexYr');
  if (tdFixedOpexMo) tdFixedOpexMo.textContent = formatCurrency(c.fixedOpexM / 12, 2);
  if (tdFixedOpexYr) tdFixedOpexYr.textContent = formatCurrency(c.fixedOpexM, 2);

  // Fixed OPEX Control Card Summary Badge
  const textFixedOpexTotalSummary = document.getElementById('textFixedOpexTotalSummary');
  if (textFixedOpexTotalSummary) {
    textFixedOpexTotalSummary.textContent = `${formatCurrency(c.fixedOpexM, 2)} / yr (${formatCurrency(c.fixedOpexM / 12, 2)} / mo)`;
  }

  // 5. Commercial Sales & Marketing
  const tdSalesMktgMo = document.getElementById('tdSalesMktgMo');
  const tdSalesMktgYr = document.getElementById('tdSalesMktgYr');
  if (tdSalesMktgMo) tdSalesMktgMo.textContent = formatCurrency(c.salesMktgM / 12, 2);
  if (tdSalesMktgYr) tdSalesMktgYr.textContent = formatCurrency(c.salesMktgM, 2);

  // 6. TOTAL OPERATING EXPENSES (OPEX)
  const tdTotalOpexMo = document.getElementById('tdTotalOpexMo');
  const tdTotalOpexYr = document.getElementById('tdTotalOpexYr');
  if (tdTotalOpexMo) tdTotalOpexMo.textContent = formatCurrency(c.totalYear1OpexM / 12, 2);
  if (tdTotalOpexYr) tdTotalOpexYr.textContent = formatCurrency(c.totalYear1OpexM, 2);

  // Power metrics summary
  const textAvgItLoad = document.getElementById('textAvgItLoad');
  if (textAvgItLoad) textAvgItLoad.textContent = `${c.totalAvgItLoadMw.toFixed(2)} MW`;

  const textFacilityLoad = document.getElementById('textFacilityLoad');
  if (textFacilityLoad) textFacilityLoad.textContent = `${c.facilityAvgLoadMw.toFixed(2)} MW (@ PUE ${p.pue.toFixed(2)})`;

  // Engineering Load Model: Sync Card 1 and OPEX nested breakdown
  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  const updatePowerInput = (id, val, decimals = 1) => {
    const el = document.getElementById(id);
    if (el && document.activeElement !== el && val !== undefined) {
      el.value = Number(val).toFixed(decimals);
    }
  };

  const numServersFmt = formatRawNumber(p.numServers, 0);

  // Card 1 Table Elements
  setText('labelServerAvgLoad', `${numServersFmt}-server average load`);
  setText('descServerAvgLoad', `${numServersFmt} servers × ${c.serverAvgKw.toFixed(1)} kW continuous draw`);
  setText('tdServerAvgLoadMw', `${c.serverAvgLoadMw.toFixed(2)} MW`);
  setText('labelServerMaxLoad', 'Maximum server load');
  setText('descServerMaxLoad', `${numServersFmt} servers × ${c.maxServerKw.toFixed(1)} kW peak stress load`);
  setText('tdServerMaxLoadMw', `${c.serverMaxLoadMw.toFixed(2)} MW`);
  setText('tdTotalAvgItLoadMw', `~${c.totalAvgItLoadMw.toFixed(2)} MW`);
  setText('tdTotalMaxItLoadMw', `~${c.totalMaxItLoadMw.toFixed(2)} MW`);
  setText('labelFacilityAvgPue', `Facility average at PUE ${p.pue.toFixed(2)}`);
  setText('tdFacilityAvgLoadMw', `~${c.facilityAvgLoadMw.toFixed(2)} MW`);
  setText('labelFacilityMaxPue', `Facility maximum equivalent at PUE ${p.pue.toFixed(2)}`);
  setText('tdFacilityMaxEquivalentMw', `~${c.facilityMaxEquivalentMw.toFixed(2)} MW`);

  // Card 1 Table Input Fields
  updatePowerInput('inputMaxServerKw', c.maxServerKw, 1);
  updatePowerInput('inputServerAvgKwTable', c.serverAvgKw, 1);
  updatePowerInput('inputNetStorageAvgKw', c.netStorageAvgKw, 2);
  updatePowerInput('inputNetStorageMaxMw', c.netStorageMaxMw, 2);
  updatePowerInput('inputReservedMwTable', p.reservedItMw, 1);

  // Card 3 Nested Breakdown Table Elements
  setText('tdSubMaxServerKw', `~${c.maxServerKw.toFixed(1)} kW/server`);
  setText('tdSubServerAvgKw', `${c.serverAvgKw.toFixed(1)} kW/server`);
  setText('tdSubServerAvgLoadLabel', `${numServersFmt}-server average load`);
  setText('tdSubServerAvgLoadDesc', `${numServersFmt} servers × ${c.serverAvgKw.toFixed(1)} kW continuous draw`);
  setText('tdSubServerAvgLoadMw', `${c.serverAvgLoadMw.toFixed(2)} MW`);
  setText('tdSubNetStorageAvgMw', `~${c.netStorageAvgKw.toFixed(2)} MW`);
  setText('tdSubTotalAvgItMw', `~${c.totalAvgItLoadMw.toFixed(2)} MW`);
  setText('tdSubServerMaxLoadLabel', 'Maximum server load');
  setText('tdSubServerMaxLoadDesc', `${numServersFmt} servers × ${c.maxServerKw.toFixed(1)} kW peak stress load`);
  setText('tdSubServerMaxLoadMw', `${c.serverMaxLoadMw.toFixed(2)} MW`);
  setText('tdSubNetStorageMaxMw', `~${c.netStorageMaxMw.toFixed(2)} MW`);
  setText('tdSubTotalMaxItMw', `~${c.totalMaxItLoadMw.toFixed(2)} MW`);
  setText('tdSubCommercialReservationMw', `${p.reservedItMw.toFixed(1)} MW`);
  setText('tdSubFacilityAvgPueLabel', `Facility average at PUE ${p.pue.toFixed(2)}`);
  setText('tdSubFacilityAvgLoadMw', `~${c.facilityAvgLoadMw.toFixed(2)} MW`);
  setText('tdSubFacilityMaxPueLabel', `Facility maximum equivalent at PUE ${p.pue.toFixed(2)}`);
  setText('tdSubFacilityMaxEquivalentMw', `~${c.facilityMaxEquivalentMw.toFixed(2)} MW`);
  setText('tdSubTotalColoPowerCost', `${formatCurrency(c.annualColoRentM + c.annualElecTotalM, 2)} / yr`);

  // 7. Unit Economics in Card 4
  const tdMonthlyOpexPerNode = document.getElementById('tdMonthlyOpexPerNode');
  if (tdMonthlyOpexPerNode) {
    tdMonthlyOpexPerNode.textContent = `${sym}${formatRawNumber(c.monthlyOpexPerServer * fx, 0)} / mo`;
  }
  const tdElecPerNode = document.getElementById('tdElecPerNode');
  if (tdElecPerNode) {
    tdElecPerNode.textContent = `${sym}${formatRawNumber(c.monthlyElecTotalPerServer * fx, 0)} / mo`;
  }
  const tdColoPerNode = document.getElementById('tdColoPerNode');
  if (tdColoPerNode) {
    tdColoPerNode.textContent = `${sym}${formatRawNumber(c.monthlyColoRentPerServer * fx, 0)} / mo`;
  }
  const tdFixedPerNode = document.getElementById('tdFixedPerNode');
  if (tdFixedPerNode) {
    tdFixedPerNode.textContent = `${sym}${formatRawNumber(c.monthlyFixedOpexPerServer * fx, 0)} / mo`;
  }
  const tdCashOpexGpuHr = document.getElementById('tdCashOpexGpuHr');
  if (tdCashOpexGpuHr) {
    tdCashOpexGpuHr.textContent = `${sym}${(c.cashOpexPerGpuHour * fx).toFixed(2)} / GPU-h`;
  }
  const tdCashBreakevenGpuHr = document.getElementById('tdCashBreakevenGpuHr');
  if (tdCashBreakevenGpuHr) {
    tdCashBreakevenGpuHr.textContent = `${sym}${(c.cashEbitdaBreakevenPrice * fx).toFixed(2)} / GPU-h`;
  }
}

// Render Dynamic 1, 3, 5, 10-Year Profit & Loss Statement (P&L)
function renderPnLStatement(c) {
  const pnlThead = document.getElementById('pnlTableHead');
  const pnlTbody = document.getElementById('pnlTableBody');
  if (!pnlThead || !pnlTbody) return;

  const horizon = state.pnlHorizon || 10;
  const viewMode = state.pnlViewMode || 'columns';
  const { sym, rate: fx, code } = getCurrencyInfo();
  const yearlyData = c.tenYearModel?.yearlyData || [];
  const selectedYears = yearlyData.slice(0, horizon);

  // Update card title, active pill, and currency hint
  const pnlCardTitle = document.getElementById('pnlCardTitle');
  if (pnlCardTitle) {
    if (horizon === 1) {
      pnlCardTitle.textContent = 'Year-1 Profit & Loss Statement (P&L)';
    } else {
      pnlCardTitle.textContent = `${horizon}-Year Profit & Loss Statement (P&L)`;
    }
  }

  const activeHorizonPill = document.getElementById('activeHorizonPill');
  if (activeHorizonPill) {
    activeHorizonPill.textContent = (horizon === 1) ? '1-Year Horizon Active' : `${horizon}-Year Horizon Active`;
  }

  const pnlCurrencyHint = document.getElementById('pnlCurrencyHint');
  if (pnlCurrencyHint) {
    pnlCurrencyHint.textContent = `${code} (${sym.trim()}M)`;
  }

  // Update mode group toggle visibility (hidden when 1-Year is selected)
  const modeGroup = document.getElementById('pnlModeGroup');
  if (modeGroup) {
    modeGroup.style.display = (horizon === 1) ? 'none' : 'flex';
  }

  // Update active pill button classes
  document.querySelectorAll('.pnl-horizon-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.getAttribute('data-horizon'), 10) === horizon);
  });
  document.querySelectorAll('.pnl-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-mode') === viewMode);
  });

  // Calculate Cumulative totals over the selected horizon
  const totalRev = selectedYears.reduce((sum, y) => sum + y.revenue, 0);
  const totalOpex = selectedYears.reduce((sum, y) => sum + y.opex, 0);
  const totalEbitda = selectedYears.reduce((sum, y) => sum + y.ebitda, 0);
  const totalDeprec = selectedYears.reduce((sum, y) => sum + y.deprec, 0);
  const totalEbit = selectedYears.reduce((sum, y) => sum + y.ebit, 0);
  const totalInterest = selectedYears.reduce((sum, y) => sum + y.interest, 0);
  const totalTax = selectedYears.reduce((sum, y) => sum + y.tax, 0);
  const totalNetProfit = selectedYears.reduce((sum, y) => sum + y.netIncome, 0);

  const cumEbitdaMargin = totalRev > 0 ? (totalEbitda / totalRev) * 100 : 0;
  const cumNetMargin = totalRev > 0 ? (totalNetProfit / totalRev) * 100 : 0;

  if (horizon === 1) {
    // 1-Year Statement View
    pnlThead.innerHTML = `
      <tr>
        <th class="pnl-col-sticky">Line Item</th>
        <th class="text-right" style="width: 140px;">Year 1</th>
      </tr>
    `;

    const yr1 = selectedYears[0] || {};
    const rev1 = yr1.revenue !== undefined ? yr1.revenue : c.annualRevenueM;
    const opex1 = yr1.opex !== undefined ? yr1.opex : c.totalYear1OpexM;
    const ebitda1 = yr1.ebitda !== undefined ? yr1.ebitda : c.ebitdaM;
    const ebitdaMargin1 = yr1.ebitdaMargin !== undefined ? yr1.ebitdaMargin : c.ebitdaMargin;
    const deprec1 = yr1.deprec !== undefined ? yr1.deprec : c.depreciationM;
    const ebit1 = yr1.ebit !== undefined ? yr1.ebit : c.ebitM;
    const interest1 = yr1.interest !== undefined ? yr1.interest : c.year1InterestM;
    const tax1 = yr1.tax !== undefined ? yr1.tax : c.taxM;
    const netProfit1 = yr1.netIncome !== undefined ? yr1.netIncome : c.netProfitM;
    const netMargin1 = yr1.netMargin !== undefined ? yr1.netMargin : c.netMargin;

    pnlTbody.innerHTML = `
      <tr>
        <td class="pnl-col-sticky"><strong>Revenue (${state.params.utilizationPct}% util @ ${sym}${(state.params.gpuPricePerHour * fx).toFixed(2)}/h)</strong></td>
        <td class="text-right font-mono font-bold" style="color: #047857; font-size: 1rem;">${formatCurrency(rev1)}</td>
      </tr>
      <tr>
        <td class="pnl-col-sticky">Operating Expenses (OPEX)</td>
        <td class="text-right font-mono text-danger">(${formatCurrency(opex1)})</td>
      </tr>
      <tr style="background: var(--md-sys-color-surface-container-high);">
        <td class="pnl-col-sticky"><strong>EBITDA</strong></td>
        <td class="text-right font-mono font-bold">${formatCurrency(ebitda1)}</td>
      </tr>
      <tr>
        <td class="pnl-col-sticky">EBITDA Margin</td>
        <td class="text-right font-mono font-bold">${ebitdaMargin1.toFixed(1)}%</td>
      </tr>
      <tr>
        <td class="pnl-col-sticky">Depreciation (4-Year Straight-Line on IT)</td>
        <td class="text-right font-mono">(${formatCurrency(deprec1)})</td>
      </tr>
      <tr style="background: var(--md-sys-color-surface-container-high);">
        <td class="pnl-col-sticky"><strong>EBIT (Operating Income)</strong></td>
        <td class="text-right font-mono font-bold">${formatCurrency(ebit1)}</td>
      </tr>
      <tr>
        <td class="pnl-col-sticky">Senior Debt Interest (Year 1 @ ${state.params.debtRate.toFixed(1)}%)</td>
        <td class="text-right font-mono">(${formatCurrency(interest1)})</td>
      </tr>
      <tr>
        <td class="pnl-col-sticky">Corporate Income Tax (${state.params.taxRate.toFixed(0)}% Malaysia Rate)</td>
        <td class="text-right font-mono">(${formatCurrency(tax1)})</td>
      </tr>
      <tr class="total-row" style="background: var(--md-sys-color-primary-container);">
        <td class="pnl-col-sticky"><strong>NET PROFIT (Year 1)</strong></td>
        <td class="text-right font-mono font-bold" style="color: var(--md-sys-color-primary); font-size: 1.05rem;">${formatCurrency(netProfit1)}</td>
      </tr>
      <tr>
        <td class="pnl-col-sticky">Net Profit Margin</td>
        <td class="text-right font-mono font-bold">${netMargin1.toFixed(1)}%</td>
      </tr>
    `;
    return;
  }

  // Multi-Year View: Cumulative Summary Mode
  if (viewMode === 'cumulative') {
    pnlThead.innerHTML = `
      <tr>
        <th class="pnl-col-sticky">Line Item</th>
        <th class="text-right" style="min-width: 110px;">${horizon}-Yr Total</th>
        <th class="text-right" style="min-width: 100px;">Annual Avg</th>
        <th class="text-right" style="min-width: 90px;">% Margin / Share</th>
      </tr>
    `;

    const avgRev = totalRev / horizon;
    const avgOpex = totalOpex / horizon;
    const avgEbitda = totalEbitda / horizon;
    const avgDeprec = totalDeprec / horizon;
    const avgEbit = totalEbit / horizon;
    const avgInterest = totalInterest / horizon;
    const avgTax = totalTax / horizon;
    const avgNetProfit = totalNetProfit / horizon;

    pnlTbody.innerHTML = `
      <tr>
        <td class="pnl-col-sticky"><strong>Revenue</strong></td>
        <td class="text-right font-mono font-bold" style="color: #047857; font-size: 0.95rem;">${formatCurrency(totalRev)}</td>
        <td class="text-right font-mono">${formatCurrency(avgRev)}/yr</td>
        <td class="text-right font-mono font-bold">100.0%</td>
      </tr>
      <tr>
        <td class="pnl-col-sticky">Operating Expenses (OPEX)</td>
        <td class="text-right font-mono text-danger">(${formatCurrency(totalOpex)})</td>
        <td class="text-right font-mono text-danger">(${formatCurrency(avgOpex)}/yr)</td>
        <td class="text-right font-mono">${totalRev > 0 ? ((totalOpex / totalRev) * 100).toFixed(1) : '0.0'}%</td>
      </tr>
      <tr style="background: var(--md-sys-color-surface-container-high);">
        <td class="pnl-col-sticky"><strong>EBITDA</strong></td>
        <td class="text-right font-mono font-bold">${formatCurrency(totalEbitda)}</td>
        <td class="text-right font-mono font-bold">${formatCurrency(avgEbitda)}/yr</td>
        <td class="text-right font-mono font-bold">${cumEbitdaMargin.toFixed(1)}%</td>
      </tr>
      <tr>
        <td class="pnl-col-sticky">Depreciation</td>
        <td class="text-right font-mono">(${formatCurrency(totalDeprec)})</td>
        <td class="text-right font-mono">(${formatCurrency(avgDeprec)}/yr)</td>
        <td class="text-right font-mono">${totalRev > 0 ? ((totalDeprec / totalRev) * 100).toFixed(1) : '0.0'}%</td>
      </tr>
      <tr style="background: var(--md-sys-color-surface-container-high);">
        <td class="pnl-col-sticky"><strong>EBIT (Operating Income)</strong></td>
        <td class="text-right font-mono font-bold">${formatCurrency(totalEbit)}</td>
        <td class="text-right font-mono font-bold">${formatCurrency(avgEbit)}/yr</td>
        <td class="text-right font-mono font-bold">${totalRev > 0 ? ((totalEbit / totalRev) * 100).toFixed(1) : '0.0'}%</td>
      </tr>
      <tr>
        <td class="pnl-col-sticky">Senior Debt Interest</td>
        <td class="text-right font-mono">(${formatCurrency(totalInterest)})</td>
        <td class="text-right font-mono">(${formatCurrency(avgInterest)}/yr)</td>
        <td class="text-right font-mono">${totalRev > 0 ? ((totalInterest / totalRev) * 100).toFixed(1) : '0.0'}%</td>
      </tr>
      <tr>
        <td class="pnl-col-sticky">Corporate Income Tax (${state.params.taxRate.toFixed(0)}%)</td>
        <td class="text-right font-mono">(${formatCurrency(totalTax)})</td>
        <td class="text-right font-mono">(${formatCurrency(avgTax)}/yr)</td>
        <td class="text-right font-mono">${totalRev > 0 ? ((totalTax / totalRev) * 100).toFixed(1) : '0.0'}%</td>
      </tr>
      <tr class="total-row" style="background: var(--md-sys-color-primary-container);">
        <td class="pnl-col-sticky"><strong>NET PROFIT (${horizon}-Yr Total)</strong></td>
        <td class="text-right font-mono font-bold" style="color: var(--md-sys-color-primary); font-size: 1.05rem;">${formatCurrency(totalNetProfit)}</td>
        <td class="text-right font-mono font-bold" style="color: var(--md-sys-color-primary);">${formatCurrency(avgNetProfit)}/yr</td>
        <td class="text-right font-mono font-bold" style="color: var(--md-sys-color-primary);">${cumNetMargin.toFixed(1)}%</td>
      </tr>
    `;
    return;
  }

  // Multi-Year View: Annual Columns Mode
  let theadHtml = `<tr><th class="pnl-col-sticky">Line Item</th>`;
  selectedYears.forEach(y => {
    theadHtml += `<th class="text-right" style="min-width: 68px;">Yr ${y.year}</th>`;
  });
  theadHtml += `<th class="text-right pnl-total-col" style="min-width: 86px;">Total (${horizon}-Yr)</th></tr>`;
  pnlThead.innerHTML = theadHtml;

  const buildRow = (label, dataKey, isFormatCurrency = true, isNegative = false, isBold = false, rowClass = '') => {
    let rowHtml = `<tr class="${rowClass}"><td class="pnl-col-sticky">${isBold ? `<strong>${label}</strong>` : label}</td>`;
    selectedYears.forEach(y => {
      let val = y[dataKey];
      let formattedVal = '';
      if (isFormatCurrency) {
        formattedVal = isNegative ? `(${formatCurrency(val)})` : formatCurrency(val);
      } else {
        formattedVal = `${val.toFixed(1)}%`;
      }
      const valColor = dataKey === 'revenue' ? 'color: #047857;' : (isNegative ? 'color: #b91c1c;' : (dataKey === 'netIncome' ? 'color: var(--md-sys-color-primary);' : ''));
      rowHtml += `<td class="text-right font-mono ${isBold ? 'font-bold' : ''}" style="${valColor}">${formattedVal}</td>`;
    });

    // Total column
    let totalVal = 0;
    if (dataKey === 'revenue') totalVal = totalRev;
    else if (dataKey === 'opex') totalVal = totalOpex;
    else if (dataKey === 'ebitda') totalVal = totalEbitda;
    else if (dataKey === 'ebitdaMargin') totalVal = cumEbitdaMargin;
    else if (dataKey === 'deprec') totalVal = totalDeprec;
    else if (dataKey === 'ebit') totalVal = totalEbit;
    else if (dataKey === 'interest') totalVal = totalInterest;
    else if (dataKey === 'tax') totalVal = totalTax;
    else if (dataKey === 'netIncome') totalVal = totalNetProfit;
    else if (dataKey === 'netMargin') totalVal = cumNetMargin;

    let formattedTotal = '';
    if (isFormatCurrency) {
      formattedTotal = isNegative ? `(${formatCurrency(totalVal)})` : formatCurrency(totalVal);
    } else {
      formattedTotal = `${totalVal.toFixed(1)}%`;
    }
    const totalColor = dataKey === 'revenue' ? 'color: #047857;' : (isNegative ? 'color: #b91c1c;' : (dataKey === 'netIncome' ? 'color: var(--md-sys-color-primary);' : ''));
    rowHtml += `<td class="text-right font-mono font-bold pnl-total-col" style="${totalColor}">${formattedTotal}</td></tr>`;
    return rowHtml;
  };

  let tbodyHtml = '';
  tbodyHtml += buildRow('Revenue', 'revenue', true, false, true);
  tbodyHtml += buildRow('Operating Expenses (OPEX)', 'opex', true, true, false);
  tbodyHtml += buildRow('EBITDA', 'ebitda', true, false, true, 'highlight-row');
  tbodyHtml += buildRow('EBITDA Margin', 'ebitdaMargin', false, false, true);
  tbodyHtml += buildRow('Depreciation', 'deprec', true, true, false);
  tbodyHtml += buildRow('EBIT (Operating Income)', 'ebit', true, false, true, 'highlight-row');
  tbodyHtml += buildRow('Senior Debt Interest', 'interest', true, true, false);
  tbodyHtml += buildRow('Corporate Income Tax', 'tax', true, true, false);
  tbodyHtml += buildRow('NET PROFIT', 'netIncome', true, false, true, 'total-row');
  tbodyHtml += buildRow('Net Profit Margin', 'netMargin', false, false, true);

  pnlTbody.innerHTML = tbodyHtml;
}

// Render Dynamic 1, 3, 5, 10-Year Balance Sheet Statement
function renderBalanceSheetStatement(c) {
  const thead = document.getElementById('balanceSheetTableHead');
  const tbody = document.getElementById('balanceSheetTableBody');
  if (!thead || !tbody) return;

  const horizon = state.pnlHorizon || 10;
  const { sym, code } = getCurrencyInfo();
  const yearlyData = c.tenYearModel?.yearlyData || [];
  const selectedYears = yearlyData.slice(0, horizon);
  const y0 = c.tenYearModel?.year0 || {};

  const cardTitle = document.getElementById('balanceSheetCardTitle');
  if (cardTitle) {
    cardTitle.textContent = (horizon === 1)
      ? 'Year-1 Balance Sheet Statement'
      : `${horizon}-Year Balance Sheet Statement`;
  }

  const currencyHint = document.getElementById('balanceSheetCurrencyHint');
  if (currencyHint) {
    currencyHint.textContent = `${code} (${sym.trim()}M)`;
  }

  // Check for balance difference
  const maxDiff = selectedYears.reduce((m, y) => Math.max(m, y.balanceDiff || 0), 0);
  const badge = document.getElementById('balanceSheetBadge');
  if (badge) {
    if (maxDiff <= 0.05) {
      badge.className = 'balance-check-badge';
      badge.style.background = '';
      badge.style.color = '';
      badge.style.borderColor = '';
      badge.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
        Balanced (${sym.trim()}${maxDiff.toFixed(2)}M diff)
      `;
    } else {
      badge.className = 'balance-check-badge';
      badge.style.background = 'rgba(234, 179, 8, 0.15)';
      badge.style.color = '#b45309';
      badge.style.borderColor = 'rgba(234, 179, 8, 0.4)';
      badge.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        Reconciliation Diff: -${sym.trim()}${maxDiff.toFixed(2)}M (Line 513 Maint Deferred)
      `;
    }
  }

  const noteEl = document.getElementById('balanceSheetModelNote');
  if (noteEl) {
    noteEl.innerHTML = `* <strong>Treasury Cash</strong> derived from independent direct cash roll-forward (Opening Cash + CFO + CFI + CFF). 
      ${maxDiff > 0.05 ? `<br><span style="color: #b45309; font-weight: 600;">Note: Difference (-${sym.trim()}${maxDiff.toFixed(2)}M max) reflects Line 513 maintenance capex accounting policy ($8.0M flat capitalization vs escalating cash spend), intentionally deferred per Owner Decision B.</span>` : ''}`;
  }

  // Table Headers
  let theadHtml = `<tr><th class="pnl-col-sticky">Balance Sheet Item</th>`;
  if (horizon === 1) {
    theadHtml += `<th class="text-right" style="min-width: 120px;">Inception (Yr 0)</th>`;
    theadHtml += `<th class="text-right" style="min-width: 120px;">Year 1 (Ending)</th></tr>`;
  } else {
    selectedYears.forEach(y => {
      theadHtml += `<th class="text-right" style="min-width: 68px;">Yr ${y.year}</th>`;
    });
    theadHtml += `</tr>`;
  }
  thead.innerHTML = theadHtml;

  const totalCols = horizon === 1 ? 2 : selectedYears.length;

  const renderSectionHeader = (title) => `
    <tr class="section-header-row">
      <td class="pnl-col-sticky" colspan="${totalCols + 1}"><strong>${title}</strong></td>
    </tr>
  `;

  const renderRow = (label, key, isNegative = false, isBold = false, rowClass = '') => {
    let row = `<tr class="${rowClass}"><td class="pnl-col-sticky">${isBold ? `<strong>${label}</strong>` : label}</td>`;
    if (horizon === 1) {
      const v0 = y0[key] || 0;
      const v1 = (selectedYears[0] && selectedYears[0][key]) || 0;
      const f0 = isNegative ? `(${formatCurrency(v0)})` : formatCurrency(v0);
      const f1 = isNegative ? `(${formatCurrency(v1)})` : formatCurrency(v1);
      row += `<td class="text-right font-mono ${isBold ? 'font-bold' : ''}">${f0}</td>`;
      row += `<td class="text-right font-mono ${isBold ? 'font-bold' : ''}">${f1}</td>`;
    } else {
      selectedYears.forEach(y => {
        const val = y[key] || 0;
        const formatted = isNegative ? `(${formatCurrency(val)})` : formatCurrency(val);
        row += `<td class="text-right font-mono ${isBold ? 'font-bold' : ''}">${formatted}</td>`;
      });
    }
    row += `</tr>`;
    return row;
  };

  let bodyHtml = '';
  // 1. ASSETS
  bodyHtml += renderSectionHeader('ASSETS');
  bodyHtml += renderRow('Treasury Cash (Cash & Equivalents / 公司现金余额)', 'cash');
  bodyHtml += renderRow('Accounts Receivable (Trade)', 'ar');
  bodyHtml += renderRow('Gross Capital Assets (PP&E)', 'grossPpe');
  bodyHtml += renderRow('Less: Accumulated Depreciation', 'accumDeprec', true);
  bodyHtml += renderRow('Net PP&E (Equipment & Facilities)', 'netPpe', false, true, 'subtotal-row');
  bodyHtml += renderRow('TOTAL ASSETS', 'totalAssets', false, true, 'total-row');

  // 2. LIABILITIES
  bodyHtml += renderSectionHeader('LIABILITIES');
  bodyHtml += renderRow('Senior Term Debt Outstanding', 'seniorDebt');
  bodyHtml += renderRow('Deferred Prepayment (Unearned Rev)', 'deferredPrepay');
  bodyHtml += renderRow('Accounts Payable & Accrued Expenses', 'ap');
  bodyHtml += renderRow('TOTAL LIABILITIES', 'totalLiabilities', false, true, 'subtotal-row');

  // 3. SHAREHOLDERS' EQUITY
  bodyHtml += renderSectionHeader("SHAREHOLDERS' EQUITY");
  bodyHtml += renderRow('Contributed Common Equity', 'contributedEquity');
  bodyHtml += renderRow('Retained Earnings (Accumulated Profit)', 'retainedEarnings');
  bodyHtml += renderRow("TOTAL SHAREHOLDERS' EQUITY", 'totalEquity', false, true, 'subtotal-row');

  // 4. BALANCE SHEET IDENTITY
  bodyHtml += renderRow("TOTAL LIABILITIES & EQUITY", 'totalLiabEquity', false, true, 'total-row');

  tbody.innerHTML = bodyHtml;
}

// Render Dynamic 1, 3, 5, 10-Year Cash Flow Statement
function renderCashFlowStatement(c) {
  const thead = document.getElementById('cashFlowTableHead');
  const tbody = document.getElementById('cashFlowTableBody');
  if (!thead || !tbody) return;

  const horizon = state.pnlHorizon || 10;
  const viewMode = state.pnlViewMode || 'columns';
  const { sym, code } = getCurrencyInfo();
  const yearlyData = c.tenYearModel?.yearlyData || [];
  const selectedYears = yearlyData.slice(0, horizon);

  const cardTitle = document.getElementById('cashFlowCardTitle');
  if (cardTitle) {
    cardTitle.textContent = (horizon === 1)
      ? 'Year-1 Cash Flow Statement & Free Cash Flow Projection'
      : `${horizon}-Year Cash Flow Statement & Free Cash Flow Projection`;
  }

  const chartTitleText = document.getElementById('cashFlowChartTitleText');
  if (chartTitleText) {
    chartTitleText.textContent = (horizon === 1)
      ? 'Year-1 Free Cash Flow & Cumulative Project Cash'
      : `${horizon}-Year Free Cash Flow (Blue Bars) & Cumulative Project Cash (Green Line)`;
  }

  const currencyHint = document.getElementById('cashFlowCurrencyHint');
  if (currencyHint) {
    currencyHint.textContent = `${code} (${sym.trim()}M)`;
  }

  // Calculate horizon sums
  const totalEbitda = selectedYears.reduce((sum, y) => sum + (y.cfoEbitda || 0), 0);
  const totalInterest = selectedYears.reduce((sum, y) => sum + (y.cfoInterest || 0), 0);
  const totalTax = selectedYears.reduce((sum, y) => sum + (y.cfoTax || 0), 0);
  const totalAccrualCfo = selectedYears.reduce((sum, y) => sum + (y.accrualCfo || (y.cfoEbitda - y.cfoInterest - y.cfoTax)), 0);
  const totalDeltaNwc = selectedYears.reduce((sum, y) => sum + (y.deltaNwc || 0), 0);
  const totalNetCfo = selectedYears.reduce((sum, y) => sum + y.netCfo, 0);
  const totalMaintCapex = selectedYears.reduce((sum, y) => sum + y.maintCapex, 0);
  const totalRefreshCapex = selectedYears.reduce((sum, y) => sum + y.refreshCapex, 0);
  const totalNetCfi = selectedYears.reduce((sum, y) => sum + y.netCfi, 0);
  const totalPrincipal = selectedYears.reduce((sum, y) => sum + y.debtPrincipal, 0);
  const totalNetCff = selectedYears.reduce((sum, y) => sum + y.netCff, 0);
  const totalNetCashChange = selectedYears.reduce((sum, y) => sum + y.netCashChange, 0);
  const totalProjectFcf = selectedYears.reduce((sum, y) => sum + y.projectFcf, 0);
  const totalEquityFcf = selectedYears.reduce((sum, y) => sum + y.equityFcf, 0);

  // Table Headers
  let theadHtml = `<tr><th class="pnl-col-sticky">Cash Flow Item</th>`;
  if (horizon === 1) {
    theadHtml += `<th class="text-right" style="width: 140px;">Year 1</th></tr>`;
  } else if (viewMode === 'cumulative') {
    theadHtml += `
      <th class="text-right" style="min-width: 110px;">${horizon}-Yr Total</th>
      <th class="text-right" style="min-width: 100px;">Annual Avg</th>
    </tr>`;
  } else {
    selectedYears.forEach(y => {
      theadHtml += `<th class="text-right" style="min-width: 68px;">Yr ${y.year}</th>`;
    });
    theadHtml += `<th class="text-right pnl-total-col" style="min-width: 86px;">Total (${horizon}-Yr)</th></tr>`;
  }
  thead.innerHTML = theadHtml;

  const totalCols = (horizon === 1) ? 1 : (viewMode === 'cumulative' ? 2 : selectedYears.length + 1);

  const renderSectionHeader = (title) => `
    <tr class="section-header-row">
      <td class="pnl-col-sticky" colspan="${totalCols + 1}"><strong>${title}</strong></td>
    </tr>
  `;

  const renderRow = (label, key, isNegative = false, isBold = false, rowClass = '', totalVal = null, customStyle = '') => {
    let row = `<tr class="${rowClass}"><td class="pnl-col-sticky">${isBold ? `<strong>${label}</strong>` : label}</td>`;
    const styleAttr = customStyle ? `style="${customStyle}"` : '';

    if (horizon === 1) {
      const val = (selectedYears[0] && selectedYears[0][key]) || 0;
      const formatted = isNegative ? `(${formatCurrency(val)})` : formatCurrency(val);
      row += `<td class="text-right font-mono ${isBold ? 'font-bold' : ''}" ${styleAttr}>${formatted}</td>`;
    } else if (viewMode === 'cumulative') {
      const tot = (totalVal !== null) ? totalVal : selectedYears.reduce((s, y) => s + (y[key] || 0), 0);
      const avg = tot / horizon;
      const fTot = isNegative ? `(${formatCurrency(tot)})` : formatCurrency(tot);
      const fAvg = isNegative ? `(${formatCurrency(avg)})` : formatCurrency(avg);
      row += `<td class="text-right font-mono ${isBold ? 'font-bold' : ''}" ${styleAttr}>${fTot}</td>`;
      row += `<td class="text-right font-mono ${isBold ? 'font-bold' : ''}">${fAvg}/yr</td>`;
    } else {
      selectedYears.forEach(y => {
        const val = y[key] || 0;
        const formatted = isNegative ? `(${formatCurrency(val)})` : formatCurrency(val);
        row += `<td class="text-right font-mono ${isBold ? 'font-bold' : ''}" ${styleAttr}>${formatted}</td>`;
      });
      // Total column
      const tot = (totalVal !== null) ? totalVal : selectedYears.reduce((s, y) => s + (y[key] || 0), 0);
      const fTot = isNegative ? `(${formatCurrency(tot)})` : formatCurrency(tot);
      row += `<td class="text-right font-mono font-bold pnl-total-col" ${styleAttr}>${fTot}</td>`;
    }
    row += `</tr>`;
    return row;
  };

  let bodyHtml = '';
  // 1. CFO
  bodyHtml += renderSectionHeader('OPERATING ACTIVITIES (CFO)');
  bodyHtml += renderRow('EBITDA (Operating Cash Generation)', 'cfoEbitda', false, false, '', totalEbitda);
  bodyHtml += renderRow('Senior Debt Interest Paid', 'cfoInterest', true, false, '', totalInterest);
  bodyHtml += renderRow('Corporate Income Tax Paid', 'cfoTax', true, false, '', totalTax);
  bodyHtml += renderRow('Operating Cash Flow before Working Capital', 'accrualCfo', false, false, '', totalAccrualCfo);
  bodyHtml += renderRow('Change in Working Capital (ΔAR - ΔAP)', 'deltaNwc', true, false, '', totalDeltaNwc);
  bodyHtml += renderRow('Net Cash from Operations (CFO)', 'netCfo', false, true, 'subtotal-row', totalNetCfo);

  // 2. CFI
  bodyHtml += renderSectionHeader('INVESTING ACTIVITIES (CFI)');
  bodyHtml += renderRow('Maintenance Capex Reserve (Annual)', 'maintCapex', true, false, '', totalMaintCapex);
  bodyHtml += renderRow('Platform Refresh Capex (Year 5)', 'refreshCapex', true, false, '', totalRefreshCapex);
  bodyHtml += renderRow('Net Cash from Investing (CFI)', 'netCfi', false, true, 'subtotal-row', totalNetCfi);

  // 3. CFF
  bodyHtml += renderSectionHeader('FINANCING ACTIVITIES (CFF)');
  bodyHtml += renderRow('Senior Debt Principal Repayment', 'debtPrincipal', true, false, '', totalPrincipal);
  bodyHtml += renderRow('Net Cash from Financing (CFF)', 'netCff', false, true, 'subtotal-row', totalNetCff);

  // 4. FREE CASH FLOWS & BALANCES
  bodyHtml += renderSectionHeader('SUMMARY FREE CASH FLOW & BALANCES');
  bodyHtml += renderRow(
    'Annual Project Free Cash Flow (Unlevered FCF / 项目自由现金流)', 
    'projectFcf', 
    false, 
    true, 
    'highlight-row', 
    totalProjectFcf, 
    'color: #1d4ed8; font-weight: 700;'
  );
  bodyHtml += renderRow('Equity Free Cash Flow (Modelled FCFE / 股东自由现金流)*', 'equityFcf', false, false, '', totalEquityFcf);
  bodyHtml += renderRow('Net Annual Cash Change (年度净现金变动)', 'netCashChange', false, false, '', totalNetCashChange);
  
  if (viewMode === 'cumulative') {
    const lastCum = selectedYears[selectedYears.length - 1].cumulativeProjectCash;
    const lastCash = selectedYears[selectedYears.length - 1].cash;
    bodyHtml += `
      <tr class="total-row">
        <td class="pnl-col-sticky"><strong>Cumulative Project FCF (累计项目自由现金流)</strong></td>
        <td class="text-right font-mono font-bold" style="${lastCum >= 0 ? 'color: #047857;' : 'color: #b91c1c;'}">${formatCurrency(lastCum)}</td>
        <td class="text-right font-mono font-bold" style="${lastCum >= 0 ? 'color: #047857;' : 'color: #b91c1c;'}">${formatCurrency(lastCum / horizon)}/yr</td>
      </tr>
      <tr class="subtotal-row" style="background: var(--md-sys-color-surface-container);">
        <td class="pnl-col-sticky"><strong>Closing Treasury Cash Balance (期末公司现金余额)</strong></td>
        <td class="text-right font-mono font-bold" style="${lastCash >= 0 ? 'color: #047857;' : 'color: #b91c1c;'}">${formatCurrency(lastCash)}</td>
        <td class="text-right font-mono" style="color: var(--md-sys-color-on-surface-variant); font-size: 0.75rem;">(Ending Balance)</td>
      </tr>
    `;
  } else if (horizon > 1) {
    let cumRow = `<tr class="total-row"><td class="pnl-col-sticky"><strong>Cumulative Project FCF (累计项目自由现金流)</strong></td>`;
    selectedYears.forEach(y => {
      const val = y.cumulativeProjectCash;
      const formatted = formatCurrency(val);
      const color = val >= 0 ? 'color: #047857;' : 'color: #b91c1c;';
      cumRow += `<td class="text-right font-mono font-bold" style="${color}">${formatted}</td>`;
    });
    const lastCum = selectedYears[selectedYears.length - 1].cumulativeProjectCash;
    cumRow += `<td class="text-right font-mono font-bold pnl-total-col" style="${lastCum >= 0 ? 'color: #047857;' : 'color: #b91c1c;'}">${formatCurrency(lastCum)}</td></tr>`;
    bodyHtml += cumRow;

    let cashRow = `<tr class="subtotal-row" style="background: var(--md-sys-color-surface-container);"><td class="pnl-col-sticky"><strong>Closing Treasury Cash Balance (期末公司现金余额)</strong></td>`;
    selectedYears.forEach(y => {
      const val = y.cash;
      const formatted = formatCurrency(val);
      const color = val >= 0 ? 'color: #047857;' : 'color: #b91c1c;';
      cashRow += `<td class="text-right font-mono font-bold" style="${color}">${formatted}</td>`;
    });
    const lastCash = selectedYears[selectedYears.length - 1].cash;
    cashRow += `<td class="text-right font-mono font-bold pnl-total-col" style="${lastCash >= 0 ? 'color: #047857;' : 'color: #b91c1c;'}">${formatCurrency(lastCash)}</td></tr>`;
    bodyHtml += cashRow;
  } else if (horizon === 1) {
    bodyHtml += renderRow('Closing Treasury Cash Balance (期末公司现金余额)', 'cash', false, true, 'subtotal-row', null, 'color: #047857;');
  }

  tbody.innerHTML = bodyHtml;
}

// Render Year-5 GPU Hardware Refresh Liquidity & Funding Assessment Card
function renderYear5RefreshAssessment(c) {
  const fund = c.tenYearModel?.year5RefreshFunding;
  if (!fund) return;

  const { sym, rate: fx, code } = getCurrencyInfo();
  const setElText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  const badge = document.getElementById('badgeRefreshFundingStatus');
  if (badge) {
    badge.textContent = fund.refreshFundingStatus;
    if (fund.refreshFundingStatus === 'SUFFICIENT') {
      badge.className = 'kpi-tag tag-success';
      badge.style.background = 'rgba(16, 185, 129, 0.15)';
      badge.style.color = '#047857';
      badge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    } else if (fund.refreshFundingStatus === 'CONDITIONAL') {
      badge.className = 'kpi-tag tag-warning';
      badge.style.background = 'rgba(245, 158, 11, 0.15)';
      badge.style.color = '#b45309';
      badge.style.borderColor = 'rgba(245, 158, 11, 0.4)';
    } else {
      badge.className = 'kpi-tag tag-danger';
      badge.style.background = 'rgba(239, 68, 68, 0.15)';
      badge.style.color = '#b91c1c';
      badge.style.borderColor = 'rgba(239, 68, 68, 0.4)';
    }
  }

  setElText('refreshCurrencyHint', `${code} (${sym.trim()}M)`);
  setElText('rfMetricRefreshCost', `${sym}${formatRawNumber(fund.refreshCost * fx, 1)}M`);
  setElText('rfMetricYear4Cash', `${sym}${formatRawNumber(fund.year4ClosingCash * fx, 1)}M`);
  setElText('rfMetricRestricted', `${sym}${formatRawNumber(fund.totalRestrictedCash * fx, 1)}M`);
  setElText('rfMetricUnrestrictedDay1', `${sym}${formatRawNumber(fund.unrestrictedCashDay1 * fx, 1)}M`);
  setElText('rfMetricYear5Cfo', `+${sym}${formatRawNumber(fund.year5OperatingCashCfo * fx, 1)}M`);

  // Scenario Table
  setElText('rfScenACash', `${sym}${formatRawNumber(fund.unrestrictedCashDay1 * fx, 1)}M`);
  const scenAGapEl = document.getElementById('rfScenAGap');
  if (scenAGapEl) {
    const val = fund.day1SurplusGap * fx;
    scenAGapEl.textContent = `${val >= 0 ? '+' : '-'}${sym}${formatRawNumber(Math.abs(val), 1)}M`;
    scenAGapEl.style.color = val >= 0 ? '#047857' : '#b91c1c';
  }

  setElText('rfScenBCash', `${sym}${formatRawNumber(fund.year4ClosingCash * fx, 1)}M`);
  const scenBSurpEl = document.getElementById('rfScenBSurplus');
  if (scenBSurpEl) {
    const val = fund.day1SurplusWithReserve * fx;
    scenBSurpEl.textContent = `${val >= 0 ? '+' : '-'}${sym}${formatRawNumber(Math.abs(val), 1)}M`;
    scenBSurpEl.style.color = val >= 0 ? '#047857' : '#b91c1c';
  }

  const grossMidCash = (fund.unrestrictedCashDay1 + (0.5 * fund.year5NetOperatingCash)) * fx;
  setElText('rfScenCCash', `${sym}${formatRawNumber(grossMidCash, 1)}M`);
  const scenCSurpEl = document.getElementById('rfScenCSurplus');
  if (scenCSurpEl) {
    const val = fund.midYearSurplus * fx;
    scenCSurpEl.textContent = `${val >= 0 ? '+' : '-'}${sym}${formatRawNumber(Math.abs(val), 1)}M`;
    scenCSurpEl.style.color = val >= 0 ? '#047857' : '#b91c1c';
  }

  const grossEndCash = (fund.year4ClosingCash + fund.year5OperatingCashCfo) * fx;
  setElText('rfScenEndCash', `${sym}${formatRawNumber(grossEndCash, 1)}M`);
  const scenEndSurpEl = document.getElementById('rfScenEndSurplus');
  if (scenEndSurpEl) {
    const val = fund.year5ClosingCash * fx;
    scenEndSurpEl.textContent = `+${sym}${formatRawNumber(val, 1)}M`;
    scenEndSurpEl.style.color = val >= 0 ? '#047857' : '#b91c1c';
  }
}

// Update Year 1 & Multi-Year P&L Table + Balance Sheet + Cash Flow + Unit Economics
function updatePnLTable(c) {
  const { sym, rate: fx } = getCurrencyInfo();

  const setElText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  // Render 3 Core Financial Statements & Refresh Assessment
  renderPnLStatement(c);
  renderBalanceSheetStatement(c);
  renderCashFlowStatement(c);
  renderYear5RefreshAssessment(c);

  // Unit Breakdown
  setElText('unitCashOpex', `${sym}${(c.cashOpexPerGpuHour * fx).toFixed(2)} / GPU-hr`);
  setElText('unitCashBreakeven', `${sym}${(c.cashEbitdaBreakevenPrice * fx).toFixed(2)} / GPU-hr`);
  setElText('unitFullCost', `${sym}${(c.fullCostPerGpuHour * fx).toFixed(2)} / GPU-hr`);
  setElText('unitServerMonthlyOpex', `${sym}${formatRawNumber(c.monthlyOpexPerServer * fx, 0)} / mo`);
  setElText('unitServerMonthlyFull', `${sym}${formatRawNumber(c.monthlyFullCostPerServer * fx, 0)} / mo`);
  setElText('unitServerHourEquivalent', `${sym}${(c.serverHourPrice * fx).toFixed(2)} / hr`);

  // Horizon-Adaptive Returns & Payback Panel
  const horizon = state.pnlHorizon || 10;
  const returnsPanelTitle = document.getElementById('returnsPanelTitle');
  if (returnsPanelTitle) {
    returnsPanelTitle.textContent = (horizon === 1)
      ? 'Year-1 Modeled Returns & Payback'
      : `${horizon}-Year Modeled Returns & Payback`;
  }

  const horizonMetric = c.tenYearModel.returnsByHorizon?.[horizon] || {
    projectIrr: c.tenYearModel.projectIrr,
    equityIrr: c.tenYearModel.equityIrr,
    npv: c.tenYearModel.npv,
    assetProjectIrr: c.tenYearModel.assetProjectIrr,
    assetEquityIrr: c.tenYearModel.assetEquityIrr,
    assetNpv: c.tenYearModel.assetNpv
  };

  const projectIrr = horizonMetric.projectIrr;
  const equityIrr = horizonMetric.equityIrr;
  const npv = horizonMetric.npv;

  const assetProjectIrr = horizonMetric.assetProjectIrr;
  const assetEquityIrr = horizonMetric.assetEquityIrr;
  const assetNpv = horizonMetric.assetNpv;
  const tvProceeds = c.tenYearModel.terminalResaleProceeds || 0;

  // Legacy element bindings for backwards compatibility
  setElText('metricProjectIrr', (projectIrr !== null && !isNaN(projectIrr)) ? `${projectIrr.toFixed(1)}%` : 'N/A');
  setElText('metricEquityIrr', (equityIrr !== null && !isNaN(equityIrr)) ? `${equityIrr.toFixed(1)}%` : 'N/A');
  if (npv !== null && !isNaN(npv)) {
    const formattedNpv = formatCurrency(npv);
    setElText('metricNpv', npv >= 0 ? `+${formattedNpv}` : formattedNpv);
  } else {
    setElText('metricNpv', 'N/A');
  }

  // Method 1: Cash-Only Return Elements
  setElText('metricProjectIrrCash', (projectIrr !== null && !isNaN(projectIrr)) ? `${projectIrr.toFixed(1)}%` : 'N/A');
  setElText('metricEquityIrrCash', (equityIrr !== null && !isNaN(equityIrr)) ? `${equityIrr.toFixed(1)}%` : 'N/A');
  if (npv !== null && !isNaN(npv)) {
    const formattedNpv = formatCurrency(npv);
    setElText('metricNpvCash', npv >= 0 ? `+${formattedNpv}` : formattedNpv);
  } else {
    setElText('metricNpvCash', 'N/A');
  }

  // Method 2: Asset-Inclusive Return Elements
  if (horizon === 10 && assetProjectIrr !== null && !isNaN(assetProjectIrr)) {
    setElText('metricProjectIrrAsset', `${assetProjectIrr.toFixed(1)}%`);
    setElText('metricEquityIrrAsset', (assetEquityIrr !== null && !isNaN(assetEquityIrr)) ? `${assetEquityIrr.toFixed(1)}%` : 'N/A');
    if (assetNpv !== null && !isNaN(assetNpv)) {
      const formattedAssetNpv = formatCurrency(assetNpv);
      setElText('metricNpvAsset', assetNpv >= 0 ? `+${formattedAssetNpv}` : formattedAssetNpv);
    } else {
      setElText('metricNpvAsset', 'N/A');
    }
  } else {
    setElText('metricProjectIrrAsset', 'N/A (Yr 10 only)');
    setElText('metricEquityIrrAsset', 'N/A (Yr 10 only)');
    setElText('metricNpvAsset', 'N/A (Yr 10 only)');
  }

  const labelNpvHurdle = document.getElementById('labelNpvHurdle');
  if (labelNpvHurdle) {
    labelNpvHurdle.textContent = `NPV @ ${state.params.discountRate.toFixed(1)}% (${horizon === 1 ? '1-Yr' : horizon + '-Yr'})`;
  }

  // Synchronize Tab Context Banner Pill
  const ctxReturnsIrr = document.getElementById('ctxReturnsIrr');
  if (ctxReturnsIrr) {
    if (horizon === 10 && assetProjectIrr !== null && tvProceeds > 0) {
      ctxReturnsIrr.textContent = `${projectIrr.toFixed(1)}% (Cash) | ${assetProjectIrr.toFixed(1)}% (Asset)`;
    } else {
      ctxReturnsIrr.textContent = (projectIrr !== null && !isNaN(projectIrr)) ? `${projectIrr.toFixed(1)}%` : 'N/A';
    }
  }

  const pInitial = c.tenYearModel.initialPaybackYear;
  setElText('metricPaybackInitial', (typeof pInitial === 'number' && !isNaN(pInitial)) ? `${pInitial.toFixed(1)} years` : '> 10 years');

  const pSustained = c.tenYearModel.sustainedPaybackYear;
  setElText('metricPaybackSustained', (typeof pSustained === 'number' && !isNaN(pSustained)) ? `${pSustained.toFixed(1)} years` : '> 10 years');

  const updateDiscountInput = (id) => {
    const el = document.getElementById(id);
    if (el && document.activeElement !== el) {
      el.value = state.params.discountRate.toFixed(1);
    }
  };
  updateDiscountInput('inputDiscountRate');
  updateDiscountInput('inputDiscountRateTab4');

  const updateResaleInput = (id) => {
    const el = document.getElementById(id);
    if (el && document.activeElement !== el) {
      el.value = (state.params.terminalResaleProceeds || 0).toString();
    }
  };
  updateResaleInput('inputTerminalResale');
  updateResaleInput('sliderTerminalResale');
  updateResaleInput('inputTerminalResaleTab4');
}

// Sensitivity Heatmap Matrix: Price vs Utilization
function updateSensitivityTable(calc) {
  const container = document.getElementById('sensitivityTableBody');
  if (!container) return;

  const { sym, rate: fx, code } = getCurrencyInfo();

  // Dynamic header currency units and corner label
  const matrixUnitLabel = document.getElementById('matrixUnitLabel');
  if (matrixUnitLabel) {
    matrixUnitLabel.textContent = `${code} millions`;
  }
  const matrixCornerTh = document.getElementById('matrixCornerTh');
  if (matrixCornerTh) {
    matrixCornerTh.textContent = `${sym.trim()}/h`;
  }

  // Dynamic legend thresholds formatted in current currency
  const legendHigh = document.getElementById('legendHigh');
  if (legendHigh) legendHigh.textContent = `Strong EBITDA (> ${sym}${Math.round(320 * fx)}M)`;
  const legendMid = document.getElementById('legendMid');
  if (legendMid) legendMid.textContent = `Target EBITDA (${sym}${Math.round(250 * fx)}M - ${sym}${Math.round(320 * fx)}M)`;
  const legendLow = document.getElementById('legendLow');
  if (legendLow) legendLow.textContent = `Marginal EBITDA (${sym}${Math.round(150 * fx)}M - ${sym}${Math.round(250 * fx)}M)`;
  const legendNeg = document.getElementById('legendNeg');
  if (legendNeg) legendNeg.textContent = `Weak / Below Screen (< ${sym}${Math.round(150 * fx)}M)`;

  const prices = [4.25, 5.00, 5.75, 6.50, 7.25, 8.00, 8.50];
  const utilizations = [50, 60, 70, 80, 90, 95];
  const totalGpus = state.params.numServers * state.params.gpusPerServer;
  const hoursPerYear = 8760;

  let html = '';
  prices.forEach(price => {
    const formattedPrice = (price * fx).toFixed(2);
    html += `<tr><td class="matrix-price-td font-mono font-bold">${formattedPrice}</td>`;
    utilizations.forEach(util => {
      const gpuHours = totalGpus * hoursPerYear * (util / 100);
      const revM = (gpuHours * price) / 1_000_000;
      const opexM = calc.annualColoRentM + calc.annualElecTotalM + calc.fixedOpexM + (revM * (state.params.salesMktgPct / 100));
      const ebitdaM = revM - opexM;

      let heatClass = 'negative';
      if (ebitdaM > 320) heatClass = 'positive-high';
      else if (ebitdaM > 250) heatClass = 'positive-mid';
      else if (ebitdaM > 150) heatClass = 'positive-low';

      const isBase = (Math.abs(price - state.params.gpuPricePerHour) < 0.1 && util === state.params.utilizationPct);
      const highlight = isBase ? 'base-highlight' : '';

      const ebitdaVal = Math.round(ebitdaM * fx);
      const revVal = Math.round(revM * fx);

      html += `<td class="cell-heat ${heatClass} ${highlight}" title="Price: ${sym}${formattedPrice}/h, Util: ${util}% | EBITDA: ${sym}${ebitdaVal}M, Revenue: ${sym}${revVal}M">
        <div class="matrix-ebitda">${ebitdaVal}</div>
        <div class="matrix-rev">${revVal}</div>
      </td>`;
    });
    html += `</tr>`;
  });

  container.innerHTML = html;
}

// Render or Update Chart.js Visualizations
function updateCharts(calc) {
  // 1. CAPEX Donut Chart
  const capexCanvas = document.getElementById('capexChart');
  if (capexCanvas && typeof Chart !== 'undefined') {
    const dataVals = [
      calc.landedServerCostM,
      state.params.networkStorageCapex,
      state.params.racksCoolingCapex,
      state.params.coloDeposit + state.params.liquidityReserve
    ];
    const labels = ['B300 Servers (1,024)', '800G Fabric & Storage', 'Racks & DLC Cooling', 'Deposit & Reserve'];

    if (capexChartInstance) {
      capexChartInstance.data.datasets[0].data = dataVals;
      capexChartInstance.update();
    } else {
      capexChartInstance = new Chart(capexCanvas, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: dataVals,
            backgroundColor: ['#2563eb', '#0d9488', '#7c3aed', '#f59e0b'],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.raw, 1)} (${((ctx.raw / calc.totalUpfrontM) * 100).toFixed(1)}%)`
              }
            }
          },
          cutout: '65%'
        }
      });
    }
  }

  // 2. OPEX Donut Chart
  const opexCanvas = document.getElementById('opexChart');
  if (opexCanvas && typeof Chart !== 'undefined') {
    const opexVals = [
      calc.annualColoRentM,
      calc.annualElecTotalM,
      state.params.hwMaint + state.params.swLicenses,
      state.params.opsEng + state.params.custSupport + state.params.remoteHands + state.params.corpStaff,
      calc.salesMktgM + state.params.insurance + state.params.cyberSecurity + state.params.legalCompliance + state.params.adminAudit
    ];
    const opexLabels = ['Colocation Rent', 'Power & Demand', 'HW/SW Support', 'Ops & Engineering Staff', 'SG&A, Sales & Insurance'];

    if (opexChartInstance) {
      opexChartInstance.data.datasets[0].data = opexVals;
      opexChartInstance.update();
    } else {
      opexChartInstance = new Chart(opexCanvas, {
        type: 'doughnut',
        data: {
          labels: opexLabels,
          datasets: [{
            data: opexVals,
            backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.raw, 1)} (${((ctx.raw / calc.totalYear1OpexM) * 100).toFixed(1)}%)`
              }
            }
          },
          cutout: '65%'
        }
      });
    }
  }

  // 3. 10-Year Cash Flow Projection Chart
  const cashflowCanvas = document.getElementById('cashflowChart');
  if (cashflowCanvas && typeof Chart !== 'undefined') {
    const horizon = state.pnlHorizon || 10;
    const filteredData = calc.tenYearModel.yearlyData.slice(0, horizon);
    const years = filteredData.map(d => `Yr ${d.year}`);
    const fcf = filteredData.map(d => d.projectFcf);
    const cumCash = filteredData.map(d => d.cumulativeProjectCash);

    // Custom Chart.js Plugin: Renders the Annual Free Cash Flow numerical value on top of each blue bar
    const barValueLabelsPlugin = {
      id: 'barValueLabelsPlugin',
      afterDatasetsDraw(chart) {
        const { ctx } = chart;
        const meta = chart.getDatasetMeta(0); // dataset 0 is Annual Free Cash Flow (blue bars)
        if (!meta || meta.hidden) return;

        ctx.save();
        const isNarrow = chart.width < 560;
        ctx.font = isNarrow
          ? '600 9px system-ui, -apple-system, sans-serif'
          : 'bold 11px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';

        meta.data.forEach((bar, index) => {
          const val = chart.data.datasets[0].data[index];
          if (val === undefined || val === null) return;

          const formattedVal = isNarrow ? formatCurrency(val, 0) : formatCurrency(val, 1);

          if (val >= 0) {
            ctx.fillStyle = '#1d4ed8'; // Crisp corporate blue
            ctx.textBaseline = 'bottom';
            ctx.fillText(formattedVal, bar.x, bar.y - 4);
          } else {
            ctx.fillStyle = '#b91c1c'; // Red for negative cash flow
            ctx.textBaseline = 'top';
            ctx.fillText(formattedVal, bar.x, bar.y + 4);
          }
        });
        ctx.restore();
      }
    };

    if (cashflowChartInstance) {
      // Verify if existing instance has our bar labels plugin registered
      const hasPlugin = cashflowChartInstance.config.plugins?.some(p => p.id === 'barValueLabelsPlugin');
      if (!hasPlugin) {
        cashflowChartInstance.destroy();
        cashflowChartInstance = null;
      }
    }

    if (cashflowChartInstance) {
      cashflowChartInstance.data.labels = years;
      cashflowChartInstance.data.datasets[0].data = fcf;
      cashflowChartInstance.data.datasets[1].data = cumCash;
      cashflowChartInstance.update();
    } else {
      cashflowChartInstance = new Chart(cashflowCanvas, {
        type: 'bar',
        data: {
          labels: years,
          datasets: [
            {
              type: 'bar',
              label: 'Annual Free Cash Flow',
              data: fcf,
              backgroundColor: '#3b82f6',
              borderRadius: 4
            },
            {
              type: 'line',
              label: 'Cumulative Cash Flow',
              data: cumCash,
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              borderWidth: 3,
              fill: false,
              tension: 0.2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: {
            padding: { top: 24, bottom: 8, left: 6, right: 6 }
          },
          scales: {
            y: {
              grace: '15%',
              grid: { color: 'rgba(0,0,0,0.05)' },
              ticks: { callback: (val) => formatCurrency(val, 0) }
            }
          },
          plugins: {
            legend: { position: 'top' },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw, 1)}`
              }
            }
          }
        },
        plugins: [barValueLabelsPlugin]
      });
    }
  }
}

// Bind Sliders and Inputs Synchronously
function setupEventListeners() {
  // Sync slider and input pairs (supports optional slider)
  const bindPair = (inputId, sliderId, paramKey, parser = parseFloat) => {
    const numInput = document.getElementById(inputId);
    const sliderInput = sliderId ? document.getElementById(sliderId) : null;

    if (!numInput) return;

    numInput.value = state.params[paramKey];
    if (sliderInput) sliderInput.value = state.params[paramKey];

    const onChange = (val) => {
      const parsed = parser(val);
      if (!isNaN(parsed)) {
        state.params[paramKey] = parsed;
        if (document.activeElement !== numInput) numInput.value = parsed;
        if (sliderInput && document.activeElement !== sliderInput) sliderInput.value = parsed;
        setCustomScenario();
        syncAllInputsWithState();
        renderApp();
      }
    };

    numInput.addEventListener('input', (e) => onChange(e.target.value));
    if (sliderInput) sliderInput.addEventListener('input', (e) => onChange(e.target.value));
  };

  // Bind core inputs
  bindPair('inputServers', 'sliderServers', 'numServers', parseInt);
  bindPair('inputServerPrice', 'sliderServerPrice', 'serverPrice', parseFloat);
  bindPair('inputGpuPrice', 'sliderGpuPrice', 'gpuPricePerHour', parseFloat);
  bindPair('inputUtil', 'sliderUtil', 'utilizationPct', parseFloat);
  bindPair('inputPriceErosion', 'sliderPriceErosion', 'annualPriceErosion', parseFloat);
  bindPair('inputTerminalResale', 'sliderTerminalResale', 'terminalResaleProceeds', parseFloat);
  bindPair('inputPue', 'sliderPue', 'pue', parseFloat);
  bindPair('inputColoRate', 'sliderColoRate', 'coloRatePerKwMo', parseFloat);
  bindPair('inputReservedMw', 'sliderReservedMw', 'reservedItMw', parseFloat);
  bindPair('inputServerAvgKw', 'sliderServerAvgKw', 'serverAvgKw', parseFloat);
  bindPair('inputElecRate', 'sliderElecRate', 'elecRatePerKwh', parseFloat);
  bindPair('inputDemandRate', 'sliderDemandRate', 'demandRatePerKwMo', parseFloat);

  // Bind Detailed inputs
  const bindDirect = (inputId, paramKey, parser = parseFloat) => {
    const el = document.getElementById(inputId);
    if (!el) return;
    el.value = state.params[paramKey];
    el.addEventListener('input', (e) => {
      const val = parser(e.target.value);
      if (!isNaN(val)) {
        state.params[paramKey] = val;
        setCustomScenario();
        syncAllInputsWithState();
        renderApp();
      }
    });
  };

  bindDirect('inputColoRateOpex', 'coloRatePerKwMo');
  bindDirect('inputPueOpex', 'pue');
  bindDirect('inputNetStorageCapex', 'networkStorageCapex');
  bindDirect('inputRacksCoolingCapex', 'racksCoolingCapex');
  bindDirect('inputColoDeposit', 'coloDeposit');
  bindDirect('inputLiquidityReserve', 'liquidityReserve');
  bindDirect('inputCustomerPrepay', 'customerPrepay');
  bindDirect('inputDebtPct', 'debtPct');
  bindDirect('inputDebtRate', 'debtRate');
  bindDirect('inputHwMaint', 'hwMaint');
  bindDirect('inputSwLicenses', 'swLicenses');
  bindDirect('inputOpsEng', 'opsEng');
  bindDirect('inputInternetWan', 'internetWan');
  bindDirect('inputCustSupport', 'custSupport');
  bindDirect('inputRemoteHands', 'remoteHands');
  bindDirect('inputCorpStaff', 'corpStaff');
  bindDirect('inputInsurance', 'insurance');
  bindDirect('inputCyberSecurity', 'cyberSecurity');
  bindDirect('inputLegalCompliance', 'legalCompliance');
  bindDirect('inputAdminAudit', 'adminAudit');

  // 800G Fabric & Auxiliary Infrastructure Breakdown inputs
  bindDirect('inputFabricSwitches', 'fabricSwitchesCapex');
  bindDirect('inputOpticsFiber', 'opticsFiberCapex');
  bindDirect('inputMgmtEth', 'mgmtEthCapex');
  bindDirect('inputFabricSw', 'fabricSwCapex');
  bindDirect('inputStorage', 'storageCapex');
  bindDirect('inputMgmtNodes', 'mgmtNodesCapex');
  bindDirect('inputCyberApp', 'cyberAppCapex');
  bindDirect('inputIntegration', 'integrationCapex');
  bindDirect('inputSparesPool', 'sparesPoolCapex');

  // Racks & Liquid Cooling Breakdown inputs
  bindDirect('inputComputeRacks', 'computeRacksCapex');
  bindDirect('inputNetStorageRacks', 'netStorageRacksCapex');
  bindDirect('inputCduSystems', 'cduSystemsCapex');
  bindDirect('inputManifolds', 'manifoldsCapex');
  bindDirect('inputLeakDetection', 'leakDetectionCapex');
  bindDirect('inputLoopCommissioning', 'loopCommissioningCapex');

  // Power & Engineering Load Model inputs
  bindDirect('inputMaxServerKw', 'maxServerKw');
  bindDirect('inputNetStorageAvgKw', 'netStorageAvgKw');
  bindDirect('inputNetStorageMaxMw', 'netStorageMaxMw');

  // Load Model Table inputs linked to existing sliders
  const inputServerAvgKwTable = document.getElementById('inputServerAvgKwTable');
  if (inputServerAvgKwTable) {
    inputServerAvgKwTable.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        state.params.serverAvgKw = val;
        const mainInput = document.getElementById('inputServerAvgKw');
        const mainSlider = document.getElementById('sliderServerAvgKw');
        if (mainInput && document.activeElement !== mainInput) mainInput.value = val;
        if (mainSlider && document.activeElement !== mainSlider) mainSlider.value = val;
        setCustomScenario();
        syncAllInputsWithState();
        renderApp();
      }
    });
  }

  const inputReservedMwTable = document.getElementById('inputReservedMwTable');
  if (inputReservedMwTable) {
    inputReservedMwTable.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        state.params.reservedItMw = val;
        const mainInput = document.getElementById('inputReservedMw');
        const mainSlider = document.getElementById('sliderReservedMw');
        if (mainInput && document.activeElement !== mainInput) mainInput.value = val;
        if (mainSlider && document.activeElement !== mainSlider) mainSlider.value = val;
        setCustomScenario();
        syncAllInputsWithState();
        renderApp();
      }
    });
  }

  // Discount / Hurdle Rate inputs (Tab 2 and Tab 4)
  const bindDiscountRate = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val > 0) {
        state.params.discountRate = val;
        const otherId = id === 'inputDiscountRate' ? 'inputDiscountRateTab4' : 'inputDiscountRate';
        const otherEl = document.getElementById(otherId);
        if (otherEl && document.activeElement !== otherEl) otherEl.value = val;
        setCustomScenario();
        syncAllInputsWithState();
        renderApp();
      }
    });
  };
  bindDiscountRate('inputDiscountRate');
  bindDiscountRate('inputDiscountRateTab4');

  // Year-10 Terminal Resale Proceeds input (Tab 4)
  const inputTerminalResaleTab4 = document.getElementById('inputTerminalResaleTab4');
  if (inputTerminalResaleTab4) {
    inputTerminalResaleTab4.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val >= 0) {
        state.params.terminalResaleProceeds = val;
        const mainInput = document.getElementById('inputTerminalResale');
        const mainSlider = document.getElementById('sliderTerminalResale');
        if (mainInput && document.activeElement !== mainInput) mainInput.value = val;
        if (mainSlider && document.activeElement !== mainSlider) mainSlider.value = val;
        setCustomScenario();
        syncAllInputsWithState();
        renderApp();
      }
    });
  }

  // Quick Server Scale micro buttons
  document.querySelectorAll('[data-set-servers]').forEach(btn => {
    btn.addEventListener('click', () => {
      const count = parseInt(btn.getAttribute('data-set-servers'), 10);
      if (!isNaN(count)) {
        state.params.numServers = count;
        const input = document.getElementById('inputServers');
        const slider = document.getElementById('sliderServers');
        if (input) input.value = count;
        if (slider) slider.value = count;
        setCustomScenario();
        renderApp();
      }
    });
  });

  // Quick Server Price micro buttons
  document.querySelectorAll('[data-set-price]').forEach(btn => {
    btn.addEventListener('click', () => {
      const price = parseFloat(btn.getAttribute('data-set-price'));
      if (!isNaN(price)) {
        state.params.serverPrice = price;
        const input = document.getElementById('inputServerPrice');
        const slider = document.getElementById('sliderServerPrice');
        if (input) input.value = price;
        if (slider) slider.value = price;
        setCustomScenario();
        renderApp();
      }
    });
  });

  // Quick Compute Price micro buttons
  document.querySelectorAll('[data-set-gpuprice]').forEach(btn => {
    btn.addEventListener('click', () => {
      const price = parseFloat(btn.getAttribute('data-set-gpuprice'));
      if (!isNaN(price)) {
        state.params.gpuPricePerHour = price;
        const input = document.getElementById('inputGpuPrice');
        const slider = document.getElementById('sliderGpuPrice');
        if (input) input.value = price;
        if (slider) slider.value = price;
        setCustomScenario();
        renderApp();
      }
    });
  });

  // Desktop Scenario Chips
  document.querySelectorAll('.scenario-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const scenarioKey = chip.getAttribute('data-scenario');
      applyScenario(scenarioKey);
    });
  });

  // Mobile Scenario Selector Trigger & Dropdown
  const mobileTrigger = document.getElementById('mobileScenarioTrigger');
  const mobileDropdown = document.getElementById('mobileScenarioDropdown');
  const mobileHeader = document.getElementById('mobileScenarioHeader');
  const mobileHint = document.getElementById('mobileScenarioHint');

  const toggleMobileScenarioMenu = (forceState) => {
    if (!mobileDropdown || !mobileTrigger) return;
    const isCurrentlyOpen = mobileDropdown.style.display !== 'none';
    const willOpen = (typeof forceState === 'boolean') ? forceState : !isCurrentlyOpen;

    if (willOpen) {
      mobileDropdown.style.display = 'flex';
      mobileTrigger.classList.add('open');
      mobileTrigger.setAttribute('aria-expanded', 'true');
      if (mobileHint) mobileHint.textContent = 'Tap to close ▴';
    } else {
      mobileDropdown.style.display = 'none';
      mobileTrigger.classList.remove('open');
      mobileTrigger.setAttribute('aria-expanded', 'false');
      if (mobileHint) mobileHint.textContent = 'Tap to change ▾';
    }
  };

  if (mobileTrigger) {
    mobileTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMobileScenarioMenu();
    });
  }

  if (mobileHeader) {
    mobileHeader.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMobileScenarioMenu();
    });
  }

  // Mobile Dropdown Option Buttons
  document.querySelectorAll('.mobile-option-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const scenarioKey = btn.getAttribute('data-scenario-select');
      applyScenario(scenarioKey);
      // Immediately hide dropdown after selection ("选了之后把它藏起来")
      toggleMobileScenarioMenu(false);
    });
  });

  // Close mobile dropdown if clicking outside
  document.addEventListener('click', (e) => {
    if (mobileDropdown && mobileDropdown.style.display !== 'none') {
      if (!mobileDropdown.contains(e.target) && !mobileTrigger?.contains(e.target) && !mobileHeader?.contains(e.target)) {
        toggleMobileScenarioMenu(false);
      }
    }
  });

  // Tab Switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // Currency Segmented Control Buttons (header and Tab 1)
  document.querySelectorAll('[data-set-currency]').forEach(btn => {
    btn.addEventListener('click', () => {
      const cur = btn.getAttribute('data-set-currency');
      setCurrency(cur);
    });
  });

  // FX Settings Modal Open & Close
  const fxModal = document.getElementById('fxSettingsModal');
  const btnFxSettings = document.getElementById('btnFxSettings');
  const modalFxClose = document.getElementById('modalFxClose');
  const btnFxSaveApply = document.getElementById('btnFxSaveApply');
  const btnFxResetDefaults = document.getElementById('btnFxResetDefaults');

  if (btnFxSettings && fxModal) {
    btnFxSettings.addEventListener('click', () => {
      syncFxInputs();
      updateCurrencyUI();
      fxModal.showModal();
    });
  }

  const btnMobileCurrency = document.getElementById('btnMobileCurrency');
  if (btnMobileCurrency && fxModal) {
    btnMobileCurrency.addEventListener('click', () => {
      syncFxInputs();
      updateCurrencyUI();
      fxModal.showModal();
    });
  }

  if (modalFxClose && fxModal) {
    modalFxClose.addEventListener('click', () => fxModal.close());
  }

  if (btnFxSaveApply && fxModal) {
    btnFxSaveApply.addEventListener('click', () => {
      fxModal.close();
      renderApp();
    });
  }

  // Backdrop click to close dialog
  if (fxModal) {
    fxModal.addEventListener('click', (e) => {
      if (e.target === fxModal) fxModal.close();
    });
  }

  // Modal Currency Radio buttons
  document.querySelectorAll('input[name="modalCurrencyRadio"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      setCurrency(e.target.value);
    });
  });

  // Reset Default FX Rates (4.25 MYR / 1.35 SGD)
  if (btnFxResetDefaults) {
    btnFxResetDefaults.addEventListener('click', () => {
      state.fxRates.SGD = 1.35;
      state.fxRates.MYR = 4.25;
      try {
        localStorage.setItem('dc_fx_rates', JSON.stringify({ SGD: 1.35, MYR: 4.25 }));
      } catch (e) {}
      syncFxInputs();
      renderApp();
    });
  }

  // Bind FX Rate inputs (Tab 1 and Modal)
  const bindFxRateInput = (id, curKey) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val > 0) {
        state.fxRates[curKey] = val;
        try {
          localStorage.setItem('dc_fx_rates', JSON.stringify({
            SGD: state.fxRates.SGD,
            MYR: state.fxRates.MYR
          }));
        } catch (err) {}
        syncFxInputs();
        renderApp();
      }
    });
  };

  bindFxRateInput('inputFxRateSgd', 'SGD');
  bindFxRateInput('inputFxRateMyr', 'MYR');
  bindFxRateInput('modalRateSgd', 'SGD');
  bindFxRateInput('modalRateMyr', 'MYR');

  // Dark Mode Toggle
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const target = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', target);
      localStorage.setItem('dc_theme', target);
    });
  }

  // Auto-hiding sticky header on scroll down, smooth fade-in on scroll up
  const appHeader = document.querySelector('.top-app-bar');
  if (appHeader) {
    let lastScrollY = window.scrollY;
    let isScrollTicking = false;

    window.addEventListener('scroll', () => {
      if (!isScrollTicking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          // When near the top, always keep header visible
          if (currentScrollY <= 20) {
            appHeader.classList.remove('header-hidden');
          } else {
            const scrollDiff = currentScrollY - lastScrollY;
            // Scroll down threshold of 6px to avoid micro-jitter
            if (scrollDiff > 6 && currentScrollY > 70) {
              appHeader.classList.add('header-hidden');
            } else if (scrollDiff < -6) {
              // Scrolling up reveals header
              appHeader.classList.remove('header-hidden');
            }
          }
          lastScrollY = Math.max(0, currentScrollY);
          isScrollTicking = false;
        });
        isScrollTicking = true;
      }
    }, { passive: true });
  }

  // 800G Fabric & Storage breakdown accordion toggle
  const rowNetStorage = document.getElementById('rowNetStorage');
  const rowNetStorageBreakdown = document.getElementById('rowNetStorageBreakdown');
  const badgeNetStorageToggle = document.getElementById('badgeNetStorageToggle');

  if (rowNetStorage && rowNetStorageBreakdown) {
    rowNetStorage.addEventListener('click', () => {
      const isExpanded = rowNetStorageBreakdown.style.display !== 'none';
      rowNetStorageBreakdown.style.display = isExpanded ? 'none' : 'table-row';
      rowNetStorage.classList.toggle('expanded', !isExpanded);
      if (badgeNetStorageToggle) {
        badgeNetStorageToggle.classList.toggle('active', !isExpanded);
        const icon = badgeNetStorageToggle.querySelector('.chevron-icon');
        if (icon) {
          icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
        }
      }
    });

    rowNetStorageBreakdown.addEventListener('click', (e) => {
      // Prevent accordion collapse when clicking inside the breakdown sub-table or inputs
      e.stopPropagation();
    });
  }

  // Reset 800G fabric breakdown items to benchmark defaults
  const btnResetFabricBreakdown = document.getElementById('btnResetFabricBreakdown');
  if (btnResetFabricBreakdown) {
    btnResetFabricBreakdown.addEventListener('click', (e) => {
      e.stopPropagation();
      state.params.fabricSwitchesCapex = BASE_DEFAULTS.fabricSwitchesCapex;
      state.params.opticsFiberCapex = BASE_DEFAULTS.opticsFiberCapex;
      state.params.mgmtEthCapex = BASE_DEFAULTS.mgmtEthCapex;
      state.params.fabricSwCapex = BASE_DEFAULTS.fabricSwCapex;
      state.params.storageCapex = BASE_DEFAULTS.storageCapex;
      state.params.mgmtNodesCapex = BASE_DEFAULTS.mgmtNodesCapex;
      state.params.cyberAppCapex = BASE_DEFAULTS.cyberAppCapex;
      state.params.integrationCapex = BASE_DEFAULTS.integrationCapex;
      state.params.sparesPoolCapex = BASE_DEFAULTS.sparesPoolCapex;
      state.params.networkStorageCapex = BASE_DEFAULTS.networkStorageCapex;

      setCustomScenario();
      syncAllInputsWithState();
      renderApp();
    });
  }

  // Racks & Liquid Cooling breakdown accordion toggle
  const rowRacksCooling = document.getElementById('rowRacksCooling');
  const rowRacksCoolingBreakdown = document.getElementById('rowRacksCoolingBreakdown');
  const badgeRacksCoolingToggle = document.getElementById('badgeRacksCoolingToggle');

  if (rowRacksCooling && rowRacksCoolingBreakdown) {
    rowRacksCooling.addEventListener('click', () => {
      const isExpanded = rowRacksCoolingBreakdown.style.display !== 'none';
      rowRacksCoolingBreakdown.style.display = isExpanded ? 'none' : 'table-row';
      rowRacksCooling.classList.toggle('expanded', !isExpanded);
      if (badgeRacksCoolingToggle) {
        badgeRacksCoolingToggle.classList.toggle('active', !isExpanded);
        const icon = badgeRacksCoolingToggle.querySelector('.chevron-icon');
        if (icon) {
          icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
        }
      }
    });

    rowRacksCoolingBreakdown.addEventListener('click', (e) => {
      // Prevent accordion collapse when clicking inside the breakdown sub-table or inputs
      e.stopPropagation();
    });
  }

  // Reset Racks breakdown items to benchmark defaults
  const btnResetRacksBreakdown = document.getElementById('btnResetRacksBreakdown');
  if (btnResetRacksBreakdown) {
    btnResetRacksBreakdown.addEventListener('click', (e) => {
      e.stopPropagation();
      state.params.computeRacksCapex = BASE_DEFAULTS.computeRacksCapex;
      state.params.netStorageRacksCapex = BASE_DEFAULTS.netStorageRacksCapex;
      state.params.cduSystemsCapex = BASE_DEFAULTS.cduSystemsCapex;
      state.params.manifoldsCapex = BASE_DEFAULTS.manifoldsCapex;
      state.params.leakDetectionCapex = BASE_DEFAULTS.leakDetectionCapex;
      state.params.loopCommissioningCapex = BASE_DEFAULTS.loopCommissioningCapex;
      state.params.racksCoolingCapex = BASE_DEFAULTS.racksCoolingCapex;

      setCustomScenario();
      syncAllInputsWithState();
      renderApp();
    });
  }

  // Reset Power Model items to benchmark defaults
  const btnResetPowerModel = document.getElementById('btnResetPowerModel');
  if (btnResetPowerModel) {
    btnResetPowerModel.addEventListener('click', (e) => {
      e.stopPropagation();
      state.params.maxServerKw = BASE_DEFAULTS.maxServerKw;
      state.params.serverAvgKw = BASE_DEFAULTS.serverAvgKw;
      state.params.netStorageAvgKw = BASE_DEFAULTS.netStorageAvgKw;
      state.params.netStorageMaxMw = BASE_DEFAULTS.netStorageMaxMw;
      state.params.reservedItMw = BASE_DEFAULTS.reservedItMw;
      state.params.pue = BASE_DEFAULTS.pue;

      setCustomScenario();
      syncAllInputsWithState();
      renderApp();
    });
  }

  // Colocation & Power Load Model accordion toggle in OPEX table
  const rowColoPowerSubtotal = document.getElementById('rowColoPowerSubtotal');
  const rowColoPowerBreakdown = document.getElementById('rowColoPowerBreakdown');
  const badgeColoPowerToggle = document.getElementById('badgeColoPowerToggle');

  if (rowColoPowerSubtotal && rowColoPowerBreakdown) {
    rowColoPowerSubtotal.addEventListener('click', () => {
      const isExpanded = rowColoPowerBreakdown.style.display !== 'none';
      rowColoPowerBreakdown.style.display = isExpanded ? 'none' : 'table-row';
      rowColoPowerSubtotal.classList.toggle('expanded', !isExpanded);
      if (badgeColoPowerToggle) {
        badgeColoPowerToggle.classList.toggle('active', !isExpanded);
        const icon = badgeColoPowerToggle.querySelector('.chevron-icon');
        if (icon) {
          icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
        }
      }
    });

    rowColoPowerBreakdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  // Reset to Base
  const btnReset = document.getElementById('btnReset');
  if (btnReset) {
    btnReset.addEventListener('click', () => applyScenario('base'));
  }

  // Dismiss feedback banner
  const feedbackClose = document.getElementById('feedbackClose');
  if (feedbackClose) {
    feedbackClose.addEventListener('click', () => {
      const banner = document.getElementById('scenarioFeedback');
      if (banner) banner.style.display = 'none';
    });
  }

  // P&L Horizon Filter Buttons (1, 3, 5, 10 Years)
  document.querySelectorAll('.pnl-horizon-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const horizon = parseInt(btn.getAttribute('data-horizon'), 10);
      state.pnlHorizon = horizon;
      document.querySelectorAll('.pnl-horizon-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const modeGroup = document.getElementById('pnlModeGroup');
      if (modeGroup) {
        modeGroup.style.display = (horizon === 1) ? 'none' : 'flex';
      }

      renderApp();
    });
  });

  // P&L View Mode Buttons (Year-by-Year Columns vs Cumulative Summary)
  document.querySelectorAll('.pnl-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode');
      state.pnlViewMode = mode;
      document.querySelectorAll('.pnl-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      renderApp();
    });
  });
}

function switchTab(tabId) {
  state.activeTab = tabId;

  // Set active tab attribute on container for responsive layout rules
  const appContainer = document.getElementById('appContainer') || document.querySelector('.app-container');
  if (appContainer) {
    appContainer.setAttribute('data-active-tab', tabId);
  }

  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(b => {
    const isActive = b.getAttribute('data-tab') === tabId;
    b.classList.toggle('active', isActive);
    if (isActive) {
      // Auto-center the active tab button in scroll view
      try {
        b.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      } catch (e) {}
    }
  });

  // Toggle tab contents
  document.querySelectorAll('.tab-content').forEach(c => {
    c.classList.toggle('active', c.id === `tab-${tabId}`);
  });

  // Smooth scroll container to top if scrolled past
  const tabNav = document.querySelector('.tabs-nav-container');
  if (tabNav) {
    const navRect = tabNav.getBoundingClientRect();
    if (navRect.top < 65) {
      tabNav.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Re-render charts on tab switch if needed
  if (tabId === 'summary' || tabId === 'returns') {
    setTimeout(() => {
      const calc = calculateFinancials();
      updateCharts(calc);
    }, 50);
  }
}

function updateTabContextBanners(calc) {
  const { sym, rate: fx } = getCurrencyInfo();
  const p = state.params;

  // Tab 2 (CAPEX)
  const ctxCapexTotal = document.getElementById('ctxCapexTotal');
  if (ctxCapexTotal) {
    ctxCapexTotal.textContent = calc.effectivePrepayM > 0
      ? `${formatCurrency(calc.totalUpfrontM)} (Net: ${formatCurrency(calc.netRequiredM)})`
      : formatCurrency(calc.totalUpfrontM);
  }
  const ctxCapexServers = document.getElementById('ctxCapexServers');
  if (ctxCapexServers) ctxCapexServers.textContent = formatCurrency(calc.landedServerCostM);
  const ctxCapexCooling = document.getElementById('ctxCapexCooling');
  if (ctxCapexCooling) ctxCapexCooling.textContent = formatCurrency(calc.racksCoolingM || 22.0);

  // Tab 3 (OPEX & Power)
  const ctxOpexTotal = document.getElementById('ctxOpexTotal');
  if (ctxOpexTotal) ctxOpexTotal.textContent = `${formatCurrency(calc.totalYear1OpexM)}/yr`;
  const ctxOpexLoad = document.getElementById('ctxOpexLoad');
  if (ctxOpexLoad) ctxOpexLoad.textContent = `~${calc.totalAvgItLoadMw.toFixed(2)} MW IT`;
  const ctxOpexReserved = document.getElementById('ctxOpexReserved');
  if (ctxOpexReserved) ctxOpexReserved.textContent = `${p.reservedCapacityMw.toFixed(1)} MW Sub`;

  // Tab 4 (P&L & Returns)
  const ctxReturnsEbitda = document.getElementById('ctxReturnsEbitda');
  if (ctxReturnsEbitda) ctxReturnsEbitda.textContent = formatCurrency(calc.ebitdaM);
  const ctxReturnsMargin = document.getElementById('ctxReturnsMargin');
  if (ctxReturnsMargin) ctxReturnsMargin.textContent = `${calc.ebitdaMargin.toFixed(1)}% margin`;
  const ctxReturnsIrr = document.getElementById('ctxReturnsIrr');
  if (ctxReturnsIrr) {
    ctxReturnsIrr.textContent = calc.tenYearModel.projectIrr !== null ? `${calc.tenYearModel.projectIrr.toFixed(1)}%` : 'N/A';
  }

  // Tab 5 (Sensitivity)
  const ctxSensBreakeven = document.getElementById('ctxSensBreakeven');
  if (ctxSensBreakeven) ctxSensBreakeven.textContent = `${sym}${(calc.fullCostPerGpuHour * fx).toFixed(2)}/h`;
  const ctxSensPrice = document.getElementById('ctxSensPrice');
  if (ctxSensPrice) ctxSensPrice.textContent = `${sym}${(p.gpuPricePerHour * fx).toFixed(2)}/h`;
  const ctxSensUtil = document.getElementById('ctxSensUtil');
  if (ctxSensUtil) ctxSensUtil.textContent = `${p.utilizationPct}% Util`;
}

function applyScenario(key) {
  if (key === 'custom') {
    state.currentScenario = 'custom';
    if (!state.customParams) {
      // First time entering custom mode: start from a clean copy of current params
      state.customParams = { ...state.params };
    } else {
      // Restore previously entered custom edits
      state.params = { ...state.customParams };
    }
    try {
      localStorage.setItem('dc_custom_params', JSON.stringify(state.customParams));
      localStorage.setItem('dc_current_scenario', 'custom');
    } catch (e) {}

    syncAllInputsWithState();
    updateScenarioChipStyles();
    updateCustomChipLabel();

    // Ensure user is on summary tab to see the drivers
    if (state.activeTab !== 'summary') {
      switchTab('summary');
    }

    showScenarioFeedback('custom');
    renderApp();
    highlightInputs();
    return;
  }

  const preset = PRESETS[key];
  if (!preset) return;

  state.currentScenario = key;
  // Overwrite state.params completely with the selected preset (clean reset!)
  state.params = { ...preset };
  try {
    localStorage.setItem('dc_current_scenario', key);
  } catch (e) {}

  syncAllInputsWithState();
  updateScenarioChipStyles();
  updateCustomChipLabel();

  showScenarioFeedback(key);
  renderApp();
}

function setCustomScenario() {
  state.currentScenario = 'custom';
  state.customParams = { ...state.params };
  try {
    localStorage.setItem('dc_custom_params', JSON.stringify(state.customParams));
    localStorage.setItem('dc_current_scenario', 'custom');
  } catch (e) {}

  updateScenarioChipStyles();
  updateCustomChipLabel();
  showScenarioFeedback('custom', false);
}

function updateScenarioChipStyles() {
  document.querySelectorAll('.scenario-chip').forEach(c => {
    c.classList.toggle('active', c.getAttribute('data-scenario') === state.currentScenario);
  });
  updateMobileScenarioUI();
}

function updateCustomChipLabel() {
  const label = document.getElementById('customChipLabel');
  if (label) {
    if (state.customParams) {
      const servers = formatRawNumber(state.customParams.numServers, 0);
      const priceK = Math.round(state.customParams.serverPrice / 1000);
      label.textContent = `Custom ($${priceK}k @ ${servers} servers)`;
    } else {
      label.textContent = 'Custom Values';
    }
  }
  updateMobileScenarioUI();
}

function updateMobileScenarioUI() {
  const meta = {
    severe: { label: 'Severe ($650k @ 1,024 servers)', color: '#dc2626' },
    bear: { label: 'Bear ($625k @ 1,024 servers)', color: '#d97706' },
    base: { label: 'Base ($550k @ 1,024 servers)', color: '#2563eb' },
    bull: { label: 'Bull ($475k @ 1,024 servers)', color: '#059669' },
    custom: {
      label: state.customParams
        ? `Custom ($${Math.round(state.customParams.serverPrice / 1000)}k @ ${formatRawNumber(state.customParams.numServers, 0)} servers)`
        : 'Custom Values',
      color: '#7c3aed'
    }
  };

  const current = meta[state.currentScenario] || meta.base;

  // 1. Update the single active trigger button
  const triggerText = document.getElementById('mobileTriggerText');
  const triggerDot = document.getElementById('mobileTriggerDot');
  if (triggerText) triggerText.textContent = current.label;
  if (triggerDot) triggerDot.style.backgroundColor = current.color;

  // 2. Update custom label in mobile dropdown list
  const mobileCustomLabel = document.getElementById('mobileCustomOptionLabel');
  if (mobileCustomLabel) {
    mobileCustomLabel.textContent = meta.custom.label;
  }

  // 3. Update active item in dropdown
  document.querySelectorAll('.mobile-option-item').forEach(btn => {
    const isSelected = btn.getAttribute('data-scenario-select') === state.currentScenario;
    btn.classList.toggle('active', isSelected);
  });
}

function updateQuickButtonsActive() {
  document.querySelectorAll('[data-set-servers]').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.getAttribute('data-set-servers'), 10) === state.params.numServers);
  });
  document.querySelectorAll('[data-set-price]').forEach(btn => {
    btn.classList.toggle('active', parseFloat(btn.getAttribute('data-set-price')) === state.params.serverPrice);
  });
  document.querySelectorAll('[data-set-gpuprice]').forEach(btn => {
    btn.classList.toggle('active', parseFloat(btn.getAttribute('data-set-gpuprice')) === state.params.gpuPricePerHour);
  });
}

function syncAllInputsWithState() {
  const p = state.params;
  const updatePair = (inputId, sliderId, val) => {
    const el1 = document.getElementById(inputId);
    const el2 = sliderId ? document.getElementById(sliderId) : null;
    if (el1 && document.activeElement !== el1) el1.value = val;
    if (el2 && document.activeElement !== el2) el2.value = val;
  };

  updatePair('inputServers', 'sliderServers', p.numServers);
  updatePair('inputServerPrice', 'sliderServerPrice', p.serverPrice);
  updatePair('inputGpuPrice', 'sliderGpuPrice', p.gpuPricePerHour);
  updatePair('inputUtil', 'sliderUtil', p.utilizationPct);
  updatePair('inputPriceErosion', 'sliderPriceErosion', p.annualPriceErosion);
  updatePair('inputTerminalResale', 'sliderTerminalResale', p.terminalResaleProceeds || 0);
  updatePair('inputPue', 'sliderPue', p.pue);
  updatePair('inputColoRate', 'sliderColoRate', p.coloRatePerKwMo);
  updatePair('inputReservedMw', 'sliderReservedMw', p.reservedItMw);
  updatePair('inputServerAvgKw', 'sliderServerAvgKw', p.serverAvgKw);
  updatePair('inputElecRate', 'sliderElecRate', p.elecRatePerKwh);
  updatePair('inputDemandRate', 'sliderDemandRate', p.demandRatePerKwMo);

  const updateVal = (id, val) => {
    const el = document.getElementById(id);
    if (el && document.activeElement !== el) el.value = val;
  };

  updateVal('inputColoRateOpex', p.coloRatePerKwMo);
  updateVal('inputPueOpex', p.pue);
  updateVal('inputNetStorageCapex', p.networkStorageCapex);
  updateVal('inputRacksCoolingCapex', p.racksCoolingCapex);
  updateVal('inputColoDeposit', p.coloDeposit);
  updateVal('inputLiquidityReserve', p.liquidityReserve);
  updateVal('inputCustomerPrepay', p.customerPrepay);
  updateVal('inputDebtPct', p.debtPct);
  updateVal('inputDebtRate', p.debtRate);
  updateVal('inputHwMaint', p.hwMaint);
  updateVal('inputSwLicenses', p.swLicenses);
  updateVal('inputOpsEng', p.opsEng);
  updateVal('inputInternetWan', p.internetWan);
  updateVal('inputCustSupport', p.custSupport);
  updateVal('inputRemoteHands', p.remoteHands);
  updateVal('inputCorpStaff', p.corpStaff);
  updateVal('inputInsurance', p.insurance);
  updateVal('inputCyberSecurity', p.cyberSecurity);
  updateVal('inputLegalCompliance', p.legalCompliance);
  updateVal('inputAdminAudit', p.adminAudit);

  // 800G Fabric Breakdown inputs
  updateVal('inputFabricSwitches', p.fabricSwitchesCapex);
  updateVal('inputOpticsFiber', p.opticsFiberCapex);
  updateVal('inputMgmtEth', p.mgmtEthCapex);
  updateVal('inputFabricSw', p.fabricSwCapex);
  updateVal('inputStorage', p.storageCapex);
  updateVal('inputMgmtNodes', p.mgmtNodesCapex);
  updateVal('inputCyberApp', p.cyberAppCapex);
  updateVal('inputIntegration', p.integrationCapex);
  updateVal('inputSparesPool', p.sparesPoolCapex);

  // Racks & Liquid Cooling Breakdown inputs
  updateVal('inputComputeRacks', p.computeRacksCapex);
  updateVal('inputNetStorageRacks', p.netStorageRacksCapex);
  updateVal('inputCduSystems', p.cduSystemsCapex);
  updateVal('inputManifolds', p.manifoldsCapex);
  updateVal('inputLeakDetection', p.leakDetectionCapex);
  updateVal('inputLoopCommissioning', p.loopCommissioningCapex);

  // Power & Engineering Load Model inputs
  updateVal('inputMaxServerKw', p.maxServerKw);
  updateVal('inputServerAvgKwTable', p.serverAvgKw);
  updateVal('inputNetStorageAvgKw', p.netStorageAvgKw);
  updateVal('inputNetStorageMaxMw', p.netStorageMaxMw);
  updateVal('inputReservedMwTable', p.reservedItMw);

  // Discount / Hurdle Rate inputs
  updateVal('inputDiscountRate', p.discountRate);
  updateVal('inputDiscountRateTab4', p.discountRate);

  // Terminal Resale inputs
  updateVal('inputTerminalResaleTab4', p.terminalResaleProceeds || 0);
}

function highlightInputs() {
  const card = document.getElementById('inputsCard');
  if (card) {
    card.classList.remove('input-highlight-pulse');
    void card.offsetWidth; // trigger reflow to restart animation
    card.classList.add('input-highlight-pulse');
    if (typeof card.scrollIntoView === 'function') {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Focus the first input field
    const firstInput = document.getElementById('inputServers');
    if (firstInput && typeof firstInput.focus === 'function') {
      firstInput.focus();
    }
  }
}

function showScenarioFeedback(key, shouldAutoShow = true) {
  const banner = document.getElementById('scenarioFeedback');
  const icon = document.getElementById('feedbackIcon');
  const text = document.getElementById('feedbackText');
  if (!banner || !icon || !text) return;

  if (shouldAutoShow) {
    banner.className = `scenario-feedback-banner ${key}`;
    banner.style.display = 'flex';
  } else if (banner.style.display !== 'none') {
    banner.className = `scenario-feedback-banner ${key}`;
  }

  const icons = {
    severe: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
    bear: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    base: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>`,
    bull: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>`,
    custom: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`
  };

  const currentPriceK = Math.round(state.params.serverPrice / 1000);
  const customSavedNote = state.customParams
    ? ` <span style="opacity: 0.88; font-weight: 500;">(Your custom setup of $${Math.round(state.customParams.serverPrice / 1000)}k @ ${formatRawNumber(state.customParams.numServers, 0)} servers remains saved in "Custom Values")</span>`
    : '';

  const messages = {
    severe: `<strong>Severe Loaded:</strong> 1,024 servers @ $650,000 stress planning price ($4.25/GPU-hr, 50% util, 30% erosion, PUE 1.40).${customSavedNote}`,
    bear: `<strong>Bear Loaded:</strong> 1,024 servers @ $625,000 planning price ($5.00/GPU-hr, 65% util, $120/kW-mo, PUE 1.40).${customSavedNote}`,
    base: `<strong>Base Loaded:</strong> 1,024 servers @ $550,000 planning price ($6.50/GPU-hr, 80% util, 16.5 MW colo @ $105/kW-mo, PUE 1.30).${customSavedNote}`,
    bull: `<strong>Bull Loaded:</strong> 1,024 servers @ $475,000 discount planning price ($8.00/GPU-hr, 90% util, $95/kW-mo, PUE 1.20).${customSavedNote}`,
    custom: `<strong>Custom Active ($${currentPriceK}k @ ${formatRawNumber(state.params.numServers, 0)} servers):</strong> You can set any B300 server price (e.g. $475k, $500k, $550k, $625k), server count (e.g. 1,024 vs 1,344), compute price ($/GPU-hr), or utilization % below. Switch back to Base anytime to compare.`
  };

  icon.innerHTML = icons[key] || icons.base;
  text.innerHTML = messages[key] || messages.base;
}

// Initializer
document.addEventListener('DOMContentLoaded', () => {
  // Saved Theme
  const savedTheme = localStorage.getItem('dc_theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  const appContainer = document.getElementById('appContainer') || document.querySelector('.app-container');
  if (appContainer) {
    appContainer.setAttribute('data-active-tab', state.activeTab || 'summary');
  }

  setupEventListeners();
  renderApp();
});
