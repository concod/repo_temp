import React, { useMemo } from "react";
import { Button } from "impact-ui-v3";
import { capitalize } from "lodash";
import CloseOutlinedIcon from "assets/closeOutlined.svg";
import Select from "../../../ImpactSelect/Select";
import { DIMENSION_OPTIONS_METRICS } from "../../../../../pages-oms/OrderManagement/constants/selectMetrics.constants";

const KPIContribution = ({
  contributionList,
  kpi,
  addContribution,
  removeContribution,
  selectContributionValues,
  pivotDescriptionData,
  currentDimensionValues,
}) => {
  const baseDimensionOptions = useMemo(() => {
    const options = Object.entries(pivotDescriptionData.dimension_values)
      .filter(([key]) => key !== DIMENSION_OPTIONS_METRICS.MEASURES)
      .filter(([, values]) => values.length > 1)
      .map(([key]) => ({
        label: capitalize(key),
        value: key,
      }))
      .filter((option) => currentDimensionValues.includes(option.value));

    const existingValues = contributionList
      .map((item) => item.baseDimension?.value)
      .filter(Boolean);

    const hasFirstRowWithDefaultParent =
      contributionList.length > 0 && !contributionList[0].baseDimension;
    if (hasFirstRowWithDefaultParent) {
      existingValues.push("parent");
    }

    const filteredOptions = options.filter(
      (option) => !existingValues.includes(option.value)
    );

    const parentOption = { label: "Parent", value: "parent" };
    return existingValues.includes("parent")
      ? filteredOptions
      : [parentOption, ...filteredOptions];
  }, [pivotDescriptionData, contributionList, currentDimensionValues]);

  const baseFieldsOptions = [{ label: "Parent", value: "parent" }];

  return (
    <div className="varianceList">
      {contributionList.map((item, index) => (
        <div key={index} className="varianceItem">
          <div className="varianceHeader">
            <div className="dropdownInput contribution-select">
              <span>Base Dimension</span>
              <Select
                options={baseDimensionOptions}
                value={item?.baseDimension || ""}
                className="versionSelect"
                onChange={(selectedValue) =>
                  selectContributionValues(kpi, index, "baseDimension", selectedValue)
                }
                minWidth={"172px"}
                withPortal={true}
              />
            </div>
            <div className="dropdownInput contribution-select">
              <span>Base Field: </span>
              <Select
                options={baseFieldsOptions}
                value={item?.baseField || ""}
                className="versionSelect"
                onChange={(selectedValue) =>
                  selectContributionValues(kpi, index, "baseField", selectedValue)
                }
                minWidth={"172px"}
                withPortal={true}
              />
            </div>
          </div>
          <span className="deleteIcon" onClick={() => removeContribution(kpi, index)}>
            <CloseOutlinedIcon />
          </span>
        </div>
      ))}
      <Button
        className="addVarianceButton"
        size="medium"
        variant="secondary"
        disabled={
          !baseDimensionOptions.length ||
          contributionList.some(
            (item) => !item.baseDimension || !item.baseField
          )
        }
        onClick={() =>
          addContribution(kpi, {
            baseField: { label: "Parent", value: "parent" },
          })
        }
        children="+  Add"
      />
    </div>
  );
};

export default KPIContribution;
