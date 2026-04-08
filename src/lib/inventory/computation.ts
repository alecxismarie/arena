type DailyComputationInput = {
  beginningStock: number;
  stockAdded: number;
  endingStock: number;
  wasteUnits: number;
  sellingPrice: number;
  costPrice: number;
};

export function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

export function computeDailyInventoryFinancials({
  beginningStock,
  stockAdded,
  endingStock,
  wasteUnits,
  sellingPrice,
  costPrice,
}: DailyComputationInput) {
  const unitsSold = beginningStock + stockAdded - endingStock - wasteUnits;
  const revenue = roundMoney(unitsSold * sellingPrice);
  const cogs = roundMoney(unitsSold * costPrice);
  const grossProfit = roundMoney(revenue - cogs);

  return {
    unitsSold,
    revenue,
    cogs,
    grossProfit,
  };
}
