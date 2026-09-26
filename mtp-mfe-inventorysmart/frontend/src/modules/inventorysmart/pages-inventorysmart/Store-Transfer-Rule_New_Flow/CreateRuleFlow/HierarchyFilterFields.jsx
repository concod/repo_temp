import React, { useCallback, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Select } from "impact-ui-v3";
import { addSnack } from "core/actions/snackbarActions";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { fetchStoreTransferFilterValues } from "modules/inventorysmart/services-inventorysmart/Store-Transfer-Rule/store-transfer-rule";
import {
  buildHierarchyFilterCacheKey,
  buildStoreTransferFilterPayload,
  extractStoreTransferFilterValues,
  mapStoreTransferFilterOptions,
} from "./storeSelectionUtils";
import FieldLabel from "./FieldLabel";
import { useCreateRuleFlowStyles } from "./useCreateRuleFlowStyles";

const HierarchyFilterFields = ({
  selectedTab,
  hierarchyFilters = [],
  selectedValues = {},
  onSelectedValuesChange,
  isDisabled = false,
}) => {
  const dispatch = useDispatch();
  const classes = useCreateRuleFlowStyles();
  const [filterOptions, setFilterOptions] = useState({});
  const [selectAllState, setSelectAllState] = useState({});
  const [openColumn, setOpenColumn] = useState(null);
  const [loadingColumn, setLoadingColumn] = useState(null);
  const fetchInFlightRef = useRef({});
  const optionsCacheRef = useRef({});

  const updateSelectAllState = (column, selectedOptions, options) => {
    setSelectAllState((prev) => ({
      ...prev,
      [column]:
        options.length > 0 && selectedOptions.length === options.length,
    }));
  };

  const invalidateDownstreamOptions = (column) => {
    const currentIndex = hierarchyFilters.findIndex(
      (filter) => filter.column === column
    );

    hierarchyFilters.slice(currentIndex + 1).forEach((filter) => {
      delete optionsCacheRef.current[filter.column];
    });
  };

  const fetchFilterOptions = useCallback(
    async (column) => {
      if (fetchInFlightRef.current[column]) {
        return;
      }

      fetchInFlightRef.current[column] = true;
      setLoadingColumn(column);

      try {
        const payload = buildStoreTransferFilterPayload({
          tab: selectedTab,
          get: column,
          hierarchyFilters,
          selectedValues,
          currentColumn: column,
        });
        const response = await dispatch(fetchStoreTransferFilterValues(payload));

        if (response?.data?.status) {
          const options = mapStoreTransferFilterOptions(
            extractStoreTransferFilterValues(response?.data)
          );
          const cacheKey = buildHierarchyFilterCacheKey(
            column,
            hierarchyFilters,
            selectedValues
          );

          optionsCacheRef.current[column] = cacheKey;

          setFilterOptions((prev) => ({
            ...prev,
            [column]: options,
          }));

          updateSelectAllState(
            column,
            selectedValues[column] || [],
            options
          );
          return;
        }

        dispatch(
          addSnack({
            message: response?.data?.message || ERROR_MESSAGE,
            options: { variant: "error" },
          })
        );
      } catch (error) {
        const errObj = error?.response?.data;
        dispatch(
          addSnack({
            message: errObj?.show_message ? errObj.message : ERROR_MESSAGE,
            options: { variant: "error" },
          })
        );
        setFilterOptions((prev) => ({
          ...prev,
          [column]: [],
        }));
      } finally {
        fetchInFlightRef.current[column] = false;
        setLoadingColumn(null);
      }
    },
    [dispatch, hierarchyFilters, selectedTab, selectedValues]
  );

  const handleDropdownOpen = (column) => {
    const cacheKey = buildHierarchyFilterCacheKey(
      column,
      hierarchyFilters,
      selectedValues
    );

    if (optionsCacheRef.current[column] === cacheKey) {
      return;
    }

    fetchFilterOptions(column);
  };

  const handleSelectionChange = (column, selectedOptions) => {
    const nextSelectedOptions = selectedOptions || [];
    const options = filterOptions[column] || [];

    invalidateDownstreamOptions(column);

    const currentIndex = hierarchyFilters.findIndex(
      (filter) => filter.column === column
    );
    const next = { ...selectedValues, [column]: nextSelectedOptions };

    hierarchyFilters.slice(currentIndex + 1).forEach((filter) => {
      next[filter.column] = [];
    });

    onSelectedValuesChange?.(next);

    updateSelectAllState(column, nextSelectedOptions, options);

    setFilterOptions((prev) => {
      const next = { ...prev };
      const currentIndex = hierarchyFilters.findIndex(
        (filter) => filter.column === column
      );

      hierarchyFilters.slice(currentIndex + 1).forEach((filter) => {
        delete next[filter.column];
      });

      return next;
    });

    setSelectAllState((prev) => {
      const next = { ...prev, [column]: false };
      const currentIndex = hierarchyFilters.findIndex(
        (filter) => filter.column === column
      );

      hierarchyFilters.slice(currentIndex + 1).forEach((filter) => {
        next[filter.column] = false;
      });

      return next;
    });
  };

  if (!hierarchyFilters.length) {
    return null;
  }

  return (
    <div className={classes.hierarchyFiltersRow}>
      {hierarchyFilters.map((filter) => (
        <div key={filter.column} className={classes.hierarchyFilterField}>
          <FieldLabel>{filter.label}</FieldLabel>
          <Select
            placeholder="Select"
            isMulti
            isClearable
            isWithSearch
            withPortal
            toggleSelectAll
            isDisabled={isDisabled}
            isOpen={isDisabled ? false : openColumn === filter.column}
            setIsOpen={(isOpen) =>
              setOpenColumn(isOpen ? filter.column : null)
            }
            onDropdownOpen={() => handleDropdownOpen(filter.column)}
            isLoading={loadingColumn === filter.column}
            currentOptions={filterOptions[filter.column] || []}
            initialOptions={filterOptions[filter.column] || []}
            selectedOptions={selectedValues[filter.column] || []}
            setSelectedOptions={(options) =>
              handleSelectionChange(filter.column, options)
            }
            handleChange={(options) =>
              handleSelectionChange(filter.column, options)
            }
            isSelectAll={Boolean(selectAllState[filter.column])}
            setIsSelectAll={(value) =>
              setSelectAllState((prev) => ({
                ...prev,
                [filter.column]: value,
              }))
            }
            minWidth="289px"
            width="289px"
          />
        </div>
      ))}
    </div>
  );
};

export default HierarchyFilterFields;
