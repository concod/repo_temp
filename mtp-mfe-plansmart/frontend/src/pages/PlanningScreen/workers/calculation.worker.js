import budgetTableCalculation from "../budgetTableCalculation/budgetTableCalculation.util";

onmessage = async (event) => {
  const { data } = event;
  let result = null;
  for (let i = 0; i < data.length; i++) {
    const calcParams = data[i];
    if (result === null) {
      result = await budgetTableCalculation(calcParams);
    } else {
      result = await budgetTableCalculation({
        ...calcParams,
        rowData: result?.rowData,
        trackBudgetTableChanges: result?.trackBudgetTableChanges,
        refreshCells: result?.refreshCells
      });
    }
  }
  // data.forEach(async (calcParams) => );
  postMessage(result);
};
