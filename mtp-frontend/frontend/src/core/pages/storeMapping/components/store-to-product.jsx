import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import Loader from "../../../Utils/Loader/loader";
import "./filter.scss";
import Button from "@mui/material/Button";
import globalStyles from "core/Styles/globalStyles";
import {
  getAllStoreAndGroup,
  setTenantUploadConfig,
  fetchUploadConfig,
  uploadMappings,
} from "../services/storeMappingService";
import MappedStore from "./mapped-products";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import { setProductStatusData } from "../../../actions/productStoreStatusActions";
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
import { fetchDynamicConfigFromTenantReducer } from "core/Utils/DynamicLabels";
import {
  fetchFilterFieldValues,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import UploadHandler from "core/commonComponents/uploadHandler";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import { isActionAllowedOnSubModule } from "core/Utils/utils";
import { INVENTORY_SUBMODULES_NAMES } from "core/Utils/constants/inventorySmart-constants";
import { findIndex } from "lodash";
import { getSelectAllStoresData } from "../services/storeMappingService";
import { FormControlLabel, Radio, RadioGroup } from "@mui/material";
import { setFilterConfiguration } from "core/actions/filterAction";

function StoretoProduct(props) {
  const [showloader, setloader] = useState(true);
  const [columns, setColumns] = useState([]);
  const [selectedRowsIDs, setSelectedRowsIDs] = useState([]);
  const [showMappedProduct, setShowMappedProduct] = useState(false);
  const [selectedID, setSelectedID] = useState("");
  const [productDimension, setProductDimension] = useState("store");
  const [filterDependency, setDependency] = useState([]);
  const [storeStatusValues, setStoreStatusValue] = useState([]);
  const [storeData, setStoreData] = useState([]);
  const [storeGroupData, setStoreGroupData] = useState([]);
  const [totalStore, setStoreTotal] = useState("");
  const [totalStoreGroup, setSGTotal] = useState("");

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [templateHeaders, setTemplateHeaders] = useState([]);
  const [showUploadBtn, setShowUploadBtn] = useState(false);
  const validationHandler = useRef();
  const storeTableRef = useRef(null);
  const storeGroupTableRef = useRef(null);
  const filterDependencyRef = useRef(null);
  const storeStatusValuesRef = useRef([]);
  const radioDimensionRef = useRef("store");
  const storeToProdRefObject = useRef({ storeTableRef, storeGroupTableRef });
  const globalClasses = globalStyles();
  const moduleCodeRef = useRef("");

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
    updateUploadConfig();
  }, []);

  const updateUploadConfig = async () => {
    try {
      const templateData = await fetchUploadConfig();
      const headerData =
        templateData?.data?.data?.map((obj) => {
          return { label: obj.label, key: obj.column };
        }) || [];
      setTemplateHeaders(headerData);
      const uploadConfig = fetchDynamicConfigFromTenantReducer(
        "core",
        "showProductSheetUploadBtn"
      );
      setShowUploadBtn(Boolean(uploadConfig));
      let tenantData = await props.getTenantConfigApplicationLevel(1, {
        attribute_name: "ps_mapping_upload_instructions",
      });
      props.setTenantUploadConfig(tenantData.data?.data[0]?.attribute_value);
    } catch (error) {
      console.log(error);
      displaySnackMessages(
        error.response?.data?.message || "Something went wrong",
        "error"
      );
    }
  };

  /**
   * attachCallBacks funtions will
   * check if there is any callback
   * if there is any callback
   * then attach that call to
   * validationHandler
   * @param {function} callback
   */
  const attachCallBacks = (callback) => {
    validationHandler.current = { validate: callback };
  };

  /**
   * @function
   * @description Validate parcedExcelData, create payload using CSV_CONFIG and call file upload api
   */
  const handleUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("module_code", moduleCodeRef.current);
      const res = await uploadMappings(formData);
      displaySnackMessages(
        res?.data?.message || "Please wait for notification to be received shortly",
        "success"
      );
      if (res?.data?.status) {
        setIsUploadModalOpen(false);
      } else {
        validationHandler.current.validate([{ message: res?.data?.message }]);
      }
    } catch (error) {
      if (error.response?.data?.data?.length) {
        validationHandler.current.validate(error.response?.data?.data);
      } else {
        displaySnackMessages(
          error?.data?.message || "Something went wrong",
          "error"
        );
        validationHandler.current.validate([]);
      }
    }
  };

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
        if (props.application_code) {
          body.application_code = props.application_code;
        }
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
                <div
                  className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} ${globalClasses.gap}`}
                >
                  {showUploadBtn && (
                    <>
                      <Button
                        variant="contained"
                        color="primary"
                        id="Edit&Upload"
                        onClick={() => {
                          setIsUploadModalOpen(true);
                        }}
                      >
                        <FileUploadIcon />
                      </Button>
                      <UploadHandler
                        handleUpload={handleUpload}
                        isModalOpen={isUploadModalOpen}
                        setIsModalOpen={(val) => {
                          setIsUploadModalOpen(val);
                        }}
                        attachCallBacks={attachCallBacks}
                        templateConfig={templateHeaders}
                        uploadInstructions={[]}
                        tenantUploadConfig={props.tenantUploadConfig}
                        templateName="storeMappingTemplate"
                        moduleName="Store Mapping"
                        moduleCodeRef={moduleCodeRef}
                      />
                    </>
                  )}
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
                              : await getStoresInSelectedGroups(
                                  selectedRowsIDs
                                ),
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
      state.inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    savedFilterSelection: state.filterReducer.savedFilterSelection,
    isAggregated: state.storeMappingReducerService.isAggregated,
    tenantUploadConfig: state.storeMappingReducerService.tenantUploadConfig,
  };
};
const mapDispatchToProps = (dispatch) => {
  return {
    setProductStatusData: (data) => dispatch(setProductStatusData(data)),
    setTenantUploadConfig: (data) => dispatch(setTenantUploadConfig(data)),
    addSnack: (snackObject) => dispatch(addSnack(snackObject)),
    fetchAllStoreCodes,
    setFilterConfiguration: (filterConfig) =>
      dispatch(setFilterConfiguration(filterConfig)),
    getTenantConfigApplicationLevel: (dynamicRoute, queryParam) =>
      dispatch(getTenantConfigApplicationLevel(dynamicRoute, queryParam)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(StoretoProduct);
