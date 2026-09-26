import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import globalStyles from "core/Styles/globalStyles";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import {
  formatSelectedFiltersData,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import { Button } from "impact-ui-v3";
import {
  IS_OVERRIDEN_CORE_BUTTON_WIDTH,
  IS_OVERRIDEN_CORE_BTN_PLACEMENT_TWO_TABS,
} from "config/constants";
import { cloneDeep } from "lodash";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { isEmpty } from "lodash";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { useStyles as useOrderingStyles } from "modules/oms/styles-oms/orderingCustomStyles";
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
  getConstraintsDeleiveryLeadTimeVendorStoreTableConfig,
  setConstraintsDeleiveryLeadTimeTableConfigLoader,
  setConstraintsDeleiveryLeadTimeTableDataLoader,
  getConstraintsDeleiveryLeadTimeVendorStoreTableData,
  setConstraintsDeliveryLeadTimeDataVendorStore,
  setConstraintsSetAllSuccess,
  getConstraintsDeleiveryLeadTimeDownlaodTableData,
  setConstraintsOmsLoader,
  setConstraintsOmsFilterDependency,
  getConstraintOmsFilterConfigurationVendorStore,
  setConstraintsOmsFilterElements,
  setSelectedOmsFilters,
} from "modules/oms/services-oms/Constraints/constraints-services";

import { getValidCheckConfiguration } from "../utils";
import SetAllPopUp from "../setAllPopUp";
import PackConfigBottomSheet from "modules/oms/pages-oms/common/PackConfigBottomSheet";
import { resetSelectedOmsFilters } from "modules/oms/services-oms/Constraints/constraints-services";
import {
  filtersPayload,
  fetchFilterOptions,
  scrollIntoView,
} from "modules/oms/utils-oms/oms-utility";
import { OMS_CONSTRAINTS_SCREENNAME } from "modules/oms/constants-oms/stringConstants";

