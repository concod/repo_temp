// PORTED FROM: pages/PlanningScreen/components/PivotPanel/components/SelectMetrics/ContributionSection.jsx
import React, { useEffect, useState } from "react";
import VirtualizedAccordion from "./VirtualizedAccordion";
import {
  selectCalculatedFieldsSelection,
  setCalculatedFieldsSelection,
  selectKpiMeasures,
  selectSelectedIds,
  selectPivotDescriptionData,
} from "../../../../../pages-oms/OrderManagement/slices/pivot.slice";
import { selectPlanKpiConfigV2 } from "../../../../../pages-oms/OrderManagement/slices/kpi.slice";
import { useDispatch, useSelector } from "react-redux";
import Select from "../../../ImpactSelect/Select";
import { selectActiveViewDetail } from "../../../../../shared/ViewManagement/slices/viewManagement.slice";
import "./CalculatedFields.scss";
import KPIContribution from "./KPIContribution";

const ContributionSection = () => {
  const selectedIds = useSelector(selectSelectedIds);
  const calculatedFieldsSelection = useSelector(selectCalculatedFieldsSelection);
  const kpiMeasures = useSelector(selectKpiMeasures);
  const planKpiConfig = useSelector(selectPlanKpiConfigV2);
  const pivotDescriptionData = useSelector(selectPivotDescriptionData);
  const activeViewDetail = useSelector(selectActiveViewDetail);

  const currentDimensionValues = [
    ...(activeViewDetail?.view_details?.rowDimensions || []),
    ...(activeViewDetail?.view_details?.columnDimensions || [])
  ].map((dimension) => dimension.value);

  const [selectedContribution, setSelectedContribution] = useState(
    calculatedFieldsSelection.contribution
  );

  const [expandedAccordion, setExpandedAccordion] = useState("");

  const dispatch = useDispatch();

  useEffect(() => {
    const isAnyFieldEmpty = selectedContribution.some((item) =>
      item.contributionList.some(
        (contribution) => !contribution.baseDimension || !contribution.baseField
      )
    );
    if (isAnyFieldEmpty) {
      return;
    }
    dispatch(
      setCalculatedFieldsSelection({
        ...calculatedFieldsSelection,
        contribution: selectedContribution
      })
    );
  }, [selectedContribution]);

  /**
   * Checks if any channel in the configuration has class_dept_contribution_visible set to true
   * @param {Object} kpiConfig - KPI configuration object
   * @param {string} version - Version of the plan (e.g. 'WP', 'LY', etc.)
   * @returns {boolean} - Returns true if any channel has class_dept_contribution_visible set to true
   */
  const hasAnyChannelDeptContributionVisible = (kpiConfig, kpiVersion) => {
    const parts = String(kpiVersion)?.split("_") || [];
    // Custom version format: {kpi}_{version}_{planId} e.g., sales_sp_1253
    // Normal version format: {kpi}_{version} e.g., sales_wp
    // For custom versions (3+ parts), get second-to-last; for normal, get last
    const isCustomVersion = parts.length > 2 && !isNaN(parts[parts.length - 1]);
    const version = isCustomVersion 
      ? parts[parts.length - 2]?.toUpperCase() 
      : parts[parts.length - 1]?.toUpperCase() || "";
    // Get the version specific visibility config
    const versionConfig = kpiConfig?.visible?.[version] || {};

    // Check all channels in this version
    return Object.values(versionConfig).some(
      (channelConfig) => channelConfig.class_to_dept_visible === true
    );
  };

  useEffect(() => {
    const persistedContributionMap = new Map(
      (calculatedFieldsSelection?.contribution || []).map((c) => [c.value, c])
    );

    const selectedKpiList = getSelectedKpiList(selectedIds).map(
      (item) => persistedContributionMap.get(item.value) || item
    );

    handleKpiSelection(selectedKpiList);
  }, [selectedIds]);

  const getSelectedKpiList = (selectedIds) => {
    return selectedIds
      .filter((item) =>
        hasAnyChannelDeptContributionVisible(
          planKpiConfig[item.name],
          item.version
        )
      )
      .map((item) => ({
        label: item.label,
        value: item.version
      }));
  };

  const handleKpiSelection = (selectedKpi) => {
    const selectedKpiValueList = selectedKpi.map((item) => item.value);
    const updatedSelectedContribution = selectedContribution.filter((item) =>
      selectedKpiValueList.includes(item.value)
    );

    const newSelectedContribution = selectedKpi.map((item) => {
      const existingContribution = updatedSelectedContribution.find(
        (contribution) => contribution.value === item.value
      );
      return (
        existingContribution || {
          label: item.label,
          header: item.label,
          value: item.value,
          contributionList: []
        }
      );
    });
    setSelectedContribution(newSelectedContribution);
  };

  const addContribution = (kpi, contribution) => {
    setSelectedContribution((prev) => {
      const selectedContributionList = prev.map((item) => {
        const filteredContributionList = item.contributionList.filter(
          (existing) => existing.baseDimension && existing.baseField
        );

        if (item.value === kpi) {
          const isFirstContribution = filteredContributionList.length === 0;
          const updatedContribution = isFirstContribution
            ? {
              ...contribution,
              baseDimension: { label: "Parent", value: "parent" }
            }
            : contribution;

          return {
            ...item,
            contributionList: [...filteredContributionList, updatedContribution]
          };
        }

        return {
          ...item,
          contributionList: filteredContributionList
        };
      });

      return selectedContributionList;
    });
    
    // Expand only the specific accordion that was modified
    setExpandedAccordion(prev => {
      const newExpanded = Array.isArray(prev) ? [...prev] : [];
      if (!newExpanded.includes(kpi)) {
        newExpanded.push(kpi);
      }
      return newExpanded;
    });
  };

  const removeContribution = (kpi, index) => {
    setSelectedContribution((prev) => {
      return prev.map((item) => {
        if (item.value === kpi) {
          return {
            ...item,
            contributionList: item.contributionList.filter((_, i) => i !== index)
          };
        }
        return item;
      });
    });
  };

  const selectContributionValues = (kpi, index, key, value) => {
    setSelectedContribution((prev) => {
      return prev.map((item) => {
        if (item.value === kpi) {
          const updatedContributionList = item.contributionList.map(
            (contribution, i) => {
              if (i === index) {
                return { ...contribution, [key]: value };
              }
              return contribution;
            }
          );
          return { ...item, contributionList: updatedContributionList };
        }
        return item;
      });
    });
  };

  const currentSelectedContribution = selectedContribution.filter(
    (contribution) =>
      selectedIds.some((item) => contribution.value === item.version)
  );

  const accordionData = currentSelectedContribution.map((item) => ({
    value: item.value,
    header: item.header,
    content: (
      <KPIContribution
        kpi={item.value}
        contributionList={item.contributionList}
        addContribution={addContribution}
        removeContribution={removeContribution}
        selectContributionValues={selectContributionValues}
        pivotDescriptionData={pivotDescriptionData}
        currentDimensionValues={currentDimensionValues}
      />
    )
  }));

  return (
    <div>
      <div className="selectKpiContainer">
        <label className="selectKpiLabel">Select KPIs</label>
        <Select
          options={getSelectedKpiList(selectedIds)}
          onChange={handleKpiSelection}
          isMulti={true}
          value={currentSelectedContribution}
          toggleSelectAll={true}
          isWithSearch={true}
          minWidth="172px"
        />
      </div>
      <div className="varianceSection">
        <VirtualizedAccordion
          data={accordionData}
          expanded={expandedAccordion}
          setExpanded={setExpandedAccordion}
          isMultiExpanded={true}
        />
      </div>
    </div>
  );
};

export default ContributionSection;
