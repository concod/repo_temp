import { cloneDeep, get, isEqual, isEmpty } from "lodash";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setPivotAttributeValue,
  setPersistentPivotHideAttributes,
  selectPivotDescriptionData,
  selectPivotHideAttributes,
  selectPivotAttributeValue,
  selectPersistentPivotHideAttributes,
  selectIsPivotFilterOpen,
} from "../../../../../../pages-oms/OrderManagement/slices/pivot.slice";

export const usePersistentPivotFilters = () => {
  const dispatch = useDispatch();

  const pivotDescriptionData = useSelector(selectPivotDescriptionData);
  const pivotHideAttributes = useSelector(selectPivotHideAttributes);
  const pivotAttributeValue = useSelector(selectPivotAttributeValue);
  const isPivotFilterOpen = useSelector(selectIsPivotFilterOpen);
  const persistentPivotHideAttributes = useSelector(selectPersistentPivotHideAttributes);
  const attributeValues = get(pivotDescriptionData, "attribute_values", []);
  const dimension_options = get(pivotDescriptionData, "dimension_options", []);
  const { dimension_values = {}, attribute_values = {} } = pivotDescriptionData || {};

  const [hideAndShowFilterData, setHideAndShowFilterData] = useState(pivotHideAttributes);
  const [hideAndShowAttributeValue, setHideAndShowAttributeValue] = useState(pivotAttributeValue);
  const [dropdownOptions, setDropdownOptions] = useState(attributeValues);
  const dropDownOptionsRef = useRef(attributeValues);
  const [defaultDropdownOptions, setDefaultDropdownOptions] = useState(attributeValues);
  const [isPersistentFilterApplied, setIsPersistentFilterApplied] = useState(false);

  useEffect(() => {
    dropDownOptionsRef.current = attributeValues;
    setDefaultDropdownOptions((prev) => {
      if (!isEqual(prev, attributeValues)) {
        return attributeValues;
      }
      return prev;
    });
  }, [attributeValues]);

  useEffect(() => {
    if (!isEmpty(pivotAttributeValue)) {
      const updatedAttributeValues = cloneDeep(pivotAttributeValue);
      let localHasChanges = false;

      Object.keys(updatedAttributeValues).forEach((dimension) => {
        Object.keys(updatedAttributeValues[dimension]).forEach((attributeKey) => {
          if (
            persistentPivotHideAttributes[attributeKey] &&
            persistentPivotHideAttributes[attributeKey].length > 0
          ) {
            const currentOptions = updatedAttributeValues[dimension][attributeKey];
            const deselectedValuesSet = new Set(persistentPivotHideAttributes[attributeKey]);
            const filteredOptions = currentOptions.filter(
              (option) => !deselectedValuesSet.has(option.value)
            );

            if (filteredOptions.length !== currentOptions.length) {
              localHasChanges = true;
              const attributeOrder = dimension_values[dimension].map((attr) => attr.value);
              const currentAttributeIndex = attributeOrder.indexOf(attributeKey);

              const newAttributeValues = cloneDeep(hideAndShowAttributeValue);
              const newDropdownOptions = cloneDeep(dropdownOptions);

              if (!newAttributeValues[dimension]) {
                newAttributeValues[dimension] = {};
              }

              newAttributeValues[dimension][attributeKey] = filteredOptions;
              let allDependentValues = filteredOptions.flatMap((val) => {
                const found = attribute_values?.[dimension]?.[attributeKey]?.find(
                  (v) => v.value === val.value
                );
                return found?.dependent_hierarchies || [];
              });

              for (let i = currentAttributeIndex + 1; i < attributeOrder.length; i++) {
                const attrKey = attributeOrder[i];
                const allOptions = attribute_values[dimension]?.[attrKey] || [];
                const filteredOption =
                  filteredOptions.length === 0
                    ? []
                    : allOptions.filter((opt) => allDependentValues.includes(opt.value));

                newDropdownOptions[dimension][attrKey] = filteredOption;
                newAttributeValues[dimension][attrKey] = filteredOption.map((opt) => ({
                  label: opt.label,
                  value: opt.value,
                }));

                allDependentValues = filteredOption.flatMap(
                  (opt) => opt.dependent_hierarchies || []
                );
              }

              updatedAttributeValues[dimension] = newAttributeValues[dimension];
            }
          }
        });
      });

      setHideAndShowAttributeValue(updatedAttributeValues);
      setIsPersistentFilterApplied(localHasChanges);

      if (localHasChanges) {
        const newHideAndShowFilterData = { ...hideAndShowFilterData };
        Object.keys(persistentPivotHideAttributes).forEach((key) => {
          if (persistentPivotHideAttributes[key]?.length > 0) {
            newHideAndShowFilterData[key] = [...persistentPivotHideAttributes[key]];
          }
        });
        setHideAndShowFilterData(newHideAndShowFilterData);
      }
    }
  }, [pivotAttributeValue, pivotHideAttributes]);

  useEffect(() => {
    return () => {
      if (persistentPivotHideAttributes && Object.keys(persistentPivotHideAttributes).length > 0) {
        dispatch(setPersistentPivotHideAttributes({}));
      }
    };
  }, []);

  useEffect(() => {
    setHideAndShowFilterData(pivotHideAttributes);
  }, [pivotHideAttributes]);

  useEffect(() => {
    const av = get(pivotDescriptionData, "attribute_values", []);
    dispatch(setPivotAttributeValue(av));
    setDropdownOptions(av);
  }, [pivotDescriptionData]);

  const hasUnsavedChanges = useMemo(() => {
    const filterChanges = !isEqual(hideAndShowFilterData, pivotHideAttributes);
    const isAllFilterDropdownReset = Object.keys(hideAndShowFilterData).length
      ? Object.values(hideAndShowFilterData).filter((attribute) => attribute.length !== 0).length === 0
      : false;
    const attributeChanges = !isEqual(hideAndShowAttributeValue, pivotAttributeValue);
    const nonEmptySelectedHideAttributes =
      Object.keys(pivotHideAttributes).filter(
        (attribute) => pivotHideAttributes[attribute].length !== 0
      ).length > 0;
    return isAllFilterDropdownReset && !nonEmptySelectedHideAttributes
      ? false
      : filterChanges || attributeChanges;
  }, [
    hideAndShowFilterData,
    pivotHideAttributes,
    hideAndShowAttributeValue,
    pivotAttributeValue,
    isPivotFilterOpen,
  ]);

  return {
    pivotDescriptionData,
    pivotHideAttributes,
    dimension_values,
    dimension_options,
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
    isPersistentFilterApplied,
    hasUnsavedChanges,
    isPivotFilterOpen,
    persistentPivotHideAttributes,
  };
};
