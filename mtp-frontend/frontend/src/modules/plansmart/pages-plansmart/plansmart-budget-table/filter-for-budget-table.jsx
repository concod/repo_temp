import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, Grid } from "@mui/material";
import { connect } from "react-redux";
import { get, isEqual } from "lodash";
import Form from "core/Utils/form";
import { FILTER_FIELDS } from "modules/plansmart/utils-plansmart";
import { useBudgetStyles } from "./budget-table-style";
import {
  checkFormatOfNumber,
  setTargetDefaultValue,
  updateFilterChips,
} from "./budget-table-functions";
import { getPlanFilterDropdownOptions } from "modules/plansmart/services-plansmart/BudgetPlanTable/budget-plan-table-service";
import { isWeekNumber } from "modules/plansmart/utils-plansmart/ConstantFunctions";
import PlanSmartUpdatePlanModal from "../PlanSmartUpdatePlanModal";

export const FilterForBudgetTable = (props) => {
  const {
    selectedLevel,
    setFiltersForBudgetTable,
    filtersForRows,
    planDetails,
    tabData,
    setTargetFormValues,
    disableAllOptions,
    pivotViewMode,
    setFilterChips,
    viewMode,
    updateConstraintFilterReq,
    planSmartBudgetTableLoader,
    planCode,
    setTabData,
    planBudgetData,
    agTableRef,
    updatedIndexStack,
    setShowFilter,
  } = props;

  const classes = useBudgetStyles();
  const [selectedValues, setSelectedValues] = useState([]);
  const [dropDownFilters, setDropDownFilters] = useState([]);

  const [showClassUpdateAlert, setShowClassUpdateAlert] = useState(false);
  const [updatedClassValues, setUpdatedClassValues] = useState({});

  useEffect(() => {
    setSelectedValues(filtersForRows);
  }, [filtersForRows]);

  const getFilterDependency = (elementsData, selectedOptions, index) => {
    if (selectedOptions) {
      let dependency = [];
      elementsData.forEach((key, Idx) => {
        if (Idx < index) {
          let val = [
            selectedOptions[key.column_name] ||
              key.options.map((option) => option.value),
          ].flat();
          dependency.push({
            attribute_name: key.column_name,
            operator: "in",
            values: val,
            filter_type: "cascaded",
            dimension: "product",
          });
        }
      });
      return dependency;
    } else {
      return [];
    }
  };

  const saveFilterLevelsForBudgetTable = async (val, _id, item) => {
    updateFilterChips(dropDownFilters, val, setFilterChips);
    const changedHchyIndx = tabData.findIndex(
      (data) => data.column_name === item.column_name
    );
    const updatedTabData = tabData.map(async (data, tabInx) => {
      if (changedHchyIndx < tabInx && changedHchyIndx !== tabInx) {
        let body = {
          attribute_name: data.column_name,
          filter_type: "cascaded",
          filters: getFilterDependency(tabData, val, tabInx),
        };
        const options = await getPlanFilterDropdownOptions(planCode, body)();
        let filterOptions = options.data.data.map((option) => {
          return {
            value: option.attribute,
            label: option.attribute,
            id: option.attribute,
          };
        });
        return {
          ...data,
          options: filterOptions,
        };
      }
      return new Promise((resolve) => {
        resolve(data);
      });
    });
    const fetchedOptions = await Promise.all(updatedTabData);
    const updatedSelection = {
      ...filtersForRows,
      [item.level]: val[item.accessor],
    };
    setTabData(fetchedOptions);
    if (item?.type === "Class" && updatedIndexStack > 0) {
      setUpdatedClassValues(updatedSelection);
      setShowClassUpdateAlert(true);
    } else {
      setSelectedValues(updatedSelection);
    }
  };

  const updateFilter = (isUpdateFilterForBudgetTable) => {
    let tempFilter = [],
      tempBudgetLevelFilters = [],
      setFiltersForRows = {};
    const isBottomUp = planDetails?.plan_type === "bottom-up" ? true : false;
    if (planDetails) {
      tabData.forEach((index) => {
        tempBudgetLevelFilters.push({
          ...index,
          label: index?.type,
          level: index?.id,
          field_type: "dropdown",
          isMulti: true,
          accessor: index?.column_name,
          options: [...index.options],
          isDisabled: disableAllOptions,
          is_clearable: true,
        });
      });
      let currentFilterLevel = tempBudgetLevelFilters.findIndex(
        (o) => o?.level === selectedLevel
      );
      currentFilterLevel =
        selectedLevel === "sku"
          ? isBottomUp
            ? 0
            : tempBudgetLevelFilters.length - 1
          : currentFilterLevel;
      if (isBottomUp) {
        for (
          let i = tempBudgetLevelFilters?.length - 1;
          i >= currentFilterLevel;
          i--
        ) {
          if (i > currentFilterLevel) {
            tempBudgetLevelFilters[i].isDisabled = pivotViewMode ? false : true;
          }
          tempFilter.push(tempBudgetLevelFilters[i]);
          setFiltersForRows[
            tempBudgetLevelFilters?.[i]?.accessor
          ] = filtersForRows[tempBudgetLevelFilters?.[i]?.accessor]
            ? filtersForRows[tempBudgetLevelFilters[i]?.accessor]
            : tempBudgetLevelFilters?.[i]?.options.map(
                (option) => option.value
              );
        }
      } else {
        for (let i = 0; i <= currentFilterLevel; i++) {
          if (i < currentFilterLevel) {
            tempBudgetLevelFilters[i].isDisabled = pivotViewMode ? false : true;
          }

          tempFilter.push(tempBudgetLevelFilters[i]);
          setFiltersForRows[
            tempBudgetLevelFilters[i]?.accessor
          ] = filtersForRows[tempBudgetLevelFilters[i]?.accessor]
            ? filtersForRows[tempBudgetLevelFilters[i]?.accessor]
            : tempBudgetLevelFilters[i].options.map((option) => option.value);
        }
      }
      if (isUpdateFilterForBudgetTable) {
        setFiltersForBudgetTable(setFiltersForRows);
      }
      setDropDownFilters(tempFilter);
    }
  };

  useEffect(() => {
    updateFilter(true);
  }, [planDetails, selectedLevel]);

  useEffect(() => {
    updateFilter();
  }, [tabData]);

  useEffect(() => {
    updateFilterChips(dropDownFilters, props.filtersForRows, setFilterChips);
  }, [props.filtersForRows]);

  const formatValue = (dataObj) => {
    let values = { ...dataObj };
    Object.keys(values).forEach((key) => {
      values[key] = values[key] ? values[key] : null;
    });
    return values;
  };

  const handleClassUpdateAlert = () => {
    setFiltersForBudgetTable(updatedClassValues);
    setShowClassUpdateAlert(false);
  };

  const handleFilter = () => {
    setFiltersForBudgetTable(selectedValues);
    setShowFilter(false);
  };
  return (
    <>
      {dropDownFilters?.length > 0 && (
        <Form
          layout="vertical"
          updateDefaultValue={false}
          maxFieldsInRow={5}
          labelWidthSpan={6}
          fieldTypeWidthSpan={6}
          handleChange={(val, id, item) => {
            saveFilterLevelsForBudgetTable(val, id, item);
          }}
          fields={dropDownFilters}
          defaultValues={formatValue(selectedValues)}
        ></Form>
      )}

      <Box display="flex" justifyContent="flex-end" mt={1}>
        <Button
          variant="contained"
          id="plansmartBudgetTableFilterBtn"
          color="primary"
          onClick={handleFilter}
        >
          Filter
        </Button>
      </Box>

      {showClassUpdateAlert && (
        <PlanSmartUpdatePlanModal
          showUpdatePlanAlert={showClassUpdateAlert}
          onSubmit={handleClassUpdateAlert}
          onClose={() => setShowClassUpdateAlert(false)}
        />
      )}
    </>
  );
};

const mapState = (store) => {
  return {
    planSmartBudgetTableLoader: get(
      store,
      "plansmartReducer.planBudgetTableReducer.plansmartBudgetTableLoader",
      false
    ),
  };
};

export default connect(mapState)(FilterForBudgetTable);
