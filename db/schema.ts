import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Stable municipality catalogue. Geometry is GeoJSON MultiPolygon (EPSG:4326). */
export const geographicMunicipalities = sqliteTable("geographic_municipalities", {
  id: text("id").primaryKey(),
  countryCode: text("country_code").notNull().default("MX"),
  stateCode: text("state_code").notNull(),
  municipalityCode: text("municipality_code").notNull(),
  officialName: text("official_name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  geographicType: text("geographic_type", { enum: ["municipality", "borough", "equivalent"] }).notNull(),
  regionCode: text("region_code").notNull(),
  geometry: text("geometry").notNull(),
  centroid: text("centroid"),
  boundingBox: text("bounding_box"),
  populationReference: integer("population_reference"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("municipality_state_idx").on(table.stateCode),
  index("municipality_code_idx").on(table.municipalityCode),
  index("municipality_normalized_name_idx").on(table.normalizedName),
]);

export const budgetVersions = sqliteTable("budget_versions", {
  id: text("id").primaryKey(), code: text("code").notNull().unique(), name: text("name").notNull(),
  fiscalYear: integer("fiscal_year").notNull(), versionType: text("version_type", { enum: ["original", "revised", "forecast", "stretch", "scenario"] }).notNull(),
  status: text("status").notNull(), approvedAt: text("approved_at"), approvedBy: text("approved_by"), effectiveFrom: text("effective_from"), notes: text("notes"),
  createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
});

export const salesBudgets = sqliteTable("sales_budgets", {
  id: text("id").primaryKey(), budgetVersionId: text("budget_version_id").notNull(), fiscalYear: integer("fiscal_year").notNull(), fiscalMonth: integer("fiscal_month").notNull(),
  periodStart: text("period_start").notNull(), periodEnd: text("period_end").notNull(),
  budgetLevel: text("budget_level", { enum: ["national", "region", "state", "municipality", "territory", "salesperson", "cedis", "channel", "segment", "brand", "family", "product", "customer"] }).notNull(),
  regionCode: text("region_code"), stateCode: text("state_code"), municipalityCode: text("municipality_code"), territoryId: text("territory_id"), salespersonId: text("salesperson_id"), distributionCenterId: text("distribution_center_id"),
  channel: text("channel"), customerSegment: text("customer_segment"), brand: text("brand"), family: text("family"), subcategory: text("subcategory"), productId: text("product_id"), customerId: text("customer_id"),
  budgetNetSales: real("budget_net_sales").notNull(), budgetGrossMargin: real("budget_gross_margin").notNull(), budgetUnits: real("budget_units").notNull(), budgetActiveCustomers: integer("budget_active_customers").notNull(), budgetNewCustomers: integer("budget_new_customers").notNull(), budgetVisits: integer("budget_visits").notNull(),
  currency: text("currency").notNull().default("MXN"), status: text("status").notNull(), source: text("source").notNull(), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, (table) => [index("budget_period_level_idx").on(table.fiscalYear, table.fiscalMonth, table.budgetLevel), index("budget_municipality_idx").on(table.municipalityCode)]);

export const budgetDailyAllocations = sqliteTable("budget_daily_allocations", {
  id: text("id").primaryKey(), salesBudgetId: text("sales_budget_id").notNull(), businessDate: text("business_date").notNull(), workingDay: integer("working_day", { mode: "boolean" }).notNull(), seasonalityFactor: real("seasonality_factor").notNull(),
  dailyBudgetNetSales: real("daily_budget_net_sales").notNull(), dailyBudgetGrossMargin: real("daily_budget_gross_margin").notNull(), dailyBudgetUnits: real("daily_budget_units").notNull(), cumulativeBudgetNetSales: real("cumulative_budget_net_sales").notNull(), createdAt: text("created_at").notNull(),
});

export const commercialCalendar = sqliteTable("commercial_calendar", {
  calendarDate: text("calendar_date").primaryKey(), fiscalYear: integer("fiscal_year").notNull(), fiscalMonth: integer("fiscal_month").notNull(), fiscalWeek: integer("fiscal_week").notNull(), dayOfMonth: integer("day_of_month").notNull(), dayOfWeek: integer("day_of_week").notNull(),
  isWorkingDay: integer("is_working_day", { mode: "boolean" }).notNull(), isHoliday: integer("is_holiday", { mode: "boolean" }).notNull(), holidayName: text("holiday_name"), seasonalityFactor: real("seasonality_factor").notNull(), monthProgressPercentage: real("month_progress_percentage").notNull(), workingDayProgressPercentage: real("working_day_progress_percentage").notNull(),
});
