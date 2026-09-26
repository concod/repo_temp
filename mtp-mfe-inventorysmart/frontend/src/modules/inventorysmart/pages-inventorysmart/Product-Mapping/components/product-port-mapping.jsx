import Typography from "@mui/material/Typography";
import makeStyles from "@mui/styles/makeStyles";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import AgGridTable from "core/Utils/agGrid";
import ConfirmBox from "core/Utils/confirmPrompt/confirmPopup";
import { productMappingTableArticleFilter } from "core/Utils/constants/inventorySmart-constants";
import { addSnack } from "core/actions/snackbarActions";
import { Prompt, Button, Switch, useTranslation } from "impact-ui-v3";
import { cloneDeep } from "lodash";
import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import Loader from "core/Utils/Loader/loader";
import { setProductStatusData } from "core/actions/productStoreStatusActions";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { setActiveScreenName } from "core/pages/commonModulesServices/common-assort-service";
import {
  getAllProductPort,
  mapProductToPort,
} from "../services-product-mapping/productMappingService";
import Modify from "./modify-product-mapping";
import { INVENTORY_SUBMODULES_NAMES } from "core/Utils/constants/inventorySmart-constants";
import { isActionAllowedOnSubModule } from "core/Utils/utils";

const useStyles = makeStyles(() => ({
  button: {
    marginLeft: "0.6rem",
  },
  confirmBox: {
    "& .MuiDialog-paper": {
      minWidth: "430px",
      borderRadius: "10px 10px 6px 6px",
    },
  },
  contentBody: {
    minHeight: "10rem",
  },
  action: {
    background: "#f7f7f7",
    padding: "1rem",
  },
  title: {
    fontSize: "1rem",
    fontWeight: "600",
    paddingTop: "1.5rem",
  },
  text: {
    fontSize: "0.9rem",
    color: "#5a5a5ad9",
  },
  HeaderBreadCrumbs: {
    display: "flex",
    paddingBottom: "2rem",
  },
  footer: {
    textAlign: "center",
    padding: "1rem",
  },
}));

