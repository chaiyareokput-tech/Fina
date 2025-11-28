
export interface FinancialMetric {
  label: string;
  value: number;
  unit: string;
}

export interface FinancialRatio {
  name: string;
  value: number;
  benchmark: number | null; // Benchmark might be null if not applicable
  status: 'Good' | 'Average' | 'Poor';
  category: 'Liquidity' | 'Profitability' | 'Efficiency' | 'Leverage';
  description: string;
}

export interface Anomaly {
  item: string;
  observation: string;
  impact: 'High' | 'Medium' | 'Low';
  related_entity?: string;
}

export interface AccountInsight {
  account_name: string;
  value: number;
  change_percentage?: number;
  analysis: string;
  status: 'Normal' | 'Concern' | 'Good';
}

export interface EntityInsight {
  name: string;
  liquidity_status: 'Good' | 'Average' | 'Poor';
  summary: string;
  key_metrics: FinancialMetric[];
}

export interface AnalysisResult {
  summary: string;
  future_outlook: string; // New field for future trend analysis
  financial_ratios: FinancialRatio[]; // Renamed from liquidity_ratios to cover all types
  key_metrics: FinancialMetric[];
  anomalies: Anomaly[];
  entity_insights?: EntityInsight[]; 
  account_insights?: AccountInsight[];
}

export interface FileData {
  base64: string;
  mimeType: string;
  name: string;
}
