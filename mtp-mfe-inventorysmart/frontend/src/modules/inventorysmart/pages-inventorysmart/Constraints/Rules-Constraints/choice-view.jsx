import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import globalStyles from "core/Styles/globalStyles";
import { getChoiceViewData } from "../../../services-inventorysmart/Rules-Contraints/rules-contraints-services";
import Loader from "core/Utils/Loader/loader";
import { handleErrorMessage } from "./add-rcl-component";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
  scrollIntoView,
} from "../../inventorysmart-utility.js";
import { isEmpty, cloneDeep } from "lodash";
import { formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import { CHOICE_VIEW_CUSTOM_FILTER_CONFIG } from "../../../constants-inventorysmart/stringConstants";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { IS_OVERRIDEN_CORE_BUTTON_WIDTH,IS_OVERRIDEN_CORE_BUTTON_PLACEMENT } from "config/constants";

const ChoiceViewComponent = (props) => {
  const [tableColumns, setTableColumns] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [userChoiceFilterConfig, setUserChoiceFilterConfig] = useState([]);
  const [displayTable, setDisplayTable] = useState(false);
  const [userChoiceLoading, setUserChoiceLoading] = useState(false);

  const agGridInstance = useRef(null);
  const tableRef = useRef(null);

  const globalClasses = globalStyles();

  useEffect(() => {
    (async () => {
      try {
        setUserChoiceLoading(true);
        let filterConfigResponse = await fetchFilterConfig(
          "Choice View Filter Config"
        );
        setUserChoiceFilterConfig(filterConfigResponse);
      } catch (err) {
        handleErrorMessage(err, props);
      } finally {
        setUserChoiceLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (
      isEmpty(props.filterDashboardConfiguration) &&
      !isEmpty(userChoiceFilterConfig)
    ) {
      setUserChoiceLoading(true);
      const getFilterValues = async (selected, current) => {
        try {
          let requiredFilterObjParams = {
            allFilters: cloneDeep(userChoiceFilterConfig),
            appliedFilters: selected,
            current: current,
            rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
            screenName: props.screenName,
          };
          const response = await fetchFilterOptions(requiredFilterObjParams);
          const filterDataWithCustomFilter = response?.map((data_key) => {
            if (data_key?.column_name === "view_date") {
              data_key = { ...data_key, disablePast: true };
              return data_key;
            }
            return data_key;
          });
          const filterConfigData = [
            {
              filterDashboardData: [
                ...filterDataWithCustomFilter,
                ...CHOICE_VIEW_CUSTOM_FILTER_CONFIG,
              ],
              expectedFilterDimensions: getFilterDimensions([
                ...filterDataWithCustomFilter,
                ...CHOICE_VIEW_CUSTOM_FILTER_CONFIG,
              ]),
              isCrossDimensionFilter: true,
              screen_name: props.screenName,
            },
          ];
          const filterConfig = formattedFilterConfiguration(
            "choiceViewFilterConfiguration",
            filterConfigData,
            "Store Allocations Choice View"
          );
          props.setFilterConfiguration(filterConfig);
          setUserChoiceLoading(false);
        } catch (e) {
          setUserChoiceLoading(false);
          handleErrorMessage(e, props);
        }
      };
      getFilterValues();
    }
  }, [userChoiceFilterConfig]);

  const fetchTableData = async (dependencyData) => {
    try {
      setUserChoiceLoading(true);

      // Creating a map for quick lookup
      const dependencyMap = dependencyData.reduce((acc, item) => {
        acc[item.attribute_name] = item.values;
        return acc;
      }, {});

      const body = {
        filters: dependencyData.reduce(
          (acc, item) => {
            if (
              item.attribute_name !== "view_date" &&
              item.attribute_name !== "view_metric"
            ) {
              acc.push(item);
            }
            return acc;
          },
          [...props.parentFilterConfig]
        ),

        view_metric:
          dependencyMap.view_metric?.length > 0
            ? dependencyMap.view_metric.map((item) =>
                item !== "WOS"
                  ? item.toLowerCase() + "_stock"
                  : item.toLowerCase()
              )
            : ["wos", "min_stock", "max_stock"],

        view_date: dependencyMap.view_date,
      };

      const response = await props.getChoiceViewData(body);
      if (response.data?.show_message) {
        props.displaySnackMessages(response.data?.message, "warning");
      }
      if (response?.data?.data) {
        let choiceViewColumnDef = agGridColumnFormatter(
          response.data.data?.columns
        );
        setTableColumns(choiceViewColumnDef);
        setTableData(response.data.data?.data);
        setDisplayTable(true);
        // Scroll into view after data is set
        scrollIntoView(tableRef);
      }
      setUserChoiceLoading(false);
    } catch (error) {
      setDisplayTable(false);
      handleErrorMessage("error", props);
      setTableData([]);
      setUserChoiceLoading(false);
    }
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    setDisplayTable(false);
    fetchTableData(dependencyData);
  };

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const choiceCustomDependencyValue = (dependency) => {
    return [...dependency, ...props.parentFilterConfig];
  };

  return (
    <div style={{marginTop: IS_OVERRIDEN_CORE_BUTTON_PLACEMENT}}>
      <CoreComponentScreen
        IscoreButtonWidth = {IS_OVERRIDEN_CORE_BUTTON_WIDTH}
        showFilterDashboard={true}
        filterConfigKey={"choiceViewFilterConfiguration"}
        preventFilterPreselection={false}
        onApplyFilter={(dependencyData, filterData) =>
          onFilterDashboardClick(dependencyData, filterData)
        }
        customDependencyValue={choiceCustomDependencyValue}
        hideSaveFilterSection={false}
      />
      <Loader loader={userChoiceLoading}>
        {displayTable && (
          <div className={globalClasses.paddingVertical} ref={tableRef}>
            <AgGridComponent
              rowdata={tableData}
              columns={tableColumns}
              uniqueRowId="store_code"
              sizeColumnsToFitFlag
              onGridChanged
              loadTableInstance={loadTableInstance}
              suppressColumnVirtualisation={true}
              tableHeader={props?.dynamicLabels?.choice_view}
              disablePaginationForSinglePage={true}
            />
          </div>
        )}
      </Loader>
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    pageSize:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig?.inventorysmart_page_count,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
        "choiceViewFilterConfiguration"
      ],
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    getChoiceViewData: (body) => dispatch(getChoiceViewData(body)),
    setFilterConfiguration: (filterConfig) =>
      dispatch(setFilterConfiguration(filterConfig)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ChoiceViewComponent);