const ProductsFilter = React.forwardRef((props, ref) => {
  const { t } = useTranslation();
  const [showloader, setloader] = useState(true);
  const [columns, setColumns] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedRowsIDs, setSelectedRowsIDs] = useState([]);
  const [modifyProduct, showModifyProduct] = useState(false);
  const [setAllDataPort, updatesetAllDataPort] = useState([]);
  const [portData, setPortData] = useState([]);
  const [portDefaultData, setPortDefaultData] = useState([]);
  const [portCols, setPortCols] = useState([]);
  const [disableSetAll, setDisableSetAll] = useState(false);
  const [confirmBox, showConfirmBox] = useState(false);
  const portTableRef = useRef(null);
  const [hasEditPermissions, setHasEditPermissions] = useState(false);
  const [isMultipleStatus, setIsMultipleStatus] = useState(false);
  const classes = useStyles();
  const { updateFlagEdit = () => {} } = props;

  const displaySnackMessages = (msg, type) => {
    props.addSnack({
      message: msg,
      options: {
        variant: type,
      },
    });
  };

  useEffect(() => {
    const getInitialData = async () => {
      try {
        let cols = await getColumnsAg("table_name=product_port_configuration_table")();

        let actionPermissionCheck = !!canTakeActionOnModules(
          INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_MAPPING_PRODUCT_DC_FC,
          "edit"
        );
        let areStatusGrouped = false;
        cols.forEach(async (item) => {
          if (item.extra?.is_grouping_key) {
            areStatusGrouped = true;
            item.cellRenderer = "agGroupCellRenderer";
          }
        
          if (item.column_name === "is_eligible") {
            // Set as list type for Set All popup to show dropdown
            item.type = "list";
            item.is_editable = actionPermissionCheck;
            item.editable = false;
            item.options = [
              { label: "Map", value: true, id: true },
              { label: "Unmap", value: false, id: false },
            ];
            item.cellRenderer = (cellProps) => {
              if (typeof cellProps.data?.is_eligible === "boolean") {
                const handleToggleChange = (e) => {
                  const newValue = e.target.checked;
                  cellProps.node.setDataValue("is_eligible", newValue);
                };
                return (
                  <Switch
                    value={cellProps.data?.is_eligible}
                    checked={cellProps.data?.is_eligible}
                    disabled={!actionPermissionCheck}
                    onChange={handleToggleChange}
                    color="primary"
                  />
                );
              }
              return null;
            };
          }
        });
        setIsMultipleStatus(areStatusGrouped);

        setColumns(cols);
        setPortCols(cols);
        setloader(false);
        setHasEditPermissions(actionPermissionCheck);
      } catch (error) {
        props.handleErrorMessage(error);
      }
    };

    getInitialData();

    props.setActiveScreenName("Product to Port mapping");
    sessionStorage.setItem("activeScreenName", "Product to Port mapping");
  }, []);

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props?.inventorysmartModulesPermission,
      props?.module,
      subModuleName,
      action
    );
  };

  const manualCallBack = async (manualbody, pageIndex, params) => {
    setloader(true);
    if (ref.current.length === 0) {
      setloader(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
    let filter = ref.current;
    // to filter table based on selected sku's, show data selected on alerts on inventory screen
    if (pageIndex === 0 && props.isRedirectedFromDifferentPage) {
      let articleFilter = productMappingTableArticleFilter;
      articleFilter.values = [...props.selectedProductMappingArticles];
      filter = [...ref.current, articleFilter];
    }

    let body = {
      filters: filter,
      meta: {
        ...manualbody,
        limit: { limit: props.pageSize || 10, page: pageIndex + 1 },
      },
      selection: {
        data: params?.api?.checkConfiguration,
        unique_columns: props.isAggregated
          ? ["aggregation_code"]
          : ["article"],
      },
    };

    let queryParams = `?page=${pageIndex + 1}&level=${
      props.isAggregated ? "aggregation" : "product"
    }`;

    try {
      let { data: portResponse } = await getAllProductPort(body, queryParams)();

      portResponse.data = portResponse.data.map((item) => {
        let newItem = { ...item };

        if (newItem.port_validity?.length === 1) {
          newItem = {
            ...item,
            ...item.port_validity[0],
            port_validity: null,
          };
        }
        if (newItem.port_validity && newItem.port_validity.length === 0) {
          newItem.port_validity = null;
        }

        // Add unique row identifier for AG Grid selection tracking
        newItem._row_id = `${newItem.article}_${newItem.port_code || ''}_${newItem.shippingmethod || newItem.shipping_method || ''}`;
        return newItem;
      });

      setloader(false);
      setPortData(portResponse.data);
      setPortDefaultData(cloneDeep(portResponse.data));
      return {
        data: portResponse.data,
        totalCount: portResponse.total,
      };
    } catch (error) {
      setloader(false);
      props.handleErrorMessage(error);
    }
  };

  useEffect(() => {
    props.filtersSelection.length ? onClickFilter() : onReset();
  }, [props.filtersSelection]);

  const onClickFilter = () => {
    
    if (portTableRef.current)
      portTableRef.current.api.refreshServerSideStore({ purge: true });
  };

  const setAllChanges = async (fields_values, params) => {
    // Build payload for save API: { elements: [{ article, is_eligible, port_code, shippingmethod }] }
    // Use selectedRowsIDs state which tracks all selected rows via onSelectionChanged.
    // Each row now has a unique _row_id (article + port_code + shippingmethod) so AG Grid
    // correctly tracks individual row selections without deduplication.
    const selectedRows = selectedRowsIDs;

    if (!selectedRows || selectedRows.length === 0) {
      displaySnackMessages("Please select at least one row", "error");
      return { message: t("inventorysmart.noRowsSelected"), type: "error" };
    }

    const elements = selectedRows.map((row) => ({
      article: row.article,
      is_eligible: fields_values.is_eligible === true || fields_values.is_eligible?.value === true,
      port_code: row.port_code || null,
      shippingmethod: row.shippingmethod || row.shipping_method || null,
    }));
    
    const savePayload = { elements };
    
    try {
      await mapProductToPort(savePayload)();
      params.api.deselectAll();
      onClickFilter();
    } catch (error) {
      console.error("Error saving product port mapping:", error);
    }
    // Return response object so modal closes (always return to close modal)
    return {
      message: t("inventorysmart.successfullyAppliedValues"),
      type: "success",
    };
  };

  const saveRequest = () => {
    if (setAllDataPort.length) {
      setShowModal(true);
    } else {
      displaySnackMessages("There is no change to save.", "warning");
    }
  };

  const onConfirm = async () => {
    try {
      setloader(true);
      if (setAllDataPort.length) {
        let body = { elements: setAllDataPort };
        const response = await mapProductToPort(body)();
        if (response?.data?.message.includes("Failed")) {
          displaySnackMessages(response?.data?.message, "error");
          return;
        }
      }
      //Once we save the data, we reset to the original state
      updatesetAllDataPort([]);
      displaySnackMessages("Product(s) mapped successfully", "success");
      setShowModal(false);
      setloader(false);
      updateFlagEdit(false);
    } catch (err) {
      setloader(false);
      displaySnackMessages(
        "Unable to save the request.Please try again",
        "error"
      );
    }
  };

  const onReset = () => {
    updatesetAllDataPort([]);
    onClickFilter();
  };

  const onSelectionChanged = (event) => {
    setSelectedRowsIDs(event.api.getSelectedRows());
  };

  const onCellValueChanged = (params) => {
    let rowIndex = params.rowIndex % 10;
    let value = Array.isArray(params.value)
      ? params.value.map((val) => val.value || val)
      : [params.value];
    let row = {
      values: params.data,
    };
    const columnId = params.column.colId;
    const uniqueId = props.isAggregated ? "article" : "product_code";
    
    // Handle is_eligible column changes for port mapping
    if (columnId === "is_eligible") {
      let alreadyexist = setAllDataPort
        ? setAllDataPort.filter((item) => !(row.values.article === item.article && row.values.port_code === item.port_code))
        : [];
      let newElement = {
        article: row.values.article,
        is_eligible: value[0],
        port_code: row.values.port_code || null,
        shippingmethod: row.values.shippingmethod || row.values.shipping_method || null,
      };
      updatesetAllDataPort([...alreadyexist, newElement]);
      let newData = portData.map((item, index) => {
        if (index === rowIndex) {
          return {
            ...item,
            [columnId]: value[0],
          };
        }
        return item;
      });
      setPortData(newData);
    }
    updateFlagEdit(true);
  };

  const getTopRightTableOptions = () => {
    const options = [];
    options.push(<Typography>Port Mapping</Typography>);
    if(hasEditPermissions && selectedRowsIDs?.length > 0){
      options.push(
        <Button
          variant="tertiary"
          onClick={async () => {
            if (selectedRowsIDs.length > 0) {
              portTableRef.current.trigerSetAll(true);
            } else {
              displaySnackMessages(
                "Please select atleast one Product",
                "error"
              );
            }
          }}
          disabled={
            !canTakeActionOnModules(
              INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_MAPPING_PRODUCT_DC_FC,
              "edit"
            ) || disableSetAll
          }
        >
          Set All
        </Button>
      )
    }
      
    options.push(
      <Button
        variant="secondary"
        id="producttoDcfcCancelBtn"
        onClick={() => {
          if (portData.length && setAllDataPort.length) {
            showConfirmBox(true);
          } else {
            displaySnackMessages("No changes are made", "warning");
          }
        }}
      >
        Cancel
      </Button>
    );
    options.push(
      <Button
        variant="contained"
        color="primary"
        onClick={() => {
          saveRequest();
        }}
        disabled={
          !canTakeActionOnModules(
            INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_MAPPING_PRODUCT_DC_FC,
            "edit"
          )
        }
      >
        Save
      </Button>
    );
    
    return options;
  }

  const renderContent = () => {
   
    return (
      <Loader loader={showloader}>
        <div
          style={{ display: modifyProduct ? "none" : "" }}
          data-testid="filterContainer"
        >
          <Prompt
            isOpen={showModal}
            title="Confirm Changes"
            onPrimaryButtonClick={() => {
                onConfirm();
                setShowModal(false);
            }}
            onSecondaryButtonClick={
             () => setShowModal(false)
            }
        
            primaryButtonLabel = "Update"
            secondaryButtonLabel = "Close"
          >
            Are you sure to save all your changes?
          </Prompt>
          <div data-testid="resultContainer">

            {(
              <AgGridTable
                columns={columns}
                // rowData={toggleFcValue ? fcData : dcData}
                selectAllHeaderComponent={hasEditPermissions}
                sizeColumnsToFitFlag
                onGridChanged
                onRowSelected
                manualCallBack={(body, pageIndex, params) =>
                  manualCallBack(body, pageIndex, params)
                }
                loadTableInstance={(gridInstance) => {
                  portTableRef.current = gridInstance;
                }}
                groupDisplayType={"custom"}
                rowModelType="serverSide"
                serverSideStoreType="partial"
                cacheBlockSize={props.pageSize || 10}
                paginationPageSize={props.pageSize}
                uniqueRowId={"_row_id"}
                onSelectionChanged={onSelectionChanged}
                setAllInterdependentFields={true}
                onSetAllApply={setAllChanges}
                onCellValueChanged={onCellValueChanged}
                childKey={"port_validity"}
                treeData={true}
                tableHeader = {`Filtered ${dynamicLabelsBasedOnTenant("product", "core")}`}
                topRightOptions = {getTopRightTableOptions()}
              />
            )}
          </div>
          {confirmBox && (
            <ConfirmBox
              onClose={() => showConfirmBox(false)}
              onConfirm={() => {
                if (portData.length) {
                  updatesetAllDataPort([]);
                  onClickFilter();
                }
                showConfirmBox(false);
                updateFlagEdit(false);
              }}
            />
          )}
        </div>

        {modifyProduct && (
          <div style={{ display: modifyProduct ? "" : "none" }}>
            <Modify
              cols={columns}
              selectedProducts={selectedRowsIDs[0]}
              goBack={() => showModifyProduct(false)}
            ></Modify>
          </div>
        )}
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
    isAggregated: state.productMappingReducerService.isDcMappingAggregated,
    pageSize: state.inventorysmartReducer.inventorySmartCommonService.inventorysmartScreenConfig?.inventorysmart_page_count,
  };
};
const mapDispatchToProps = (dispatch) => {
  return {
    setProductStatusData: (data) => dispatch(setProductStatusData(data)),
    setActiveScreenName: (data) => dispatch(setActiveScreenName(data)),
    addSnack: (snackObj) => dispatch(addSnack(snackObj)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps, null, {
  forwardRef: true,
})(ProductsFilter);
