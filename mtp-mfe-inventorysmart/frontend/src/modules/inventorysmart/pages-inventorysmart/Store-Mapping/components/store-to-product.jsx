import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import Loader from "core/Utils/Loader/loader";
import "./filter.scss";
import Button from "@mui/material/Button";
import globalStyles from "core/Styles/globalStyles";
import { getAllStoreAndGroup } from "../services/storeMappingService";
import MappedStore from "./mapped-products";
import { setProductStatusData } from "core/actions/productStoreStatusActions";
import { FormControlLabel, Radio, RadioGroup } from "@mui/material";
import { isNull, uniqBy, isEmpty } from "lodash";
import StoreToProductTables from "./store-To-Product-Table";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { addSnack } from "core/actions/snackbarActions";
import { configureViewButton } from "./common-mapping-functions";
import {
  fetchAllStoreCodes,
  fetchStoreGroups,
} from "core/pages/store-grouping/services-store-grouping/custom-store-group-service";
import {
  fetchFilterFieldValues,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";

import { isActionAllowedOnSubModule } from "core/Utils/utils";
import { INVENTORY_SUBMODULES_NAMES } from "core/Utils/constants/inventorySmart-constants";
import { findIndex } from "lodash";
import { getSelectAllStoresData } from "../services/storeMappingService";

function StoretoProduct(props) {
  const [showloader, setloader] = useState(true);
  const [columns, setColumns] = useState([]);
  const [selectedRowsIDs, setSelectedRowsIDs] = useState([]);
  const [showMappedProduct, setShowMappedProduct] = useState(false);
  const [selectedID, setSelectedID] = useState("");
  const [productDimension, setProductDimension] = useState("store");
  const [filterDependency, setDependency] = useState([]);
  const [storeStatusValues, setStoreStatusValue] = useState([]);

  const storeTableRef = useRef(null);
  const storeGroupTableRef = useRef(null);
  const filterDependencyRef = useRef(null);
  const storeStatusValuesRef = useRef([]);
  const radioDimensionRef = useRef("store");
  const storeToProdRefObject = useRef({ storeTableRef, storeGroupTableRef });
  const globalClasses = globalStyles();

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  useEffect(() => {
    const getInitialData = async () => {
      try {
        let data = props?.roleBasedAccess
          ? await fetchFilterFieldValues("store mapping", [], props.screenName)
          : await fetchFilterFieldValues(
              "store mapping",
              props.savedFilterSelection,
              props.screenName
            );

        if (isEmpty(props.filterDashboardConfiguration)) {
          let filterConfigData = [
            {
              filterDashboardData: data,
              isCrossDimensionFilter: true,
              onReset: onReset,
              screen_name: props.screenName,
            },
          ];
          if (sessionStorage.getItem("currentApp") === "inventorysmart") {
            filterConfigData[0]["saved_filter_screen_name"] =
              "Inventorysmart Store Mapping";
          }
          const filterConfig = formattedFilterConfiguration(
            "storeMappingStoreToProductFilterConfiguration",
            filterConfigData,
            "Store Mapping Store To Product"
          );
          props.setFilterConfiguration(filterConfig);
        }
        setDependency([]);
        setloader(false);
      } catch (error) {
        displaySnackMessages(
          error?.response?.data?.message || "Something went wrong.",
          "error"
        );
      }
    };

    getInitialData();
  }, []);

  const manualCallBack = async (manualbody, pageIndex, params) => {
    if (isNull(filterDependencyRef.current)) {
      return {
        data: [],
        totalCount: 0,
      }; // returning for server side pagination on ag grid
    }
    setloader(true);
    try {
      let body = {
        filters: filterDependencyRef.current,
        meta: {
          ...manualbody,
          search:
            storeStatusValuesRef.current.length > 0
              ? manualbody.search.concat(storeStatusValuesRef.current)
              : manualbody.search,
        },
      };
      if (radioDimensionRef.current === "store") {
        const { data: store } = await getAllStoreAndGroup(
          `stores?store_level=store&page=${pageIndex + 1}`,
          body
        )();
        //agGridRowFormatter should be removed once it's handled from BE
        //to handle it from BE pass params.api.checkConfiguration in request body to the above api call
        let formatedData = agGridRowFormatter(
          store.data,
          params.api.checkConfiguration,
          `store_code`
        );
        formatedData = configureViewButton(
          formatedData,
          "mapped_products_count"
        );
        setloader(false);
        return {
          data: formatedData,
          totalCount: store.total,
        };
      } else {
        const { data: group } = await fetchStoreGroups(
          body,
          "",
          pageIndex + 1
        )();
        //agGridRowFormatter should be removed once it's handled from BE
        //to handle it from BE pass params.api.checkConfiguration in request body to the above api call
        let formatedData = agGridRowFormatter(
          group.data,
          params.api.checkConfiguration,
          `sg_code`
        );
        formatedData = configureViewButton(
          formatedData,
          "mapped_products_count"
        );
        setloader(false);
        return {
          data: formatedData,
          totalCount: group.total,
        };
      }
    } catch (err) {
      setloader(false);
    }
  };

  const onClickFilter = () => {
    if (storeTableRef.current)
      storeTableRef.current.api.refreshServerSideStore({ purge: true });
    if (storeGroupTableRef.current)
      storeGroupTableRef.current.api.refreshServerSideStore({ purge: true });
  };

  const onFilterDashboardClick = (dependencyData) => {
    filterDependencyRef.current = dependencyData;
    onClickFilter();
  };

  const handleChangeDimension = (event) => {
    setProductDimension(event.target.value);
    radioDimensionRef.current = event.target.value;
  };

  const onReset = () => {
    setStoreStatusValue([]);
    storeStatusValuesRef.current = [];
    setDependency([]);
    filterDependencyRef.current = [];
    onClickFilter();
  };

  const getStoresInSelectedGroups = async (storeGroups) => {
    const promises = [];
    // Fetch Store using selected Store Groups
    storeGroups.forEach((storeGroup) => {
      let body = {
        filters: [],
        range: [],
        sort: [],
        search: [],
      };
      promises.push(props.fetchAllStoreCodes(storeGroup.sg_code, body));
    });
    let flattenedData = [];
    // Accumulate store codes based on the store values
    await Promise.all(promises).then((data) => {
      const promiseData = data.map((promise) => {
        return promise.data.data;
      });
      flattenedData = promiseData.reduce(function (prev, next) {
        return prev.concat(next);
      });
      flattenedData = uniqBy(flattenedData, "store_code");
    });
    return flattenedData;
  };

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props?.inventorysmartModulesPermission,
      props?.module,
      subModuleName,
      action
    );
  };

  const getTableConfiguration = () => {
    return {
      selection: {
        data: storeTableRef?.current?.api?.checkConfiguration || {},
        unique_columns: ["store_code"],
      },
    };
  };
  const fetchStoresToModify = async (selectedIDs) => {
    const tableConfiguration = getTableConfiguration();
    // if select all action was done, use api to get exact products count
    const checkAllActionIndex = findIndex(tableConfiguration.selection.data, {
      checkAll: true,
      searchColumns: {},
    });

    if (checkAllActionIndex !== -1) {
      let body = {
        filters: filterDependencyRef.current ? filterDependencyRef.current : [],
        meta: {
          range: [],
          sort: [],
          search: [],
          limit: { limit: 10000, page: 1 },
        },
        selection: {
          data: [],
          unique_columns: ["store_code"],
        },
        extra: {
          selection: tableConfiguration.selection,
        },
      };
      setloader(true);
      let { data: stores } = await getSelectAllStoresData(body)();
      setloader(false);
      return stores?.data;
    } else {
      return selectedIDs;
    }
  };

  const renderContent = () => {
    return (
      <CoreComponentScreen
        showPageRoute={false}
        showPageHeader={false}
        // Filter dashboard props
        showFilterDashboard={true}
        filterConfigKey={"storeMappingStoreToProductFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
      >
        <Loader loader={showloader}>
          <div data-testid="filterContainer">
            {showMappedProduct && (
              <MappedStore
                selectedID={selectedID}
                dimension={productDimension}
                onModify={async (dataBody) => {
                  props.toggleModifyMapping(
                    {
                      selectedStores:
                        productDimension === "store"
                          ? dataBody.selectedStores
                          : await getStoresInSelectedGroups(
                              dataBody.selectedStores
                            ),
                    },
                    true
                  );
                  setShowMappedProduct(false);
                }}
                onCancel={() => {
                  setShowMappedProduct(false);
                }}
                disableModify={canTakeActionOnModules(
                  INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_MAPPING,
                  "edit"
                )}
                isAggregated={props.isAggregated}
              ></MappedStore>
            )}

            <div data-testid="resultContainer">
              <div
                className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} ${globalClasses.marginBottom}`}
              >
                <RadioGroup
                  row
                  aria-label="gender"
                  name="controlled-radio-buttons-group"
                  value={productDimension}
                  onChange={handleChangeDimension}
                >
                  <FormControlLabel
                    value="store"
                    control={<Radio color="primary" id="StoreRadioBtn" />}
                    label="Store"
                  />
                  <FormControlLabel
                    value="store_groups"
                    control={<Radio color="primary" id="StoreGroupRadioBtn" />}
                    label="Store groups"
                  />
                </RadioGroup>

                <Button
                  variant="contained"
                  color="primary"
                  id="storetoproductModifyBtn"
                  onClick={async () => {
                    if (selectedRowsIDs.length > 0) {
                      props.toggleModifyMapping({
                        cols: columns,
                        selectedStores:
                          productDimension === "store"
                            ? await fetchStoresToModify(selectedRowsIDs)
                            : await getStoresInSelectedGroups(selectedRowsIDs),
                      });
                    } else {
                      displaySnackMessages(
                        "Please select atleast one store",
                        "error"
                      );
                    }
                  }}
                  disabled={
                    !canTakeActionOnModules(
                      INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_MAPPING,
                      "edit"
                    )
                  }
                >
                  Modify
                </Button>
              </div>
              <StoreToProductTables
                ref={storeToProdRefObject}
                manualCallBack={manualCallBack}
                radioDimension={productDimension}
                filterDependency={filterDependency}
                storeStatusValues={storeStatusValues}
                setSelectedRowsIDs={setSelectedRowsIDs}
                setShowMappedProduct={setShowMappedProduct}
                setSelectedID={setSelectedID}
              />
            </div>
          </div>
        </Loader>
      </CoreComponentScreen>
    );
  };

  return <React.Fragment>{renderContent()}</React.Fragment>;
}
const mapStateToProps = (state) => {
  return {
    filterDashboardConfiguration:
      state.filterReducer.filterDashboardConfiguration[
        "storeMappingStoreToProductFilterConfiguration"
      ],
    inventorysmartModulesPermission:
      state.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    savedFilterSelection: state.filterReducer.savedFilterSelection,
    isAggregated: state.storeMappingReducerService.isAggregated,
  };
};
const mapDispatchToProps = (dispatch) => {
  return {
    setProductStatusData: (data) => dispatch(setProductStatusData(data)),
    addSnack: (snackObject) => dispatch(addSnack(snackObject)),
    fetchAllStoreCodes,
    setFilterConfiguration: (filterConfig) =>
      dispatch(setFilterConfiguration(filterConfig)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(StoretoProduct);
