/**
 * TypeScript types for PSP-StoreHub Dashboard API Response
 * Single source of truth for dashboard data structures
 */

// Filter types
export interface DistrictFilter {
  currentSelection: string;
  options: string[];
}

export interface StoreFilter {
  currentSelection: string;
  storeName: string;
  district: string;
}

// Overall Summary types
export interface WeekData {
  start: string;
  end: string;
  avg_rating: number;
  response_count?: number;
}

export interface WeekRange {
  previous: WeekData;
  current: WeekData;
}

export interface SummaryContext {
  store?: string;
  store_id?: string;
  district: string;
  period: string;
  weekRange: WeekRange;
}

export interface MetricChange {
  value: number;
  unit: string;
  direction: 'up' | 'down' | 'neutral';
  pct?: number;
}

export interface MetricValue {
  value: number;
  unit: string;
}

export interface SummaryMetric {
  key: string;
  label: string;
  change: MetricChange;
  current: MetricValue;
  previous: MetricValue;
}

export interface SummaryStyle {
  variant: string;
  tone: string;
}

export interface OverallSummary {
  id: string;
  title: string;
  body: string;
  context: SummaryContext;
  metrics: SummaryMetric[];
  style: SummaryStyle;
  ai_insight: string[];
}

// KPI Card types
export interface KPIMetric {
  label: string;
  value: string | number | null;
  direction: 'up' | 'down' | 'neutral' | 'flat';
}

export interface SparklineDataPoint {
  x: string;
  y: number;
}

export interface TimeSeriesDataPoint {
  week_start?: string;
  week_start_original?: string;
  quarter_start?: string;
  quarter_label?: string;
  revenue?: number;
  score?: number;
}

export interface ChartSeries {
  id: string;
  label: string;
  data: TimeSeriesDataPoint[];
}

export interface DetailChart {
  type: string;
  yAxisLabel: string;
  xAxisLabel: string;
  series: ChartSeries[];
}

export interface AITodoItem {
  id: string;
  icon: string;
  text: string;
  severity: string;
}

export interface AIInsight {
  title: string;
  items: AITodoItem[];
}

export interface KPIDetail {
  title: string;
  headline: string;
  status?: string;
  subtext: string;
  period: string;
  chart: DetailChart;
  aiInsight: AIInsight;
}

export interface KPICard {
  id: string;
  title: string;
  metricKey: string;
  icon: string;
  value: number;
  unit: string;
  metrics: KPIMetric[];
  sparklineData: SparklineDataPoint[];
  expandable: boolean;
  detail: KPIDetail;
}

// Store types
export interface StoreLocation {
  district: string;
  label: string | null;
}

export interface KPIDelta {
  value: number;
  unit: string;
  direction: 'up' | 'down' | 'neutral';
}

export interface StoreKPIDeltas {
  netSales: KPIDelta;
  nrr: KPIDelta;
  revv: KPIDelta;
}

export interface SentimentBreakdown {
  positive: number;
  neutral: number;
  negative: number;
}

export interface TagTheme {
  type: string;
  value: string;
}

export interface TagItem {
  themes: TagTheme[];
}

export interface Store {
  id: string;
  name: string;
  location: StoreLocation;
  average_rating: number;
  tags: TagItem[];
  topIssue: string;
  kpiDeltas: StoreKPIDeltas;
  sentimentBreakdown: SentimentBreakdown;
}

export interface AllStores {
  title: string;
  subtitle: string;
  stores: Store[];
}

// Theme types
export interface TopComment {
  text: string;
  date: string;
  store_id: string;
  store_name: string;
}

export interface CommentAction {
  type: string;
  icon: string;
  ariaLabel: string;
}

export interface CommentTotals {
  themeCommentCount: number;
}

export interface ThemeComments {
  popoverTitle: string;
  action: CommentAction;
  top: TopComment[];
  examples: string[];
  totals: CommentTotals;
}

