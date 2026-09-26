import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { Button, Alert } from "impact-ui-v3";
import { cloneDeep } from "lodash";
import { isEmpty } from "lodash";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { getHeaderForExcel } from "core/Utils/functions/utils";

import {
  ERROR_MESSAGE,
  defaultTableData,
  UPDATED_MESSAGE,
  OMS_EDITED_GRID_CELLS_BACKGROUND,
  CONSTRAINTS_OMS_SCREENNAME_KEYS,
  NO_DATA_FOUND,
  tableConfigurationMetaData,
  FILE_DOWNLOADING_MESSAGE_OMS_CONSTRAINTS,
  OMS_CONSTRAINTS_SCREENNAME_KEY,
} from "modules/oms/constants-oms/stringConstants";
import {
  getConstraintsDeleiveryLeadTimeTableConfig,
  setConstraintsDeleiveryLeadTimeTableConfigLoader,
  setConstraintsDeleiveryLeadTimeTableDataLoader,
  getConstraintsDeleiveryLeadTimeTableData,
  setConstraintsDeliveryLeadTimeData,
  setConstraintsSetAllSuccess,
  getConstraintsDeleiveryLeadTimeDownlaodTableData,
} from "modules/oms/services-oms/Constraints/constraints-services";
import { scrollIntoView } from "modules/oms/utils-oms/oms-utility";
import { getValidCheckConfiguration } from "../utils";
import SetAllPopUp from "../setAllPopUp";
import PackConfigBottomSheet from "modules/oms/pages-oms/common/PackConfigBottomSheet";

