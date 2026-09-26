import  { useState, useRef, useEffect } from "react";
import moment from "moment";
import { connect } from "react-redux";
import { isEmpty, cloneDeep } from "lodash";
import { Badge } from 'impact-ui-v3'
import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { addSnack } from "core/actions/snackbarActions";
import { getChoiceViewDataV2 } from "modules/inventorysmart/services-inventorysmart/Rules-Contraints/rules-contraints-services";
import { setFilterConfiguration } from "core/actions/filterAction";
import { formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";
import { fetchFilterConfig, fetchFilterOptions, getFilterDimensions, scrollIntoView } from "../../inventorysmart-utility";
import { handleErrorMessage } from "../Rules-Constraints/add-rcl-component";
import TopRightFilters from "./TopRightFilters";
import { CHOICE_VIEW_CUSTOM_FILTER_CONFIG } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { createPayloadForRuleResolution } from "./RuleResolutionUtils";
import { wrapColumnsWithEmptyCell } from "./constraintsCommonUtils";
import { makeStyles } from "@mui/styles";

const statusColorMapping = {
  active: "success",
  inactive: "default",
  "expiring soon": "warning"
}

export const useStyles = makeStyles(() => ({
  ruleResolutionContainer: {
    "& .impact-datepicker-main-container .datePicker-input-container": {
      width: "155px",
    },
  },
  /** Hide leftover AG Grid header bar when the empty-state overlay is shown. */
  ruleResolutionEmptyGrid: {
    "& .ag-header": {
      display: "none",
    },
  },
  dividerLine: {
    width: "1px",
    height: "12px",
    backgroundColor: "#d9dde7",
  },
}));

const RuleResolutionComponent = (props) => {
  const tenantDateFormat = localStorage && localStorage.getItem("tenantDateFormat") || "MM-DD-YYYY";
  const classes = useStyles();

  const [tableData, setTableData] = useState([]);
  const [styleOptions, setStyleOptions] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const [selectedStyles, setSelectedStyles] = useState([]);
  const [userChoiceLoading, setUserChoiceLoading] = useState(false);
  const [userChoiceFilterConfig, setUserChoiceFilterConfig] = useState([]);
  const [selectedDate, setSelectedDate] = useState(moment(new Date()).format(tenantDateFormat));

  const tableRef = useRef(null);
  const agGridInstance = useRef(null);

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

  const addCellRenderer = (columns) => {
    return columns.map((column) => {
      if (column.children && column.children.length) {
        column.children = addCellRenderer(column.children);
        column.sub_headers = addCellRenderer(column.sub_headers);
      }
      if (column.column_name === "status") {
        return {
          ...column,
          cellRenderer: (params) => {
            return (
              <Badge
                variant="stroke"
                color={statusColorMapping[params?.value?.toLowerCase()] || 'success'}
                label={params.value}
              />
            )
          }
        }
      }
      if (column.column_name === 'item_status') {
        return {
          ...column,
          cellRenderer: (params) => {
            return (
              <Badge
                variant="stroke"
                color="default"
                label={params.value}
              />
            )
          }
        }
      }
      return column;
    });
  }
  

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
          [...(props.parentFilterConfig || [])]
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

      const response = await props.getChoiceViewDataV2(body);
      if (response.data?.show_message) {
        props.addSnack({
          message: response.data?.message,
          options: {
            variant: "warning",
          }
        })
      }
      if (response?.data?.data) {
        let choiceViewColumnDef = agGridColumnFormatter(
          response.data.data?.columns
        );
        choiceViewColumnDef = addCellRenderer(choiceViewColumnDef);
        wrapColumnsWithEmptyCell(choiceViewColumnDef);
        setTableColumns(choiceViewColumnDef);
        setTableData(response.data.data?.data);
        // Scroll into view after data is set
        scrollIntoView(tableRef);
      }
      setUserChoiceLoading(false);
    } catch (error) {
      handleErrorMessage("error", props);
      setTableData([]);
      setUserChoiceLoading(false);
    }
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    fetchTableData(dependencyData);
  };

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const createPayload = (date, styles) => {
    const styleValues = styles.map((item) => item.value);
    const dependencyData = createPayloadForRuleResolution(
      [...userChoiceFilterConfig, 
        {
          column_name: "view_date",
        }
      ], {view_date: date, article: styleValues})
    onFilterDashboardClick(dependencyData, null);
  };

  const handleDateSelect = (date) => {
    const formattedDate = date.format(tenantDateFormat)
    setSelectedDate(formattedDate);
    if (formattedDate && selectedStyles.length > 0) {
      createPayload(formattedDate, selectedStyles);
    }
  };

  const handleStyleUpdate = (filterMeta, selectedValues) => {
    setSelectedStyles(selectedValues);
    if (selectedDate && selectedValues.length > 0) {
      createPayload(selectedDate, selectedValues);
    }
  };

  useEffect(() => {
    setTableColumns([]);
    setTableData([]);
    setSelectedStyles([]);
  }, [props.filterDashboardConfigurationRuleContraints?.appliedFilterData?.dependencyData])


  const isTableEmpty = isEmpty(tableData);

  const topRightOptions = () => {
    const dependencyData =
      props.filterDashboardConfigurationRuleContraints?.appliedFilterData?.dependencyData ||
      [];
    return (
      <>
        <TopRightFilters
          screenName={props.screenName}
          selectedDate={selectedDate}
          styleOptions={styleOptions}
          selectedStyles={selectedStyles}
          userChoiceFilterConfig={userChoiceFilterConfig}
          dependencyData={dependencyData}
          onDateSelect={handleDateSelect}
          onStyleUpdate={handleStyleUpdate}
          onStyleOptionsFetched={setStyleOptions}
        />
        {isTableEmpty && (
          <div
            key="selection-actions-separator"
            className={classes.dividerLine}
          />
        )}
      </>
    )
  }
  return (
    <div
      className={`${globalClasses.marginTop_8} ${classes.ruleResolutionContainer} ${
        isTableEmpty ? classes.ruleResolutionEmptyGrid : ""
      }`}
      ref={tableRef}
    >
      <Loader loader={userChoiceLoading} minHeight="368px">
        {!userChoiceLoading && (
          <AgGridComponent
            rowdata={tableData}
            columns={tableColumns}
            uniqueRowId="key"
            sizeColumnsToFitFlag
            onGridChanged
            loadTableInstance={loadTableInstance}
            suppressColumnVirtualisation={true}
            tableHeader={props?.dynamicLabels?.choice_view || "Details"}
            topRightOptions={topRightOptions()}
            disablePaginationForSinglePage={true}
            showCustomNoRowOverlay={false}
            viewPoint={isTableEmpty ? "list" : ""}
            height={isTableEmpty ? "311px" : ""}
            headerHeight={isTableEmpty ? 0 : undefined}
            emptyStateText={"Select “Style Color ID” from dropdown to display data"}
          />
        )}
      </Loader>
    </div>
  );
}

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
    filterDashboardConfigurationRuleContraints:
      filterReducer.filterDashboardConfiguration.rulesConstraintsFilterConfig,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    getChoiceViewDataV2: (body) => dispatch(getChoiceViewDataV2(body)),
    setFilterConfiguration: (filterConfig) =>
      dispatch(setFilterConfiguration(filterConfig)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(RuleResolutionComponent);
