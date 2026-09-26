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
import Filters from "core/commonComponents/filters/filterGroup";
import Loader from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import { getColumnsAg } from "core/actions/tableColumnActions";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";

import { getCombinedCrossDimensionFiltersData } from "core/actions/filterAction";
import {
  mapDataToLabel,
  getfilterAttributeList,
} from "core/commonComponents/coreComponentScreen/utils";

import {
  fetchFilterConfig,
  fetchFilterOptions,
  scrollIntoView,
} from "../../../inventorysmart-utility";
import {
  ERROR_MESSAGE,
  NO_PRODUCT_PROFILE_MAPPED,
} from "../../../../constants-inventorysmart/stringConstants";
import {
  setDemandConstraintsPopupFilterConfiguration,
  fetchDemandAndConstraintsAllFiltersTableData,
} from "../../../../services-inventorysmart/New-Store/demand-constraints";
import { getStoreSizeContributionData } from "../../../../services-inventorysmart/Product-Profile/product-profile-dashboard-service";

const styles = makeStyles(() => ({
  contentBody: {
    minHeight: "4rem",
    border: "none",
  },
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
  const [filterConfig, setFilterConfig] = useState([]);
  const [initialDependencyValue, setInitialDependencyValue] = useState([]);
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

  const updateFilters = async (dependency, filter) => {
    setAddNewProductsLoader(true);
    let selectionValueDependency =
      dependency.length > 0
        ? dependency.map((opt) => {
            return {
              attribute_name: opt.filter_id,
              operator: "in",
              values: Array.isArray(opt.values)
                ? opt.values.map((option) => option.value)
                : opt.values,
              filter_type: opt.filter_type,
              dimension: opt.dimension,
            };
          })
        : [];
    try {
      if (!filter || filter.filter_type === "cascaded") {
        let initialFilterElements = [...filterConfig];
        let filterElementsData = [];
        const attributesList = getfilterAttributeList(initialFilterElements);
        let body = {
          attributes: attributesList,
          filter_type: "cascaded",
          filters: selectionValueDependency,
          application_code: 1,
        };
        if (props.tenantFilterUamConfig) {
          body.is_urm_filter = true;
          body.screen_name = props.screenName;
        }
        filterElementsData = await getCombinedCrossDimensionFiltersData(body)();
        filterElementsData = filterElementsData.data.data;
        const filterElements = initialFilterElements.map(async (key) => {
          if (key.type === "cascaded") {
            const options = filterElementsData[key.column_name];
            key.initialData = options.map((item) => {
              return mapDataToLabel(item);
            });
          }
          return key;
        });
        let data = await Promise.all(filterElements);
        setFilterConfig(data);
        setInitialDependencyValue(selectionValueDependency);
      }
      setAddNewProductsLoader(false);
    } catch (err) {
      props.displaySnackMessages(ERROR_MESSAGE, "error");
      setAddNewProductsLoader(false);
    }
  };

  useEffect(() => {
    if (props.demandConstraintsPopupFilterConfig.length) {
      getFiltersOptions();
    }
  }, [props.demandConstraintsPopupFilterConfig]);

  const getFiltersOptions = async (selected, current) => {
    try {
      setAddNewProductsLoader(true);
      let requiredFilterObjParams = {
        allFilters: cloneDeep(props.demandConstraintsPopupFilterConfig),
        appliedFilters: selected,
        current: current,
        rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
        screenName: props.screenName,
        tenantFilterUamConfig: props.tenantFilterUamConfig,
        enableCrossFiltersConditionally: true,
      };
      const response = await fetchFilterOptions(requiredFilterObjParams);
      let filterElements = cloneDeep(response);
      setFilterConfig(filterElements);
      setAddNewProductsLoader(false);
    } catch (error) {
      setAddNewProductsLoader(false);
      props.displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const fetchValuesBasedOnFilterApplied = async () => {
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
      filterDependencies.current = initialDependencyValue;
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
        data: storeData.data.data,
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

  const resetSelectedFilterValues = () => {
    setInitialDependencyValue([]);
    getFiltersOptions();
    setNewProductsColumnConfig([]);
    setShowPPSizeDistribution(false);
    setShowAllArticles(false);
  };

  const onSelectionChanged = (event) => {
    let selections = event.api.getSelectedRows();
    setSelectedRecords(selections);
  };

  const pushSelectedNewRows = () => {
    if (selectedRecords.length) props.newSelectedRecords(selectedRecords);
    else props.displaySnackMessages("Select a record", "warning");
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
      <DialogContent className={classes.contentBody}>
        <Loader loader={addNewProductsLoader}>
          <>
            <Filters
              filters={filterConfig}
              update={updateFilters}
              onReset={resetSelectedFilterValues}
              onFilter={fetchValuesBasedOnFilterApplied}
              screen="new-store-new-product"
              doNotUpdateDefaultValue
            />
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
                  />
                </div>
              </div>
            )}
          </>
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
  const { inventorysmartReducer } = store;
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
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(AddProductsPopup);
