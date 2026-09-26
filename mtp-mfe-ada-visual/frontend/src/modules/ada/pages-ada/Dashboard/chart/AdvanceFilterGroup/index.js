import React, { useEffect, useState } from "react";
import { cloneDeep, isEmpty } from "lodash";
import { useSelector } from "react-redux";

import FilterGroup from "core/commonComponents/filters/filterGroup";
import {
  fetchCrossFilterOptions,
  getEligibleSKU,
  getFormattedChartFilters,
  getSelectedProductStoreFilters,
} from "modules/ada/utils-ada/utilityFunctions";
import SelectContainer from "core/commonComponents/filters/SelectContainer";
import AdvanceFilter from "./AdvanceFilter";
import { useCoreFilterConfig } from "../useCoreFilterConfig";

const AdvanceFilterGroup = ({
  activeKey,
  id,
  setChartLoader,
  fetchChartData,
  setSelectedGraphFilters,
  setFilterApplied,
}) => {
  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const [filterData, setFilterData] = useState([]);
  const [inititalSelection, setInititalSelection] = useState([]);
  const [currentSelectOptions, setCurrentSelectOptions] = useState({});
  const [selectedOptions, setSelectedOptions] = useState({});
  const [prevStateSelectedOptions, setPrevStateSelectedOptions] = useState({});
  const [filterLoader, setFilterLoader] = useState(0);
  const [isOpen, setIsOpen] = useState({});
  const [
    isFirstApiCallDoneAfterSelection,
    setIsFirstApiCallDoneAfterSelection,
  ] = useState(false);
  const {
    coreFilterConfig,
    formattedCoreFilters,
    labelMap,
  } = useCoreFilterConfig();
  // To fetch eligible SKU's
  const fetchTenantFilters = async (selected, key) => {
    try {
      setFilterLoader((prevState) => prevState + 1);

      // Merged top level filters & visualization filters
      let selectedPayload = getFormattedChartFilters(adaReducer, selected);

      if (
        adaReducer?.clientConfig?.attribute_value?.custom_product_store_group
      ) {
        selectedPayload = selectedPayload?.filter(
          (elem) => elem?.filter_name !== "product_code"
        );

        selectedPayload = selectedPayload?.filter(
          (elem) => elem?.filter_name !== "store_code"
        );
      }

      if (adaReducer?.clientConfig?.attribute_value?.sales_org_dim_store) {
        let salesOrgFilter = selectedPayload.find(
          (elem) => elem.filter_id === "sales_org_name"
        );

        if (salesOrgFilter) {
          salesOrgFilter = JSON.parse(JSON.stringify(salesOrgFilter));
          salesOrgFilter.dimension = "store";

          // Check if the modified object already exists
          const isDuplicate = selectedPayload.some(
            (elem) =>
              elem.filter_id === "sales_org_name" && elem.dimension === "store"
          );

          if (!isDuplicate) {
            selectedPayload.push(salesOrgFilter);
          }
        }
      }
      // Preserve labels from core config
      const filterElements = formattedCoreFilters?.map((key) => ({
        ...key,
        filter_keyword: key.column_name,
        levelLabel: "Hierarchy",
        display_type: "dropdown",
        is_multiple_selection: true,
        label: labelMap.get(key.column_name) || key.label,
        type: "cascaded",
        component: SelectContainer,
        initialData: [],
      }));

      setInititalSelection(selectedPayload);
      setFilterData(filterElements);
    } catch (error) {
      console.log("Error in Fetching Chart filters", error);
    } finally {
      setFilterLoader((prevState) => prevState - 1);
    }
  };

  const updateFilters = async (currentDropdown, getAllFilters) => {
    try {
      if (getAllFilters) {
        setFilterApplied(true);
      }
      let selected = getAllFilters ? filterData : [cloneDeep(currentDropdown)];
      setFilterLoader((prevState) => prevState + 1);
      setChartLoader((prevState) => prevState + 1);

      // Merged top level filters & visualization filters
      // let selectedPayload = cloneDeep(filterData);
      let selectedPayload = getFormattedFilters(
        adaReducer,
        selected,
        selectedOptions
      );

      let filterResponse = await fetchCrossFilterOptions(
        selected,
        selectedPayload,
        "ada-visual",
        { application_code: 11 }
      );

      // Handling Product Sku filter
      let skuData = filterResponse?.find(
        ({ column_name }) => column_name === "product_code"
      );

      if (skuData) {
        let skuDataFilter = selected?.find(
          ({ filter_id }) => filter_id === "product_code"
        );

        // When redirected from Alerts, the dropdown should show only the SKU(s) selected by the user.
        if (adaReducer?.isRedirectedFromInventory) {
          //If the user has deselected all options
          if (skuDataFilter === undefined) {
            let redirectedFilters = getSelectedProductStoreFilters(adaReducer);
            skuDataFilter = redirectedFilters?.find(
              ({ filter_id }) => filter_id === "product_code"
            );
            skuData.initialData = skuDataFilter;
          }

          let selectedValues = skuDataFilter?.values?.map(
            (filter) => filter.value
          );
          let checkConfiguration = [{ checkedRows: selectedValues }];
          skuDataFilter["check_configuration"] = checkConfiguration;
        }

        //When user clicks on SelectAll option from DropDown
        if (
          skuDataFilter &&
          !skuDataFilter?.check_configuration[0]?.checkedRows
        ) {
          let selectedValues = skuDataFilter?.values?.map(
            (filter) => filter.value
          );
          let checkConfiguration = [{ checkedRows: selectedValues }];
          skuDataFilter["check_configuration"] = checkConfiguration;
        }

        let skuDataCheckConfig = skuDataFilter?.check_configuration;

        if (
          adaReducer?.clientConfig?.attribute_value?.show_features
            ?.graph_sku_dropdown
        ) {
          const skuResponse = await getEligibleSKU(
            adaReducer,
            cloneDeep(filterResponse),
            id,
            skuDataCheckConfig
          );
          skuData.initialData = skuResponse;
        }
      }
      setSelectedGraphFilters(selectedPayload);

      // on initial mount of component, there is no selection in visualization
      // so, we are only fetching chart data from this fn when selection is there

      let storeGroup =
        inititalSelection?.find((elem) => elem?.filter_id === "store_group")
          ?.values || [];
      let storeCodeFilter =
        selectedPayload?.find((elem) => elem?.filter_id === "store_code")
          ?.values || [];

      // If store group is selected but no store code is filtered, in that case we need to fetch store codes from reducer
      // and add them to selected payload else it will start fetching all store codes, this is an edge case for store group filter
      // as ada api's doesn't support store group filter
      if (storeGroup.length && !storeCodeFilter.length) {
        let storeCodes =
          adaReducer?.store?.find((elem) => elem?.filter_id === "store_code")
            ?.values || [];

        let store_code = {
          filter_name: "store_code",
          filter_id: "store_code",
          filter_type: "non-cascaded",
          dimension: "product",
          display_type: "dropdown",

          is_mandatory: false,
          values: storeCodes,
          attribute_name: "store_code",
          operator: "in",
        };

        selectedPayload.push(store_code);
      }

      if (getAllFilters) {
        fetchChartData(selectedPayload);
        setFilterApplied(true);
      }

      let clonedFilterData = cloneDeep(filterData);

      filterResponse.forEach((filter) => {
        let currFilterIndex = clonedFilterData?.findIndex(
          (elem) => elem?.column_name === filter?.column_name
        );
        clonedFilterData[currFilterIndex] = filter;
      });
      // currFilter.initialData = filterResponse?.[selectedId];

      setFilterData(cloneDeep(clonedFilterData));

      let clonedSelectedOptions = cloneDeep(selectedOptions);

      let selectedFilterIds = Object.keys(clonedSelectedOptions);

      selectedFilterIds.forEach((filterId) => {
        if (clonedSelectedOptions[filterId].length) {
          let response = filterResponse?.find(
            (elem) => elem?.column_name === filterId
          )?.initialData;
          clonedSelectedOptions[filterId] = response;
        }
      });
      if (selectedFilterIds.length) {
        setSelectedOptions(clonedSelectedOptions);
      }
    } catch (error) {
      console.log("Error in Fetching Chart filters", error);
    } finally {
      setFilterLoader((prevState) => prevState - 1);
      setChartLoader((prevState) => prevState - 1);
    }
  };

  useEffect(() => {
    if (!coreFilterConfig?.length || !adaReducer?.isFiltersValid) {
      return;
    }
    const selectedFilters = getSelectedProductStoreFilters(adaReducer);
    fetchTenantFilters(selectedFilters);
  }, [coreFilterConfig, adaReducer?.isFiltersValid]);

  return (
    <div
      style={{
        display: "flex",
        gap: "12px",
      }}
    >
      {filterData?.map((item, index) => {
        return (
          <AdvanceFilter
            label={item?.label}
            index={index}
            columnName={item?.column_name}
            firstColumnSelectionDone={
              selectedOptions?.[filterData?.[0]?.column_name]?.length
            }
            filterProps={item}
            isDefaultSelectionNeeded={true}
            // currentSelectOptions={currentSelectOptions[item?.column_name]}
            setCurrentSelectOptions={setCurrentSelectOptions}
            selectedOptions={selectedOptions[item?.column_name]}
            allSelectedOptions={selectedOptions}
            setSelectedOptions={setSelectedOptions}
            updateFilters={updateFilters}
            filterLoader={filterLoader}
            isOpen={isOpen[index]}
            isFirstDropdownOpen={isOpen[0]}
            setIsOpen={setIsOpen}
            isFirstApiCallDoneAfterSelection={isFirstApiCallDoneAfterSelection}
            setIsFirstApiCallDoneAfterSelection={
              setIsFirstApiCallDoneAfterSelection
            }
            prevStateSelectedOptions={
              prevStateSelectedOptions[item?.column_name]
            }
            setPrevStateSelectedOptions={setPrevStateSelectedOptions}
            isLoading={filterLoader}
          />
        );
      })}
    </div>
  );
};