const DeleiveryLeadTimeTable = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [leadTimeTableColumns, setLeadTimeTableColumns] = useState([]);
  const [render, setRender] = useState(false);
  const [ishide, setIsHide] = useState(true);
  const [deleiveryLeadPayload, setDeleiveryLeadPayload] = useState([]);
  const [openPopUp, setOpenPopUp] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [checkAllSetAllRequest, setCheckAllSetAllRequest] = useState([]);
  const [buttonEnabled, setButtonEnabled] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [manualBodyData, setManualBodyData] = useState({});
  const downloadLink = useRef(null);
  const [isUserHasViewOnlyAccess, setIsUserHasViewOnlyAccess] = useState(true);
  const allocationRef = useRef();
  const DeleiveryLeadTableGridInstance = useRef(null);
  var deleiveryLead = useRef([]);
  const [isValidValue, setIsValidValue] = useState(true);
  const [openPackConfig, setOpenPackConfig] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState("");
  const [isUserHasEditAccess, setIsUserHasEditAccess] = useState(true);
  const [isUserHasSetAllAccess, setIsUserHasSetAllAccess] = useState(true);
  const [alertMessage, setAlertMessage] = useState(null);
  const [alertVariant, setAlertVariant] = useState("info");

  // user access for lead time
  const constraintsAccess = props.userAccess?.find(
    (item) =>
      item.module === "constraints_lead_time" &&
      item.screen === OMS_CONSTRAINTS_SCREENNAME_KEY
  );
  const canEdit = constraintsAccess?.isEditButton || false;
  const canSetAll = constraintsAccess?.isSetAllButton || false;

  const UNIQUE_ROW_ID =
    props?.orderingScreensConfig?.constraints?.lead_time?.unique_row_id || "id";
  const REMOVE_SECONDARY_ROW_ID =
    props?.orderingScreensConfig?.constraints?.lead_time?.remove_row_id ||
    false;

  const HIDE_SETALL_BUTTON =
    props?.orderingScreensConfig?.constraints?.lead_time?.hide_setall_button;
  const HIDE_UPDATE_BUTTON =
    props?.orderingScreensConfig?.constraints?.lead_time?.hide_update_button;

  const SETALL_FORMDATA_FIELDS = props?.orderingScreensConfig?.constraints
    ?.lead_time?.setall_formdata_fields || [
    {
      label: "Vendor To Dc lead time (weeks)",
      accessor: "leadTime",
      field_type: "IntegerField",
      value_type: "number",
      no_negative_values: true,
    },
  ];

  const checkForEditability = (columns) => {
    // If userAccess exists, use canEdit flag; otherwise fall back to orderingAccessControl
    const shouldDisableEdit = !isEmpty(props?.userAccess)
      ? !canEdit
      : !props?.orderingAccessControl?.isEditButton?.isVisible;

    if (shouldDisableEdit) {
      columns.map((col) => {
        col.is_editable = false;
      });
    }
    return columns;
  };

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

  useEffect(() => {
    if (props.selectedOmsFilters.length !== 0) {
      const fetchColumnConfig = async () => {
        setIsHide(true);
        props.setConstraintsDeleiveryLeadTimeTableConfigLoader(true);
        let columns = await props.getConstraintsDeleiveryLeadTimeTableConfig(
          {}
        );
        columns?.data?.data.forEach((item) => {
          if (item.column_name === "pack_config") {
            item.onClick = (tableInfo) => {
              setSelectedStyle(tableInfo?.cellData?.data?.article || {});
              setOpenPackConfig(true);
            };
          }
        });
        let updatedCols = checkForEditability(columns?.data?.data);
        let formattedColumns = agGridColumnFormatter(
          updatedCols,
          null,
          null,
          null,
          null,
          null,
          null,
          true
        );
        props.setConstraintsDeleiveryLeadTimeTableConfigLoader(false);
        setLeadTimeTableColumns(formattedColumns);
        setCsvHeaders(getHeaderForExcel(cloneDeep(formattedColumns)));
        setRender(true);
        scrollIntoView(allocationRef);
        setIsHide(true);
      };

      fetchColumnConfig();
    }
  }, [props.selectedOmsFilters]);

  useEffect(() => {
    if (!isEmpty(props.selectedOmsFilters)) {
      setRender(false);
      setCheckAllSetAllRequest([]);
      setButtonEnabled(false);
    }
  }, [props.selectedOmsFilters]);

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setConstraintsDeleiveryLeadTimeTableDataLoader(true);
      const selection = {
        data: getValidCheckConfiguration(
          DeleiveryLeadTableGridInstance?.current?.api?.checkConfiguration
        ),
        unique_columns: [UNIQUE_ROW_ID],
      };
      let body = {
        filters: [
          ...props.selectedOmsFilters,
          //   ...tableColumnsToBeSentInDataRequest,
        ],
        //...props.startEndDate,
        //is_recommended: isRecommended.current,
        meta: manualbody
          ? {
              ...manualbody,
              sort: [
                manualbody?.sort.length > 0
                  ? manualbody.sort[0]
                  : { column: UNIQUE_ROW_ID, order: "asc" },
              ],
              limit: { limit: 10, page: pageIndex + 1 },
            }
          : {
              search: [],
              sort: [{ column: UNIQUE_ROW_ID, order: "asc" }],
              range: [],
              //...tableConfigurationMetaData.meta,
              limit: { limit: 10, page: Number(pageIndex) ? pageIndex + 1 : 1 },
            },
        selection,
      };
      setManualBodyData(body?.meta);
      let response = await props.getConstraintsDeleiveryLeadTimeTableData(body);
      if (response.data.status) {
        response.data.data.forEach((item) => {
          if (item.pack_config) {
            item.pack_config = "View Pack Config";
          } else {
            item.pack_config = "";
          }
        });
        let formatedData = agGridRowFormatter(
          response.data.data,
          getValidCheckConfiguration(params?.api?.checkConfiguration),
          UNIQUE_ROW_ID
        );

        // Check and update default_mode for matching records
        if (deleiveryLead.current?.length > 0) {
          formatedData = formatedData.map((newRecord) => {
            const matchingRecord = deleiveryLead.current?.find(
              (existingRecord) =>
                existingRecord.article === newRecord.article &&
                existingRecord.loc_code === newRecord.loc_code
            );

            if (matchingRecord) {
              return {
                ...newRecord,
                default_mode: false,
              };
            }
            return newRecord;
          });
        }

        setTotalCount(response.data.total);
        //props.setOrderManagementSkuSummaryTableData(cloneDeep(formatedData));
        props.setConstraintsDeleiveryLeadTimeTableDataLoader(false);

        return { data: formatedData, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setConstraintsDeleiveryLeadTimeTableDataLoader(false);
        return defaultTableData;
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setConstraintsDeleiveryLeadTimeTableDataLoader(false);
      return defaultTableData;
    }
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

  const loadTableInstance = (params) => {
    DeleiveryLeadTableGridInstance.current = params;
  };

  const onCellValueChanged = (params) => {
    const { colDef, node, data, newValue } = params;

    //filter all matching row data
    let previousSelectedNode;

    params.api.forEachNode((nodeItem) => {
      if (
        data["id"] === nodeItem.data["id"] &&
        data.article === nodeItem.data.article &&
        data.loc_code === nodeItem.data.loc_code &&
        data?.mode_shipment !== nodeItem.data?.mode_shipment &&
        nodeItem.data.default_mode
      )
        previousSelectedNode = nodeItem;
    });

    if (params.value === "") {
      setIsValidValue(false);
      return displaySnackMessages("Please Enter valid value", "info");
    }

    const isLeadTimeField =
      colDef.accessor && colDef.accessor.includes("lead_time");

    let updatedValue = params.value;

    if (isLeadTimeField) {
      const numericValue = Number(params.value);

      if (Number.isNaN(numericValue)) {
        setIsValidValue(false);
        return displaySnackMessages("Please Enter valid value", "info");
      }

      updatedValue = numericValue * 7;
    }

    if (updatedValue || updatedValue === 0) {
      setIsHide(false);
      setIsValidValue(true);
      if (deleiveryLead.current.length != 0) {
        var flag = false;
        if (colDef.accessor && colDef.accessor.includes("lead_time")) {
          deleiveryLead.current.filter((prod_code) => {
            if (prod_code[UNIQUE_ROW_ID] === params.data[UNIQUE_ROW_ID]) {
              prod_code[colDef.accessor] = updatedValue;
              flag = true;
            }
          });
          if (!flag) {
            deleiveryLead.current.push({
              ...(params.data[UNIQUE_ROW_ID]
                ? { [UNIQUE_ROW_ID]: params.data[UNIQUE_ROW_ID] }
                : {}),
              article: params.data.article,
              vendor_code: params.data.vendor_code || "-",
              loc_code: params.data.loc_code || "-",
              ...(params.data.lead_time === 0 || params.data.lead_time
                ? { lead_time: params.data.lead_time }
                : {}),
              ...(params.data.manufacturing_lead_time === 0 ||
              params.data.manufacturing_lead_time
                ? {
                    manufacturing_lead_time:
                      params.data.manufacturing_lead_time,
                  }
                : {}),
              ...(params.data.shipping_lead_time === 0 ||
              params.data.shipping_lead_time
                ? { shipping_lead_time: params.data.shipping_lead_time }
                : {}),
              [colDef.accessor]: updatedValue, // Override with new value
              ...(params.data.mode_shipment
                ? {
                    mode_shipment: params.data.mode_shipment,
                    default_mode: params.data.default_mode ? 1 : 0,
                  }
                : {}),
            });
          }
        }
        if (colDef.accessor === "po_to_order_processing") {
          deleiveryLead.current.filter((prod_code) => {
            if (prod_code[UNIQUE_ROW_ID] === params.data[UNIQUE_ROW_ID]) {
              prod_code.po_to_order_processing = updatedValue;
              flag = true;
            }
          });
          if (!flag) {
            deleiveryLead.current.push({
              ...(params.data[UNIQUE_ROW_ID]
                ? { [UNIQUE_ROW_ID]: params.data[UNIQUE_ROW_ID] }
                : {}),
              article: params.data.article,
              vendor_code: params.data.vendor_code || "-",
              loc_code: params.data.loc_code || "-",
              po_to_order_processing: updatedValue,
            });
          }
        }
        if (colDef.accessor === "default_mode") {
          if (previousSelectedNode) {
            previousSelectedNode.data.default_mode = false;
          }

          deleiveryLead.current = deleiveryLead.current.filter(
            (prod_code) => prod_code.article !== params.data.article
          );

          deleiveryLead.current.push({
            ...(params.data[UNIQUE_ROW_ID]
              ? { [UNIQUE_ROW_ID]: params.data[UNIQUE_ROW_ID] }
              : {}),
            article: params.data.article,
            vendor_code: params.data.vendor_code || "-",
            loc_code: params.data.loc_code || "",
            ...(params.data.lead_time === 0 || params.data.lead_time
              ? { lead_time: params.data.lead_time }
              : {}),
            ...(params.data.manufacturing_lead_time === 0 ||
            params.data.manufacturing_lead_time
              ? { manufacturing_lead_time: params.data.manufacturing_lead_time }
              : {}),
            ...(params.data.shipping_lead_time === 0 ||
            params.data.shipping_lead_time
              ? { shipping_lead_time: params.data.shipping_lead_time }
              : {}),
            mode_shipment: params.data.mode_shipment,
            default_mode: updatedValue ? 1 : 0,
          });
        }
      } else {
        if (colDef.accessor && colDef.accessor.includes("lead_time")) {
          deleiveryLead.current.push({
            ...(params.data[UNIQUE_ROW_ID]
              ? { [UNIQUE_ROW_ID]: params.data[UNIQUE_ROW_ID] }
              : {}),
            article: params.data.article,
            vendor_code: params.data.vendor_code || "-",
            loc_code: params.data.loc_code || "-",
            ...(params.data.lead_time === 0 || params.data.lead_time
              ? { lead_time: params.data.lead_time }
              : {}),
            ...(params.data.manufacturing_lead_time === 0 ||
            params.data.manufacturing_lead_time
              ? { manufacturing_lead_time: params.data.manufacturing_lead_time }
              : {}),
            ...(params.data.shipping_lead_time === 0 ||
            params.data.shipping_lead_time
              ? { shipping_lead_time: params.data.shipping_lead_time }
              : {}),
            [colDef.accessor]: updatedValue, // Override with new value
            ...(params.data.mode_shipment
              ? {
                  mode_shipment: params.data.mode_shipment,
                  default_mode: params.data.default_mode,
                }
              : {}),
          });
        }
        if (colDef.accessor === "po_to_order_processing") {
          deleiveryLead.current.push({
            ...(params.data[UNIQUE_ROW_ID]
              ? { [UNIQUE_ROW_ID]: params.data[UNIQUE_ROW_ID] }
              : {}),
            article: params.data.article,
            vendor_code: params.data.vendor_code || "-",
            loc_code: params.data.loc_code || "-",
            po_to_order_processing: updatedValue,
          });
        }
        if (colDef.accessor === "default_mode") {
          if (previousSelectedNode) {
            previousSelectedNode.data.default_mode = false;
          }

          deleiveryLead.current.push({
            ...(params.data[UNIQUE_ROW_ID]
              ? { [UNIQUE_ROW_ID]: params.data[UNIQUE_ROW_ID] }
              : {}),
            article: params.data.article,
            vendor_code: params.data.vendor_code || "-",
            loc_code: params.data.loc_code || "",
            ...(params.data.lead_time === 0 || params.data.lead_time
              ? { lead_time: params.data.lead_time }
              : {}),
            ...(params.data.manufacturing_lead_time === 0 ||
            params.data.manufacturing_lead_time
              ? { manufacturing_lead_time: params.data.manufacturing_lead_time }
              : {}),
            ...(params.data.shipping_lead_time === 0 ||
            params.data.shipping_lead_time
              ? { shipping_lead_time: params.data.shipping_lead_time }
              : {}),
            mode_shipment: params.data.mode_shipment,
            default_mode: updatedValue ? 1 : 0,
          });
        }
      }
      setDeleiveryLeadPayload(deleiveryLead.current);

      if (updatedValue !== params.data.newValue) {
        var column = params.column.colDef.field;
        params.column.colDef.cellStyle = OMS_EDITED_GRID_CELLS_BACKGROUND;
        params.api.refreshCells({
          force: true,
          suppressFlash: false,
          columns: [column],
          rowNodes: [
            ...(previousSelectedNode ? [previousSelectedNode] : []),
            node,
          ],
        });
      }
    }

    if (colDef.accessor === "default_mode" && !data.default_mode) {
      node.data.default_mode = true;
      params.api.refreshCells({
        force: true,
        suppressFlash: false,
        rowNodes: [node],
        columns: [colDef.accessor],
      });
      displaySnackMessages(
        "You cannot deselect an existing default mode",
        "info"
      );
    }

    updateParams(params);
  };

  const updateParams = (params) => {
    params.column.colDef.cellStyle = {};
  };

  const updateEdit = async () => {
    if (!isValidValue) {
      setAlertVariant("info");
      setAlertMessage("Please Enter valid value");
      setTimeout(() => setAlertMessage(null), 5000);
      return;
    }
    if (deleiveryLeadPayload.length !== 0) {
      let body = {
        orders: Array.isArray(deleiveryLeadPayload)
          ? deleiveryLeadPayload?.map((item) => ({
              ...item,
              default_mode: item.default_mode ? 1 : 0,
            }))
          : deleiveryLeadPayload,
        keys: ["article", "loc_code", "vendor_code", "mode_shipment"],
      };
      if (REMOVE_SECONDARY_ROW_ID) {
        body.orders = body.orders.map(
          ({ [UNIQUE_ROW_ID]: unique_row_id, ...rest }) => rest
        );
      }
      let response = await props.setConstraintsDeliveryLeadTimeData(body);
      if (response.data.status) {
        DeleiveryLeadTableGridInstance.current.api.refreshCells({
          force: true,
          suppressFlash: false,
        });
        setAlertVariant("success");
        setAlertMessage(UPDATED_MESSAGE);
        deleiveryLead.current = [];
        setDeleiveryLeadPayload([]);
        props.setConstraintsSetAllSuccess(true);
        setIsHide(true);
        // Clear alert after 5 seconds
        setTimeout(() => setAlertMessage(null), 5000);
      }
    } else {
      setAlertVariant("error");
      setAlertMessage("No edit data");
      setTimeout(() => setAlertMessage(null), 5000);
    }
  };

  const openSetAllPopUp = () => {
    setOpenPopUp(true);
  };

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selectedRows = [];
    DeleiveryLeadTableGridInstance.current.api.forEachNode((node) => {
      node.selected && selectedRows.push({ ...node.data });
    });
    setSelectedRows(selectedRows);
    let l_selections = event.api.getSelectedRows().length;
    let l_buttonEnabled =
      DeleiveryLeadTableGridInstance.current.api.buttonEnabled;
    if (l_selections) {
      !l_buttonEnabled && setButtonEnabled(true);
    } else {
      l_buttonEnabled && setButtonEnabled(false);
    }
    //let selectedRows = event.api.getSelectedRows().length;
  };

  const updateSetAllData = async (payload, setAllData) => {
    var selection = {
      data: DeleiveryLeadTableGridInstance?.current?.api?.checkConfiguration,
      unique_columns: ["id"],
    };
    let body = {
      orders: payload,
      filters: [...props.selectedOmsFilters],
      meta: {
        sort: [],
        range: [],
      },
      selection,
      set_all: setAllData,
      isSelectAllRecords:
        DeleiveryLeadTableGridInstance?.current?.api?.isSelectAllRecords,
    };
    if (!DeleiveryLeadTableGridInstance?.current?.api?.isSelectAllRecords) {
      body.keys = ["article", "loc_code", "vendor_code", "mode_shipment"];
    }
    if (REMOVE_SECONDARY_ROW_ID) {
      body.orders = body.orders.map(
        ({ [UNIQUE_ROW_ID]: unique_row_id, ...rest }) => rest
      );
    }

    let response = await props.setConstraintsDeliveryLeadTimeData(body);
    if (response.data.status) {
      displaySnackMessages(UPDATED_MESSAGE, "success");
      setSelectedRows([]);
      DeleiveryLeadTableGridInstance?.current?.api?.deselectAll(true);
      DeleiveryLeadTableGridInstance?.current?.api?.setCheckConfiguration([]);
      DeleiveryLeadTableGridInstance?.current?.api?.refreshServerSideStore({
        purge: true,
      });
      return true;
      //props.setConstraintsSetAllSuccess(true)
    }
  };

  useEffect(() => {
    if (DeleiveryLeadTableGridInstance?.current) {
      //checkconfig
      DeleiveryLeadTableGridInstance.current.api.checkAllSetAllRequest = checkAllSetAllRequest;
      DeleiveryLeadTableGridInstance.current.api.buttonEnabled = buttonEnabled;
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
        let response = await props.getConstraintsDeleiveryLeadTimeDownlaodTableData(
          body
        );
        if (response.data.status) {
          // let downloadData;
          // downloadData = agGridRowFormatter(response.data.data);
          // setCsvData(cloneDeep(downloadData), csvHeaders);
          // displaySnackMessages("Successfully Download", "success");
        } else {
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

    // Determine if Update should be disabled
    const isUpdateDisabled = !isEmpty(props?.userAccess)
      ? !isUserHasEditAccess || ishide
      : isUserHasViewOnlyAccess || ishide;

    if (selectedRows?.length) {
      options.push(
        <>
          {!HIDE_SETALL_BUTTON && (
            <div>
              <Button
                variant="tertiary"
                color="primary"
                id="leadTimeSetAllBtn"
                className={classes.button}
                onClick={openSetAllPopUp}
                disabled={isSetAllDisabled}
              >
                Set All
              </Button>
            </div>
          )}
        </>
      );
    }

    if (!HIDE_UPDATE_BUTTON) {
    options.push(
          <Button
            variant="primary"
            color="primary"
            className={classes.button}
            onClick={updateEdit}
            disabled={isUpdateDisabled}
          >
            Update
          </Button>
    );
    }

    return options;
  };

  const getTopCenterOptions = () => {
    if (alertMessage) {
      return <Alert severity={alertVariant} title={alertMessage} onClose={() => setAlertMessage(null)}></Alert>;
    }
    return null;
  };
  return (
    <>
      {/* <DeleiveryFilter/> */}
      {props.isFilterOmsValid && (
        <div className={globalClasses.marginVertical1rem}>
          <Loader
            loader={
              props.constraintsDeleiveryLeadTimeTableDataLoader ||
              props.constraintsDeleiveryLeadTimeTableConfigLoader
            }
            minHeight={"260px"}
          >
            {render && (
              <div ref={allocationRef}>
                <AgGridComponent
                  columns={leadTimeTableColumns}
                  manualCallBack={(body, pageIndex, params) =>
                    manualCallBack(body, pageIndex, params)
                  }
                  onCellValueChanged={onCellValueChanged}
                  loadTableInstance={loadTableInstance}
                  onSelectionChanged={onSelectionChanged}
                  pagination={true}
                  totalCount={totalCount}
                  cacheBlockSize={10}
                  serverSideStoreType="partial"
                  rowModelType="serverSide"
                  uniqueRowId={UNIQUE_ROW_ID}
                  rowSelection="multiple"
                  onRowSelected
                  selectAllHeaderComponent={!HIDE_SETALL_BUTTON}
                  hideSelectAllRecords={HIDE_SETALL_BUTTON}
                  tableHeader={`Details`}
                  topRightOptions={getTopRightOptions()}
                  topCenterOptions={getTopCenterOptions()}
                />
              </div>
            )}
          </Loader>
          {openPopUp && (
            <SetAllPopUp
              feildsData={SETALL_FORMDATA_FIELDS}
              PRIMARY_KEY={UNIQUE_ROW_ID}
              setShowSetAllModal={setOpenPopUp}
              screenName={CONSTRAINTS_OMS_SCREENNAME_KEYS.LeadTime}
              rowsData={selectedRows}
              setAll={updateSetAllData}
              setCheckAllSetAllRequest={setCheckAllSetAllRequest}
              agGridInstance={DeleiveryLeadTableGridInstance?.current}
              displaySnackMessages={displaySnackMessages}
              maxFields={
                SETALL_FORMDATA_FIELDS?.length === 1
                  ? 2
                  : SETALL_FORMDATA_FIELDS?.length
              }
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
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    orderingScreensConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig,
    orderingAccessControl:
      store.omsReducer.orderingCommonService.orderingAccessControl,
    userAccess:
      store.omsReducer.orderingCommonService.orderingUserAccess?.vendor_dc,
    constraintsDeleiveryLeadTimeTableDataLoader:
      store.omsReducer.orderingConstraintsService
        .constraintsDeleiveryLeadTimeTableDataLoader,
    constraintsDeleiveryLeadTimeTableConfigLoader:
      store.omsReducer.orderingConstraintsService
        .constraintsDeleiveryLeadTimeTableConfigLoader,
    selectedOmsFilters:
      store.omsReducer.orderingConstraintsService.selectedOmsFilters,
    isFilterOmsValid:
      store.omsReducer.orderingConstraintsService.isFilterOmsValid,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getConstraintsDeleiveryLeadTimeTableConfig: (payload) =>
    dispatch(getConstraintsDeleiveryLeadTimeTableConfig(payload)),
  getConstraintsDeleiveryLeadTimeTableData: (payload) =>
    dispatch(getConstraintsDeleiveryLeadTimeTableData(payload)),
  getConstraintsDeleiveryLeadTimeDownlaodTableData: (payload) =>
    dispatch(getConstraintsDeleiveryLeadTimeDownlaodTableData(payload)),
  setConstraintsDeleiveryLeadTimeTableConfigLoader: (payload) =>
    dispatch(setConstraintsDeleiveryLeadTimeTableConfigLoader(payload)),
  setConstraintsDeleiveryLeadTimeTableDataLoader: (payload) =>
    dispatch(setConstraintsDeleiveryLeadTimeTableDataLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  setConstraintsDeliveryLeadTimeData: (payload) =>
    dispatch(setConstraintsDeliveryLeadTimeData(payload)),
  setConstraintsSetAllSuccess: (payload) =>
    dispatch(setConstraintsSetAllSuccess(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DeleiveryLeadTimeTable);
