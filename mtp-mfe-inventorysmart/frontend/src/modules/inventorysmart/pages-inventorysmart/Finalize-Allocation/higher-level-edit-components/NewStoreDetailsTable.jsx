import { addSnack } from "core/actions/snackbarActions";
import { cloneDeep, isEmpty } from "lodash";
import {
  ERROR_MESSAGE,
  ORDER_BATCHING_NEW_VALUE_GREATER_THAN_OLD_VALUE_MESSAGE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { setStoreDetailsTableData, downloadMasterProductStoreSizeView } from "modules/inventorysmart/services-inventorysmart/Finalize/product-view-services";
import {
  getStoreView,
  saveShippingDates,
  saveCancelDates,
  setStoreViewLoader,
  savePriority,
  setFetchArticleSummary,
} from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import React, { useEffect, useMemo, useRef, useState, useContext } from "react";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import IA_DOWNLOAD from "coreAssets/IA_DOWNLOAD.svg";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import {
  getIgnoreAllocationCode
} from "../../Create-Allocation/helperFunctions";
import InvalidAllocation from "../components/InvalidAllocation";
import SetDatesComponent from "../components/SetDatesComponent";
import { Button, Tooltip } from "impact-ui-v3";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import {
  appendExcelDownloadData,
  fetchFilterChipsToDownload,
  prependExtraData,
} from "core/Utils/agGrid/table-functions";
import StoreSizeModal from "../components/StoreSizeModal";
import Paper from "@mui/material/Paper";
import { Typography } from "@mui/material";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import NewProductStoreSizeDetailsTable from "./NewProductStoreSizeDetails";
import { setFetchStoreDetails } from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import { setFetchProductStoreDetails } from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import { setFetchProductDetails } from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import NewProductDetailsTable from "./NewProductDetailsTable";
import {
  isActionAllowedOnSubModule,
  fetchMinPackAndEachesValue,
} from "../../inventorysmart-utility";
import { INVENTORY_SUBMODULES_NAMES } from "../../../constants-inventorysmart/stringConstants";
import {
  bulkUpdateAllocatedUnits,
  setAllocationCode,
  setOriginalAllocationCode,
  finalizeSaveEditsBasedOnSession,
} from "../../../services-inventorysmart/Finalize/store-view-services";
import { finalizeAllocationContext } from "../index";
import NewAllocatedUnitsSetAllModalComponent from "./NewAllocatedUnitsSetAllModal";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import {
  buildSaveRowEditsPayload,
  handleSaveEditsAPI,
  getAllocationUpdates
} from "../utils/editApiUtils";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

const NewStoreDetailsTableComponent = (props) => {

  const {
    selectedOption,
    sessionId,
    setSessionId,
    toggleUpdateResponse,
  } = useContext(finalizeAllocationContext);

  const [storeDetailsTableColumns, setStoreDetailsTableColumns] = useState([]);
  const [storeDetailsTableData, setStoreDetailsTableData] = useState([]);
  const originalStoreDetailsTableDataRef = useRef([]); // Store original data for comparison
  const [storeViewResposne, setStoreViewResposne] = useState({});
  const [userEdits, setUserEdits] = useState([]);
  const [buttonEnabled, setButtonEnabled] = useState(false);
  const storeDetailsTableInstance = useRef(null);
  const [
    downloadFormatChipsDependency,
    setDownloadFormatChipsDependency,
  ] = useState({});
  const [downloadMenuAnchor, setDownloadMenuAnchor] = useState(null);
  const dcOptionsInSetAll = useRef([]);
  const globalClasses = globalStyles();
  const classes = useStyles();
  const [deliveryDateInBulk, setDeliveryDateInBulk] = useState(false);
  const [modalColumns, setModalColumns] = useState([]);
  const [viewStoreDetailsTable, setViewStoreDetailsTable] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isStoreBand, setIsStoreBand] = useState([]);
  const editedDataList = useRef([]);
  const [disabledForViewOnlyAccess, setDisabledForViewOnlyAccess] = useState(
    false
  );
  const [saveButtonDisabled, setSaveButtonDisabled] = useState(true);
  const [
    enableStoreDetailsTableEditing,
    setEnableStoreDetailsTableEditing,
  ] = useState(false);
  const [minPackAndEaches, setMinPackAndEaches] = useState({
    minPack: 0,
    minEaches: 0,
  });
  const [dynamicSetAllColumns, setDynamicSetAllColumns] = useState([]);
  const dynamicSetAllColumnsRef = useRef([]);
  const [
    showStoreDetailsSetAllModal,
    setShowStoreDetailsSetAllModal,
  ] = useState(false);
  const [
    updatedStoreSummaryRowEdits,
    setUpdatedStoreSummaryRowEdits,
  ] = useState([]);
  const updatedStoreSummaryRowEditsRef = useRef([]);
  const [editValuesModalOpen, setEditValuesModalOpen] = useState(false);

  const showMasterSkuStoreDownload =
    props?.finalizeAllocationConfig?.showMasterSkuStoreDownload;

  const DELIVERY_DATES_SETALL_FIELDS = useMemo(
    () => [
      {
        label: "DCs",
        accessor: "dcs",
        field_type: "dropdown",
        options: dcOptionsInSetAll.current?.map((dcs) => {
          return {
            ...dcs,
            value: `shipping_date_${dcs?.value}`,
          };
        }),
        isMulti: true,
      },
      {
        label: storeDetailsTableColumns?.filter(
          (val) => val.column_name === "shipping_date__dc"
        )?.[0]?.label,
        accessor: "shipping_date",
        field_type: "DateTimeField",
        disablePast: true,
      },
      ...(props.showInSetAll?.includes("cancel_date")
        ? [
          {
            label: "Cancel Date",
            accessor: "cancel_date",
            field_type: "DateTimeField",
            disablePast: true,
          },
        ]
        : []),
      ...(props.showInSetAll?.includes("priority_code")
        ? [
          {
            label: "Priority Code",
            accessor: "priority_code",
            field_type: "dropdown",
            options: storeDetailsTableColumns?.filter(
              (val) => val.column_name === "priority_code_dc"
            )?.[0]?.extra?.options,
          },
        ]
        : []),
    ],
    [storeDetailsTableData, storeDetailsTableColumns]
  );
  const toggleStoreDetailsTable = (data, columnName) => {
    const selectedArticle = data?.psa_name;
    setViewStoreDetailsTable(true);
    setSelectedArticle(selectedArticle);
  };
  const actionMap = { ...props.actionMap, psa_name: toggleStoreDetailsTable };
  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        disableOnClose: true,
      },
    });
  };

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
  };

  const getStoreDetailsData = async () => {
    let columns = [],
      data = [];
    try {
      props.setStoreDetailsTableData(null);
      props.setStoreViewLoader(true);
      let l_response = await props.getStoreView(
        {
          allocation_code: props.allocationCode,
          article: props.articles || [],
          ignore_allocation_code: getIgnoreAllocationCode(
            props.originalAllocationCode,
            props.allocationCode
          ),
          plan_status: props.planStatus,
          plan_type: props.planType,
        },
        props.isV3?.includes("storeDetails")
      );
      if (l_response.data.status) {
        let l_responseData = l_response.data.data;
        setModalColumns(l_responseData);
        columns = l_responseData.table_config;
        data = l_responseData.table_data;
        data.forEach((item, index) => (item.index = index));
        props.setStoreDetailsTableData(data);
        setStoreViewResposne(l_response.data);
        dcOptionsInSetAll.current = l_responseData?.dc_dict;
      }
    } catch (e) {
      handleErrorMessage(e);
    } finally {
      props.setStoreViewLoader(false);
      let formattedColumns = agGridColumnFormatter(columns, null, actionMap);

      let l_columnsWithDisablekey = formattedColumns?.map((obj) => {
        if (obj?.extra?.disableSubHeader && obj.sub_headers?.length) {
          obj.sub_headers = obj?.sub_headers?.map((val) => {
            val.disabled = setCellsToBeDisabled;
            return val;
          });
        }
        return obj;
      });
      let isStoreBand = l_columnsWithDisablekey.some(
        (item) => item.column_name === "psa_name"
      );
      setIsStoreBand(isStoreBand);
      // fetch editable keys here and ensure they start as non-editable
      let dynamicEditableColumns = l_columnsWithDisablekey.filter(
        (item) => item.column_name === "allocated_quantity_packs_eaches"
      );
      let dynamicPacksAndEachesKeyColumns = [];
      dynamicEditableColumns.forEach((item) => {
        item?.sub_headers?.forEach((subItem) => {
          subItem?.sub_headers?.forEach((subItem2) => {
            const dcOption = dcOptionsInSetAll.current?.find(dc => replaceSpecialCharacter(dc.label) === subItem.label);
            const columnInfo = {
              column_name: subItem2.column_name,
              columnLabel: subItem.label + (subItem2.column_name.includes('packs') ? ' - Packs' : ' - Eaches'),
              dc_code: dcOption?.value || dcOption?.dc_code
            };
            dynamicPacksAndEachesKeyColumns.push(columnInfo);
            // Ensure these columns start as non-editable by default
            subItem2.is_editable = false;
            subItem2.cellRenderer = null;
          });
        });
      });
      setDynamicSetAllColumns(dynamicPacksAndEachesKeyColumns);
      dynamicSetAllColumnsRef.current = dynamicPacksAndEachesKeyColumns;
      setStoreDetailsTableColumns(l_columnsWithDisablekey);
      setStoreDetailsTableData(cloneDeep(data));
      originalStoreDetailsTableDataRef.current = cloneDeep(data); // Store original data
    }
  };

  useEffect(() => {
    if (props.allocationCode && props.fetchStoreDetails === null) {
      getStoreDetailsData();
    }
  }, [props.allocationCode, props.fetchStoreDetails]);

  // Sync refs with state changes
  useEffect(() => {
    dynamicSetAllColumnsRef.current = dynamicSetAllColumns;
  }, [dynamicSetAllColumns]);

  useEffect(() => {
    if (props.fetchStoreDetails) {
      getStoreDetailsData()
        .then(() => {
          props.setFetchStoreDetails(false);
          props.setFetchProductDetails(true);
        })
        .catch((error) => {
          props.setFetchStoreDetails(false);
          props.setFetchProductDetails(true);
        });
    }
  }, [props.fetchStoreDetails]);

  useEffect(() => {
    if (!isEmpty(updatedStoreSummaryRowEdits))
      updatedStoreSummaryRowEditsRef.current = cloneDeep(
        updatedStoreSummaryRowEdits
      );
  }, [updatedStoreSummaryRowEdits]);

  const setCellsToBeDisabled = (row, item) => {
    return row?.[item?.column_name] ? false : true;
  };

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selections = event.api.getSelectedRows();
    setButtonEnabled(selections?.length > 0);
    const minValuesMap = {};
    dcOptionsInSetAll.current?.forEach(item => {
      const minValues = fetchMinPackAndEachesValue(
        selections,
        `allocated_quantity_packs__${item.label}`,
        `allocated_quantity_eaches__${item.label}` // to see of this will be updated dynamically
      );
      minValuesMap[`min_allocated_quantity_packs__${item.label}`] = minValues.minPack;
      minValuesMap[`min_allocated_quantity_eaches__${item.label}`] = minValues.minEaches;
    })
    setMinPackAndEaches(minValuesMap);
  };


  const updateEditedRowState = (data) => {
    let cloneRefInstance = cloneDeep(updatedStoreSummaryRowEditsRef.current);
    const existingIndex = cloneRefInstance.findIndex(
      (obj) => obj.store_code === data.store_code // change the unique key here
    );
    if (existingIndex !== -1) {
      // Replace the existing object with the new object
      cloneRefInstance[existingIndex] = data;
      setUpdatedStoreSummaryRowEdits(cloneRefInstance);
    } else {
      // Push the new object to the state
      setUpdatedStoreSummaryRowEdits((prevState) => [...prevState, data]);
    }
  };

  const onBlur = (e, data, column, isChanged, value, initialValue) => {
    // Use ref to get the most current value of dynamicSetAllColumns
    const currentDynamicSetAllColumns = dynamicSetAllColumnsRef.current;
    
    if (
      currentDynamicSetAllColumns.some(col => col.column_name === column.colId) &&
      isChanged
    ) {
      let oldValue = originalStoreDetailsTableDataRef.current.find(
        (item) => item.store_code === data.store_code
      )?.[column.colId];
      
      if (value > oldValue) {
        displaySnackMessages(
          ORDER_BATCHING_NEW_VALUE_GREATER_THAN_OLD_VALUE_MESSAGE,
          "warning"
        );
        data[column.colId] = oldValue;
      } else {
        data[column.colId] = value;
        updateEditedRowState(data);
      }
      
      storeDetailsTableInstance.current?.api?.refreshCells({
        columns: [column.colId],
      });
    }
  };

  const onCellValueChanged = (params) => {
    const { data } = params;
    updateEditedRowState(data);
  };


  const EDITABLE_DATES_STORE_VIEW = {
    shipping_date_: props.saveShippingDates,
    cancel_date_: props.saveCancelDates,
    priority_code_: props.savePriority,
  };

  const editDeliveryDate = (p_bool) => {
    setDeliveryDateInBulk(p_bool);
  };

  const loadTableInstance = (params) => {
    storeDetailsTableInstance.current = params;
  };

  const prependData = () => {
    if (!isEmpty(downloadFormatChipsDependency)) {
      let prependContentReq = prependExtraData(downloadFormatChipsDependency);
      return appendExcelDownloadData(prependContentReq);
    }
  };

  useEffect(() => {
    if (props.filterDashboardConfiguration?.dependencyData?.length) {
      let filterChips = fetchFilterChipsToDownload(
        props.filterDashboardConfiguration?.dependencyData
      );
      setDownloadFormatChipsDependency(filterChips);
    }
  }, [props.filterDashboardConfiguration]);

  useEffect(() => {
    if (!isEmpty(props.inventorysmartModulesPermission)) {
      let l_roleWithCreateAccess = shoulDisable(
        props.inventorysmartModulesPermission
      );
      setDisabledForViewOnlyAccess(!l_roleWithCreateAccess);
    }
  }, [props.inventorysmartModulesPermission]);

  const shoulDisable = (p_inventorysmartModulesPermission) => {
    return isActionAllowedOnSubModule(
      p_inventorysmartModulesPermission,
      "inventorysmart_create_allocation",
      INVENTORY_SUBMODULES_NAMES.INVENTORY_FINALIZE_PRODUCT_STORE_TABLE,
      "create"
    );
  };

  const handleMasterSkuStoreDownload = async () => {
    const payload = {
      allocation_code: props.allocationCode,
      article: "",
      ignore_allocation_code: getIgnoreAllocationCode(
        props.originalAllocationCode,
        props.allocationCode
      ),
      plan_status: props.planStatus,
      plan_type: props.planType ? props?.planType : "",
    };
    try {
      const response = await props.downloadMasterProductStoreSizeView(
        payload,
        props.isV3?.includes("storeDetails")
      );
      displaySnackMessages(response?.data?.data?.message, "success");
    } catch (err) {
      displaySnackMessages(err, "error");
    }
  };

  const setStoreDetailsTableEditing = () => {
    setEnableStoreDetailsTableEditing(true);
    showEditValuesModal(true);
  };

  const disableStoreDetailsTableEditing = () => {
    setEnableStoreDetailsTableEditing(false);
    showEditValuesModal(false);
    setUpdatedStoreSummaryRowEdits([]);
    // Reset table data to original data without API call
    setStoreDetailsTableData(cloneDeep(originalStoreDetailsTableDataRef.current));
  };

  const showEditValuesModal = (showEdits) => {
    const currentDynamicSetAllColumns = dynamicSetAllColumnsRef.current;
    let newCol = storeDetailsTableColumns.map((column) => {
      if (column.sub_headers && column.sub_headers.length > 0) {
        column.sub_headers.forEach((subHeader) => {
          if (subHeader.sub_headers && subHeader.sub_headers.length > 0) {
            subHeader.sub_headers.forEach((subSubHeader) => {
              const columnExists = currentDynamicSetAllColumns.some(col => col.column_name === subSubHeader.column_name);
              if (columnExists) {
                subSubHeader.is_editable = showEdits;
                if (showEdits) {
                  subSubHeader.cellRenderer = (params, extraProps) => {
                    return params.data && params.data.hasOwnProperty(subSubHeader.column_name) ? (
                      <CellRenderers
                        cellData={params}
                        column={subSubHeader}
                        extraProps={extraProps}
                        actions={null}
                      ></CellRenderers>
                    ) : null;
                  };
                } else {
                  subSubHeader.cellRenderer = null;
                }
              }
            });
          } else {
            const columnExists = currentDynamicSetAllColumns.some(col => col.column_name === subHeader.column_name);
            if (columnExists) {
              subHeader.is_editable = showEdits;
              if (showEdits) {
                subHeader.cellRenderer = (params, extraProps) => {
                  return params.data && params.data.hasOwnProperty(subHeader.column_name) ? (
                    <CellRenderers
                      cellData={params}
                      column={subHeader}
                      extraProps={extraProps}
                      actions={null}
                    ></CellRenderers>
                  ) : null;
                };
              } else {
                subHeader.cellRenderer = null;
              }
            }
          }
        });
      }
      return column;
    });
    setStoreDetailsTableColumns(newCol);
    storeDetailsTableInstance.current?.api?.refreshCells({
      force: true,
    });
    setEditValuesModalOpen(showEdits);
  };

  const getTopRightOptions = () => {
    let options = [];
    const isEditDisabled = toggleUpdateResponse?.data?.data?.enable_edit === false;
    const hoverMessage = !isEditDisabled ? "" : toggleUpdateResponse?.data?.data?.edit_button_hover_msg || "";
    
    if (selectedOption === "edit") {
      // Show Set All button only when not in edit mode
      if (!enableStoreDetailsTableEditing) {
        options.push(
          <Tooltip title={hoverMessage} orientation="top" variant="secondary">
            <Button
              size="large"
              type="default"
              variant="tertiary"
              id="update-store-details-set-all-button"
              disabled={!buttonEnabled || isEditDisabled}
              onClick={() => setShowStoreDetailsSetAllModal(true)}
            >
              Set All
            </Button>
          </Tooltip>,
          <div className="divider-line"></div>
        );
      }
      
      // Show Cancel and Update buttons when in edit mode
      if (enableStoreDetailsTableEditing) {
        options.push(
          <Button
            size="large"
            type="default"
            variant="text"
            id="cancel-store-details-button"
            onClick={() => disableStoreDetailsTableEditing()}
          >
            Cancel
          </Button>,
          <Button
            variant="primary"
            size="large"
            type="default"
            disabled={
              disabledForViewOnlyAccess ||
              props?.planStatus === "Finalized"
            }
            onClick={() => saveStoreDetailsRowEdits()}
          >
            Update
          </Button>
        );
      } else {
        // Show Edit Values button when not in edit mode (default state)
        options.push(
          <Tooltip title={hoverMessage} orientation="top" variant="secondary">
            <Button
              size="large"
              type="default"
              variant="secondary"
              id="edit-store-summary-button"
              disabled={isEditDisabled}
              onClick={() => setStoreDetailsTableEditing()}
            >
              Edit Values
            </Button>
          </Tooltip>
        );
      }
    }
    return options;
  };

  const saveStoreDetailsRowEdits = async () => {
    if (updatedStoreSummaryRowEdits.length > 0) {
      const payload = buildSaveRowEditsPayload({
        allocationCode: props.allocationCode,
        sessionId: sessionId,
        updatedRowEdits: updatedStoreSummaryRowEdits,
        tableType: 'store',
        dcConfig: dcOptionsInSetAll.current,
        isPercentage: false,
        dc_code: '',
        dynamicSetAllColumns: dynamicSetAllColumnsRef.current,
        originalData: originalStoreDetailsTableDataRef.current
      });
      const result = await handleSaveEditsAPI({
        payload,
        apiFunction: props.finalizeSaveEditsBasedOnSession,
        setLoader: props.setStoreViewLoader,
        displaySnackMessages,
        onSuccess: () => {
          setUpdatedStoreSummaryRowEdits([]);
          disableStoreDetailsTableEditing();
          // Refresh all related data similar to NewProductStoreDetailsTable
          props.setFetchArticleSummary(true);
          props.setFetchStoreDetails(true);
          props.setFetchProductStoreDetails(true);
        },
        onError: (e) => {
          props.setStoreViewLoader(false);
        }
      });
    } else {
      displaySnackMessages("No changes to save", "error");
    }
  };

  // Use the common getAllocationUpdates function from utils
  const getStoreAllocationUpdates = (data, item) => {
    return getAllocationUpdates(data, item, 'store');
  };

  const applySetAllOnDetailsTable = async (data) => { 
    // Get selected rows and prepare them as row edits
    const selectedRows = storeDetailsTableInstance.current.api
      .getSelectedNodes()
      .map((row) => row.data);
        
    // Convert selected rows to row edits format with the set all values
    const updatedRowEdits = selectedRows.map((item) => ({
      ...item,
      // Apply the set all values to each selected row
      ...getAllocationUpdates(data, item, 'store')
    }));
    
    const payload = buildSaveRowEditsPayload({
      allocationCode: props.allocationCode,
      sessionId: sessionId,
      updatedRowEdits: updatedRowEdits,
      tableType: 'store',
      dcConfig: dcOptionsInSetAll.current,
      isPercentage: data.isPercentage || false,
      dc_code: data.dc_code,
      dynamicSetAllColumns: dynamicSetAllColumnsRef.current,
      originalData: originalStoreDetailsTableDataRef.current
    });
    
    const result = await handleSaveEditsAPI({
      payload,
      apiFunction: props.finalizeSaveEditsBasedOnSession,
      setLoader: props.setStoreViewLoader,
      displaySnackMessages,
      onSuccess: () => {
        // Clear grid selections after successful Set All operation
        storeDetailsTableInstance.current?.api?.deselectAll();
        setButtonEnabled(false);
        
        // Refresh all related data similar to NewProductStoreDetailsTable
        props.setFetchArticleSummary(true);
        props.setFetchStoreDetails(true);
        props.setFetchProductStoreDetails(true);
      },
      onError: (e) => {
        props.setStoreViewLoader(false);
      }
    });
  };

  return (
    <>
      <Loader loader={props.storeViewLoader}>
        {props.openPopup && (
          <StoreSizeModal
            columns={agGridColumnFormatter([
              ...(modalColumns?.article ? modalColumns?.article : []),
              ...modalColumns?.[props?.columnSelected],
            ])}
            storeSizeData={props?.modalRows}
            setOpenPopup={props?.setOpenPopup}
          />
        )}
        <InvalidAllocation resposne={storeViewResposne} />
        <AgGridComponent
          columns={storeDetailsTableColumns}
          rowdata={storeDetailsTableData}
          uniqueRowId={"index"}
          tableHeader={
            props.isStoreBand ? "Store Band Details" : "Store Details"
          }
          topRightOptions={getTopRightOptions()}
          customSystemButton={
            storeDetailsTableData?.length ? (
              <>
                <Tooltip title="Download" orientation="top" variant="tertiary">
                  <Button
                    id="newStoreDownloadMenuBtn"
                    variant="tertiary"
                    icon={<IA_DOWNLOAD />}
                    onClick={(e) => setDownloadMenuAnchor(e.currentTarget)}
                    sx={{
                      background: "#f5f6fa !important",
                      border: "none !important",
                    }}
                  />
                </Tooltip>
                <Menu
                  anchorEl={downloadMenuAnchor}
                  open={Boolean(downloadMenuAnchor)}
                  onClose={() => setDownloadMenuAnchor(null)}
                  PaperProps={{
                    sx: {
                      borderRadius: "12px",
                      boxShadow: "0px 4px 16px rgba(0, 0, 0, 0.08)",
                      minWidth: "200px",
                      mt: 1,
                    },
                  }}
                >
                  <MenuItem
                    onClick={() => {
                      setDownloadMenuAnchor(null);
                      storeDetailsTableInstance.current?.api?.exportDataAsExcel();
                    }}
                    sx={{
                      fontSize: "14px",
                      fontWeight: 400,
                      color: "#2b3348",
                      padding: "10px 16px",
                    }}
                  >
                    Store Download
                  </MenuItem>
                  {showMasterSkuStoreDownload && (
                    <MenuItem
                      onClick={() => {
                        setDownloadMenuAnchor(null);
                        handleMasterSkuStoreDownload();
                      }}
                      sx={{
                        fontSize: "14px",
                        fontWeight: 400,
                        color: "#2b3348",
                        padding: "10px 16px",
                      }}
                    >
                      Master SKU–Store Download
                    </MenuItem>
                  )}
                </Menu>
              </>
            ) : null
          }
          suppressFieldDotNotation
          pagination={false}
          hideSelectCurrentPageRecords
          onBlur={onBlur}
          onCellValueChanged={onCellValueChanged}
          selectAllHeaderComponent={selectedOption === "edit"}
          onSelectionChanged={onSelectionChanged}
          rowSelection="multiple"
          loadTableInstance={loadTableInstance} // to make use of available grid api's
          toPrependContent={props.excelDownloadMetaData}
          prependedContentDetails={prependData()}
          nestedTable={props.viewArticlesTable}
          nestedTableComponent={
            <NewProductDetailsTable
              actionMap={props.actionMap}
              viewStoreDetailsTable={props.viewStoreDetailsTable}
              selectedStores={props.selectedStores}
              selectedArticle={props.selectedArticle}
              setViewStoreDetailsTable={props.setViewStoreDetailsTable}
              setViewArticlesTable={props.setViewArticlesTable}
              tab={"store_view"}
              displayArticle={props.displayArticle}
              hideActionButtons={true}
              disableEditDueToParentEdit={enableStoreDetailsTableEditing}
            />
          }
          sizeColumnsToFitFlag={true}
        />
        {deliveryDateInBulk && (
          <SetDatesComponent
            setAllFields={DELIVERY_DATES_SETALL_FIELDS}
            editDeliveryDate={(p_bool) => editDeliveryDate(p_bool)}
            storeDetailsTableInstance={storeDetailsTableInstance}
            allocationCode={props.allocationCode}
            originalAllocationCode={props.originalAllocationCode}
          />
        )}
        {viewStoreDetailsTable && (
          <div className={globalClasses.marginTop}>
            <Paper className={globalClasses.paperWrapper}>
              <Typography
                style={{ flex: 1 }}
                variant="h6"
                className={globalClasses.marginBottom}
                gutterBottom
              >
                {isStoreBand
                  ? "Store Details"
                  : `${dynamicLabelsBasedOnTenant("article")} Store Details of
                ${selectedArticle}  - Net DC Available`}
              </Typography>
              <NewProductStoreSizeDetailsTable
                selectedArticle={""}
                tab={"store"}
                actionMap={actionMap}
                selectedStoreCode={selectedArticle}
              />
            </Paper>
          </div>
        )}
        <NewAllocatedUnitsSetAllModalComponent
          showSetAllModal={showStoreDetailsSetAllModal}
          closeSetAllModal={() => setShowStoreDetailsSetAllModal(false)}
          onApplySetAll={(data) => applySetAllOnDetailsTable(data)}
          minPackAndEaches={minPackAndEaches}
          dynamicSetAllColumns={dynamicSetAllColumns}
        />
      </Loader>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    storeViewLoader:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .storeViewLoader,
    allocationCode:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .allocationCode,
    planStatus:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .planStatus,
    planType:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .planType,
    originalAllocationCode:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .originalAllocationCode,
    isV3:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.isV3,
    articles:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .articles,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "viewPastAllocationFilterConfiguration"
      ]?.appliedFilterData,
    excelDownloadMetaData:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig?.excelDownloadMetaData,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    fetchStoreDetails:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .fetchStoreDetails,
    finalizeAllocationConfig:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartFinalizeAllocationConfig,
    inventorysmartModulesPermission:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartModulesPermission,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setStoreViewLoader: (payload) => dispatch(setStoreViewLoader(payload)),
  getStoreView: (payload, isV3) => dispatch(getStoreView(payload, isV3)),
  saveShippingDates: (payload) => dispatch(saveShippingDates(payload)),
  saveCancelDates: (payload) => dispatch(saveCancelDates(payload)),
  savePriority: (payload) => dispatch(savePriority(payload)),
  setStoreDetailsTableData: (payload) =>
    dispatch(setStoreDetailsTableData(payload)),
  setFetchStoreDetails: (payload) => dispatch(setFetchStoreDetails(payload)),
  setFetchProductStoreDetails: (payload) =>
    dispatch(setFetchProductStoreDetails(payload)),
  setFetchProductDetails: (payload) =>
    dispatch(setFetchProductDetails(payload)),
  bulkUpdateAllocatedUnits: (payload, isV3) =>
    dispatch(bulkUpdateAllocatedUnits(payload, isV3)),
  setAllocationCode: (payload) => dispatch(setAllocationCode(payload)),
  setOriginalAllocationCode: (payload) =>
    dispatch(setOriginalAllocationCode(payload)),
  addSnack: (snack) => dispatch(addSnack(snack)),
  finalizeSaveEditsBasedOnSession: (payload) =>
    dispatch(finalizeSaveEditsBasedOnSession(payload)),
  setFetchArticleSummary: (payload) =>
      dispatch(setFetchArticleSummary(payload)),
  downloadMasterProductStoreSizeView: (payload, isV3) =>
    dispatch(downloadMasterProductStoreSizeView(payload, isV3)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NewStoreDetailsTableComponent);
