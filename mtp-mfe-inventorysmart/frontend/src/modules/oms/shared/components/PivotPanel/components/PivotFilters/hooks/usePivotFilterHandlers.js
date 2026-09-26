import { cloneDeep, get } from "lodash";
import { useDispatch } from "react-redux";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import {
  setPivotHideAttributes,
  setPivotAttributeValue,
  setPersistentPivotHideAttributes,
  setIsPivotFilterOpen,
} from "../../../../../../pages-oms/OrderManagement/slices/pivot.slice";
import { clearExpandedRows } from "../../../../../ViewManagement/viewState.util";
import {
  SORTABLE_DIMENSIONS_FILTERS_DROPDOWN,
  FISCAL_YEAR_ATTRIBUTES,
} from "../../../../../../pages-oms/OrderManagement/constants/pivotFilters.constants";

export const usePivotFilterHandlers = ({
  tableRef,
  dimension_values,
  attribute_values,
  attributeValues,
  hideAndShowFilterData,
  setHideAndShowFilterData,
  hideAndShowAttributeValue,
  setHideAndShowAttributeValue,
  dropdownOptions,
  setDropdownOptions,
  dropDownOptionsRef,
  defaultDropdownOptions,
}) => {
  const dispatch = useDispatch();

  const getAttributeSelectedOptions = (dimension, attribute) => {
    return get(hideAndShowAttributeValue[dimension], attribute, []).map((value) => ({
      label: replaceSpecialCharacter(value.label),
      value: value.value,
    }));
  };

  const getSelectOptionsFromPlanDetails = (dimension, attribute, dropdownOpts, updatedDropdownOptions) => {
    let updatedOptions = [];
    if (updatedDropdownOptions && updatedDropdownOptions[dimension]) {
      updatedOptions = get(updatedDropdownOptions[dimension], attribute.value, []);
    }

    const optionsToUse =
      updatedOptions.length > 0
        ? updatedOptions
        : get(dropdownOpts[dimension], attribute.value, []);

    const currentDropdownOptions = optionsToUse.map((value) => ({
      label: replaceSpecialCharacter(value.label),
      value: value.value,
    }));

    return SORTABLE_DIMENSIONS_FILTERS_DROPDOWN.includes(dimension.toLowerCase())
      ? currentDropdownOptions?.sort((a, b) => a.label.localeCompare(b.label))
      : currentDropdownOptions;
  };

  const onHideAndShowFilterChange = ({ selectedValue, attribute, dimension }) => {
    const attributeOrder = dimension_values[dimension].map((attr) => attr.value);
    const currentAttributeIndex = attributeOrder.indexOf(attribute.value);

    const newAttributeValues = cloneDeep(hideAndShowAttributeValue);
    const newDropdownOptions = cloneDeep(dropdownOptions);

    if (!newAttributeValues[dimension]) {
      newAttributeValues[dimension] = {};
    }

    newAttributeValues[dimension][attribute.value] = selectedValue;

    if (dimension === "time") {
      const selectedAttributeValues = selectedValue.map((value) => {
        return attribute_values?.[dimension]?.[attribute.value]?.find(
          (opt) => opt.value === value.value
        );
      });

      const allDependentHierarchyValues = {};
      selectedAttributeValues.forEach((attributeValue) => {
        Object.keys(attributeValue.descendant_hierarchies).forEach((hierarchy) => {
          allDependentHierarchyValues[hierarchy] = [
            ...(allDependentHierarchyValues[hierarchy] || []),
            ...attributeValue.descendant_hierarchies[hierarchy],
          ];
        });
      });

      for (let i = currentAttributeIndex + 1; i < attributeOrder.length; i++) {
        const attrKey = attributeOrder[i];
        const allOptions = attribute_values[dimension]?.[attrKey] || [];
        const filteredOptions = allOptions.filter((opt) =>
          FISCAL_YEAR_ATTRIBUTES.includes(attrKey)
            ? allDependentHierarchyValues[attrKey]?.includes(Number(opt.value))
            : allDependentHierarchyValues[attrKey]?.includes(opt.value)
        );
        newDropdownOptions[dimension][attrKey] = filteredOptions;
        newAttributeValues[dimension][attrKey] = filteredOptions.map((opt) => ({
          label: opt.label,
          value: opt.value,
        }));
      }
    } else {
      let allDependentValues = selectedValue.flatMap((val) => {
        const found = attribute_values?.[dimension]?.[attribute.value]?.find(
          (v) => v.value === val.value
        );
        return found?.dependent_hierarchies || [];
      });

      for (let i = currentAttributeIndex + 1; i < attributeOrder.length; i++) {
        const attrKey = attributeOrder[i];
        const allOptions = attribute_values[dimension]?.[attrKey] || [];
        const filteredOptions =
          selectedValue.length === 0
            ? []
            : allOptions.filter((opt) => allDependentValues.includes(opt.value));
        newDropdownOptions[dimension][attrKey] = filteredOptions;
        newAttributeValues[dimension][attrKey] = filteredOptions.map((opt) => ({
          label: opt.label,
          value: opt.value,
        }));
        allDependentValues = filteredOptions.flatMap((opt) => opt.dependent_hierarchies || []);
      }
    }

    setHideAndShowAttributeValue(newAttributeValues);
    setDropdownOptions(newDropdownOptions);

    let selectedHideAttributes = { ...hideAndShowFilterData };
    attributeOrder.forEach((attrKey) => {
      const selectedValues = newAttributeValues[dimension][attrKey] || [];
      const allValues = getSelectOptionsFromPlanDetails(
        dimension,
        { value: attrKey },
        defaultDropdownOptions
      );
      if (!selectedValues.length) {
        selectedHideAttributes[attrKey] = allValues.map((val) => val.value);
      } else if (selectedValues.length === allValues.length) {
        selectedHideAttributes[attrKey] = [];
      } else {
        const selected = selectedValues.map((val) => val.value);
        const nonSelected = allValues
          .filter((val) => !selected.includes(val.value))
          .map((val) => val.value);
        selectedHideAttributes[attrKey] = nonSelected;
      }
    });

    setHideAndShowFilterData(selectedHideAttributes);
  };

  const applyHideAndShowFilterChange = () => {
    // Wipe persisted expanded_rows on user-initiated filter apply so AG Grid
    // does not auto-expand routes that the new pivot_filters would exclude
    // (which would otherwise produce a 204 on the second apply).
    clearExpandedRows();
    dispatch(setPersistentPivotHideAttributes(hideAndShowFilterData));
    dispatch(setPivotAttributeValue(hideAndShowAttributeValue));
    dispatch(setPivotHideAttributes(hideAndShowFilterData));

    const allColumns = tableRef?.current?.api?.getColumns();
    allColumns?.forEach((column) => {
      const colDef = column.userProvidedColDef;
      let isVisible = Object.entries(hideAndShowFilterData).every(([key, value]) => {
        const stringValues = value.map((val) => String(val));
        return !stringValues.includes(String(colDef[key]));
      });
      if (colDef.hide) isVisible = false;
      tableRef?.current?.api?.setColumnVisible(colDef.field, isVisible);
    });

    dispatch(setIsPivotFilterOpen(false));
  };

  const handlePivotFilterReset = () => {
    setHideAndShowFilterData({});
    setHideAndShowAttributeValue(attributeValues);
    setDropdownOptions(attributeValues);
    dispatch(setPersistentPivotHideAttributes({}));
  };

  return {
    onHideAndShowFilterChange,
    applyHideAndShowFilterChange,
    handlePivotFilterReset,
    getAttributeSelectedOptions,
    getSelectOptionsFromPlanDetails,
  };
};
