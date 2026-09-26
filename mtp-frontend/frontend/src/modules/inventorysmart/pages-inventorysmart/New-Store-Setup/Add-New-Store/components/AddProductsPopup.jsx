import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Typography,
} from "@mui/material";
import { cloneDeep, isEmpty } from "lodash";
import makeStyles from "@mui/styles/makeStyles";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import Loader from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import { getColumnsAg } from "core/actions/tableColumnActions";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { setFilterConfiguration } from "core/actions/filterAction";
import { formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  scrollIntoView,
  getFilterDimensions,
} from "../../../inventorysmart-utility";
import {
  ERROR_MESSAGE,
  NO_PRODUCT_PROFILE_MAPPED,
  BLANK_LIST,
  DEMAND_CONSTRAINTS_ADD_PRODUCT_VALIDATION_MSG,
} from "../../../../constants-inventorysmart/stringConstants";
import {
  setDemandConstraintsPopupFilterConfiguration,
  fetchDemandAndConstraintsAllFiltersTableData,
} from "../../../../services-inventorysmart/New-Store/demand-constraints";
import { getStoreSizeContributionData } from "../../../../services-inventorysmart/Product-Profile/product-profile-dashboard-service";
const styles = makeStyles(() => ({
  root: {
    "& .MuiDialog-paperWidthSm": {
      maxWidth: "80rem",
      minHeight: "40rem",
      borderRadius: "0.6rem",
    },
  },
}));
const AddProductsPopup = (props) => {
  const [newProductsColumnConfig, setNewProductsColumnConfig] = useState([]);
  const [addNewProductsLoader, setAddNewProductsLoader] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [storeSizeSplitColumnConfig, setStoreSizeSplitColumnConfig] = useState(
    []
  );
  const [storeSizeSplitData, setStoreSizeSplitData] = useState([]);
  const [showPPSizeDistribution, setShowPPSizeDistribution] = useState(false);
  const [showAllArticles, setShowAllArticles] = useState(false);
  const storePriceContributionRef = useRef({});
  const tableInstance = useRef({});
  const filterDependencies = useRef({});
  const offsetValues = useRef({});
  const globalClasses = globalStyles();
  const classes = styles();
  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        setAddNewProductsLoader(true);
        let response = await fetchFilterConfig(
          "New Store Demand And Constraint Add Products"
        );
        props.setDemandConstraintsPopupFilterConfiguration(response);
      } catch (e) {
        setAddNewProductsLoader(false);
        props.displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    getInitialFilterConfiguration();
  }, []);

  useEffect(() => {
    if (props.demandConstraintsPopupFilterConfig.length) {
      getFiltersOptions();
    }
  }, [props.demandConstraintsPopupFilterConfig]);

  const getFiltersOptions = async () => {
    try {
      setAddNewProductsLoader(true);
      let requiredFilterObjParams = {
        allFilters: cloneDeep(props.demandConstraintsPopupFilterConfig),
        appliedFilters: [],
        current: [],
        rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
        screenName: props.screenName,
        tenantFilterUamConfig: props.tenantFilterUamConfig,
      };
      const response = await fetchFilterOptions(requiredFilterObjParams);
      const filterConfigData = [
        {
          filterDashboardData: response,
          expectedFilterDimensions: getFilterDimensions(response),
          isCrossDimensionFilter: true,
          screen_name: props.screenName,
        },
      ];
      const filterConfig = formattedFilterConfiguration(
        "newStoreAddProductsConfiguration",
        filterConfigData,
        "New Store Add Products Screen"
      );
      props.setFilterConfiguration(filterConfig);
      setAddNewProductsLoader(false);
    } catch (error) {
      setAddNewProductsLoader(false);
      props.displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };
  const onFilterDashboardClick = (dependencyData, _filterData) => {
    applyFilters(dependencyData);
  };
  const applyFilters = async (dependencyData) => {
    setAddNewProductsLoader(true);
    try {
      let demandConstraintsCol = await getColumnsAg(
        "table_name=new_store_demand_and_constraint"
      )();
      demandConstraintsCol = demandConstraintsCol.map((item) => {
        if (item.type === "link") {
          item.cellRenderer = (cellProps) => {
            return (
              <CellRenderers cellData={cellProps} column={item}></CellRenderers>
            );
          };
          item.onClick = async (tableInfo) => {
            if (tableInfo.cellData.data?.pp_code) {
              try {
                setAddNewProductsLoader(true);
                let reqBody = {
                  pp_code: tableInfo.cellData.data?.pp_code,
                  channel: tableInfo.cellData.data?.channel,
                  metrics: "sale",
                  store_attributes: dependencyData.filter(
                    (item) => item.dimension === "store"
                  ),
                };
                let response = await props.getStoreSizeContributionData(
                  reqBody
                );
                setShowPPSizeDistribution(true);
                let copyOfStoreSizeContributionData = cloneDeep(
                  response.data?.data?.columns
                );
                let penetrationColDef = agGridColumnFormatter(
                  copyOfStoreSizeContributionData
                );
                setStoreSizeSplitColumnConfig(penetrationColDef);
                setStoreSizeSplitData(response.data?.data?.data);
                setAddNewProductsLoader(false);
                scrollIntoView(storePriceContributionRef);
              } catch (e) {
                setAddNewProductsLoader(false);
                props.displaySnackMessages(ERROR_MESSAGE, "error");
              }
            } else {
              props.displaySnackMessages(
                `${NO_PRODUCT_PROFILE_MAPPED} ${dynamicLabelsBasedOnTenant(
                  "article"
                )}`,
                "error"
              );
            }
          };
        }
        return item;
      });
      setNewProductsColumnConfig(demandConstraintsCol);
      setShowAllArticles(true);
      setAddNewProductsLoader(false);
      filterDependencies.current = dependencyData;
      tableInstance.current?.api?.refreshServerSideStore({ purge: true });
    } catch (e) {
      setAddNewProductsLoader(false);
      props.displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };
  const setRequestBody = (manualbody, pageIndex, filterDependencyBody) => {
    let manualFilterbody = manualbody
      ? manualbody
      : { range: [], sort: [], search: [] };
    let limit =
      Object.keys(offsetValues.current)?.length > 0 && pageIndex !== 0
        ? { limit: 10, page: pageIndex + 1, ...offsetValues.current }
        : { limit: 10, page: pageIndex + 1 };
    return {
      filters: filterDependencies.current,
      dc_row_attributes: props.finalStoreDetailsStateValues?.dc_row_attributes,
      other_attributes: props.finalStoreDetailsStateValues?.other_attributes,
      meta: {
        ...manualFilterbody,
        limit,
      },
    };
  };
  const manualCallBackAllProducts = async (manualbody, pageIndex, params) => {
    setAddNewProductsLoader(true);
    try {
      let reqBody = setRequestBody(manualbody, pageIndex);
      let { data: storeData } =
        await props.fetchDemandAndConstraintsAllFiltersTableData(reqBody);
      setAddNewProductsLoader(false);
      offsetValues.current = {
        offset: storeData.data.offset,
        sub_offset: storeData.data.sub_offset,
      };
      return {
        data: storeData.data.data?.map((row) => {
          return {
            ...row,
            ssd_ros: +parseFloat(row?.forecast_estimated) / +row?.wos,
          };
        }),
        totalCount: storeData.data?.total,
      };
    } catch (e) {
      setAddNewProductsLoader(false);
      props.displaySnackMessages(ERROR_MESSAGE, "error");
      return {
        data: [],
        totalCount: 0,
      };
    }
  };
  const onSelectionChanged = (event) => {
    let selections = event.api.getSelectedRows();
    setSelectedRecords(selections);
  };
  const pushSelectedNewRows = () => {
    if (selectedRecords.length) {
      {
        let valueArr = selectedRecords.map((item) => item.product_code);
        let isDuplicate = valueArr.some((item, id) => {
          return valueArr.indexOf(item) != id;
        });
        if (isDuplicate) {
          props.displaySnackMessages(
            DEMAND_CONSTRAINTS_ADD_PRODUCT_VALIDATION_MSG,
            "warning"
          );
        } else {
          props.newSelectedRecords(selectedRecords);
        }
      }
    } else props.displaySnackMessages(BLANK_LIST, "warning");
  };
  const setNewTableInstance = (params) => {
    tableInstance.current = params;
  };
  return (
    <Dialog
      className={classes.root}
      maxWidth={"sm"}
      aria-labelledby="customized-dialog-title"
      open={true}
      fullWidth={true}
      disableEscapeKeyDown={true}
    >
      <DialogTitle id="customized-dialog-title">Add Products</DialogTitle>
      <DialogContent>
        <Loader loader={addNewProductsLoader}>
          <CoreComponentScreen
            hideNoDataFound={true}
            showFilterDashboard={true}
            filterConfigKey={"newStoreAddProductsConfiguration"}
            disableFilterModal={true} // props used to render flat structure of filter hierarchy directly on screen
            removeFilterAccordian={true}
            disableSaveFilter={true}
            hideSaveFilterSection={true}
            preventFilterPreselection={true}
            onApplyFilter={onFilterDashboardClick}
            contained={true}
          >
            {showAllArticles && (
              <div className={globalClasses.marginVertical1rem}>
                <AgGridComponent
                  columns={newProductsColumnConfig}
                  manualCallBack={(body, pageIndex, param) =>
                    manualCallBackAllProducts(body, pageIndex, param)
                  }
                  rowModelType="serverSide"
                  serverSideStoreType="partial"
                  cacheBlockSize={10}
                  uniqueRowId={"mapping_code"}
                  selectAllHeaderComponent
                  hideHeaderCheckboxComponent
                  rowSelection="multiple"
                  // selectAllHeaderComponent={true} // commenting for time being
                  onSelectionChanged={onSelectionChanged}
                  loadTableInstance={setNewTableInstance}
                />
              </div>
            )}
            {showPPSizeDistribution && (
              <div
                className={globalClasses.marginVertical1rem}
                ref={storePriceContributionRef}
              >
                <Typography
                  variant="h4"
                  className={globalClasses.paddingHorizontal}
                >
                  Product Profile: IA Recommended
                </Typography>
                <div className={globalClasses.marginVertical1rem}>
                  <AgGridComponent
                    columns={storeSizeSplitColumnConfig}
                    rowdata={storeSizeSplitData}
                    uniqueRowId={"store_code"}
                    sizeColumnsToFitFlag
                    disablesaveConfig={true}
                  />
                </div>
              </div>
            )}
          </CoreComponentScreen>
        </Loader>
      </DialogContent>
      <DialogActions>
        <Button
          variant="outlined"
          color="primary"
          onClick={() => props.closeAddProductsPopup()}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={() => pushSelectedNewRows()}
        >
          Add Products
        </Button>
      </DialogActions>
    </Dialog>
  );
};
const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    demandConstraintsPopupFilterConfig:
      inventorysmartReducer.inventorySmartNewStoreDemandConstraintsService
        .demandConstraintsPopupFilterConfig,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
        "newStoreAddProductsConfiguration"
      ],
  };
};
const mapDispatchToProps = (dispatch) => {
  return {
    setDemandConstraintsPopupFilterConfiguration: (body) =>
      dispatch(setDemandConstraintsPopupFilterConfiguration(body)),
    fetchDemandAndConstraintsAllFiltersTableData: (body) =>
      dispatch(fetchDemandAndConstraintsAllFiltersTableData(body)),
    getStoreSizeContributionData: (body) =>
      dispatch(getStoreSizeContributionData(body)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
  };
};
export default connect(mapStateToProps, mapDispatchToProps)(AddProductsPopup);
