import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import Loader from "core/Utils/Loader/loader";
import {
  ERROR_MESSAGE,
  defaultTableData,
  UPDATED_MESSAGE,
  NO_DATA_FOUND,
  FILE_DOWNLOADING_MESSAGE_OMS_CONSTRAINTS,
  OMS_CONFIGURATION_SCREENNAME_KEY,
} from "modules/oms/constants-oms/stringConstants";
import {
  getConstraintsVendorDCPolicyTableConfig,
  setConstraintsVendorDCPolicyTableConfigLoader,
  setConstraintsVendorDCPolicyTableDataLoader,
  getConstraintsVendorDCPolicyTableData,
  setConstraintsVendorDCPolicyData,
  getConstraintsVendorDCPolicyTableDownloadData,
  getConstraintsVendorDCPolicySchedulerData,
  getConstraintsVendorDCPolicyShipmentSchedulerData
} from "modules/oms/services-oms/Constraints/constraints-services";
import { isEmpty } from "lodash";
import { scrollIntoView } from "modules/oms/utils-oms/oms-utility";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import VendorDCSetAllPopUp from "./vendorDCTableSetAllPopUp";
import VendorDCSchedulerPopUp from "./vendorDCTableSchedulerPopUp";
import { getHeaderForExcel } from "core/Utils/functions/utils";
import { cloneDeep } from "lodash";
import { getValidCheckConfiguration } from "../utils";
import { Button } from "impact-ui-v3";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import PackConfigBottomSheet from "modules/oms/pages-oms/common/PackConfigBottomSheet";

