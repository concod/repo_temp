import budgetTableCalculation from "./budgetTableCalculation.util";
import findIntersection from "./common/findIntersection.util";
import getValue from "./common/getValue.util";
import getValueByColumnKey from "./common/getValueByColumnKey.util";
import numberValidation from "./common/numberValidation.util";

function handleVarianceChange({ calcOnServer = false }) {
  const changedCellData = this.changedCellData;
  const rmVersionInValueByColumnValueKey = this.valueByColumnValueKey.filter(
    (key) => key !== "plan_version"
  );
  const columnValues = getValueByColumnKey.call(
    this,
    rmVersionInValueByColumnValueKey,
    this.changedRow
  );
  const mappedVersion = this.varianceMapping[this.changedRow.plan_version];
  const mappedVersionRowInx = findIntersection.call(
    this,
    this.rowDataInxMapping,
    [this.changedRow.metric_key, mappedVersion, ...columnValues]
  )[0];

  const currentRowInx = findIntersection.call(this, this.rowDataInxMapping, [
    this.changedRow.metric_key,
    this.currentVersion,
    ...columnValues
  ])[0];

  const mappedVersionData = getValue.call(
    this,
    mappedVersionRowInx,
    this.changedColumnDef.accessor
  );

  const currentData = getValue.call(
    this,
    currentRowInx,
    this.changedColumnDef.accessor
  );

  const newCurrentValue = this.pointVarianceList.includes(
    this.changedRow.plan_version
  )
    ? mappedVersionData + changedCellData.user_entered_value
    : numberValidation(
        (changedCellData.user_entered_value / 100) * mappedVersionData +
          mappedVersionData
      );

  const currentChangedCellData = {
    before_user_entered_value: currentData.toString(),
    user_entered_value: newCurrentValue
  };

  if (calcOnServer) {
    return {
      changedRowInx: currentRowInx,
      changedCellData: currentChangedCellData
    };
  }

  return budgetTableCalculation({
    ...this,
    changedRow: this.rowData[currentRowInx],
    changedRowInx: currentRowInx,
    changedCellData: currentChangedCellData
  });
}

export default handleVarianceChange;
