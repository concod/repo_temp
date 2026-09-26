import React, { useEffect, useState, useRef } from "react";
import Loader from "core/Utils/Loader/loader";
import { Button, Tooltip } from "impact-ui-v3";
import DeleteTrashIcon from "coreAssets/is_delete_trash.svg";
import globalStyles from "core/Styles/globalStyles";
import {
  deleteRule,
  getRulesList,
  getAllProductAndGroups,
} from "../services-product-mapping/productMappingService";
import { downloadWithSnack } from "core/Utils/download/downloadTableData";
import MappedStore from "./mapped-stores";
import { setActiveScreenName } from "core/pages/commonModulesServices/common-assort-service";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import { configureViewButton } from "modules/inventorysmart/pages-inventorysmart/Store-Mapping/components/common-mapping-functions";
import AgGridTable from "core/Utils/agGrid";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import {
  dynamicLabelsBasedOnTenant,
  dynamicLabelKeysBasedOnTenant,
  fetchDynamicConfigFromTenantReducer,
} from "core/Utils/DynamicLabels";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import { isActionAllowedOnSubModule } from "core/Utils/utils";
import { INVENTORY_SUBMODULES_NAMES } from "core/Utils/constants/inventorySmart-constants";
import { captializeStringIfCamelCase } from "core/Utils/formatter";
import { useHistory } from "react-router-dom";
import { cloneDeep } from "lodash";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";

