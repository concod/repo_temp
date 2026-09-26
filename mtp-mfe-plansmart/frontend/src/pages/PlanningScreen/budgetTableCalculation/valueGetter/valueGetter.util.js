import VarianceContributionCalc from "./VarianceContributionCalc.util";

const valueGetter = (
  cellProps,
  budgetTableRowDataRef,
  versionListRowData,
  budgetTableProps
) => {
  const varianceContributionObj = new VarianceContributionCalc(
    cellProps,
    budgetTableRowDataRef,
    budgetTableProps
  );

  if (varianceContributionObj.isVarianceCalcNeeded) {
    return varianceContributionObj.runVarianceCalc(versionListRowData);
  } else if (varianceContributionObj.isContributionCalcNeeded) {
    return varianceContributionObj.runContributionCalc();
  }

  return cellProps?.data?.[cellProps?.column?.colId];
};

export default valueGetter;
