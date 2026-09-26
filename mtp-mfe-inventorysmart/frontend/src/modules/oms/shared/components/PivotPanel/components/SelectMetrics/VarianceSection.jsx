import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";

import { get, uniqBy } from "lodash";
import { useDispatch, useSelector } from "react-redux";
import VirtualizedAccordion from "./VirtualizedAccordion";
import KPIVariance from "./KPIVariance";
import {
  selectCalculatedFieldsSelection,
  selectKpiMeasures,
  selectSelectedIds,
  setCalculatedFieldsSelection,
  setVariance,
} from "../../../../../pages-oms/OrderManagement/slices/pivot.slice";
import { selectPlanKpiConfigV2 } from "../../../../../pages-oms/OrderManagement/slices/kpi.slice";
import Select from "../../../ImpactSelect/Select";
import {
  DEFAULT_CALCULATION_OPTION,
  VARIANCE_FIELDS,
  DUPLICATE_VARIANCE_ERROR_MESSAGE
} from "../../../../../pages-oms/OrderManagement/constants/selectMetrics.constants";
import { addSnack } from "actions/snackbarActions";
import "./CalculatedFields.scss";

const VarianceSection = () => {
  const selectedIds = useSelector(selectSelectedIds);
  const kpiMeasures = useSelector(selectKpiMeasures);
  const calculatedFieldsSelection = useSelector(selectCalculatedFieldsSelection);
  const planKpiConfig = useSelector(selectPlanKpiConfigV2);
  const defaultVersion = undefined;

  const variance = get(calculatedFieldsSelection, "variance", []);

  const [selectedVariance, setSelectedVariance] = useState(variance);
  const [expandedAccordion, setExpandedAccordion] = useState([]);

  const dispatch = useDispatch();
  const isInitialized = useRef(false);
  const calculatedFieldsRef = useRef(calculatedFieldsSelection);

  useEffect(() => {
    calculatedFieldsRef.current = calculatedFieldsSelection;
  }, [calculatedFieldsSelection]);

  const dispatchVarianceToRedux = useCallback((variance) => {
    dispatch(setVariance(variance));
    
    const isAnyFieldEmpty = variance.some((item) =>
      item.varianceList.some(
        (v) =>
          !v?.calculation ||
          !v?.comparedVersion ||
          !v?.referenceVersion
      )
    );
    
    if (!isAnyFieldEmpty) {
      dispatch(
        setCalculatedFieldsSelection({
          ...calculatedFieldsRef.current,
          variance: variance
        })
      );
    }
  }, [dispatch]);

  const kpiMeasuresMap = useMemo(() => {
    const map = new Map();
    kpiMeasures.forEach((kpi) => {
      map.set(kpi.name, kpi);
    });
    return map;
  }, [kpiMeasures]);

  const kpiList = useMemo(() => {
    return uniqBy(
      selectedIds.map((item) => ({
        label: item.kpiLabel,
        value: item.name
      })),
      (item) => item.value
    );
  }, [selectedIds]);

  const getSelectedKpiList = useCallback((selectedIds) => {
    return uniqBy(
      selectedIds.map((item) => ({
        label: item.kpiLabel,
        value: item.name
      })),
      (item) => item.value
    );
  }, []);

  const handleKpiSelection = useCallback((selectedKpi) => {
    setSelectedVariance((currentVariance) => {
      const currentVarianceMap = new Map();
      currentVariance.forEach((item) => {
        currentVarianceMap.set(item.value, item);
      });

      const updatedVariance = selectedKpi.map((selectedItem) => {
        const existingItem = currentVarianceMap.get(selectedItem.value);

        if (existingItem) {
          return existingItem;
        }

        const kpiDetail = kpiMeasuresMap.get(selectedItem.value);
        const versionList = kpiDetail?.versions;

        return {
          label: selectedItem.label,
          header: selectedItem.label,
          value: selectedItem.value,
          versionList: versionList,
          varianceList: []
        };
      });

      return updatedVariance;
    });
  }, [kpiMeasuresMap]);

  const selectedIdsString = useMemo(() => {
    return selectedIds.map((id) => id.name).sort().join(",");
  }, [selectedIds]);

  const selectedIdsSet = useMemo(() => {
    return new Set(selectedIds.map((id) => id.name));
  }, [selectedIds]);

  const prevSelectedIdsRef = useRef();
  
  const currentVarianceString = useMemo(() => {
    return selectedVariance.map((v) => v.value).sort().join(",");
  }, [selectedVariance]);

  useEffect(() => {
    if (prevSelectedIdsRef.current === selectedIdsString) {
      return;
    }
    prevSelectedIdsRef.current = selectedIdsString;

    const persistedVarianceMap = new Map(
      (calculatedFieldsSelection?.variance || []).map((v) => [v.value, v])
    );

    const selectedKpiList = getSelectedKpiList(selectedIds).map(
      (item) => persistedVarianceMap.get(item.value) || item
    );

    const newValues = selectedKpiList.map((v) => v.value).sort().join(",");

    if (currentVarianceString !== newValues) {
      handleKpiSelection(selectedKpiList);
    }

    if (!isInitialized.current) {
      isInitialized.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIdsString, currentVarianceString]);

  useEffect(() => {
    dispatchVarianceToRedux(selectedVariance);
  }, [selectedVariance, dispatchVarianceToRedux]);

  const addVariance = useCallback((kpi, variance) => {
    setSelectedVariance((currentVariance) => {
      const selectedVarianceList = currentVariance.map((item) => {
        const filteredVarianceList = item.varianceList.filter(
          (existingVariance) => {
            return (
              existingVariance[VARIANCE_FIELDS.COMPARED_VERSION] &&
              existingVariance[VARIANCE_FIELDS.REFERENCE_VERSION] &&
              existingVariance[VARIANCE_FIELDS.CALCULATION]
            );
          }
        );

        if (item.value === kpi) {
          return {
            ...item,
            varianceList: [...filteredVarianceList, variance]
          };
        }

        return {
          ...item,
          varianceList: filteredVarianceList
        };
      });

      dispatchVarianceToRedux(selectedVarianceList);
      return selectedVarianceList;
    });
    
    setExpandedAccordion((prev) => {
      const newExpanded = [...prev];
      if (!newExpanded.includes(kpi)) {
        newExpanded.push(kpi);
      }
      return newExpanded;
    });
  }, [dispatchVarianceToRedux]);

  const removeVariance = useCallback((kpi, index) => {
    setSelectedVariance((currentVariance) => {
      const selectedVarianceList = currentVariance.map((item) => {
        if (item.value === kpi) {
          return {
            ...item,
            varianceList: item.varianceList.filter((_, i) => i !== index)
          };
        }
        return item;
      });

      dispatchVarianceToRedux(selectedVarianceList);
      return selectedVarianceList;
    });
  }, [dispatchVarianceToRedux]);

  const selectVarianceValues = useCallback((kpi, index, key, value) => {
    setSelectedVariance((currentVariance) => {
      const selectedVarianceList = currentVariance.map((item) => {
        if (item.value === kpi) {
          const newVarianceList = item.varianceList
            .map((variance, i) => {
              if (i === index) {
                const updatedVariance = { ...variance, [key]: value };

                if (key === VARIANCE_FIELDS.REFERENCE_VERSION) {
                  if (!updatedVariance.comparedVersion) {
                    updatedVariance.comparedVersion = defaultVersion?.value;
                  }
                  if (!updatedVariance.calculation) {
                    updatedVariance.calculation = DEFAULT_CALCULATION_OPTION.value;
                  }
                }

                const isDuplicate = item.varianceList.some((v, idx) => {
                  if (idx === index) return false;
                  return (
                    v.comparedVersion === updatedVariance.comparedVersion &&
                    v.referenceVersion === updatedVariance.referenceVersion &&
                    v.calculation === updatedVariance.calculation
                  );
                });

                if (isDuplicate) {
                  dispatch(
                    addSnack({
                      message: DUPLICATE_VARIANCE_ERROR_MESSAGE,
                      options: { variant: "error" }
                    })
                  );
                  return null;
                }

                return updatedVariance;
              }
              return variance;
            })
            .filter((v) => v !== null);

          return { ...item, varianceList: newVarianceList };
        }
        return item;
      });

      dispatchVarianceToRedux(selectedVarianceList);
      return selectedVarianceList;
    });
  }, [defaultVersion, dispatch, dispatchVarianceToRedux]);

  const accordionData = useMemo(() => {
    return selectedVariance.map((item) => ({
      value: item.value,
      header: item.header,
      content: (
        <KPIVariance
          kpi={item.value}
          varianceList={item.varianceList}
          versionList={item.versionList}
          addVariance={addVariance}
          removeVariance={removeVariance}
          selectVarianceValues={selectVarianceValues}
          planKpiConfig={planKpiConfig}
          defaultVersion={defaultVersion}
        />
      )
    }));
  }, [selectedVariance, planKpiConfig, addVariance, removeVariance, selectVarianceValues, defaultVersion]);

  return (
    <div>
      <div className="selectKpiContainer">
        <label className="selectKpiLabel">Select KPIs</label>
        <Select
          options={kpiList}
          onChange={handleKpiSelection}
          isMulti={true}
          value={selectedVariance}
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
          itemHeight={80}
          containerHeight={600}
        />
      </div>
    </div>
  );
};

export default VarianceSection;