export interface ThemeItem {
  id: string;
  title: string;
  percentage: number;
  description: string;
  tags: string[];
  comments: ThemeComments;
}

export interface ThemeSection {
  title: string;
  subtitle: string;
  share?: {
    enabled: boolean;
  };
  items: ThemeItem[];
}

// Chart types
export interface ChartDataPoint {
  x: number;
  y: number;
  z: number;
}

export interface Chart {
  title: string;
  xAxisLabel: string;
  yAxisLabel: string;
  dataPoints: ChartDataPoint[];
}

export interface PerformanceChart {
  title: string;
  subtitle: string;
  chart: Chart;
}

// Query details types
export interface KPIQuerySet {
  timeseries: string;
  breakdown: string;
  insights: string;
}

export interface KPIQueries {
  net_sales_comp_weekly: KPIQuerySet;
  nrr_audit_avg: KPIQuerySet;
  revv_overall: KPIQuerySet;
}

export interface QueryDetails {
  district: string;
  kpiQueries: KPIQueries;
  parallel_execution_time_seconds: number;
  total_processing_time_seconds: number;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface TimeDetailInfo {
  number: number;
  dates: DateRange;
  previousDates: DateRange;
}

export interface DataTimeDetail {
  granularity: string;
  dataDisplayValue: string;
  details: TimeDetailInfo;
}

/**
 * Complete dashboard API response structure
 */
export interface DashboardData {
  districtFilter: DistrictFilter;
  dataTimeDetail: DataTimeDetail;
  overallSummary: OverallSummary;
  kpiCards: KPICard[];
  allStores: AllStores;
  topNegativeThemes: ThemeSection;
  topPositiveThemes: ThemeSection;
  topNeutralThemes: ThemeSection;
  performanceChart: PerformanceChart;
  query_details: QueryDetails;
}

export interface Person {
  member_name: string;
  total_comments: number;
  positive_count: number;
  negative_count: number;
  avg_sentiment_score: number;
}

// Individual member sentiment stats
export interface SentimentMemberStats {
  member_name: string;
  total_comments: number;
  positive_count: number;
  negative_count: number;
  avg_sentiment_score: number;
}

// Weekly rating data point
export interface WeeklyRatingData {
  week_start: string;
  avg_survey_rating: number;
  responses: number;
  week_start_original?: string;
}

// Generic rating trend structure
export interface RatingTrend {
  title: string;
  subtitle: string;
  data: WeeklyRatingData[];
}

// REVV Metrics section
export interface RevvMetrics {
  persons: SentimentMemberStats[];
  ai_summary: string;
  weeklyRatingTrend6M: RatingTrend;
  weeklyRatingTrend1M: RatingTrend;
  lastCompleteWeekRating: RatingTrend;
  weeklyRatingTrend1Y: RatingTrend;
}

// Transaction summary
export interface TransactionSummary {
  total_revenue: number | null;
  total_margin: number | null;
  total_quantity: number | null;
  total_cost: number | null;
  avg_sales_price: number | null;
  total_transactions: number;
  total_line_items: number;
}

// Discount analysis
export interface DiscountAnalysis {
  total_scanback: number | null;
  total_promo_discount: number | null;
  total_vendor_coupon: number | null;
  total_psp_coupon: number | null;
  total_other_discount: number | null;
  total_all_discounts: number | null;
}

// Promo performance entry (empty array currently, defined for extensibility)
export interface PromoPerformance {}

// Weekly sales trend (same structure as rating trend)
export interface WeeklySalesTrend {
  title: string;
  subtitle: string;
  data: any[]; // could later be refined if sales data structure is known
}

// Transaction metrics section
export interface TransactionMetrics {
  summary: TransactionSummary;
  discount_analysis: DiscountAnalysis;
  promo_performance: PromoPerformance[];
  weekly_sales_trend_6m: WeeklySalesTrend;
}

// Person Analysis types
export interface PersonAnalysisItem {
  member_name: string;
  total_comments: number;
  positive_count: number;
  negative_count: number;
  avg_sentiment_score: number;
}

export interface PersonAnalysisAIItem {
  text: string;
}

export interface PersonAnalysisAISummary {
  title: string;
  items: PersonAnalysisAIItem[];
}

export interface PersonAnalysis {
  title: string;
  subtitle: string;
  persons: PersonAnalysisItem[];
  ai_summary: PersonAnalysisAISummary;
}

// Category Sales Performance types
export interface CategorySalesData {
  Category: string;
  net_sales: number;
  net_sales_prev?: number;
  net_sales_yoy?: number;
  wow_pct: number;
  yoy_pct: number;
  rank: number;
}

export interface CategorySalesPerformance {
  title: string;
  subtitle: string;
  data: CategorySalesData[];
  total_categories: number;
  ai_summary: PersonAnalysisAISummary;
}

// Execution details
export interface ExecutionDetails {
  query_execution_time_seconds: number;
  person_ai_summary_time_seconds: number;
  sales_ai_summary_time_seconds: number;
  llm_filtering_time_seconds: number;
  total_processing_time_seconds: number;
  original_person_count: number;
  filtered_person_count: number;
  removed_generic_terms: number;
  total_queries_executed: number;
  kpi_queries?: number;
  person_queries: number;
  sales_queries: number;
  theme_queries?: number;
}

// NRR Audit types
export interface NrrAuditIssue {
  issue: string;
  category: string;
  issue_title: string;
  status: string;
  score: number;
  severity: string;
  audit_date: string;
  attachments?: string[];
}

export interface NrrAuditQuarter {
  quarter: string;
  quarter_start_date: string;
  quarter_end_date: string;
  issue: string;
  score: number;
  severity: string;
  audit_date: string;
}

export interface NrrAuditCategory {
  category: string;
  quarterly_data: NrrAuditQuarter[];
}

export interface NrrAudit {
  title: string;
  subtitle?: string;
  data_by_category: NrrAuditCategory[];
  ai_summary?: PersonAnalysisAISummary;
}

// Store Comments types
export interface StoreComment {
  comment_text: string;
  sentiment_score: number;
  sentiment_label: 'positive' | 'negative' | 'neutral';
  comment_date: string;
  survey_rating: number;
}

export interface StoreComments {
  title: string;
  subtitle: string;
  comments: StoreComment[];
  total_comments: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
}

// Theme Analysis types
export interface ThemeMention {
  theme: string;
  current_count: number;
  previous_count: number;
  delta: number;
}

export interface ThemeAnalysisData {
  negative: ThemeMention[];
  neutral: ThemeMention[];
  positive: ThemeMention[];
}

export interface ThemeAnalysisSummary {
  items: PersonAnalysisAIItem[];
}

export interface ThemeAnalysisKPI {
  worst_theme: {
    theme: string;
    current_negative_mentions: number;
    previous_negative_mentions: number;
    wow_delta: number;
    trend: string;
  };
  mandated_action: string;
}

export interface ThemeAnalysis {
  title: string;
  subtitle: string;
  data: ThemeAnalysisData;
  summary: ThemeAnalysisSummary;
  kpi: ThemeAnalysisKPI;
}

// Root API response
export interface StoreSentimentResponse {
  district: string;
  store_id: string;
  store_name: string;
  analysis_week: string;
  storeFilter: StoreFilter;
  overallSummary: OverallSummary;
  kpiCards: KPICard[];
  total_persons: number;
  total_comments: number;
  total_positive_count: number;
  total_negative_count: number;
  positive_percentage: number;
  negative_percentage: number;
  person_analysis: PersonAnalysis;
  category_sales_performance: CategorySalesPerformance;
  nrr_audit?: NrrAudit;
  store_comments: StoreComments;
  theme_analysis: ThemeAnalysis;
  execution_details: ExecutionDetails;
}

export interface StoreData {
  store_id: string;
  store_name: string;
}

export interface DataDateRange {
  start_date: string;
  end_date: string;
}