export default AdvanceFilterGroup;

const handleInitialSelected = (adaReducer, filterData, setSelectedOptions) => {
  const clonedReducer = cloneDeep(adaReducer);
  let updatedInitialSelected = {};

  let selectedFilterId = filterData.map((el) => el?.column_name);
  for (let item of selectedFilterId) {
    let product = clonedReducer.product?.find(
      (elem) => elem?.filter_id === item
    );

    if (productIndex > -1) {
      updatedInitialSelected[item] = product;
    }

    let store = clonedReducer.store?.find((elem) => elem?.filter_id === item);

    if (productIndex > -1) {
      updatedInitialSelected[item] = store;
    }
  }

  setSelectedOptions(updatedInitialSelected);
};

const getFormattedFilters = (adaReducer, selected, selectedOptions) => {
  const clonedReducer = cloneDeep(adaReducer);

  let updatedSelected = mergeSelectedOptions(selectedOptions, selected);

  let selectedFilterId = updatedSelected.map((el) => el?.column_name);

  for (let item of selectedFilterId) {
    let currFilter = updatedSelected.find((el) => el?.column_name === item);

    let dimension = currFilter.dimension;

    let filterIndex = clonedReducer[dimension]?.findIndex(
      (elem) => elem?.filter_id === item
    );

    if (filterIndex > -1) {
      if (currFilter?.values?.length) {
        clonedReducer[dimension].splice(filterIndex, 1);
        clonedReducer[dimension].push(currFilter);
      }
    } else {
      if (currFilter?.values?.length) {
        clonedReducer[dimension].push(currFilter);
      }
    }
  }

  return [...clonedReducer.product, ...clonedReducer.store];
};

const mergeSelectedOptions = (selectedOptions, selected) => {
  let updatedSelected = cloneDeep(selected);

  for (let item in selectedOptions) {
    let filter = updatedSelected?.find((elem) => elem?.column_name === item);

    if (filter && selectedOptions[item]?.length) {
      filter.values = selectedOptions[item];
      filter.filter_id = item;
    }
  }

  return updatedSelected;
};