const ProductStoreBand = React.forwardRef((props, ref) => {
  const [showStoreCountInMappingStores, setShowStoreCountInMappingStores] =
    useState(false);
  const [showloader, setShowLoader] = useState(true);
  const [columns, setColumns] = useState([]);
  const [selectedRowsIDs, setSelectedRowsIDs] = useState([]);
  const [showMappedStore, setShowMappedStore] = useState(false);
  const [showDownloadBtn, setShowDownloadBtn] = useState(false);
  const [selectedID, setSelectedID] = useState("");
  const [selectAll, setSelectAll] = useState(false);
  const [enableAddRule, setEnableAddRule] = useState(false);
  const [enableDeleteRule, setEnableDeleteRule] = useState(false);
  const [enableManageException, setEnableManageException] = useState(false);
  const [hasEditPermissions, setHasEditPermissions] = useState(false);
  const [metaPayload, setMetaPayload] = useState({});
  const [totalRowsCount, setTotalRowsCount] = useState(0);
  const [styleLevelColumns, setStyleColumns] = useState([]);
  const [productCols, setProductCols] = useState([]);
  const [productGroupCols, setProductGroupCols] = useState([]);
  const globalClasses = globalStyles();
  const productTableRef = useRef(null);
  const history = useHistory();

  const isPsMappingUseRuleListFlow =
    props.inventorysmartScreenConfig?.inventorysmart_configuration
      ?.ps_mapping_use_rules_list_flow === false;

  const isThreadFeatureEnabled = Boolean(
    props?.inventorysmartScreenConfig?.inventory_smart_comment_and_thread
      ?.isThreadFeatureEnabled
  );

  useEffect(() => {
    isPsMappingUseRuleListFlow ? getInitialDataNew() : getInitialData();
    props.setActiveScreenName("Product to Store Band mapping");
    sessionStorage.setItem("activeScreenName", "Product to Store Band mapping");
  }, []);

  useEffect(() => {
    props.filtersSelection?.length && onClickFilter();
  }, [props.filtersSelection]);

  /**
   * @function
   * @description Fetch column configuration for Product Store Band Screen
   */
  const getInitialData = async () => {
    try {
      const mappingAddRuleConfig = fetchDynamicConfigFromTenantReducer(
        "core",
        "mapping_add_rule"
      );
      const mappingDeleteRuleConfig = fetchDynamicConfigFromTenantReducer(
        "core",
        "mapping_delete_rule"
      );
      const mappingManageException = fetchDynamicConfigFromTenantReducer(
        "core",
        "mapping_add_exception"
      );
      const productStoreMappingDownload = fetchDynamicConfigFromTenantReducer(
        "core",
        "view_mapped_store_download_csv"
      );
      const showStoreCountInMappingStores = fetchDynamicConfigFromTenantReducer(
        "core",
        "show_mapped_stores_as_store_count"
      );
      const checkActionablePermission = canTakeActionOnModules(
        INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_MAPPING,
        "edit"
      );
      setShowDownloadBtn(Boolean(productStoreMappingDownload));
      setEnableAddRule(mappingAddRuleConfig);
      setEnableDeleteRule(mappingDeleteRuleConfig);
      setEnableManageException(mappingManageException);
      setShowStoreCountInMappingStores(showStoreCountInMappingStores);
      let cols = await getColumnsAg("table_name=ps_mapping_rules_list", {}, {}, false, false, true, isThreadFeatureEnabled)();
      cols = cols.map((item) => {
        if (item.column_name === "mapped_stores_count") {
          item.type = "link";
          item.is_aggregated = false;
          item.is_editable = true;
          item.cellRenderer = (cellProps, extraProps) => {
            return (
              <CellRenderers
                cellData={cellProps}
                column={item}
                extraProps={extraProps}
              ></CellRenderers>
            );
          };
        }
        item.onClick = (tableInfo) => {
          setSelectedID(tableInfo.cellData.data);
          setShowMappedStore(true);
        };
        return item;
      });

      setHasEditPermissions(checkActionablePermission);
      setColumns(cols);
      setShowLoader(false);
    } catch (error) {
      console.error(error);
    }
  };

  const getInitialDataNew = async () => {
    try {
      const mappingAddRuleConfig = fetchDynamicConfigFromTenantReducer(
        "core",
        "mapping_add_rule"
      );
      const mappingDeleteRuleConfig = fetchDynamicConfigFromTenantReducer(
        "core",
        "mapping_delete_rule"
      );
      const mappingManageException = fetchDynamicConfigFromTenantReducer(
        "core",
        "mapping_add_exception"
      );
      // const productStoreMappingDownload = fetchDynamicConfigFromTenantReducer(
      //   "core",
      //   "view_mapped_store_download_csv"
      // );
      const checkActionablePermission = canTakeActionOnModules(
        INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_MAPPING,
        "edit"
      );
      // setShowDownloadBtn(Boolean(productStoreMappingDownload));
      setHasEditPermissions(checkActionablePermission);
      setEnableAddRule(mappingAddRuleConfig);
      setEnableDeleteRule(mappingDeleteRuleConfig);
      setEnableManageException(mappingManageException);
      setShowStoreCountInMappingStores(showStoreCountInMappingStores);
      let cols = [];
      let productGroupColumns = [];

      let columnPromises = [];
      columnPromises.push(getColumnsAg("table_name=product_store_products")());
      columnPromises.push(
        getColumnsAg("table_name=product_store_product_groups")()
      );
      columnPromises.push(getColumnsAg("table_name=product_store_styles")());
      const productStoreMappingDownload = fetchDynamicConfigFromTenantReducer(
        "core",
        "mapping_download_csv_landing_screen"
      );
      setShowDownloadBtn(Boolean(productStoreMappingDownload));
      const results = await Promise.all(columnPromises);
      cols = cloneDeep(results[0]);
      productGroupColumns = cloneDeep(results[1]);
      let styleCols = cloneDeep(results[2]);
      cols = cols.map((item) => {
        if (item.column_name === "mapped_stores_count") {
          item.type = "link";
          item.is_aggregated = false;
          item.is_editable = true;
          item.cellRenderer = (cellProps, extraProps) => {
            return (
              <CellRenderers
                cellData={cellProps}
                column={item}
                extraProps={extraProps}
              ></CellRenderers>
            );
          };
        }
        item.onClick = (tableInfo) => {
          setSelectedID(tableInfo.cellData.data);
          setShowMappedStore(true);
        };
        return item;
      });
      styleCols = styleCols.map((item) => {
        if (item.column_name === "mapped_stores") {
          item.type = "link";
          item.is_aggregated = false;
          item.is_editable = true;
          item.cellRenderer = (cellProps, extraProps) => {
            return (
              <CellRenderers
                cellData={cellProps}
                column={item}
                extraProps={extraProps}
              ></CellRenderers>
            );
          };
        }
        item.onClick = (tableInfo) => {
          setSelectedID(tableInfo.cellData.data);
          setShowMappedStore(true);
        };
        return item;
      });
      productGroupColumns = productGroupColumns.map((item) => {
        if (item.column_name === "mapped_stores_count") {
          item.type = "link";
          item.is_aggregated = false;
          item.is_editable = true;
          item.cellRenderer = (cellProps, extraProps) => {
            return (
              <CellRenderers
                cellData={cellProps}
                column={item}
                extraProps={extraProps}
              ></CellRenderers>
            );
          };
          item.onClick = (tableInfo) => {
            setSelectedID(tableInfo.cellData.data);
            setShowMappedStore(true);
          };
        }
        return item;
      });

      setColumns(cols);
      // For product_grouping
      setProductGroupCols(productGroupColumns);
      // For Products Product Columns same for Both in One Table
      setProductCols(cols);
      setStyleColumns(styleCols);
    } catch (error) {
      console.log(error);
    }
  };

  const displaySnackMessages = (msg, type) => {
    props.addSnack({
      message: msg,
      options: {
        variant: type,
      },
    });
  };

  const store_count_format = (formattedData) => {
    return formattedData.map((item) => {
      return {
        ...item,
        mapped_stores_count: item.store_count
      };
    });
  };

  /**
   * @function
   * @description Load table data from selected fillters or for sorted/searchable/paginated table columns
   * @param {Objet} manualbody
   * @param {Number} pageIndex
   * @param {Object} params
   * @returns {Object}
   */
  const manualCallBack = async (manualbody, pageIndex, params) => {
    setShowLoader(true);
    if (ref.current.length === 0) {
      setShowLoader(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
    try {
      const meta = {
        meta: {
          ...manualbody,
          limit: { limit: props.pageSize || 10, page: pageIndex + 1 },
        },
      };
      let body = {
        filters: ref.current,
        ...meta,
      };
      setMetaPayload(meta);
      if (isPsMappingUseRuleListFlow) {
        const { data: styleDetails } = await getAllProductAndGroups(
          body,
          `product_level=product&page=${pageIndex + 1}`
        )();
        styleDetails.data = configureViewButton(
          styleDetails.data,
          "mapped_stores_count"
        );
        let formatedData = agGridRowFormatter(
          styleDetails.data,
          params.api.checkConfiguration,
          dynamicLabelKeysBasedOnTenant(`style`, "core")
        );
        setShowLoader(false);
        setTotalRowsCount(styleDetails.total || styleDetails.data?.length || 0);
        return {
          data: showStoreCountInMappingStores ? store_count_format(formatedData) :formatedData,
          totalCount: styleDetails.total,
        };
      } else {
        const resp = await getRulesList(body);
        resp.data.data = configureViewButton(
          resp.data.data,
          "mapped_stores_count"
        );
        setShowLoader(false);
        setTotalRowsCount(resp.data.total || resp.data.data?.length || 0);
        return {
          data: showStoreCountInMappingStores ? store_count_format(resp.data.data) : resp.data.data,
          totalCount: resp.data.total,
        };
      }
    } catch (err) {
      props.handleErrorMessage(err);
      setShowLoader(false);
    }
  };

  const onClickFilter = () => {
    productTableRef.current?.api?.refreshServerSideStore({ purge: true });
  };

  const downloadData = () => downloadWithSnack({
    tableRef: productTableRef, columns, filters: ref.current,
    totalRowsCount, tableApi: "core/rcl-mapping/rules-list", uniqueColumns: ["rule_code"],
  }, displaySnackMessages);

  /**
   * @function
   * @description Handle selection changes and update local state
   * @param {Object} event
   */
  const onSelectionChanged = (event) => {
    const selectedRows = event.api.getSelectedRows();
    setSelectAll(Boolean(event.api?.isSelectAllRecords));
    setSelectedRowsIDs(selectedRows);
  };

  /**
   * handles deletion of the rows
   * in the table
   */
  const handleDelete = () => {
    try {
      let ruleCodes = [];
      let l0name = [];
      selectedRowsIDs.forEach((row) => {
        ruleCodes.push(row?.rule_code);
        if (row?.l0_name) {
          l0name.push(row.l0_name);
        }
      });
      deleteRule({ rule_codes: ruleCodes, l0_name: l0name });
      displaySnackMessages(
        `Successfully Deleted Rule${selectedRowsIDs.length > 1 ? "s" : ""}`,
        "success"
      );
      productTableRef.current.api?.refreshServerSideStore({ purge: true });
      setSelectedRowsIDs([]);
    } catch (error) {
      console.error("handleDelete error:", error);
      displaySnackMessages(
        `Failed Deletion of Rule${selectedRowsIDs.length > 1 ? "s" : ""}`,
        "error"
      );
    }
  };

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props?.inventorysmartModulesPermission,
      props?.module,
      subModuleName,
      action
    );
  };

  const onModifyClick = async () => {
    try {
      if (selectedRowsIDs.length > 0) {
        if (selectAll) {
          props.toggleSelectAllModify(metaPayload, selectedRowsIDs);
        } else {
          props.toggleModifyMapping(selectedRowsIDs, metaPayload);
        }
      } else {
        displaySnackMessages(
          `Please select atleast one ${captializeStringIfCamelCase(
            dynamicLabelsBasedOnTenant("product", "core")
          )}`,
          "error"
        );
      }
    } catch (error) {
      if (error.response?.data?.message) {
        displaySnackMessages(error.response?.data?.message, "error");
      } else {
        displaySnackMessages("Something went wrong", "error");
      }
      setShowLoader(false);
    }
  };
  const getTopRightTableOptions = () => {
    const options = [];
    
    if(selectedRowsIDs?.length > 0 && enableDeleteRule && hasEditPermissions){ 
      options.push(
      <Tooltip title="Delete" orientation="top" variant="tertiary">
        <Button
          onClick={() => handleDelete()}
          variant="secondary"
          type="destructive"
          disabled={
            !selectedRowsIDs.length ||
            !canTakeActionOnModules(
              INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_MAPPING,
              "edit"
            ) ||
            props.disableActionButtons
          }
        >
          <DeleteTrashIcon />
        </Button>
      </Tooltip>
      )
    }
    if(enableAddRule && hasEditPermissions){ 
      options.push(
      <Button
        variant="tertiary"
        onClick={() => {
          history.push("/inventory-smart/configuration/addRules", {
            screenName: props.screenName,
          });
        }}
        disabled={
          !canTakeActionOnModules(
            INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_MAPPING,
            "edit"
          ) || props.disableActionButtons
        }
      >
        Add Rule
      </Button>
    )
    }
    if(enableManageException && hasEditPermissions){ 
      options.push(
      <Button
        variant="tertiary"
        onClick={() =>
          history.push(
            "/inventory-smart/configuration/manage-exceptions",
            {
              screenName: props.screenName,
              dimension: "product",
            }
          )
        }
        disabled={
          !canTakeActionOnModules(
            INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_MAPPING,
            "edit"
          )
        }
      >
        Manage Exceptions
      </Button>
    )
    }
    if(selectedRowsIDs?.length > 0 && hasEditPermissions){ 
      options.push(
      <Button
        variant="primary"
        onClick={onModifyClick}
        disabled={
          !canTakeActionOnModules(
            INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_MAPPING,
            "edit"
          ) || props.disableActionButtons
        }
      >
        Modify
      </Button>
    )
    }
    return options;
  }

  const renderContent = () => {
    return (
      <Loader loader={showloader}>
        <div data-testid="filterContainer">
          {showMappedStore && (
            <MappedStore
              checked={false}
              selectedID={selectedID}
              dimension={"product"}
              onModify={(dataBody) => {
                props.toggleModifyMapping(dataBody, metaPayload);
              }}
              filters={ref.current}
              onCancel={() => {
                setShowMappedStore(false);
              }}
              disableModify={
                !canTakeActionOnModules(
                  INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_MAPPING,
                  "edit"
                ) || props.disableActionButtons
              }
              isAggregated={false}
              showDownloadBtn={showDownloadBtn}
              hasEditPermissions={hasEditPermissions}
              handleErrorMessage={props.handleErrorMessage}
            ></MappedStore>
          )}

          <div data-testid="resultContainer">

            {columns.length > 0 && (
              <AgGridTable
                columns={columns}
                selectAllHeaderComponent={hasEditPermissions}
                // hideSelectAllRecords={fetchSelectAllStatus()}
                sizeColumnsToFitFlag
                onGridChanged
                onRowSelected
                loadTableInstance={(instance) => {
                  productTableRef.current = instance;
                }}
                manualCallBack={(body, pageIndex, params) =>
                  manualCallBack(body, pageIndex, params)
                }
                rowModelType="serverSide"
                serverSideStoreType="partial"
                cacheBlockSize={props.pageSize || 10}
                paginationPageSize={props.pageSize || 10}
                uniqueRowId={"rule_code"}
                onSelectionChanged={onSelectionChanged}
                tableName="ps_mapping_rules_list"
                topRightOptions={getTopRightTableOptions()}
                showDownloadButton={totalRowsCount > 0}
                onDownloadButtonClick={() => downloadData()}
                isChatEnabled={isThreadFeatureEnabled}
                enableCellComment={false}
                // disableSelectionOnSelectAll={true}
              />
            )}
          </div>
        </div>
      </Loader>
    );
  };

  return <React.Fragment>{renderContent()}</React.Fragment>;
});

const mapStateToProps = (state) => {
  return {
    inventorysmartModulesPermission:
      state.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    inventorysmartScreenConfig:
      state.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
    isAggregated: state.productMappingReducerService.isAggregated,
    pageSize: state.inventorysmartReducer.inventorySmartCommonService.inventorysmartScreenConfig?.inventorysmart_page_count,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setActiveScreenName: (data) => dispatch(setActiveScreenName(data)),
    addSnack: (snackObj) => dispatch(addSnack(snackObj)),
    getTenantConfigApplicationLevel: (dynamicRoute, queryParam) =>
      dispatch(getTenantConfigApplicationLevel(dynamicRoute, queryParam)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps, null, {
  forwardRef: true,
})(ProductStoreBand);
