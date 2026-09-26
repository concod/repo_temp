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
  CONSTRAINTS_OMS_SETALL_STATUS_FIELDS_TYPE,
  UPDATED_MESSAGE,
  CONSTRAINTS_OMS_SCREENNAME_KEYS,
  NO_DATA_FOUND,
  FILE_DOWNLOADING_MESSAGE_OMS_CONSTRAINTS,
  OMS_CONFIGURATION_SCREENNAME_KEY,
} from "modules/oms/constants-oms/stringConstants";
import {
  getConstraintsStatusTableConfig,
  setConstraintsStatusTableConfigLoader,
  setConstraintsStatusTableDataLoader,
  getConstraintsStatusTableData,
  setConstraintsStatusData,
  getConstraintsStatusDownloadTableData,
} from "modules/oms/services-oms/Constraints/constraints-services";
import { isEmpty } from "lodash";
import { scrollIntoView } from "modules/oms/utils-oms/oms-utility";
import globalStyles from "core/Styles/globalStyles";
import SetAllPopUp from "../setAllPopUp";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import {
  getHeaderForExcel,
  replaceSpecialCharToCharCode,
} from "core/Utils/functions/utils";
import { cloneDeep } from "lodash";
import { getValidCheckConfiguration } from "../utils";
import { Button } from "impact-ui-v3";
import PackConfigBottomSheet from "modules/oms/pages-oms/common/PackConfigBottomSheet";

