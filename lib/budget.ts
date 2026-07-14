export type BudgetMetrics = {
  actualSales: number;
  budget: number;
  cumulativeBudget: number;
  workingDaysElapsed: number;
  workingDaysTotal: number;
};

export type ForecastMethod = "linear" | "seasonality-adjusted" | "recent-trend";

const safeDivide = (numerator: number, denominator: number) => denominator > 0 ? numerator / denominator : null;

/** Single deterministic source of truth for every API, table and map metric. */
export function calculateBudgetPerformance(input: BudgetMetrics) {
  const actual = input.actualSales;
  const budget = input.budget;
  const elapsed = Math.max(input.workingDaysElapsed, 0);
  const total = Math.max(input.workingDaysTotal, elapsed);
  const remaining = Math.max(total - elapsed, 0);
  const attainment = safeDivide(actual, budget);
  const cumulativeAttainment = safeDivide(actual, input.cumulativeBudget);
  const gap = Math.max(budget - actual, 0);
  return {
    actualSales: actual,
    budget,
    varianceAbsolute: actual - budget,
    attainmentPercent: attainment === null ? null : attainment * 100,
    variancePercent: attainment === null ? null : (attainment - 1) * 100,
    cumulativeBudget: input.cumulativeBudget,
    cumulativeAttainmentPercent: cumulativeAttainment === null ? null : cumulativeAttainment * 100,
    gapToGoal: gap,
    workingDaysRemaining: remaining,
    requiredDailySales: remaining ? gap / remaining : gap ? null : 0,
  };
}

export function forecastPeriodClose(input: BudgetMetrics & { seasonalityFactor?: number; recentTrendFactor?: number; method: ForecastMethod }) {
  const base = input.workingDaysElapsed > 0 ? input.actualSales / input.workingDaysElapsed * input.workingDaysTotal : 0;
  const factor = input.method === "seasonality-adjusted" ? input.seasonalityFactor ?? 1 : input.method === "recent-trend" ? input.recentTrendFactor ?? 1 : 1;
  const projectedClose = base * factor;
  const performance = calculateBudgetPerformance(input);
  return {
    method: input.method,
    actualSales: input.actualSales,
    cumulativeBudget: input.cumulativeBudget,
    monthlyBudget: input.budget,
    projectedClose,
    projectedAttainmentPercent: input.budget > 0 ? projectedClose / input.budget * 100 : null,
    projectedGap: Math.max(input.budget - projectedClose, 0),
    confidence: input.workingDaysElapsed >= 12 ? "medium" : "low",
    factors: ["working-days", input.method],
    ...performance,
  };
}

/** Prevents double counting by retaining the most specific applicable allocation. */
export function chooseNonOverlappingBudgets<T extends { id: string; levelRank: number; dimensions: Record<string, string | null> }>(rows: T[]) {
  return rows.filter((row) => !rows.some((candidate) => candidate.id !== row.id && candidate.levelRank > row.levelRank && Object.entries(row.dimensions).every(([key, value]) => value === null || candidate.dimensions[key] === value)));
}

export function simulateBudgetRecovery(currentSales: number, monthlyBudget: number, opportunities: { inactiveCustomers: number; crossSell: number; inventoryAvailable: number }, scenario: "conservative" | "probable" | "aggressive") {
  const factors = { conservative: 0.35, probable: 0.65, aggressive: 0.9 };
  const recoverable = (opportunities.inactiveCustomers + opportunities.crossSell + opportunities.inventoryAvailable) * factors[scenario];
  const projectedSales = currentSales + recoverable;
  return { scenario, currentGap: Math.max(monthlyBudget - currentSales, 0), recoverable, projectedSales, projectedAttainmentPercent: monthlyBudget > 0 ? projectedSales / monthlyBudget * 100 : null };
}
