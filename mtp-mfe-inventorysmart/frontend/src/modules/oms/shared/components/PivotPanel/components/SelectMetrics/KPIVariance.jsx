import React, { useMemo } from "react";
import { upperCase } from "lodash";
import { Button } from "impact-ui-v3";
import Select from "../../../ImpactSelect/Select";
import CloseOutlinedIcon from "assets/closeOutlined.svg";
import {
  DEFAULT_CALCULATION_OPTION,
  VARIANCE_FIELDS,
} from "../../../../../pages-oms/OrderManagement/constants/selectMetrics.constants";

const KPIVariance = ({
  varianceList,
  kpi,
  addVariance,
  removeVariance,
  versionList,
  selectVarianceValues,
  planKpiConfig,
  defaultVersion
}) => {
  const hasAnyChannelVarianceVisible = (kpiConfig, version) => {
    const isAddedVersion = version?.split("_")?.length > 1;
    const isSubVersion = version?.includes("-");
    let updatedVersion = version;
    if (isAddedVersion) {
      updatedVersion = version?.split("_")[0];
    }
    if (isSubVersion) {
      updatedVersion = version?.split("-")[1];
    }
    const versionConfig =
      kpiConfig?.visible?.[String(updatedVersion)?.toUpperCase()] || {};
    return Object.values(versionConfig).some(
      (channelConfig) => channelConfig.variance_visible === true
    );
  };

  const versionOptions = useMemo(() => {
    return (versionList || [])
      .filter((item) => hasAnyChannelVarianceVisible(planKpiConfig[kpi], item))
      .map((item) => ({
        label: upperCase(item),
        value: item
      }));
  }, [versionList, planKpiConfig, kpi]);

  const handleSelectChange = (index, field, selectedValue) => {
    selectVarianceValues(kpi, index, field, selectedValue);
  };

  const handleAddVariance = () => {
    const newVariance = {
      [VARIANCE_FIELDS.COMPARED_VERSION]: defaultVersion?.value,
      [VARIANCE_FIELDS.REFERENCE_VERSION]: "",
      [VARIANCE_FIELDS.CALCULATION]: DEFAULT_CALCULATION_OPTION.value
    };
    addVariance(kpi, newVariance);
  };

  return (
    <div className="varianceList">
      {varianceList.map((item, index) => (
        <div className="varianceItem" key={index}>
          <div className="varianceHeader">
            {[VARIANCE_FIELDS.COMPARED_VERSION, VARIANCE_FIELDS.REFERENCE_VERSION].map(
              (field, versionIndex) => {
                const otherField =
                  field === VARIANCE_FIELDS.COMPARED_VERSION
                    ? VARIANCE_FIELDS.REFERENCE_VERSION
                    : VARIANCE_FIELDS.COMPARED_VERSION;

                const selectedInOtherField =
                  item?.[otherField] ??
                  (otherField === VARIANCE_FIELDS.COMPARED_VERSION
                    ? defaultVersion?.value
                    : null);

                const filteredOptions = versionOptions.filter(
                  (option) => option.value !== selectedInOtherField
                );

                let selectedOption =
                  versionOptions.find((opt) => opt.value === item?.[field]) ??
                  (field === VARIANCE_FIELDS.COMPARED_VERSION ? defaultVersion : null);

                return (
                  <React.Fragment key={field}>
                    <div className="contribution-select">
                      <Select
                        options={filteredOptions}
                        value={selectedOption}
                        className="versionSelect"
                        onChange={(selectedOption) =>
                          handleSelectChange(index, field, selectedOption.value)
                        }
                        minWidth={"134px"}
git                         withPortal={true}
                      />
                    </div>
                    {versionIndex === 0 && <span>Vs</span>}
                  </React.Fragment>
                );
              }
            )}
          </div>

          <div className="varianceCalculation contribution-select">
            <span>Calculation</span>
            <Select
              className="versionSelect"
              options={[
                DEFAULT_CALCULATION_OPTION,
                { label: "Absolute", value: "absolute" }
              ]}
              value={
                [DEFAULT_CALCULATION_OPTION, { label: "Absolute", value: "absolute" }].find(
                  (opt) => opt.value === item?.calculation
                ) || DEFAULT_CALCULATION_OPTION
              }
              onChange={(selectedOption) =>
                handleSelectChange(index, VARIANCE_FIELDS.CALCULATION, selectedOption.value)
              }
              minWidth={"134px"}
              withPortal={true}
            />
          </div>

          <span className="deleteIcon" onClick={() => removeVariance(kpi, index)}>
            <CloseOutlinedIcon />
          </span>
        </div>
      ))}

      <Button
        className="addVarianceButton"
        size="medium"
        variant="secondary"
        onClick={handleAddVariance}
        children="+  Add"
      />
    </div>
  );
};

export default KPIVariance;
