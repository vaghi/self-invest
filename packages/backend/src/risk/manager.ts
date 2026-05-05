import Decimal from 'decimal.js';
import type { TradeProposal, Balance, Position, RiskConfig, RiskAssessment } from '@self-invest/shared';
import { DEFAULT_RISK_CONFIG } from '@self-invest/shared';
import { logger } from '../config/logger.js';

let currentConfig: RiskConfig = { ...DEFAULT_RISK_CONFIG };
let peakPortfolioValue = new Decimal(0);

export function updateRiskConfig(config: Partial<RiskConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

export function getRiskConfig(): RiskConfig {
  return { ...currentConfig };
}

export function validateTrade(
  trade: TradeProposal,
  balance: Balance,
  positions: Position[],
  todayTrades: { totalCost: string }[],
): RiskAssessment {
  const reasons: string[] = [];
  const warnings: string[] = [];
  let riskScore = 0;

  const totalValue = new Decimal(balance.totalValue);
  const cashBalance = new Decimal(balance.cashBalance);

  if (totalValue.gt(peakPortfolioValue)) {
    peakPortfolioValue = totalValue;
  }

  const tradeQuantity = new Decimal(trade.quantity);
  const tradePrice = new Decimal(trade.stopLossPrice);
  const estimatedCost = tradeQuantity.mul(tradePrice);
  const positionSizePct = estimatedCost.div(totalValue).mul(100);

  if (positionSizePct.gt(currentConfig.maxPositionSizePct)) {
    reasons.push(
      `Position size ${positionSizePct.toFixed(1)}% exceeds max ${currentConfig.maxPositionSizePct}%`
    );
    riskScore += 30;
  }

  if (trade.side === 'buy') {
    const minCash = totalValue.mul(currentConfig.minCashReservePct).div(100);
    if (cashBalance.minus(estimatedCost).lt(minCash)) {
      reasons.push(
        `Trade would reduce cash below ${currentConfig.minCashReservePct}% reserve requirement`
      );
      riskScore += 25;
    }
  }

  if (positions.length >= currentConfig.maxOpenPositions && trade.side === 'buy') {
    reasons.push(`Already at max open positions (${currentConfig.maxOpenPositions})`);
    riskScore += 20;
  }

  if (peakPortfolioValue.gt(0)) {
    const drawdown = peakPortfolioValue.minus(totalValue).div(peakPortfolioValue).mul(100);
    if (drawdown.gte(currentConfig.maxPortfolioDrawdownPct)) {
      reasons.push(
        `Portfolio drawdown ${drawdown.toFixed(1)}% exceeds max ${currentConfig.maxPortfolioDrawdownPct}%`
      );
      riskScore += 40;
    }
  }

  const todayLoss = todayTrades.reduce((sum, t) => sum.plus(t.totalCost), new Decimal(0));
  const dailyLossLimit = totalValue.mul(currentConfig.maxDailyLossPct).div(100);
  if (todayLoss.abs().gte(dailyLossLimit)) {
    reasons.push(`Daily loss limit of ${currentConfig.maxDailyLossPct}% reached`);
    riskScore += 35;
  }

  if (trade.confidence < 0.6) {
    warnings.push(`Low confidence trade: ${(trade.confidence * 100).toFixed(0)}%`);
    riskScore += 10;
  }

  if (!trade.stopLossPrice && trade.side === 'buy') {
    reasons.push('Buy trades must have a stop loss price');
    riskScore += 20;
  }

  const approved = reasons.length === 0;
  if (!approved) {
    logger.info({ symbol: trade.symbol, reasons }, 'Trade rejected by risk manager');
  }

  return { approved, rejectionReasons: reasons, riskScore, warnings };
}

export function checkDeathCondition(balance: Balance): boolean {
  return new Decimal(balance.totalValue).lte(1);
}