const DeliveryLeadTimeVendorStoreTable = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const orderingClasses = useOrderingStyles();

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
  const [isUserHasSetAllAccess, setIsUserHasSetAllAccess] = useState(true);
  const [isUserHasEditAccess, setIsUserHasEditAccess] = useState(true);
  const allocationRef = useRef();
  const DeliveryLeadTableGridInstance = useRef(null);
  var deleiveryLead = useRef([]);
  const [isValidValue, setIsValidValue] = useState(true);
  const [openPackConfig, setOpenPackConfig] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState("");
  const [filters, setFilters] = useState([]);
  const [filterDependency, setFilterDependency] = useState([]);
  const [filterPayload, setFilterPayload] = useState([]);
  const [isFiltersValid, updateIsFiltersValid] = useState(false);
  const [
    isRedirectedFromDifferentPage,
    setIsRedirectedFromDifferentPage,
  ] = useState(false);

  const type = new URLSearchParams(window.location.search).get("type");

  const savedFiltersDependency =
    JSON.parse(localStorage.getItem("selectedFiltersDependency")) || [];

  const onFilterDashboard = async (filterElements, filterDependency) => {
    const payload = filtersPayload(filterElements, filterDependency, true);
    payload.reqBody = payload.reqBody.filter(
      (item) =>
        ["sale_type", "store_capacity"].indexOf(item.attribute_name) === -1
    );
    //setFilterPayload(dependency);
    updateIsFiltersValid(payload.isValid);
    props.setSelectedOmsFilters(payload.reqBody);
  };

  useEffect(() => {
    const selectedFiltersDependency =
      savedFiltersDependency?.length > 0
        ? savedFiltersDependency
        : props.filterDashboardConfigurationVendorStore?.appliedFilterData
            ?.dependencyData;

    props.setConstraintsOmsFilterDependency(selectedFiltersDependency);

    const fetchData = async () => {
      props.setConstraintsOmsLoader(true);
      try {
        //fetch the filter levels
        const response = await props.getConstraintOmsFilterConfigurationVendorStore();
        let data = response.data.data;
        setFilters(data);
        props.setConstraintsOmsLoader(false);
      } catch (error) {
        props.setConstraintsOmsLoader(false);
      }
    };

    fetchData();
    return () => {
      props.resetConstraintsState([]);
    };
  }, []);

  useEffect(() => {
    if (!filters || filters?.length === 0) {
      return;
    }
    getFiltersOptions(props.savedFilterSelection);
  }, [filters]);

  useEffect(() => {
    return () => {
      props.setFilterConfiguration({
        ConstraintsOrderManagementFilterConfigurationVendorStore: undefined,
      });
      props.resetSelectedOmsFilters();
    };
  }, []);

  const getFiltersOptions = async (selected, current) => {
    try {
      props.setConstraintsOmsLoader(true);
      const selectedFilters = isRedirectedFromDifferentPage
        ? cloneDeep(props.constraintsOmsFilterDependency)
        : selected;

      let requiredFilterObjParams = {
        allFilters: filters || [],
        appliedFilters: selectedFilters,
        current: current,
        rolesBasedAccess: props?.roleBasedAccess,
        screenName: OMS_CONSTRAINTS_SCREENNAME,
        tenantFilterUamConfig: props.tenantFilterUamConfig,
      };
      const response = await fetchFilterOptions(requiredFilterObjParams);
      if (isEmpty(props.filterDashboardConfigurationVendorStore)) {
        const filterConfigData = [
          {
            filterDashboardData: response,
            isCrossDimensionFilter: true,
            screen_name: OMS_CONSTRAINTS_SCREENNAME,
          },
        ];
        const filterConfig = formattedFilterConfiguration(
          "ConstraintsOrderManagementFilterConfigurationVendorStore",
          filterConfigData,
          "Constraints Oms Screen Vendor Store",
          selectedFilters
        );
        if (isRedirectedFromDifferentPage) {
          const formattedSelectedFilters = formatSelectedFiltersData(
            filterConfigData,
            "Constraints Oms Screen Vendor Store",
            selectedFilters
          );
          filterConfig[
            "ConstraintsOrderManagementFilterConfigurationVendorStore"
          ].isRedirectedFromDifferentPage = isRedirectedFromDifferentPage;
          // onFilterDashboardClick(selectedFilters, response);
          setFilterDependency(formattedSelectedFilters);
        }
        props.setFilterConfiguration(filterConfig);
      }
      //props.setFilterConfiguration(filterConfig);
      let filterElements = cloneDeep(response);
      //setFilters(response);
      props.setConstraintsOmsFilterElements(filterElements);
    } catch (error) {
      console.log("Error123", error);
      props.addSnack({
        message: "Error while fetching options",
        options: {
          variant: "error",
        },
      });
    } finally {
      props.setConstraintsOmsLoader(false);
    }
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    onFilterDashboard(filterData, dependencyData);
  };

  // user access for lead time vendor store
  const constraintsAccess = props.userAccess?.find(
    (item) =>
      item.module === "constraints_lead_time" &&
      item.screen === OMS_CONSTRAINTS_SCREENNAME_KEY
  );
  const canEdit = constraintsAccess?.isEditButton || false;
  const canSetAll = constraintsAccess?.isSetAllButton || false;

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
    try {
      const fetchColumnConfig = async () => {
        setIsHide(true);
        props.setConstraintsDeleiveryLeadTimeTableConfigLoader(true);
        let columns = await props.getConstraintsDeleiveryLeadTimeVendorStoreTableConfig(
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

      if (
        props.selectedOmsFilters &&
        props.selectedOmsFilters.length > 0 &&
        !render
      ) {
        fetchColumnConfig();
      }
    } catch (err) {
      console.log("Error123", err);
    }
  }, [props.selectedOmsFilters, render]);

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
          DeliveryLeadTableGridInstance?.current?.api?.checkConfiguration
        ),
        unique_columns: ["id"],
      };

      const defaultSort = props?.vendorToStoreScreenConfig?.default_sort;
      const sortToBeSent =
        manualbody?.sort?.length > 0
          ? manualbody.sort
          : Array.isArray(defaultSort) && defaultSort?.length > 0
          ? defaultSort
          : [];

      let body = {
        filters: [...props.selectedOmsFilters],

        meta: manualbody
          ? {
              ...manualbody,
              sort: sortToBeSent,
              limit: { limit: 10, page: pageIndex + 1 },
            }
          : {
              search: [],
              sort: sortToBeSent,
              range: [],
              limit: { limit: 10, page: Number(pageIndex) ? pageIndex + 1 : 1 },
            },
        selection,
      };
      setManualBodyData(body?.meta);
      let response = await props.getConstraintsDeleiveryLeadTimeVendorStoreTableData(
        body
      );
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
          "id"
        );

        // Check and update default_mode for matching records
        if (deleiveryLead.current?.length > 0) {
          formatedData = formatedData.map((newRecord) => {
            const matchingRecord = deleiveryLead.current?.find(
              (existingRecord) =>
                existingRecord.article === newRecord.article &&
                existingRecord.store_code === newRecord.store_code
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
    DeliveryLeadTableGridInstance.current = params;
  };

  const onCellValueChanged = (params) => {
    const { colDef, node, data, newValue } = params;

    //filter all matching row data
    let previousSelectedNode;

    params.api.forEachNode((nodeItem) => {
      if (
        data.article === nodeItem.data.article &&
        data.store_code === nodeItem.data.store_code &&
        data?.mode_shipment !== nodeItem.data?.mode_shipment &&
        nodeItem.data.default_mode
      )
        previousSelectedNode = nodeItem;
    });

    if (params.value === "") {
      setIsValidValue(false);
      return displaySnackMessages("Please Enter valid value", "info");
    }

    if (params.value || params.value === 0) {
      setIsHide(false);
      setIsValidValue(true);
      if (deleiveryLead.current.length != 0) {
        var flag = false;
        if (colDef.accessor == "lead_time") {
          deleiveryLead.current.filter((prod_code) => {
            if (prod_code.article === params.data.article) {
              prod_code.lead_time = params.value;
              flag = true;
            }
          });
          if (!flag) {
            deleiveryLead.current.push({
              article: params.data.article,
              vendor_code: params.data.vendor_code || "-",
              store_code: params.data.store_code || "-",
              lead_time: params.value,
              ...(params.data.mode_shipment
                ? {
                    mode_shipment: params.data.mode_shipment,
                    default_mode: params.data.default_mode ? 1 : 0,
                  }
                : {}),
            });
          }
        }
        if (colDef.accessor == "po_to_order_processing") {
          deleiveryLead.current.filter((prod_code) => {
            if (prod_code.article === params.data.article) {
              prod_code.po_to_order_processing = params.value;
              flag = true;
            }
          });
          if (!flag) {
            deleiveryLead.current.push({
              article: params.data.article,
              vendor_code: params.data.vendor_code || "-",
              store_code: params.data.store_code || "-",
              po_to_order_processing: params.value,
            });
          }
        }
        if (colDef.accessor == "default_mode") {
          if (previousSelectedNode) {
            previousSelectedNode.data.default_mode = false;
          }

          deleiveryLead.current = deleiveryLead.current.filter(
            (prod_code) => prod_code.article !== params.data.article
          );

          deleiveryLead.current.push({
            article: params.data.article,
            vendor_code: params.data.vendor_code || "-",
            store_code: params.data.store_code || "",
            lead_time: params.data.lead_time,
            mode_shipment: params.data.mode_shipment,
            default_mode: params.value ? 1 : 0,
          });
        }
      } else {
        if (colDef.accessor == "lead_time") {
          deleiveryLead.current.push({
            article: params.data.article,
            vendor_code: params.data.vendor_code || "-",
            store_code: params.data.store_code || "-",
            lead_time: params.value,
            ...(params.data.mode_shipment
              ? {
                  mode_shipment: params.data.mode_shipment,
                  default_mode: params.data.default_mode,
                }
              : {}),
          });
        }
        if (colDef.accessor == "po_to_order_processing") {
          deleiveryLead.current.push({
            article: params.data.article,
            vendor_code: params.data.vendor_code || "-",
            store_code: params.data.store_code || "-",
            po_to_order_processing: params.value,
          });
        }
        if (colDef.accessor == "default_mode") {
          if (previousSelectedNode) {
            previousSelectedNode.data.default_mode = false;
          }

          deleiveryLead.current.push({
            article: params.data.article,
            vendor_code: params.data.vendor_code || "-",
            store_code: params.data.store_code || "",
            lead_time: params.data.lead_time,
            mode_shipment: params.data.mode_shipment,
            default_mode: params.value ? 1 : 0,
          });
        }
      }
      setDeleiveryLeadPayload(deleiveryLead.current);

      if (params.value !== params.data.newValue) {
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

    if (colDef.accessor == "default_mode" && !data.default_mode) {
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
      return displaySnackMessages("Please Enter valid value", "info");
    }
    if (deleiveryLeadPayload.length !== 0) {
      let body = {
        orders: Array.isArray(deleiveryLeadPayload)
          ? deleiveryLeadPayload?.map((item) => ({
              ...item,
              default_mode: item.default_mode ? 1 : 0,
            }))
          : deleiveryLeadPayload,
        keys: ["article", "store_code", "vendor_code", "mode_shipment"],
      };
      let response = await props.setConstraintsDeliveryLeadTimeDataVendorStore(
        body
      );
      if (response.data.status) {
        DeliveryLeadTableGridInstance.current.api.refreshCells({
          force: true,
          suppressFlash: false,
        });
        displaySnackMessages(UPDATED_MESSAGE, "success");
        deleiveryLead.current = [];
        setDeleiveryLeadPayload([]);
        props.setConstraintsSetAllSuccess(true);
        setIsHide(true);
        setRender(false);
      }
    } else {
      displaySnackMessages("No edit data", "error");
    }
  };

  const openSetAllPopUp = () => {
    setOpenPopUp(true);
  };

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selectedRows = [];
    DeliveryLeadTableGridInstance.current.api.forEachNode((node) => {
      node.selected && selectedRows.push({ ...node.data });
    });
    setSelectedRows(selectedRows);
    let l_selections = event.api.getSelectedRows().length;
    let l_buttonEnabled =
      DeliveryLeadTableGridInstance.current.api.buttonEnabled;
    if (l_selections) {
      !l_buttonEnabled && setButtonEnabled(true);
    } else {
      l_buttonEnabled && setButtonEnabled(false);
    }
    //let selectedRows = event.api.getSelectedRows().length;
  };

  const updateSetAllData = async (payload, setAllData) => {
    var selection = {
      data: DeliveryLeadTableGridInstance?.current?.api?.checkConfiguration,
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
        DeliveryLeadTableGridInstance?.current?.api?.isSelectAllRecords,
    };
    if (!DeliveryLeadTableGridInstance?.current?.api?.isSelectAllRecords) {
      body.keys = ["article", "store_code", "vendor_code", "mode_shipment"];
    }
    let response = await props.setConstraintsDeliveryLeadTimeDataVendorStore(
      body
    );
    if (response.data.status) {
      displaySnackMessages(UPDATED_MESSAGE, "success");
      setSelectedRows([]);
      DeliveryLeadTableGridInstance?.current?.api?.deselectAll(true);
      DeliveryLeadTableGridInstance?.current?.api?.setCheckConfiguration([]);
      DeliveryLeadTableGridInstance?.current?.api?.refreshServerSideStore({
        purge: true,
      });
      setRender(false);
      return true;
      //props.setConstraintsSetAllSuccess(true)
    }
  };

  useEffect(() => {
    if (DeliveryLeadTableGridInstance?.current) {
      //checkconfig
      DeliveryLeadTableGridInstance.current.api.checkAllSetAllRequest = checkAllSetAllRequest;
      DeliveryLeadTableGridInstance.current.api.buttonEnabled = buttonEnabled;
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
                id="productSetAllBtn"
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
          variant="secondary"
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

  return (
    <div
      style={{ marginTop: IS_OVERRIDEN_CORE_BTN_PLACEMENT_TWO_TABS }}
      className={orderingClasses.withOuterTabs}
    >
      <CoreComponentScreen
        IscoreButtonWidth={IS_OVERRIDEN_CORE_BUTTON_WIDTH}
        autoHideFilterButton={true}
        showPageRoute={false}
        showPageHeader={true}
        showFilterDashboard={true}
        filterConfigKey={
          "ConstraintsOrderManagementFilterConfigurationVendorStore"
        }
        onApplyFilter={onFilterDashboardClick}
        contained={false}
        filterDependency={filterDependency?.length ? filterDependency : null}
        customClassName={orderingClasses.customMarginBlock}
      >
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
                  customClass={orderingClasses.customDisabledInputCell}
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
                  uniqueRowId={"id"}
                  rowSelection="multiple"
                  onRowSelected
                  selectAllHeaderComponent={!HIDE_SETALL_BUTTON}
                  hideSelectAllRecords={HIDE_SETALL_BUTTON}
                  tableHeader={`Details`}
                  topRightOptions={getTopRightOptions()}
                />
              </div>
            )}
          </Loader>
          {openPopUp && (
            <SetAllPopUp
              feildsData={SETALL_FORMDATA_FIELDS}
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
              isStore={true}
              PRIMARY_KEY={"id"}
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
      </CoreComponentScreen>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    orderingScreensConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig,
    orderingAccessControl:
      store.omsReducer.orderingCommonService.orderingAccessControl,
    userAccess:
      store.omsReducer.orderingCommonService.orderingUserAccess?.vendor_store,
    vendorToStoreScreenConfig:
      store.omsReducer.orderingCommonService?.orderingVendorToStoreConfig
        ?.constraints?.lead_time,
    roleBasedAccess:
      store.omsReducer.orderingCommonService.genericTenantConfig
        ?.roleBasedAccess,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    savedFilterSelection: store.filterReducer.savedFilterSelection,

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
    filterDashboardConfigurationVendorStore:
      store.filterReducer.filterDashboardConfiguration[
        "ConstraintsOrderManagementFilterConfigurationVendorStore"
      ],
  };
};

const mapDispatchToProps = (dispatch) => ({
  getConstraintsDeleiveryLeadTimeVendorStoreTableConfig: (payload) =>
    dispatch(getConstraintsDeleiveryLeadTimeVendorStoreTableConfig(payload)),
  getConstraintsDeleiveryLeadTimeVendorStoreTableData: (payload) =>
    dispatch(getConstraintsDeleiveryLeadTimeVendorStoreTableData(payload)),
  getConstraintsDeleiveryLeadTimeDownlaodTableData: (payload) =>
    dispatch(getConstraintsDeleiveryLeadTimeDownlaodTableData(payload)),
  setConstraintsDeleiveryLeadTimeTableConfigLoader: (payload) =>
    dispatch(setConstraintsDeleiveryLeadTimeTableConfigLoader(payload)),
  setConstraintsDeleiveryLeadTimeTableDataLoader: (payload) =>
    dispatch(setConstraintsDeleiveryLeadTimeTableDataLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  setConstraintsDeliveryLeadTimeDataVendorStore: (payload) =>
    dispatch(setConstraintsDeliveryLeadTimeDataVendorStore(payload)),
  setConstraintsSetAllSuccess: (payload) =>
    dispatch(setConstraintsSetAllSuccess(payload)),
  setFilterConfiguration: (filterConfiguration) =>
    dispatch(setFilterConfiguration(filterConfiguration)),
  resetSelectedOmsFilters: () => dispatch(resetSelectedOmsFilters()),
  setConstraintsOmsFilterDependency: (payload) =>
    dispatch(setConstraintsOmsFilterDependency(payload)),
  setConstraintsOmsLoader: (payload) =>
    dispatch(setConstraintsOmsLoader(payload)),
  getConstraintOmsFilterConfigurationVendorStore: (payload) =>
    dispatch(getConstraintOmsFilterConfigurationVendorStore(payload)),
  setConstraintsOmsFilterElements: (payload) =>
    dispatch(setConstraintsOmsFilterElements(payload)),
  setSelectedOmsFilters: (payload) => dispatch(setSelectedOmsFilters(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DeliveryLeadTimeVendorStoreTable);
