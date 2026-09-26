import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import AgGridComponent from "core/Utils/agGrid";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import {
  ERROR_MESSAGE,
  defaultTableData,
} from "modules/oms/constants-oms/stringConstants";
import globalStyles from "core/Styles/globalStyles";
import { Button } from "impact-ui-v3";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { cloneDeep, uniq, isEmpty } from "lodash";
import OffCycleSetAllPopUp from "./OffCycleSetAllPopUp.jsx";
import ArticleDCSizeLevelTable from "./ArticleDCSizeLevelTable.jsx";
import {
  getOffCycleProductDetailsColumnConfig,
  getOffCycleProductDetailsTableData,
  setOffCycleOrderTableConfigLoader,
  setOffCycleOrderTableDataLoader,
  getOffCycleProductDetailsUpdateData,
  setOffCycleOrderHasUnsavedChanges,
} from "modules/oms/services-oms/Create-New-Order/off-cycle-order-service";
import { OMS_CREATE_NEW_ORDER_SCREENNAME_KEY } from "modules/oms/constants-oms/stringConstants.js";

const OffCycleProductDetailsTable = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [productDetailsTableColumns, setProductDetailsTableColumns] = useState(
    []
  );
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [render, setRender] = useState(false);
  const [editedCells, setEditedCells] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [openPopUp, setOpenPopUp] = useState(false);
  const [checkAllSetAllRequest, setCheckAllSetAllRequest] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [grandTotalData, setGrandTotalData] = useState({});

  const productTableGridInstance = useRef(null);

  const [isUserHasEditAccess, setIsUserHasEditAccess] = useState(true);
  const [isUserHasSetAllAccess, setIsUserHasSetAllAccess] = useState(true);
  const [isUserHasViewOnlyAccess, setIsUserHasViewOnlyAccess] = useState(null);

  const DESCRIPTION_LABEL =
    props?.OffCycleOrderScreenConfig?.off_cycle_orders?.description_label ||
    "Product";

  useEffect(() => {
    if (productTableGridInstance?.current) {
      productTableGridInstance.current.api.checkAllSetAllRequest = checkAllSetAllRequest;
    }
  }, [checkAllSetAllRequest]);

  const getValidCheckConfiguration = (checkConfiguration) => {
    let validCheckConfiguration = [];
    if (Array.isArray(checkConfiguration)) {
      validCheckConfiguration = checkConfiguration.filter(
        (item) => item !== null && item !== undefined
      );
    }
    if (validCheckConfiguration.length === 0) return [];
    else return validCheckConfiguration;
  };

  const getCheckConfigurationForProductDetails = () => {
    let l_checkAllSetAllRequest = {
      searchColumns: productTableGridInstance?.current?.api?.getFilterModel(),
    };
    let setAllData;
    if (
      productTableGridInstance?.current?.api?.checkConfiguration[
        productTableGridInstance?.current?.api?.checkConfiguration.length - 2
      ]
    ) {
      setCheckAllSetAllRequest((old) => {
        if (old && old.length > 0) {
          setAllData = [...old, l_checkAllSetAllRequest];
          return [...old, l_checkAllSetAllRequest];
        } else {
          setAllData = [l_checkAllSetAllRequest];
          return [l_checkAllSetAllRequest];
        }
      });
    }
    const selection = {
      data: getValidCheckConfiguration(
        productTableGridInstance?.current?.api?.checkConfiguration
      ),
      unique_columns: ["unique_row_id"],
    };
    const checkConfig = {
      selection,
      set_all: setAllData,
      isSelectAllRecords:
        productTableGridInstance?.current?.api?.isSelectAllRecords,
    };
    return checkConfig;
  };

  const cellClassRules = {
    [classes.disabledCell]: (params) => {
      const node = params.node;
      const colDef = params.colDef;
      if (colDef.accessor === "product_info" || node.data.order_status_id === 0)
        return false;
      return true;
    },
  };

  const displaySnackMessages = (message, variance) => {
    props.closeSnack();
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const setCellStyles = (columnsDef) => {
    try {
      let updatedColumnsDef = cloneDeep(columnsDef);
      updatedColumnsDef = updatedColumnsDef.map((item) => {
        const originalCellStyle = item.cellStyle;

        item.cellStyle = (params) => {
          // Grand Total row styling
          if (params.node.rowPinned === "top") {
            return {
              backgroundColor: "#f5f5f5",
              fontWeight: "600",
            };
          }

          // Regular row styling
          let colour = { backgroundColor: "inherit" };

          if (item.column_name === "order_quantity_cof") {
            if (params.node.data.isEdited)
              colour = { backgroundColor: "#0055af36" };
            if (params.node.data.isMOQBreached)
              colour = { backgroundColor: "#AF000033" };
          }

          return colour;
        };

        //item.cellClassRules = cellClassRules;

        return item;
      });
      return updatedColumnsDef;
    } catch (err) {
      displaySnackMessages("Something went wrong", "error");
      return [];
    }
  };

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setOffCycleOrderTableDataLoader(true);

      const appliedFilters = cloneDeep(props.deepDiveFilters || []);
      const appliedDateFilters = [];

      // Adding the OMS Date filters to the filters
      if (!isEmpty(props?.ropDate)) {
        appliedDateFilters.push(props?.ropDate);
      }
      if (!isEmpty(props?.recommRecieptDate)) {
        appliedDateFilters.push(props?.recommRecieptDate);
      }
      // Adding the Deep Dive Date filters to the filters
      if (props?.weekRange?.attribute_name) {
        appliedDateFilters.push(props?.weekRange);
      }

      // REAL API CALL
      let body = {
        filters: appliedFilters,
        meta: {
          ...manualbody,
          limit: { limit: 10, page: pageIndex + 1 },
        },
        draft_id: props.draftId,
      };

      // Add date_filter if appliedDateFilters is present
      if (appliedDateFilters.length > 0) {
        body.date_filter = appliedDateFilters;
      }

      if (!props.draftId) return { data: [], totalCount: 0 };

      let response = await props.getOffCycleProductDetailsTableData(body);
      if (response.data.status) {
        const dataResponse = cloneDeep(response.data.data);

        let formatedData = agGridRowFormatter(
          dataResponse,
          params?.api?.checkConfiguration,
          "unique_row_id"
        );

        formatedData = formatedData.map((item) => {
          item.isMOQBreached =
            item.order_quantity_cof < item.min_order_quantity_style_color;
          return item;
        });

        // Extract grand total from API response
        if (response.data.grand_total) {
          setGrandTotalData({
            ...response.data.grand_total,
            isGrandTotal: true,
          });
        }

        console.log("formatedData", formatedData);
        props.setOffCycleOrderTableDataLoader(false);
        return { data: formatedData, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setOffCycleOrderTableDataLoader(false);
        return defaultTableData;
      }
    } catch (err) {
      console.log("Error in Fetching Product Details Table Data", err);
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setOffCycleOrderTableDataLoader(false);
      return defaultTableData;
    }
  };

  const createNewOrderOffcycleAccess = props.userAccess?.find(
    (item) =>
      item.module === "create_new_order" &&
      item.screen === OMS_CREATE_NEW_ORDER_SCREENNAME_KEY
  );
  const canEdit = createNewOrderOffcycleAccess?.isEditButton || false;
  const canSetAll = createNewOrderOffcycleAccess?.isSetAllButton || false;

  useEffect(() => {
    if (!isEmpty(props?.userAccess)) {
      // Use new userAccess flags
      setIsUserHasEditAccess(canEdit);
      setIsUserHasSetAllAccess(canSetAll);
      setIsUserHasViewOnlyAccess(false);
    } else if (props?.orderingAccessControl) {
      // Fall back to old access control
      setIsUserHasViewOnlyAccess(
        !props?.orderingAccessControl?.isEditButton?.isVisible
      );
      setIsUserHasEditAccess(true);
      setIsUserHasSetAllAccess(true);
    }
  }, [props?.userAccess, props?.orderingAccessControl, canEdit, canSetAll]);

  // scroll to bottom when article is clicked
  useEffect(() => {
    if (selectedArticle) {
      setTimeout(() => {
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    }
  }, [selectedArticle]);

  const checkForEditability = (columnsData) => {
    let updatedColumnsData = cloneDeep(columnsData);

    // If userAccess exists, use canEdit flag; otherwise fall back to orderingAccessControl
    const shouldDisableEdit = !isEmpty(props?.userAccess)
      ? !canEdit
      : !props?.orderingAccessControl?.isEditButton?.isVisible;

    if (shouldDisableEdit) {
      updatedColumnsData.map((column) => {
        if (column.type !== "link") {
          column.is_editable = false;
        }
      });
    }
    return updatedColumnsData;
  };

  const loadTableInstance = (params) => {
    productTableGridInstance.current = params;
  };

  const onSelectionChanged = (event) => {
    let selectedRows = [];
    productTableGridInstance.current.api.forEachNode((node) => {
      node.selected && selectedRows.push({ ...node.data });
    });
    setSelectedProducts(selectedRows);

    // Notify parent component about selection change
    if (props.onSelectionChange) {
      props.onSelectionChange(
        selectedRows.length,
        selectedRows,
        getCheckConfigurationForProductDetails
      );
    }
  };

  const onBlur = (_e, data, column, isChanged) => {
    if (isChanged) {
      if (column.colId === "order_quantity_cof") {
        productTableGridInstance.current.api.forEachNode((node) => {
          if (node.data.unique_row_id === data.unique_row_id) {
            node.data.isEdited = true;
            setEditedCells((prev) => {
              const updatedRows = {
                ...prev,
                [node.data.unique_row_id]: {
                  ...node.data,
                },
              };
              return updatedRows;
            });
            setHasUnsavedChanges(true);
            node.data.isMOQBreached =
              node.data.order_quantity_cof <
              node.data.min_order_quantity_style_color;
            productTableGridInstance.current.api.refreshCells({
              force: true,
              suppressFlash: false,
              rowNodes: [node],
              columns: ["order_quantity_cof"],
            });
          }
        });
      }
    }
  };

  const onCellValueChanged = (params) => {
    try {
      const { colDef, node } = params;
      if (colDef.column_name === "adjusted_delivery_date") {
        node.data.isDateEdited = true;

        setEditedCells((prev) => {
          const updatedRows = {
            ...prev,
            [node.data.unique_row_id]: {
              ...node.data,
            },
          };
          return updatedRows;
        });
        setHasUnsavedChanges(true);

        productTableGridInstance.current.api.refreshCells({
          force: true,
          suppressFlash: false,
          rowNodes: [node],
          columns: ["adjusted_delivery_date"],
        });
      }
    } catch (error) {
      console.error("Error in onCellValueChanged", error);
    }
  };

  const refreshTableData = () => {
    productTableGridInstance?.current?.api?.refreshServerSideStore({
      purge: true,
    });
    productTableGridInstance.current?.api?.deselectAll();
    setSelectedProducts([]);
  };

  const refreshParentTableDataOnly = () => {
    productTableGridInstance?.current?.api?.refreshServerSideStore({
      purge: true,
    });
    productTableGridInstance.current?.api?.deselectAll();
    setSelectedProducts([]);
  };

  const handleSave = async () => {
    const currentEditedProducts = Object.values(editedCells).map(
      (item) => item
    );

    const appliedFilters = cloneDeep(props.deepDiveFilters || []);
    const appliedDateFilters = [];

    // Adding the OMS Date filters to the filters
    if (!isEmpty(props?.ropDate)) {
      appliedDateFilters.push(props?.ropDate);
    }
    if (!isEmpty(props?.recommRecieptDate)) {
      appliedDateFilters.push(props?.recommRecieptDate);
    }
    // Adding the Deep Dive Date filters to the filters
    if (props?.weekRange?.attribute_name) {
      appliedDateFilters.push(props?.weekRange);
    }

    let body = {
      draft_id: props.draftId,
      filters: appliedFilters,
      modifications: [
        {
          modified: currentEditedProducts.map((item) => {
            const modifiedData = {
              unique_row_id: item.unique_row_id,
            };

            // Include order_quantity_cof if edited
            if (item.isEdited) {
              const editedValue =
                item?.order_quantity_cof !== undefined &&
                item?.order_quantity_cof !== null &&
                item?.order_quantity_cof !== ""
                  ? item.order_quantity_cof
                  : item.order_quantity_cof || 0;
              modifiedData.order_quantity_cof = editedValue;
              modifiedData.ratio = (
                parseInt(editedValue) / parseInt(item.raw_roq_cof)
              ).toFixed(5);
            }

            // Include adjusted_delivery_date if edited
            if (item.isDateEdited) {
              modifiedData.adjusted_delivery_date = item.adjusted_delivery_date;
            }

            return {
              product: {
                name: item.unique_row_id,
                ...modifiedData,
              },
            };
          }),
        },
      ],
    };

    // Add date_filter if appliedDateFilters is present
    if (appliedDateFilters.length > 0) {
      body.date_filter = appliedDateFilters;
    }

    try {
      props.setOffCycleOrderTableDataLoader(true);
      // REAL API CALL
      let response = await props.getOffCycleProductDetailsUpdateData(body);
      if (response.data.status) {
        displaySnackMessages("Draft saved successfully", "success");
        setEditedCells({});
        setHasUnsavedChanges(false);

        // Notify parent to reload other components
        if (props.onSaveSuccess) {
          props.onSaveSuccess();
        }
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setOffCycleOrderTableDataLoader(false);
      refreshTableData();
    }
  };

  const openSetAllPopUp = () => {
    setOpenPopUp(true);
  };

  const fetchColumnConfig = async () => {
    try {
      let columnsData;

      let columns = await props.getOffCycleProductDetailsColumnConfig();
      columnsData = columns?.data?.data;
      columnsData = checkForEditability(columnsData);

      let formattedColumns = agGridColumnFormatter(
        columnsData,
        null,
        {
          article: (data) => setSelectedArticle(data),
        },
        null,
        null,
        null,
        null,
        true
      );

      let updatedColumns = setCellStyles(formattedColumns);

      // Add custom cell renderer for all columns to handle Grand Total row
      if (updatedColumns && updatedColumns.length > 0) {
        // Find the first suitable column for "Grand Total" label
        const firstColumnIndex = updatedColumns.findIndex(
          (col) =>
            col.column_name === "article" ||
            col.column_name === "l4_name" ||
            col.order_of_display === 1
        );

        updatedColumns = updatedColumns.map((col, index) => {
          const originalCellRenderer = col.cellRenderer;
          const isGrandTotalColumn = index === firstColumnIndex;

          col.cellRenderer = (params) => {
            // Handle Grand Total row
            if (params.node.rowPinned === "top") {
              // For the first column, show "Grand Total"
              if (isGrandTotalColumn) {
                return "Grand Total";
              }

              // For date/datetime columns, show nothing
              if (
                col.type === "date" ||
                col.type === "datetime" ||
                col.column_name?.includes("date") ||
                col.column_name?.includes("Date")
              ) {
                return "";
              }

              // For numeric columns, show the value
              if (params.value !== undefined && params.value !== null) {
                return params.value;
              }

              return "";
            }

            // For regular rows, use original renderer
            return originalCellRenderer
              ? originalCellRenderer(params)
              : params.value;
          };

          return col;
        });
      }

      setProductDetailsTableColumns(updatedColumns);
    } catch (err) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      setRender(true);
      props.setOffCycleOrderTableConfigLoader(false);
    }
  };

  useEffect(() => {
    if (props.draftId) {
      setRender(false);
      props.setOffCycleOrderTableConfigLoader(true);

      fetchColumnConfig();
    }
  }, [props.draftId, props.reloadTrigger]);

  const getTopRightOptions = () => {
    let options = [];

    options.push(
      <Button
        key="save-btn"
        variant="primary"
        color="primary"
        id="productSaveBtn"
        className={classes.button}
        disabled={
          !isEmpty(props?.userAccess)
            ? !isUserHasEditAccess ||
              (Object.keys(editedCells).length > 0 ? false : true)
            : isUserHasViewOnlyAccess ||
              (Object.keys(editedCells).length > 0 ? false : true)
        }
        onClick={handleSave}
      >
        Save
      </Button>
    );

    if (selectedProducts.length > 0) {
      options.push(
        <Button
          key="set-all-btn"
          variant="tertiary"
          color="primary"
          className={classes.button}
          disabled={
            !isEmpty(props?.userAccess)
              ? !isUserHasSetAllAccess || selectedProducts.length === 0
              : isUserHasViewOnlyAccess || selectedProducts.length === 0
          }
          onClick={openSetAllPopUp}
        >
          Set All
        </Button>
      );
    }

    return options;
  };

  const getBottomLeftOptions = () => {
    return (
      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            width: "14px",
            height: "14px",
            backgroundColor: "#AF000033",
            border: "1px solid #AF0000",
            marginRight: "8px",
          }}
        ></div>
        <span style={{ fontSize: "12px", color: "#666" }}>MOQ Breach</span>
      </div>
    );
  };

  //To Check if the Save is Enabled
  useEffect(() => {
    props.setOffCycleOrderHasUnsavedChanges({
      ...props.offCycleOrderHasUnsavedChanges,
      productDetailsLevel0: hasUnsavedChanges,
    });
  }, [hasUnsavedChanges]);

  return (
    <div className={globalClasses.marginVertical1rem}>
      <div className={globalClasses.marginVertical1rem}>
        <Loader
          loader={
            props.offCycleOrderTableConfigLoader ||
            props.offCycleOrderTableDataLoader
          }
          minHeight={"260px"}
        >
          {render && (
            <AgGridComponent
              columns={productDetailsTableColumns}
              manualCallBack={(body, pageIndex, params) =>
                manualCallBack(body, pageIndex, params)
              }
              loadTableInstance={loadTableInstance}
              onSelectionChanged={onSelectionChanged}
              onCellValueChanged={onCellValueChanged}
              onBlur={onBlur}
              pagination={true}
              totalCount={1}
              cacheBlockSize={10}
              serverSideStoreType="partial"
              rowModelType="serverSide"
              uniqueRowId={"unique_row_id"}
              rowSelection="multiple"
              onRowSelected
              selectAllHeaderComponent={true}
              hideSelectAllRecords={false}
              tableHeader={`${DESCRIPTION_LABEL} Details`}
              topRightOptions={getTopRightOptions()}
              bottomLeftOptions={getBottomLeftOptions()}
              pinnedTopRowData={grandTotalData ? [grandTotalData] : []}
            />
          )}
          {openPopUp && (
            <OffCycleSetAllPopUp
              setShowSetAllModal={setOpenPopUp}
              refreshTableData={refreshTableData}
              agGridInstance={productTableGridInstance.current}
              draftId={props.draftId}
              getCheckConfigurationForProductDetails={
                getCheckConfigurationForProductDetails
              }
              STORE_SETALL_FIELDS={
                props?.OffCycleOrderScreenConfig?.off_cycle_orders
                  ?.store_set_all_fields_product_details
              }
              deepDiveFilters={props.deepDiveFilters}
              onSaveSuccess={props.onSaveSuccess}
              weekRange={props.weekRange}
            />
          )}
          {selectedArticle && (
            <ArticleDCSizeLevelTable
              selectedArticle={selectedArticle}
              setSelectedArticle={setSelectedArticle}
              draftId={props.draftId}
              refreshParentTableData={refreshParentTableDataOnly}
              deepDiveFilters={props.deepDiveFilters}
              isUserHasViewOnlyAccess={isUserHasViewOnlyAccess}
              isUserHasEditAccess={isUserHasEditAccess}
              userAccess={props.userAccess}
              onSaveSuccess={props.onSaveSuccess}
              weekRange={props.weekRange}
              reloadTrigger={props.reloadTrigger}
            />
          )}
        </Loader>
      </div>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    offCycleOrderTableConfigLoader:
      store.omsReducer.offCycleOrderService.offCycleOrderTableConfigLoader,
    offCycleOrderTableDataLoader:
      store.omsReducer.offCycleOrderService.offCycleOrderTableDataLoader,
    OffCycleOrderScreenConfig:
      store.omsReducer.offCycleOrderService.offCycleOrderConfiguration
        ?.create_new_order,
    userAccess:
      store.omsReducer.orderingCommonService.orderingUserAccess?.vendor_dc,
    orderingAccessControl:
      store?.omsReducer.orderingCommonService.orderingAccessControl,
    offCycleOrderHasUnsavedChanges:
      store.omsReducer.offCycleOrderService.offCycleOrderHasUnsavedChanges,
    recommRecieptDate:
      store.omsReducer.offCycleOrderService.offCycleOrderRecommRecieptDate,
    ropDate: store.omsReducer.offCycleOrderService.offCycleOrderRopDate,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setOffCycleOrderHasUnsavedChanges: (payload) =>
    dispatch(setOffCycleOrderHasUnsavedChanges(payload)),
  getOffCycleProductDetailsColumnConfig: (payload) =>
    dispatch(getOffCycleProductDetailsColumnConfig(payload)),
  getOffCycleProductDetailsTableData: (payload) =>
    dispatch(getOffCycleProductDetailsTableData(payload)),
  getOffCycleProductDetailsUpdateData: (payload) =>
    dispatch(getOffCycleProductDetailsUpdateData(payload)),
  setOffCycleOrderTableConfigLoader: (payload) =>
    dispatch(setOffCycleOrderTableConfigLoader(payload)),
  setOffCycleOrderTableDataLoader: (payload) =>
    dispatch(setOffCycleOrderTableDataLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OffCycleProductDetailsTable);
