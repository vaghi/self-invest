export interface RiskConfig {
  maxPositionSizePct: number;
  maxPortfolioDrawdownPct: number;
  maxDailyLossPct: number;
  maxOpenPositions: number;
  defaultStopLossPct: number;
  maxSectorConcentrationPct: number;
  minCashReservePct: number;
}

export interface RiskAssessment {
  approved: boolean;
  rejectionReasons: string[];
  riskScore: number;
  warnings: string[];
}

export const DEFAULT_RISK_CONFIG: RiskConfig = {
  maxPositionSizePct: 10,
  maxPortfolioDrawdownPct: 20,
  maxDailyLossPct: 5,
  maxOpenPositions: 10,
  defaultStopLossPct: 3,
  maxSectorConcentrationPct: 30,
  minCashReservePct: 20,
};
