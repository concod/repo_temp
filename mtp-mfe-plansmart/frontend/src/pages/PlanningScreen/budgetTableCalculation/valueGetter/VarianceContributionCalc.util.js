import { get } from "lodash";
import findIntersection from "../common/findIntersection.util";
import getValueByColumnKey from "../common/getValueByColumnKey.util";
import varianceCalculation from "../varianceCalculation.util";
import numberValidation from "../common/numberValidation.util";

class VarianceContributionCalc {
  constructor(cellProps, budgetTableRowDataRef, budgetTableProps) {
    this.cellProps = cellProps;
    this.budgetTableRowDataRef = budgetTableRowDataRef;
    this.budgetTableProps = budgetTableProps;

    this.parentInx = get(this.cellProps, "data.parent_index", null);
    this.rowData = this.budgetTableRowDataRef?.current || [];

    this.valueByColumnValueKey = budgetTableProps.valueByColumnValueKey;

    this.rmVersionInValueByColumnValueKey = this.valueByColumnValueKey.filter(
      (key) => key !== "plan_version"
    );

    this.columnId = get(this.cellProps, "column.colId", "");
    this.rowDataObj = get(this.cellProps, "data", {});
    this.rowVersion = get(this.cellProps, "data.plan_version", "");
    this.isContributionCol = get(
      this.cellProps,
      "column.userProvidedColDef.extra.contribution",
      false
    );
    this.rowVariance = get(this.cellProps, "data.plan_version", "");
    this.rowDataInxMapping = get(
      this.budgetTableProps,
      "rowDataInxMapping",
      {}
    );
    this.varianceMapping =
      get(this.budgetTableProps, "varianceMapping", {}) || {};

    this.currentVersion = get(this.budgetTableProps, "currentVersion", "");

    this.columnValues = getValueByColumnKey(
      this.rmVersionInValueByColumnValueKey,
      this.rowDataObj
    );
    this.metricKey = this.rowDataObj.metric_key;
    this.mappedVersion = this.varianceMapping[this.rowVariance];
    this.isVarianceRow = this.varianceMapping.hasOwnProperty(this.rowVersion);
    this.roundOffValue = get(
      this.budgetTableProps,
      ["planKpiConfig", this.metricKey],
      0
    );
    this.pointVarianceList = get(
      this.budgetTableProps,
      ["planKpiConfig", this.metricKey, "point_variance_list"],
      []
    );
  }

  contributionCalculation = (numerator, denominator) => {
    return numberValidation((numerator / denominator) * 100);
  };

  getRowNode = (orderId) => {
    return this.cellProps.api.getRowNode(orderId);
  };

  getValue = (columnId, rowNode) => {
    return this.cellProps.api?.getValue(columnId, rowNode);
  };

  isProductHierarchyContribution = () => {
    const headerName = get(
      this.cellProps,
      "column.userProvidedColDef.headerName",
      ""
    );
    return headerName.includes("C%");
  };

  get isVarianceCalcNeeded() {
    const columnDefExtraObj =
      get(this.cellProps, "column.userProvidedColDef.extra", {}) || {};
    const isTimelineColumn = columnDefExtraObj.hasOwnProperty("timeline");
    return this.isVarianceRow && isTimelineColumn && !this.isContributionCol;
  }

  get isContributionCalcNeeded() {
    return (
      this.isContributionCol &&
      !this.isVarianceRow &&
      this.currentVersion === this.rowVersion
    );
  }

  runVarianceCalc = (versionListRowData) => {
    const fromAddVersion = get(this.rowDataObj, "fromAddVersion");
    const variancePlanCode = get(this.rowDataObj, "planCode");

    let mappedVersionRowData;

    if (fromAddVersion) {
      const { rowData, rowIndexMapping } = versionListRowData[variancePlanCode];

      const matchingIndexes = findIntersection(rowIndexMapping, [
        this.metricKey,
        this.mappedVersion,
        ...this.columnValues
      ]);

      const mappedVersionRowInx = matchingIndexes.filter((index) => {
        return rowData[index].planCode === variancePlanCode;
      })?.[0];

      mappedVersionRowData = rowData[mappedVersionRowInx];
    } else {
      const mappedVersionRowInx = findIntersection(this.rowDataInxMapping, [
        this.metricKey,
        this.mappedVersion,
        ...this.columnValues
      ])?.[0];

      mappedVersionRowData = this.rowData[mappedVersionRowInx];
    }

    const currentVersionRowInx = findIntersection(this.rowDataInxMapping, [
      this.metricKey,
      this.currentVersion,
      ...this.columnValues
    ])?.[0];

    const currentVersionRowData = this.rowData[currentVersionRowInx];

    const currentVersionRowNode = this.getRowNode(currentVersionRowData?.order);
    const mappedVersionRowNode = this.getRowNode(mappedVersionRowData?.order);

    const currentVersionValue = this.getValue(
      this.columnId,
      currentVersionRowNode
    );
    const mappedVersionValue = this.getValue(
      this.columnId,
      mappedVersionRowNode
    );
    return varianceCalculation(
      currentVersionValue,
      mappedVersionValue,
      this.roundOffValue,
      this.rowVariance,
      this.pointVarianceList
    );
  };

  runContributionCalc = () => {
    const currentCellNode = this.getRowNode(this.cellProps.data?.order) || {};
    const productContributionParentMapping = get(
      this.budgetTableProps,
      "productContributionParentMapping",
      {}
    );
    const channelContributionParentMapping = get(
      this.budgetTableProps,
      "channelContributionParentMapping",
      {}
    );
    const channelRollUpMapping = get(
      this.budgetTableProps,
      "channelRollUpMapping",
      {}
    );
    if (this.isProductHierarchyContribution()) {
      if (this.parentInx !== null && this.parentInx >= 0) {
        const parentRow = this.rowData[this.parentInx];
        const parentRowNode = this.getRowNode(parentRow?.order) || {};
        const currentCellNode =
          this.getRowNode(this.cellProps.data?.order) || {};
        const parentValue =
          this.getValue(
            productContributionParentMapping[this.columnId],
            parentRowNode
          ) || 0;
        const currentCellValue =
          this.getValue(
            productContributionParentMapping[this.columnId],
            currentCellNode
          ) || 0;
        return this.contributionCalculation(currentCellValue, parentValue);
      }
      return this.cellProps?.data?.[this.cellProps?.column?.colId];
    }
    const contrParentColumnId = channelContributionParentMapping[this.columnId];
    const channelTotalColumnId = channelRollUpMapping[contrParentColumnId]?.[0];
    const contrParentValue = this.getValue(
      contrParentColumnId,
      currentCellNode
    );
    const channelTotalValue = this.getValue(
      channelTotalColumnId,
      currentCellNode
    );
    return this.contributionCalculation(contrParentValue, channelTotalValue);
  };
}

export default VarianceContributionCalc;
