import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Select, useTranslation } from "impact-ui-v3";
import Loader from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import {
  getCombinedFilterDashboardData,
  mapDataToLabel,
} from "core/commonComponents/coreComponentScreen/utils";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { fetchDCSelectionFilterConfiguration } from "modules/inventorysmart/services-inventorysmart/DC-Transfer-Rule/dc-transfer-rule";
import {
  buildDCSelectionAppliedFilters,
  buildDCSelectionFilterCacheKey,
  buildDCSelectionFilterFields,
  extractFilterConfigList,
} from "./dcSelectionFilterUtils";
import FieldLabel from "./FieldLabel";
import { useCreateRuleFlowStyles } from "./useCreateRuleFlowStyles";

const DCSelectionFilters = ({
  selectedValues = {},
  onSelectedValuesChange,
  onFilterFieldsChange,
  onSelectAllStateChange,
  onConfigLoadingChange,
  isDisabled = false,
}) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const classes = useCreateRuleFlowStyles();
  const [filterFields, setFilterFields] = useState([]);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [filterOptions, setFilterOptions] = useState({});
  const [selectAllState, setSelectAllState] = useState({});
  const [openColumn, setOpenColumn] = useState(null);
  const [loadingColumn, setLoadingColumn] = useState(null);
  const fetchInFlightRef = useRef({});
  const optionsCacheRef = useRef({});

  const displaySnack = (message, variant = "error") => {
    dispatch(
      addSnack({
        message,
        options: { variant },
      })
    );
  };

  const handleErrorMessage = (error) => {
    const errObj = error?.response?.data;
    if (errObj?.show_message) {
      displaySnack(errObj.message);
    } else {
      displaySnack(ERROR_MESSAGE);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadFilterConfig = async () => {
      setIsConfigLoading(true);
      try {
        const response = await fetchDCSelectionFilterConfiguration()();
        if (cancelled) return;
        const fields = buildDCSelectionFilterFields(
          extractFilterConfigList(response)
        );
        setFilterFields(fields);
        onFilterFieldsChange?.(fields);
      } catch (error) {
        if (!cancelled) {
          handleErrorMessage(error);
          setFilterFields([]);
          onFilterFieldsChange?.([]);
        }
      } finally {
        if (!cancelled) {
          setIsConfigLoading(false);
          onConfigLoadingChange?.(false);
        }
      }
    };

    loadFilterConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const hasSelection = Object.values(selectedValues || {}).some(
      (options) => Array.isArray(options) && options.length > 0
    );
    if (hasSelection) {
      return;
    }

    setSelectAllState({});
    onSelectAllStateChange?.({});
    optionsCacheRef.current = {};
    setFilterOptions({});
    setOpenColumn(null);
  }, [selectedValues]);

  const updateSelectAllState = (column, selectedOptions, options) => {
    const isSelectAll =
      options.length > 0 && selectedOptions.length === options.length;
    setSelectAllState((prev) => {
      const next = { ...prev, [column]: isSelectAll };
      onSelectAllStateChange?.(next);
      return next;
    });
  };

  const invalidateDownstreamOptions = (column) => {
    const currentIndex = filterFields.findIndex(
      (field) => field.column_name === column
    );

    filterFields.slice(currentIndex + 1).forEach((field) => {
      delete optionsCacheRef.current[field.column_name];
    });
  };

  const fetchFilterOptions = useCallback(
    async (column) => {
      const field = filterFields.find((item) => item.column_name === column);
      if (!field || fetchInFlightRef.current[column]) {
        return;
      }

      fetchInFlightRef.current[column] = true;
      setLoadingColumn(column);

      try {
        const filterDashboardData = await getCombinedFilterDashboardData(
          [
            {
              column_name: field.column_name,
              dimension: field.dimension,
              type: field.type,
              display_type: "dropdown",
            },
          ],
          buildDCSelectionAppliedFilters(filterFields, selectedValues, column)
        );
        const options = (filterDashboardData?.[column] || []).map(mapDataToLabel);
        const cacheKey = buildDCSelectionFilterCacheKey(
          column,
          filterFields,
          selectedValues
        );

        optionsCacheRef.current[column] = cacheKey;
        setFilterOptions((prev) => ({
          ...prev,
          [column]: options,
        }));
        updateSelectAllState(column, selectedValues[column] || [], options);
      } catch (error) {
        handleErrorMessage(error);
        setFilterOptions((prev) => ({
          ...prev,
          [column]: [],
        }));
      } finally {
        fetchInFlightRef.current[column] = false;
        setLoadingColumn(null);
      }
    },
    [filterFields, selectedValues]
  );

  const handleDropdownOpen = (column) => {
    const cacheKey = buildDCSelectionFilterCacheKey(
      column,
      filterFields,
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
    const currentIndex = filterFields.findIndex(
      (field) => field.column_name === column
    );
    const next = { ...selectedValues, [column]: nextSelectedOptions };

    invalidateDownstreamOptions(column);
    filterFields.slice(currentIndex + 1).forEach((field) => {
      next[field.column_name] = [];
    });

    onSelectedValuesChange?.(next);

    setFilterOptions((prev) => {
      const nextOptions = { ...prev };
      filterFields.slice(currentIndex + 1).forEach((field) => {
        delete nextOptions[field.column_name];
      });
      return nextOptions;
    });

    setSelectAllState((prev) => {
      const nextState = {
        ...prev,
        [column]:
          options.length > 0 &&
          nextSelectedOptions.length === options.length,
      };
      filterFields.slice(currentIndex + 1).forEach((field) => {
        nextState[field.column_name] = false;
      });
      onSelectAllStateChange?.(nextState);
      return nextState;
    });
  };

  return (
    <Loader loader={isConfigLoading} minHeight={80}>
      {filterFields.length ? (
        <div className={classes.dcFiltersRow}>
          {filterFields.map((field) => (
            <div key={field.column_name} className={classes.dcFilterField}>
              <FieldLabel isRequired={Boolean(field.is_mandatory)}>
                {field.label}
              </FieldLabel>
              <Select
                placeholder={t("filters.select")}
                isMulti={field.is_multiple_selection}
                isClearable
                isWithSearch
                withPortal
                isDisabled={isDisabled}
                toggleSelectAll={field.is_multiple_selection && !isDisabled}
                isOpen={!isDisabled && openColumn === field.column_name}
                setIsOpen={(isOpen) =>
                  setOpenColumn(isOpen ? field.column_name : null)
                }
                onDropdownOpen={() => {
                  if (!isDisabled) {
                    handleDropdownOpen(field.column_name);
                  }
                }}
                isLoading={loadingColumn === field.column_name}
                currentOptions={filterOptions[field.column_name] || []}
                setCurrentOptions={(options) =>
                  setFilterOptions((prev) => ({
                    ...prev,
                    [field.column_name]: options,
                  }))
                }
                initialOptions={filterOptions[field.column_name] || []}
                selectedOptions={selectedValues[field.column_name] || []}
                setSelectedOptions={(options) => {
                  if (!isDisabled) {
                    handleSelectionChange(field.column_name, options);
                  }
                }}
                handleChange={(options) => {
                  if (!isDisabled) {
                    handleSelectionChange(field.column_name, options);
                  }
                }}
                isSelectAll={Boolean(selectAllState[field.column_name])}
                setIsSelectAll={(value) => {
                  if (isDisabled) {
                    return;
                  }
                  setSelectAllState((prev) => {
                    const next = { ...prev, [field.column_name]: value };
                    onSelectAllStateChange?.(next);
                    return next;
                  });
                }}
                minWidth="289px"
                width="289px"
              />
            </div>
          ))}
        </div>
      ) : null}
    </Loader>
  );
};

export default DCSelectionFilters;