const VendorStatusTable = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const [vendorStatusTableColumns, setVendorStatusTableColumns] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [render, setRender] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [buttonEnabled, setButtonEnabled] = useState(false);
  const [ishide, setIsHide] = useState(true);
  const [statusPayload, setStatusPayload] = useState([]);
  const [openPopUp, setOpenPopUp] = useState(false);
  const [checkAllSetAllRequest, setCheckAllSetAllRequest] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [manualBodyData, setManualBodyData] = useState({});
  const downloadLink = useRef(null);
  const [isUserHasViewOnlyAccess, setIsUserHasViewOnlyAccess] = useState(true);
  const [isUserHasSetAllAccess, setIsUserHasSetAllAccess] = useState(true);
  const [isUserHasEditAccess, setIsUserHasEditAccess] = useState(true);
  const [isUserHasDownloadAccess, setIsUserHasDownloadAccess] = useState(true);
  const [openPackConfig, setOpenPackConfig] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState("");

  const allocationRef = useRef();
  const statusTableGridInstance = useRef(null);
  var status = useRef([]);

  // user access for replenishment status
  const constraintsAccess = props.userAccess?.find(
    (item) =>
      item.module === "constraints_status" &&
      item.screen === OMS_CONFIGURATION_SCREENNAME_KEY
  );
  const canEdit = constraintsAccess?.isEditButton || false;
  const canSetAll = constraintsAccess?.isSetAllButton || false;
  const canDownload = constraintsAccess?.isDownloadButton || false;

  const SETALL_FORMDATA_FIELDS =
    props?.constraintsConfig?.setall_formdata_fields ||
    CONSTRAINTS_OMS_SETALL_STATUS_FIELDS_TYPE;
  const UNIQUE_ROW_ID = props?.constraintsConfig?.unique_key || "id";
  const PRIMARY_KEY = props?.constraintsConfig?.primary_key || "product_code";
  const SORT_BY_DEFAULT = props?.constraintsConfig?.sort_by_default || false;

  const checkForEditability = (columns) => {
    // If userAccess exists, use canEdit flag; otherwise fall back to orderingAccessControl
    const shouldDisableEdit = !isEmpty(props?.userAccess)
      ? !canEdit
      : !props?.orderingAccessControl?.isEditButton?.isVisible;

    if (shouldDisableEdit) {
      columns.map((col) => {
        col.is_editable = false;
        if (col.type === "list") col.type = "str";
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
      setIsUserHasViewOnlyAccess(false);
    } else if (props?.orderingAccessControl) {
      // Fall back to old access control
      setIsUserHasViewOnlyAccess(
        !props?.orderingAccessControl?.isEditButton?.isVisible
      );
      setIsUserHasEditAccess(true);
      setIsUserHasSetAllAccess(true);
      setIsUserHasDownloadAccess(true);
    }
  }, [
    props?.userAccess,
    props?.orderingAccessControl,
    canEdit,
    canSetAll,
    canDownload,
  ]);

  useEffect(() => {
    const fetchColumnConfig = async () => {
      setIsHide(true);
      props.setConstraintsStatusTableConfigLoader(true);
      let columns = await props.getConstraintsStatusTableConfig({});
      const modifiedColumns = columns?.data?.data.map((column) => {
        if (column.column_name === "pack_config") {
          column.onClick = (tableInfo) => {
            console.log("tableInfo", tableInfo?.cellData?.data);
            setSelectedStyle(tableInfo?.cellData?.data?.article || {});
            setOpenPackConfig(true);
          };
        }

        return column;
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
      props.setConstraintsStatusTableConfigLoader(false);
      setVendorStatusTableColumns(formattedColumns);
      setCsvHeaders(getHeaderForExcel(cloneDeep(formattedColumns)));
      setRender(true);
      scrollIntoView(allocationRef);
    };
    if (props?.selectedOmsFilters && props?.selectedOmsFilters?.length > 0) {
      fetchColumnConfig();
    }
  }, [props?.selectedOmsFilters]);

  useEffect(() => {
    !isEmpty(props.selectedOmsFilters) && setRender(false);
  }, [props.selectedOmsFilters]);

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setConstraintsStatusTableDataLoader(true);

      //For List Component in AG Grid
      let searchParameters = manualbody.search;
      if (searchParameters.length > 0) {
        searchParameters.forEach((item) => {
          if (item.column === "status" && item.type === "list") {
            item.type = "str";
          }

          // Removing the below code since it was failing comma separated searches
          // if (item.pattern && typeof item.pattern === "string") {
          //   item.pattern = replaceSpecialCharsInSearchPattern(item.pattern);
          // }
        });
      }

      const selection = {
        data: getValidCheckConfiguration(
          statusTableGridInstance?.current?.api?.checkConfiguration
        ),
        unique_columns: [UNIQUE_ROW_ID],
      };

      const sortBy = manualbody?.sort.length
        ? manualbody.sort
        : SORT_BY_DEFAULT
        ? []
        : [{ column: PRIMARY_KEY, order: "asc" }];

      let body = {
        filters: [...props.selectedOmsFilters],
        meta: manualbody
          ? {
              ...manualbody,
              limit: { limit: 10, page: pageIndex + 1 },
              sort: sortBy,
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
      let response = await props.getConstraintsStatusTableData(body);
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
        setTotalCount(response.data.total);

        props.setConstraintsStatusTableDataLoader(false);
        return { data: formatedData, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setConstraintsStatusTableDataLoader(false);
        return defaultTableData;
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setConstraintsStatusTableDataLoader(false);
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

  const loadTableInstance = (params) => {
    statusTableGridInstance.current = params;
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

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selectedRows = [];
    statusTableGridInstance.current.api.forEachNode((node) => {
      node.selected && selectedRows.push({ ...node.data });
    });
    setSelectedRows(selectedRows);
    let l_selections = event.api.getSelectedRows().length;
    let l_buttonEnabled = statusTableGridInstance.current.api.buttonEnabled;
    if (l_selections) {
      !l_buttonEnabled && setButtonEnabled(true);
    } else {
      l_buttonEnabled && setButtonEnabled(false);
    }
    //let selectedRows = event.api.getSelectedRows().length;
  };

  useEffect(() => {
    if (statusTableGridInstance?.current) {
      statusTableGridInstance.current.api.checkAllSetAllRequest = checkAllSetAllRequest;
      statusTableGridInstance.current.api.buttonEnabled = buttonEnabled;
    }
  }, [checkAllSetAllRequest, buttonEnabled]);

  const onCellValueChanged = (params) => {
    const { colDef, node, data, newValue } = params;
    if (params.value) {
      setIsHide(false);
      if (status.current.length != 0) {
        var flag = false;
        status.current.filter((prod_code) => {
          if (
            prod_code[PRIMARY_KEY] ==
            replaceSpecialCharToCharCode(params.data[PRIMARY_KEY])
          ) {
            prod_code.status = params.value;
            flag = true;
          }
        });
        if (!flag) {
          const editedStatusObject = {
            vendor_code: params.data.vendor_code,
            loc_code: params.data.loc_code,
            status: params.value,
          };
          editedStatusObject[PRIMARY_KEY] = replaceSpecialCharToCharCode(
            params.data[PRIMARY_KEY]
          );
          status.current.push(editedStatusObject);
        }
      } else {
        const editedStatusObject = {
          vendor_code: params.data.vendor_code,
          loc_code: params.data.loc_code,
          status: params.value,
        };
        editedStatusObject[PRIMARY_KEY] = replaceSpecialCharToCharCode(
          params.data[PRIMARY_KEY]
        );
        status.current.push(editedStatusObject);
      }
      setStatusPayload(status.current);
    }
  };

  const openSetAllPopUp = () => {
    setOpenPopUp(true);
  };

  const updateEdit = async () => {
    if (statusPayload.length !== 0) {
      let body = {
        orders: statusPayload,
      };
      let response = await props.setConstraintsStatusData(body);
      if (response.data.status) {
        statusTableGridInstance.current.api.refreshCells({
          force: true,
          suppressFlash: false,
        });
        status.current = [];
        displaySnackMessages(UPDATED_MESSAGE, "success");
        //props.setConstraintsSetAllSuccess(true);
        setIsHide(true);
      } else {
        setIsHide(false);
      }
    } else {
      displaySnackMessages("No edit data", "error");
    }
  };

  const updateSetAllData = async (payload, setAllData) => {
    try {
      var selection = {
        data: statusTableGridInstance?.current?.api?.checkConfiguration,
        unique_columns: [UNIQUE_ROW_ID],
      };
      const editedOrders = payload.map((data) => {
        const editedStatusObject = { ...data };
        editedStatusObject[PRIMARY_KEY] = replaceSpecialCharToCharCode(
          data[PRIMARY_KEY]
        );
        return editedStatusObject;
      });
      let body = {
        orders: editedOrders,
        filters: [...props.selectedOmsFilters],
        meta: {
          sort: [],
          range: [],
        },
        selection,
        set_all: setAllData,
        isSelectAllRecords:
          statusTableGridInstance?.current?.api?.isSelectAllRecords,
      };
      let response = await props.setConstraintsStatusData(body);
      if (response.data.status) {
        displaySnackMessages(UPDATED_MESSAGE, "success");
        setSelectedRows([]);
        statusTableGridInstance?.current?.api?.deselectAll(true);
        statusTableGridInstance?.current?.api?.setCheckConfiguration([]);
        statusTableGridInstance?.current?.api?.refreshServerSideStore({
          purge: true,
        });
        //return true;
        //props.setConstraintsSetAllSuccess(true)
      }
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

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
        let response = await props.getConstraintsStatusDownloadTableData(body);
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

    if (selectedRows?.length > 0) {
      options.push(
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
      );
    }

    options.push(
      <>
        <div>
          <Button
            variant="secondary"
            color="primary"
            className={classes.button}
            onClick={updateEdit}
            disabled={isUpdateDisabled}
          >
            Update
          </Button>
        </div>
      </>
    );

    return options;
  };

  return (
    <div className={globalClasses.marginVertical1rem}>
      <div className={globalClasses.marginVertical1rem}>
        <Loader
          loader={
            props.constraintsStatusTableDataLoader ||
            props.constraintsStatusTableConfigLoader
          }
          minHeight={"260px"}
        >
          {render && (
            <div ref={allocationRef}>
              <AgGridComponent
                columns={vendorStatusTableColumns}
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
                uniqueRowId={UNIQUE_ROW_ID}
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
          <SetAllPopUp
            feildsData={SETALL_FORMDATA_FIELDS}
            PRIMARY_KEY={PRIMARY_KEY}
            setShowSetAllModal={setOpenPopUp}
            screenName={CONSTRAINTS_OMS_SCREENNAME_KEYS.Status}
            rowsData={selectedRows}
            setAll={updateSetAllData}
            setCheckAllSetAllRequest={setCheckAllSetAllRequest}
            agGridInstance={statusTableGridInstance?.current}
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
            //productDescriptionName={selectedStyle + " Description"}
            screenName="replishment_status"
          />
        )}
      </div>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    constraintsConfig:
      store.omsReducer.orderingConstraintsService.omsConstraintsScreenConfig
        ?.status,

    constraintsStatusTableDataLoader:
      store.omsReducer.orderingConstraintsService
        .constraintsStatusTableDataLoader,
    constraintsStatusTableConfigLoader:
      store.omsReducer.orderingConstraintsService
        .constraintsStatusTableConfigLoader,
    selectedOmsFilters:
      store.omsReducer.orderingConstraintsService.selectedOmsFilters,

    orderingScreensConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig,
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
  getConstraintsStatusTableConfig: (payload) =>
    dispatch(getConstraintsStatusTableConfig(payload)),
  getConstraintsStatusTableData: (payload) =>
    dispatch(getConstraintsStatusTableData(payload)),
  getConstraintsStatusDownloadTableData: (payload) =>
    dispatch(getConstraintsStatusDownloadTableData(payload)),
  setConstraintsStatusTableConfigLoader: (payload) =>
    dispatch(setConstraintsStatusTableConfigLoader(payload)),
  setConstraintsStatusTableDataLoader: (payload) =>
    dispatch(setConstraintsStatusTableDataLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  setConstraintsStatusData: (payload) =>
    dispatch(setConstraintsStatusData(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(VendorStatusTable);