const OrderPolicyTable = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [tableColumns, setTableColumns] = useState([]);
  const [listTableColumns, setListTableColumns] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedSetAllRows, setSelectedSetAllRows] = useState([]);
  const [render, setRender] = useState(false);
  const [orderPolicyPayload, setOrderPolicyPayload] = useState([]);
  const [ishide, setIsHide] = useState(true);
  const [openPopUp, setOpenPopUp] = useState(false);
  const [checkAllSetAllRequest, setCheckAllSetAllRequest] = useState([]);
  const [showSchedulerPopUp, setShowSchedulerPopUp] = useState(false);
  const [buttonEnabled, setButtonEnabled] = useState(false);
  const [vendorDCPolicyScheduler, setVendorDCPolicyScheduler] = useState([]);
  const [vendorDCPolicyShipmentScheduler, setVendorDCPolicyShipmentScheduler] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const downloadLink = useRef(null);
  const [manualBodyData, setManualBodyData] = useState({});
  const [isUserHasViewOnlyAccess, setIsUserHasViewOnlyAccess] = useState(true);
  const [isUserHasSetAllAccess, setIsUserHasSetAllAccess] = useState(true);
  const [isUserHasEditAccess, setIsUserHasEditAccess] = useState(true);
  const [isUserHasDownloadAccess, setIsUserHasDownloadAccess] = useState(true);
  const [
    isUserHasSetSchedulerAccess,
    setIsUserHasSetSchedulerAccess,
  ] = useState(true);
  const [openPackConfig, setOpenPackConfig] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState("");
  const [openLinkData,setOpenLinkData] = useState("");  // user access for vendor DC policy
  const constraintsAccess = props.userAccess?.find(
    (item) =>
      item.module === "constraints_vendor_dc_policy" &&
      item.screen === OMS_CONFIGURATION_SCREENNAME_KEY
  );
  const canEdit = constraintsAccess?.isEditButton || false;
  const canSetAll = constraintsAccess?.isSetAllButton || false;
  const canDownload = constraintsAccess?.isDownloadButton || false;
  const canSetScheduler = constraintsAccess?.isSetSchedulerButton || false;
  const [setAllOnlySchedular,setSetAllOnlySchedular] = useState(false)


  const SETALL_FORMDATA_FIELDS =
    props?.constraintsConfig?.setall_formdata_fields || [];

  const allocationRef = useRef(null);
  const vendorDCPolicyTableGridInstance = useRef(null);
  var vendorDCPolicyEditPayload = useRef([]);

  const checkForEditability = (columns) => {
    // If userAccess exists, use canEdit flag; otherwise fall back to orderingAccessControl
    const shouldDisableEdit = !isEmpty(props?.userAccess)
      ? !canEdit
      : !props?.orderingAccessControl?.isEditButton?.isVisible;

    if (shouldDisableEdit) {
      columns.map((col) => {
        col.is_editable = false;
        if (col.type === "list") {
          col.type = "str";
        }
      });
    }
    return columns;
  };

  useEffect(() => {
    if (!isEmpty(props?.userAccess)) {
      // Use new userAccess flags
      setIsUserHasEditAccess(canEdit);
      setIsUserHasSetAllAccess(canSetAll);
      setIsUserHasDownloadAccess(canDownload);
      setIsUserHasSetSchedulerAccess(canSetScheduler);
      setIsUserHasViewOnlyAccess(false);
    } else if (props?.orderingAccessControl) {
      // Fall back to old access control
      setIsUserHasViewOnlyAccess(
        !props?.orderingAccessControl?.isEditButton?.isVisible
      );
      setIsUserHasEditAccess(true);
      setIsUserHasSetAllAccess(true);
      setIsUserHasDownloadAccess(true);
      setIsUserHasSetSchedulerAccess(true);
    }
  }, [
    props?.userAccess,
    props?.orderingAccessControl,
    canEdit,
    canSetAll,
    canDownload,
    canSetScheduler,
  ]);

  const onClickColumn = async (data,type) => {
    setSelectedSetAllRows([data]);
    setShowSchedulerPopUp(true);
    
  };

  useEffect(() => {
    const fetchColumnConfig = async () => {
      setIsHide(true);
      props.setConstraintsVendorDCPolicyTableConfigLoader(true);
      let columns = await props.getConstraintsVendorDCPolicyTableConfig({});
      let scheduler = await props.getConstraintsVendorDCPolicySchedulerData();
      let shipmentScheduler = await props.getConstraintsVendorDCPolicyShipmentSchedulerData();
      if (scheduler?.data?.status) {
        setVendorDCPolicyScheduler(scheduler?.data?.data);
      }
      if(shipmentScheduler?.data?.status)
        {
          setVendorDCPolicyShipmentScheduler(shipmentScheduler?.data?.data);
        }

        columns?.data?.data?.forEach((item) => {
          if (item.column_name === "scheduler"|| item?.column_name ==="shipment_scheduler") {
            item.type = "link";
            item.is_editable = true;
          }
        });

      columns?.data?.data?.forEach((item) => {
        if (item.column_name === "pack_config") {
          item.onClick = (tableInfo) => {
            setSelectedStyle(tableInfo?.cellData?.data?.article || {});
            setOpenPackConfig(true);
          };
        } 
        else {
          if(item?.column_name === "scheduler"){
            item.onClick = (tableInfo) => {
              setOpenLinkData("scheduler");
              onClickColumn(tableInfo?.cellData?.data || {})
         
            };
        }
        else{
          item.onClick = (tableInfo) => {    
            setOpenLinkData("shipment_scheduler");
            onClickColumn(tableInfo?.cellData?.data || {});

          };
        }
        
      }
      });

      //Fetch List Columns
      const dropdownColumns = columns?.data?.data
        ?.filter((item) => item.extra && Array.isArray(item.extra.options))
        .reduce((acc, item) => {
          acc[item.column_name] = item.extra.options;
          return acc;
        }, {});

      let updatedCols = checkForEditability(columns?.data?.data);
      let formattedCols = agGridColumnFormatter(
        updatedCols,
        null,
        null,
        null,
        null,
        null,
        null,
        true
      );
      const formattedColumns = getCellRenderer(formattedCols);

      props.setConstraintsVendorDCPolicyTableConfigLoader(false);
      setTableColumns(formattedColumns);
      setListTableColumns(dropdownColumns);
      setCsvHeaders(getHeaderForExcel(cloneDeep(formattedColumns)));
      setRender(true);
      scrollIntoView(allocationRef);
      vendorDCPolicyEditPayload.current = [];
    };
    if (props.selectedOmsFilters.length) {
      fetchColumnConfig();
    }
  }, [props.selectedOmsFilters]);

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setConstraintsVendorDCPolicyTableDataLoader(true);

      const selection = {
        data: getValidCheckConfiguration(
          vendorDCPolicyTableGridInstance?.current?.api?.checkConfiguration
        ),
        unique_columns: ["id"],
      };

      let body = {
        filters: [...props.selectedOmsFilters],
        meta: manualbody
          ? {
              ...manualbody,
              sort: manualbody?.sort.length > 0 ? [manualbody.sort[0]] : [],
              limit: { limit: 10, page: pageIndex + 1 },
            }
          : {
              search: [],
              sort: [],
              range: [],
              limit: { limit: 10, page: Number(pageIndex) ? pageIndex + 1 : 1 },
            },
        selection,
      };
      setManualBodyData(body?.meta);
      let response = await props.getConstraintsVendorDCPolicyTableData(body);
      if (response.data.status) {
        let mappedData = cloneDeep(response.data.data);
        mappedData.forEach((item) => {
          for (const columnName in listTableColumns) {
            if (item.hasOwnProperty(columnName)) {
              const mappedOptions = listTableColumns[columnName].filter(
                (option) => "mapping" in option
              );
              if (mappedOptions?.length) {
                const matchedOption = mappedOptions.find(
                  (option) => option.mapping === item[columnName]
                );
                if (matchedOption)
                  item[columnName] = matchedOption?.value ?? item[columnName];
              }
            }
          }
          if (item.pack_config) {
            item.pack_config = "View Pack Config";
          } else {
            item.pack_config = "";
          }
        });

        let formatedData = agGridRowFormatter(
          mappedData,
          getValidCheckConfiguration(params?.api?.checkConfiguration),
          "id"
        );
        setTotalCount(response.data.total);
        props.setConstraintsVendorDCPolicyTableDataLoader(false);
        return { data: formatedData, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setConstraintsVendorDCPolicyTableDataLoader(false);
        return defaultTableData;
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setConstraintsVendorDCPolicyTableDataLoader(false);
      return defaultTableData;
    }
  };

  useEffect(() => {
    if (!isEmpty(props.selectedOmsFilters)) {
      setRender(false);
      setCheckAllSetAllRequest([]);
      setButtonEnabled(false);
    }
  }, [props.selectedOmsFilters]);

  const displaySnackMessages = (message, variance) => {
    props.closeSnack();
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const loadTableInstance = (params) => {
    vendorDCPolicyTableGridInstance.current = params;
  };

  const onSelectionChanged = (event) => {
    let selectedRows = [];
    vendorDCPolicyTableGridInstance.current.api.forEachNode((node) => {
      node.selected && selectedRows.push({ ...node.data });
    });
    setSelectedSetAllRows(selectedRows);
    let l_selections = event.api.getSelectedRows().length;
    let l_buttonEnabled =
      vendorDCPolicyTableGridInstance.current.api.buttonEnabled;
    if (l_selections) {
      !l_buttonEnabled && setButtonEnabled(true);
    } else {
      l_buttonEnabled && setButtonEnabled(false);
    }
  };

  const getCellRenderer = (columns) => {
    try {
      let updatedColumns = cloneDeep(columns);
      updatedColumns = updatedColumns.map((col) => {
        if (col.is_editable) {
        // Add conditional editability for fields based on replenishment_strategy
        if (
          ["order_strategy", "scheduler", "shipment_scheduler"].includes(
            col.column_name
          )
        ) {
          col.cellRenderer = (params) => {
            // Disable if user has view only access or replenishment_strategy is "Reorder Point"
            const isReorderPoint =
              params?.data?.replenishment_strategy === "Reorder Point";
            const isDisabled = isReorderPoint;

            return (
              <CellRenderers
                cellData={params}
                column={col}
                extraProps={null}
                isPropsOverrideColumnDef={true}
                isDisabled={isDisabled}
              ></CellRenderers>
            );
          };
          }
        }
        return col;
      });
      return updatedColumns;
    } catch (error) {
      console.log("Error in getCellRenderer", error);
    }
  };

  const onCellValueChanged = (params) => {
    const { column, node, data, newValue, api } = params;
    setIsHide(false);

    // Refresh different columns based on what changed
    if (column.colId === "replenishment_strategy") {
      // When replenishment_strategy changes to "Reorder Point", set order_strategy to "Week of Supply"
      if (newValue === "Reorder Point") {
        // Update the grid cell value
        node.setDataValue("order_strategy", "Week of Supply");

        // Update the local data
        data.order_strategy = "Week of Supply";
      }
      // When replenishment_strategy changes, refresh all affected columns
      vendorDCPolicyTableGridInstance.current.api.refreshCells({
        force: true,
        suppressFlash: false,
        columns: [
          "scheduler",
          "order_strategy",
          "replenishment_strategy",
          "shipment_scheduler",
        ],
      });
    } else {
      // For other changes, refresh the specific columns
      vendorDCPolicyTableGridInstance.current.api.refreshCells({
        force: true,
        suppressFlash: false,
        columns: ["scheduler", "order_strategy", "replenishment_strategy"],
      });
    }

    vendorDCPolicyTableGridInstance.current.api.refreshCells({
      force: true,
      suppressFlash: false,
      columns: ["scheduler", "order_strategy", "replenishment_strategy"],
    });

    const keyField = props?.constraintsConfig?.setAllPayloadApiKey?.[0];
    const rowData = node.data;
    if (!rowData) {
      return;
    }

    const gridRowId = rowData.id;
    const currentKeyValue = rowData[keyField];

    let editPayloadRef = vendorDCPolicyEditPayload.current;
    let changedDataForPayloadItem = {
      id: gridRowId,
    };
    changedDataForPayloadItem[keyField] = currentKeyValue;

    if (column.colId === "order_strategy") {
      changedDataForPayloadItem.order_strategy = newValue;
      changedDataForPayloadItem.replenishment_strategy =
        rowData.replenishment_strategy;
    } else if (column.colId === "replenishment_strategy") {
      changedDataForPayloadItem.order_strategy = rowData.order_strategy;
      changedDataForPayloadItem.replenishment_strategy = newValue;
    } else {
      changedDataForPayloadItem[column.colId] = newValue;
    }

    let existingItemIndex = editPayloadRef.findIndex(
      (item) => item[keyField] === currentKeyValue
    );

    if (existingItemIndex > -1) {
      Object.assign(
        editPayloadRef[existingItemIndex],
        changedDataForPayloadItem
      );
    } else {
      editPayloadRef.push(changedDataForPayloadItem);
    }

    setOrderPolicyPayload([...editPayloadRef]);
  };

  const editSaveData = async () => {
    try {
      const keyField = props?.constraintsConfig?.setAllPayloadApiKey?.[0];

      if (orderPolicyPayload.length !== 0) {
        for (const editedItem of orderPolicyPayload) {
          if (
            editedItem.hasOwnProperty("order_strategy") &&
            editedItem.hasOwnProperty("replenishment_strategy")
          ) {
            const orderStrategyForValidation = editedItem.order_strategy;
            const replenishmentStrategyForValidation =
              editedItem.replenishment_strategy;

            if (
              (replenishmentStrategyForValidation === "Reorder Point" &&
                orderStrategyForValidation === "Order Cycle Based") ||
              (replenishmentStrategyForValidation === "Order Cycle Based" &&
                orderStrategyForValidation === "Reorder Point")
            ) {
              displaySnackMessages(
                `Invalid combination. Reorder Point and Order Cycle Based cannot be selected together.`,
                "error"
              );
              return;
            }
          }
        }

        const finalApiOrders = orderPolicyPayload
          .map((item) => {
            const apiOrder = {};
            for (const key in item) {
              if (item.hasOwnProperty(key) && key !== "id") {
                apiOrder[key] = item[key];
              }
            }
            if (
              !apiOrder.hasOwnProperty(keyField) &&
              item.hasOwnProperty(keyField) &&
              keyField !== "id"
            ) {
              apiOrder[keyField] = item[keyField];
            }
            return apiOrder;
          })
          .filter((order) => {
            const keys = Object.keys(order);
            if (keys.length === 0) return false;
            if (keys.length === 1 && keys[0] === keyField && !order[keyField])
              return false;
            return true;
          });

        if (finalApiOrders.length === 0) {
          setOrderPolicyPayload([]);
          vendorDCPolicyEditPayload.current = [];
          setIsHide(true);
          return;
        }

        let body = {
          orders: finalApiOrders,
          keys: props?.constraintsConfig?.setAllPayloadApiKey,
        };
        let response = await props.setConstraintsVendorDCPolicyData(body);
        if (response.data.status) {
          setOrderPolicyPayload([]);
          vendorDCPolicyEditPayload.current = [];
          displaySnackMessages(UPDATED_MESSAGE, "success");
          setIsHide(true);
          vendorDCPolicyTableGridInstance?.current?.api?.refreshServerSideStore(
            {
              purge: true,
            }
          );
        }
      } else {
        displaySnackMessages("No edit value", "error");
      }
    } catch (e) {
      console.log(e);
      displaySnackMessages("Edit Failed", "error");
      vendorDCPolicyTableGridInstance?.current?.api?.refreshServerSideStore({
        purge: true,
      });
      setIsHide(true);
    }
  };

  const openSetAllPopUp = () => {
    setOpenPopUp(true);
  };

  const openSetAllSchedulerPopUp = () => {
    //setShowSchedulerPopUp(true);
    setSetAllOnlySchedular(true)

  };

  const updateSetAllData = async (payload, setAllData) => {
    const isSelectAllRecords =
      vendorDCPolicyTableGridInstance?.current?.api?.isSelectAllRecords;
    const keyFields = props?.constraintsConfig?.setAllPayloadApiKey;
    const keyField = keyFields?.[0];

    const selectedRowsMap = new Map();
    selectedSetAllRows.forEach((row) => selectedRowsMap.set(row.id, row));

    for (const updatedItemFromPopup of payload) {
      let orderStrategyToValidate;
      let replenishmentStrategyToValidate;
      let articleForKey = updatedItemFromPopup[keyField];

      if (
        updatedItemFromPopup.hasOwnProperty("order_strategy") ||
        updatedItemFromPopup.hasOwnProperty("replenishment_strategy")
      ) {
        orderStrategyToValidate = updatedItemFromPopup.order_strategy;
        replenishmentStrategyToValidate =
          updatedItemFromPopup.replenishment_strategy;
      } else {
        const originalRowData = selectedRowsMap.get(updatedItemFromPopup.id);
        if (originalRowData) {
          orderStrategyToValidate = originalRowData.order_strategy;
          replenishmentStrategyToValidate =
            originalRowData.replenishment_strategy;
          if (!articleForKey) articleForKey = originalRowData[keyField];
        } else {
          displaySnackMessages(
            "Error validating SetAll data. Row not found for validation.",
            "error"
          );
          return false;
        }
      }

      if (
        (replenishmentStrategyToValidate === "Reorder Point" &&
          orderStrategyToValidate === "Order Cycle Based") ||
        (replenishmentStrategyToValidate === "Order Cycle Based" &&
          orderStrategyToValidate === "Reorder Point")
      ) {
        displaySnackMessages(
          `Invalid combination. Reorder Point and Order Cycle Based cannot be selected together.`,
          "error"
        );
        return false;
      }
    }

    const checkConfig = getValidCheckConfiguration(
      vendorDCPolicyTableGridInstance?.current?.api?.checkConfiguration
    );

    var selection = {
      data: checkConfig,
      unique_columns: ["id"],
    };
    if (isSelectAllRecords) {
      const rowDataMap = {};
      vendorDCPolicyTableGridInstance.current.api.forEachNode((node) => {
        if (node.data && node.data.id) {
          rowDataMap[node.data.id] = node.data;
        }
      });

      const transformedData = checkConfig.map((configItem) => {
        const newConfigItem = { ...configItem };

        if (newConfigItem.checkedRows) {
          newConfigItem.checkedRows = newConfigItem.checkedRows.map((id) => {
            const rowData = rowDataMap[id];
            return rowData?.[keyField] || id;
          });
        }

        if (newConfigItem.unCheckedRows) {
          newConfigItem.unCheckedRows = newConfigItem.unCheckedRows.map(
            (id) => {
              const rowData = rowDataMap[id];
              return rowData?.[keyField] || id;
            }
          );
        }
        return newConfigItem;
      });

      selection = {
        data: transformedData,
        unique_columns: keyFields,
      };
    }
    let body = {
      orders: payload,
      filters: [...props.selectedOmsFilters],
      meta: {
        sort: [],
        range: [],
      },
      keys: keyFields,
      selection,
      set_all: setAllData,
      isSelectAllRecords,
    };
    try {
      let response = await props.setConstraintsVendorDCPolicyData(body);
      if (response.data.status) {
        displaySnackMessages(UPDATED_MESSAGE, "success");
        setSelectedSetAllRows([]);
        vendorDCPolicyTableGridInstance?.current?.api?.deselectAll(true);
        vendorDCPolicyTableGridInstance?.current?.api?.setCheckConfiguration(
          []
        );
        vendorDCPolicyTableGridInstance?.current?.api?.refreshServerSideStore({
          purge: true,
        });
        return true;
      }
    } catch (e) {
      console.log(e);
      displaySnackMessages(ERROR_MESSAGE, "error");
      return true;
    }
  };

  useEffect(() => {
    if (vendorDCPolicyTableGridInstance?.current) {
      vendorDCPolicyTableGridInstance.current.api.checkAllSetAllRequest = checkAllSetAllRequest;
      vendorDCPolicyTableGridInstance.current.api.buttonEnabled = buttonEnabled;
    }
  }, [checkAllSetAllRequest, buttonEnabled]);

  const downloadCsv = async () => {
    try {
      if (totalCount > 0) {
        const filterArray = (props.selectedOmsFilters ?? []).filter(
          (filter) => filter?.values?.length > 0
        );
        let body = {
          filters: filterArray,
          meta: {
            ...manualBodyData,
            limit: { limit: totalCount, page: 1 },
          },
        };
        displaySnackMessages(FILE_DOWNLOADING_MESSAGE_OMS_CONSTRAINTS, "info");
        let response = await props.getConstraintsVendorDCPolicyTableDownloadData(
          body
        );
        if (!response.data.status) {
          displaySnackMessages(ERROR_MESSAGE, "error");
        }
      } else {
        displaySnackMessages(NO_DATA_FOUND, "info");
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const getTopRightOptions = () => {
    let options = [];

    // Determine if Set All should be disabled
    const isSetAllDisabled = !isEmpty(props?.userAccess)
      ? !isUserHasSetAllAccess || !buttonEnabled
      : isUserHasViewOnlyAccess || !buttonEnabled;

    // Determine if Set Scheduler should be disabled
    const isSetSchedulerDisabled = !isEmpty(props?.userAccess)
      ? !isUserHasSetSchedulerAccess || !buttonEnabled
      : isUserHasViewOnlyAccess || !buttonEnabled;

    // Determine if Update should be disabled
    const isUpdateDisabled = !isEmpty(props?.userAccess)
      ? !isUserHasEditAccess || ishide
      : isUserHasViewOnlyAccess || ishide;

    if (selectedSetAllRows?.length > 0) {
      options.push(
        <>
          <div>
            <Button
              variant="tertiary"
              color="primary"
              id="productSetAllBtn"
              className={classes.button}
              onClick={openSetAllPopUp}
              disabled={isSetAllDisabled}
            >
              Set All
            </Button>
          </div>

          {!props?.constraintsConfig?.hide_set_scheduler && (
            <div>
              <Button
                variant="tertiary"
                color="primary"
                id="productSetAllBtn"
                className={classes.button}
                onClick={openSetAllSchedulerPopUp}
                disabled={isSetSchedulerDisabled}
              >
                Set Scheduler
              </Button>
            </div>
          )}
        </>
      );
    }
    options.push(
      <>
        <Button
          variant="secondary"
          color="primary"
          onClick={() => {
            editSaveData();
          }}
          disabled={isUpdateDisabled}
        >
          Update
        </Button>
      </>
    );

    return options;
  };

  return (
    <div className={globalClasses.marginVertical1rem}>
      <Loader
        loader={
          props.constraintsVendorDCPolicyTableDataLoader ||
          props.constraintsVendorDCPolicyTableConfigLoader
        }
        minHeight={"260px"}
      >
        {render && (
          <div ref={allocationRef}>
            <AgGridComponent
              columns={tableColumns}
              manualCallBack={(body, pageIndex, params) =>
                manualCallBack(body, pageIndex, params)
              }
              loadTableInstance={loadTableInstance}
              onSelectionChanged={onSelectionChanged}
              onCellValueChanged={onCellValueChanged}
              pagination={true}
              totalCount={totalCount}
              cacheBlockSize={10}
              serverSideStoreType="partial"
              rowModelType="serverSide"
              uniqueRowId={"id"}
              rowSelection="multiple"
              onRowSelected
              selectAllHeaderComponent={true}
              hideSelectAllRecords={false}
              tableHeader={`Details`}
              topRightOptions={getTopRightOptions()}
              showDownloadButton={
                !isEmpty(props?.userAccess) ? isUserHasDownloadAccess : true
              }
              onDownloadButtonClick={downloadCsv}
            />
          </div>
        )}
      </Loader>
      {openPopUp && (
        <VendorDCSetAllPopUp
          SETALL_FORMDATA_FIELDS={SETALL_FORMDATA_FIELDS}
          setShowSetAllModal={setOpenPopUp}
          rowsData={selectedSetAllRows}
          setAll={updateSetAllData}
          setCheckAllSetAllRequest={setCheckAllSetAllRequest}
          agGridInstance={vendorDCPolicyTableGridInstance?.current}
          displaySnackMessages={displaySnackMessages}
          keyField={props?.constraintsConfig?.setAllPayloadApiKey?.[0]}
        />
      )}

      {showSchedulerPopUp && (
        <VendorDCSchedulerPopUp
          setShowSetAllModal={setShowSchedulerPopUp}
          rowsData={selectedSetAllRows}
          setAll={updateSetAllData}
          scheduler={openLinkData === "shipment_scheduler" ? vendorDCPolicyShipmentScheduler : vendorDCPolicyScheduler}
          setCheckAllSetAllRequest={setCheckAllSetAllRequest}
          agGridInstance={vendorDCPolicyTableGridInstance?.current}
          displaySnackMessages={displaySnackMessages}
          keyField={props?.omsScreenConfig?.setAllPayloadApiKey?.[0]}
          openLinkData={openLinkData}
        />
      )}
       {setAllOnlySchedular && (
        <VendorDCSchedulerPopUp
          setShowSetAllModal={setSetAllOnlySchedular}
          rowsData={selectedSetAllRows}
          setAll={updateSetAllData}
          scheduler={vendorDCPolicyScheduler}
          setCheckAllSetAllRequest={setCheckAllSetAllRequest}
          agGridInstance={vendorDCPolicyTableGridInstance?.current}
          displaySnackMessages={displaySnackMessages}
          keyField={props?.constraintsConfig?.setAllPayloadApiKey?.[0]}
          // openLinkData={openLinkData}
        />
      )}
      {openPackConfig && (
        <PackConfigBottomSheet
          openPackConfigDetailSheet={openPackConfig}
          setOpenPackConfigDetailSheet={setOpenPackConfig}
          l1DisplayName={"Master SKU"}
          activeChildHierarchyKey={selectedStyle}
          screenName="replishment_status"
        />
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    constraintsConfig:
      store.omsReducer.orderingConstraintsService.omsConstraintsScreenConfig
        ?.vendor_dc_policy,

    constraintsVendorDCPolicyTableDataLoader:
      store.omsReducer.orderingConstraintsService
        .constraintsVendorDCPolicyTableDataLoader,
    constraintsVendorDCPolicyTableConfigLoader:
      store.omsReducer.orderingConstraintsService
        .constraintsVendorDCPolicyTableConfigLoader,
    selectedOmsFilters:
      store.omsReducer.orderingConstraintsService.selectedOmsFilters,

    screenConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig?.constraints
        ?.vendor_constraints,
    filterConfigScreenName:
      store.omsReducer.orderingCommonService.orderingScreensConfig?.constraints
        ?.vendor_constraints?.filter_config,
    orderingAccessControl:
      store.omsReducer.orderingCommonService.orderingAccessControl,
    userAccess:
      store.omsReducer.orderingCommonService.orderingUserAccess?.vendor_dc,
    roleBasedAccess:
      store.omsReducer.orderingCommonService.genericTenantConfig
        ?.roleBasedAccess,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getConstraintsVendorDCPolicyTableConfig: (payload) =>
    dispatch(getConstraintsVendorDCPolicyTableConfig(payload)),
  getConstraintsVendorDCPolicyTableData: (payload) =>
    dispatch(getConstraintsVendorDCPolicyTableData(payload)),
  getConstraintsVendorDCPolicyTableDownloadData: (payload) =>
    dispatch(getConstraintsVendorDCPolicyTableDownloadData(payload)),
  setConstraintsVendorDCPolicyTableConfigLoader: (payload) =>
    dispatch(setConstraintsVendorDCPolicyTableConfigLoader(payload)),
  setConstraintsVendorDCPolicyTableDataLoader: (payload) =>
    dispatch(setConstraintsVendorDCPolicyTableDataLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  setConstraintsVendorDCPolicyData: (payload) =>
    dispatch(setConstraintsVendorDCPolicyData(payload)),
  getConstraintsVendorDCPolicySchedulerData: (payload) =>
    dispatch(getConstraintsVendorDCPolicySchedulerData(payload)),
  getConstraintsVendorDCPolicyShipmentSchedulerData: (payload) =>
    dispatch(getConstraintsVendorDCPolicyShipmentSchedulerData(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(OrderPolicyTable);
