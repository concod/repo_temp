import React, { useEffect, useState, useRef } from "react";
import Loader from "../../../Utils/Loader/loader";
import { Button } from "impact-ui";
import DeleteIcon from "@mui/icons-material/Delete";
import globalStyles from "core/Styles/globalStyles";
import {
  deleteRule,
  getRulesList,
} from "../services-product-mapping/productMappingService";
import MappedStore from "./mapped-stores";
import { setActiveScreenName } from "../../commonModulesServices/common-assort-service";
import { getColumnsAg } from "../../../actions/tableColumnActions";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import { configureViewButton } from "core/pages/storeMapping/components/common-mapping-functions";
import AgGridTable from "core/Utils/agGrid";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { fetchDynamicConfigFromTenantReducer } from "core/Utils/DynamicLabels";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import { isActionAllowedOnSubModule } from "core/Utils/utils";
import { INVENTORY_SUBMODULES_NAMES } from "core/Utils/constants/inventorySmart-constants";
import { captializeStringIfCamelCase } from "core/Utils/formatter";
import { useHistory } from "react-router-dom";

const ProductStoreBand = React.forwardRef((props, ref) => {
  const [showloader, setShowLoader] = useState(true);
  const [columns, setColumns] = useState([]);
  const [selectedRowsIDs, setSelectedRowsIDs] = useState([]);
  const [showMappedStore, setShowMappedStore] = useState(false);
  const [selectedID, setSelectedID] = useState("");
  const [selectAll, setSelectAll] = useState(false);
  const [enableAddRule, setEnableAddRule] = useState(false);
  const [enableDeleteRule, setEnableDeleteRule] = useState(false);
  const [enableManageException, setEnableManageException] = useState(false);
  const [metaPayload, setMetaPayload] = useState({});
  const globalClasses = globalStyles();
  const productTableRef = useRef(null);
  const history = useHistory();

  useEffect(() => {
    getInitialData();
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
      setEnableAddRule(mappingAddRuleConfig);
      setEnableDeleteRule(mappingDeleteRuleConfig);
      setEnableManageException(mappingManageException);
      let cols = await getColumnsAg("table_name=ps_mapping_rules_list")();
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

      setColumns(cols);
      setShowLoader(false);
    } catch (error) {
      console.error(error);
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
          limit: { limit: 500, page: pageIndex + 1 },
        },
      };
      let body = {
        filters: ref.current,
        ...meta,
      };
      setMetaPayload(meta);
      const resp = await getRulesList(body);
      resp.data.data = configureViewButton(
        resp.data.data,
        "mapped_stores_count"
      );
      setShowLoader(false);
      return {
        data: resp.data.data,
        totalCount: resp.data.total,
      };
    } catch (err) {
      setShowLoader(false);
    }
  };

  const onClickFilter = () => {
    productTableRef.current?.api?.refreshServerSideStore({ purge: true });
  };

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
      selectedRowsIDs.forEach((row) => {
        ruleCodes.push(row?.rule_code);
      });
      deleteRule({ rule_codes: ruleCodes });
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
          props.toggleSelectAllModify(metaPayload);
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
            ></MappedStore>
          )}

          <div data-testid="resultContainer">
            <div
              className={`${globalClasses.flexRow} ${globalClasses.layoutAlignEnd} ${globalClasses.gap} ${globalClasses.marginBottom}`}
            >
              {enableDeleteRule && (
                <Button
                  onClick={() => handleDelete()}
                  icon={DeleteIcon}
                  variant="primary"
                  disabled={
                    !selectedRowsIDs.length ||
                    !canTakeActionOnModules(
                      INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_MAPPING,
                      "edit"
                    ) ||
                    props.disableActionButtons
                  }
                />
              )}
              {enableAddRule && (
                <Button
                  variant="primary"
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
              )}
              {enableManageException && (
                <Button
                  variant="primary"
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
              )}
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
            </div>
            {columns.length > 0 && (
              <AgGridTable
                columns={columns}
                selectAllHeaderComponent={true}
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
                cacheBlockSize={500}
                uniqueRowId={"rule_code"}
                onSelectionChanged={onSelectionChanged}
                disableSelectionOnSelectAll={true}
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
