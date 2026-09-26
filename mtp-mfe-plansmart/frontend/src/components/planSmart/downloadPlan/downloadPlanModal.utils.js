import { DATATYPE } from "./downloadPlanModal.constant";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import {
  getFormattedValue,
  validateContribution
} from "../CellRenderer/cellRenderer.util";
import { get } from "lodash";

export const getHierarchyValuesForDownloadPlan = (
  hierarchyLevel,
  planDetails
) => {
  const filters = {};
  hierarchyLevel.forEach((hierarchy) => {
    filters[hierarchy] = planDetails[hierarchy];
  });
  return filters;
};

export const handleCheckbox = (
  e,
  selectedHierarchyLevel,
  setIsDownloadDisabled
) => {
  const value = e.target.value;
  const index = selectedHierarchyLevel.indexOf(value);
  if (index === -1) {
    selectedHierarchyLevel.push(value);
  } else {
    selectedHierarchyLevel.splice(index, 1);
  }
  selectedHierarchyLevel.length > 0
    ? setIsDownloadDisabled(false)
    : setIsDownloadDisabled(true);
};

export const getParams = ({
  planKpiConfig,
  varianceList,
  planKpiConfigV2
}) => ({
  skipRowGroups: true,
  processCellCallback(params) {
    const inputValue = params.value;
    const version = get(params.node.data, "plan_version", "");
    const metricKey = get(params.node.data, "metric_key", "");
    const isContributionCol = get(
      params.column.colDef,
      "extra.contribution",
      false
    );

    if (
      planKpiConfigV2 &&
      isContributionCol &&
      !varianceList.includes(version)
    ) {
      const displayStaticValue = validateContribution({
        colDef: get(params?.column, "colDef", {}),
        kpiConfig: planKpiConfigV2[metricKey],
        parentIndex: get(params?.node?.data, "parent_index", ""),
        version: version,
        channel: get(params?.column?.colDef, "extra.channel", "")
      });

      if (displayStaticValue !== null) {
        return displayStaticValue;
      }
    }

    let value;

    if (typeof inputValue === DATATYPE.STRING) {
      value = replaceSpecialCharacter(inputValue);
    } else if (typeof inputValue === DATATYPE.NUMBER) {
      value = getFormattedValue({
        inputValue: inputValue,
        varianceList,
        version,
        planKpiConfig,
        metricKey,
        isContributionCol
      });
    } else {
      value = inputValue;
    }
    return value;
  }
});
