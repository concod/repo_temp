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
  UPDATED_MESSAGE,
  tableConfigurationMetaData,
  MIN_MAX_VALIDATION,
  INVALID_ORDER_MULTIPLE,
  INVALID_MIN_QTY,
  MAX_MIN_VALIDATION,
  INVALID_VALUE_MESSAGE,
  OMS_CONSTRAINTS_SCREENNAME_KEY,
} from "modules/oms/constants-oms/stringConstants";
import {
  getVendorConstraintsTableConfig,
  setVendorConstraintsTableConfigLoader,
  setVendorConstraintsTableDataLoader,
  getVendorConstraintsTableData,
  setRulesConstraintsData,
  setOMSSelectedRulesList,
} from "modules/oms/services-oms/Constraints/constraints-services";
import { isEmpty, isNumber, isUndefined } from "lodash";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { getHeaderForExcel } from "core/Utils/functions/utils";
import { cloneDeep } from "lodash";
import VendorConstraintsSetAllPopUp from "./vendorConstraintsSetAllPopUp";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import { getValidCheckConfiguration } from "../utils";
import { Button, Tooltip, Alert } from "impact-ui-v3";
import PackConfigBottomSheet from "modules/oms/pages-oms/common/PackConfigBottomSheet";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { extractPackValues } from "./utils";
import { scrollIntoView } from "modules/oms/utils-oms/oms-utility";
import { getVendorConstraintsStylePackIdMapping } from "modules/oms/services-oms/Constraints/constraints-services";
import { deleteOrderingRules } from "modules/oms/services-oms/Constraints/constraints-services";

const VendorConstraintsTable = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [constraintsTableColumns, setConstraintsTableColumns] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [render, setRender] = useState(false);
  const [buttonEnabled, setButtonEnabled] = useState(false);
  const [ishide, setIsHide] = useState(true);
  const [openPopUp, setOpenPopUp] = useState(false);
  const [checkAllSetAllRequest, setCheckAllSetAllRequest] = useState([]);
  const [viewableListColumns, setViewableListColumns] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [manualBodyData, setManualBodyData] = useState({});
  const [selectedSetAllRows, setSelectedSetAllRows] = useState([]);
  const [isUserHasViewOnlyAccess, setIsUserHasViewOnlyAccess] = useState(null);
  const [isUserHasSetAllAccess, setIsUserHasSetAllAccess] = useState(true);
  const [isUserHasEditAccess, setIsUserHasEditAccess] = useState(true);
  const [isUserHasDeleteAccess, setIsUserHasDeleteAccess] = useState(true);

  //Pack Order Details
  const [openPackConfigDetailSheet, setOpenPackConfigDetailSheet] = useState(
    false
  );
  const [
    packConfigDetailsPayloadData,
    setPackConfigDetailsPayloadData,
  ] = useState([]);
  const [activeChildHierarchyKey, setActiveChildHierarchyKey] = useState(null);
  const [isPackOrderIdsFetched, setIsPackOrderIdsFetched] = useState(false);
  const [packOrderIdOptions, setPackOrderIdOptions] = useState([]);
  const [loader, setLoader] = useState(false);
  const [alertVariant, setAlertVariant] = useState("info");
  const [alertMessage, setAlertMessage] = useState(null);
  const PACK_ID_STYLE_KEY =
    props?.screenConfig?.unique_pack_order_key || "article";

  const VIEW_PACK_CONFIG_DETAILS_KEY =
    props?.screenConfig?.view_pack_config_details_key || "pack_exist";

  const allocationRef = useRef();
  const omsRulesConstraintsTableGridInstance = useRef(null);
  var rulesConstraintsEditPayload = useRef([]);
  const filterDependencies = useRef({});

  const RULES_CONSTRAINTS_ROW_ID =
    props?.screenConfig?.unique_key || "rule_code";

  const SIZE_RELATED_RESTRICTED_LOA =
    props?.screenConfig?.size_related_restricted_loa || "sum_all";

  const IS_PARTIAL_SAVE_ENABLED =
    props?.screenConfig?.is_partial_save_enabled || false;

  const SETALL_MAPPING = props?.screenConfig?.setall_mapping || {};

  const DISABLE_DELETE_RULE_BUTTON =
    props?.screenConfig?.disable_delete_rule_button || false;

  const SETALL_FORMDATA_FIELDS =
    props?.screenConfig?.setall_formdata_fields || [];

  const THRESHOLD_MIN_VALUE =
    props?.screenConfig?.setall_formdata_fields?.filter(
      (data) => data.accessor === "moq_tolerance"
    )?.min_value || 0;
  const THRESHOLD_MAX_VALUE =
    props?.screenConfig?.setall_formdata_fields?.filter(
      (data) => data.accessor === "moq_tolerance"
    )?.max_value || 100;

  const MINIMUM_QTY_MIN_VALUE =
    props?.screenConfig?.setall_formdata_fields?.filter(
      (data) => data.accessor === "min_replenishment_quantity"
    )?.min_value || 0;

  const ORDER_MULTIPLE_MIN_VALUE =
    props?.screenConfig?.setall_formdata_fields?.filter(
      (data) => data.accessor === "order_multiple"
    )?.min_value || 1;

  // User access control vendor constraints set all , edit , delete , multi select rows
  const constraintsAccess = props.userAccess?.find(
    (item) =>
      item.module === "vendor_constraints" &&
      item.screen === OMS_CONSTRAINTS_SCREENNAME_KEY
  );
  const canEdit = constraintsAccess?.isEditButton || false;
  const canSetAll = constraintsAccess?.isSetAllButton || false;
  const canDelete = constraintsAccess?.isDeleteButton || false;

  const checkForEditability = (columns) => {
    try {
      // If userAccess exists, use canEdit flag; otherwise fall back to isUserHasViewOnlyAccess
      const shouldDisableEdit = !isEmpty(props?.userAccess)
        ? !canEdit
        : isUserHasViewOnlyAccess;

      if (shouldDisableEdit) {
        columns.map((col) => {
          col.is_editable = false;
        });
      }
      return columns;
    } catch (error) {
      console.log("Error in checkForEditability", error);
    }
  };

  // Helper function to check pack_selection value
  const getPackSelectionValue = (packSelection) => {
    try {
      // Handle null or undefined
      if (!packSelection) {
        return "not_manual"; // Any non-manual value disables order_multiple
      }

      // Handle string values
      if (
        typeof packSelection === "string" ||
        typeof packSelection?.value === "string"
      ) {
        return packSelection?.value || packSelection; // Will be "manual" or something else
      }

      // Handle array values
      if (Array.isArray(packSelection)) {
        // If it's an array of objects (processed pack selection), check the first object's value
        if (
          packSelection.length > 0 &&
          typeof packSelection[0] === "object" &&
          packSelection[0].value
        ) {
          return packSelection[0].value;
        }
        // If it's an array of strings, return the first string
        if (packSelection.length > 0 && typeof packSelection[0] === "string") {
          return packSelection[0];
        }
        // If array has length > 0, it means pack IDs are selected (not manual)
        return packSelection.length > 0 ? "not_manual" : "manual";
      }

      return "not_manual"; // Any other type is considered not manual
    } catch (error) {
      console.log("Error in getPackSelectionValue", error);
      return "not_manual"; // Error case defaults to not manual
    }
  };

  const getCellRenderer = (columns) => {
    try {
      let updatedColumns = cloneDeep(columns);
      updatedColumns = updatedColumns.map((col) => {
        if (col.column_name === "pack_selection") {
          col.cellRenderer = (params) => {
            //Update the options for the pack selection dropdown
            const packOptions =
              packOrderIdOptions?.filter(
                (data) => data.style === params?.data?.[PACK_ID_STYLE_KEY]
              )?.[0]?.packs || [];

            let initialOptionsForCell = col.extra.options;

            if (packOptions.length > 0) {
              const updatedOptions = [...col.extra.options];
              updatedOptions[1] = {
                ...updatedOptions[1],
                children: [...packOptions],
              };
              initialOptionsForCell = cloneDeep(updatedOptions);
            }

            //Disable the cell if the user has view only access
            if (isUserHasViewOnlyAccess) {
              col.is_disabled = true;
              col.disabled = true;
            }
            //Disable the cell if the pack selection is on Style Level
            let disableEditSelection = false;
            console.log(
              "params?.data?.is_rule_style_level",
              params?.data?.is_rule_style_level,
              props?.isPackOrderingEnabled,
              !params?.data?.is_rule_style_level && props?.isPackOrderingEnabled
            );
            if (
              !params?.data?.is_rule_style_level &&
              props?.isPackOrderingEnabled
            ) {
              disableEditSelection = true;
            }
            if (params?.data?.is_default) {
              disableEditSelection = true;
            }

            return (
              <CellRenderers
                cellData={params}
                column={col}
                extraProps={null}
                options={initialOptionsForCell}
                isPropsOverrideColumnDef={true}
                isDisabled={disableEditSelection}
                value={[]}
              ></CellRenderers>
            );
          };
        }

        // Add conditional editability for order_multiple based on pack_selection
        if (col.column_name === "order_multiple") {
          col.cellRenderer = (params) => {
            // Get the actual pack_selection value using helper function
            const packSelectionValue = getPackSelectionValue(
              params?.data?.pack_selection
            );
            console.log(
              "pack_selection",
              params?.data?.pack_selection,
              "resolved value:",
              packSelectionValue
            );

            // Enable only when pack_selection is "manual", disable for "select_pack_ids" or any other value
            const isPackSelectionManual = packSelectionValue === "manual";

            // Disable if user has view only access or pack_selection is not "manual"
            const isDisabled = !isPackSelectionManual;

            console.log(
              "pack_selection",
              params?.data?.pack_selection,
              "resolved value:",
              packSelectionValue
            );

            if (isDisabled) {
              col.is_disabled = true;
              col.disabled = true;
              col.is_editable = false;
            } else {
              col.is_disabled = false;
              col.disabled = false;
              col.is_editable = true;
            }

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

        if (col.column_name === "pack_config_details") {
          col.cellRenderer = (params) => {
            //Disable the cell if the pack selection is on Style Level
            let disableEditSelection = false;
            if (
              !params?.data?.is_rule_style_level &&
              props?.isPackOrderingEnabled
            ) {
              disableEditSelection = true;
            }
            return (
              <CellRenderers
                cellData={params}
                column={col}
                extraProps={null}
                isPropsOverrideColumnDef={true}
                isDisabled={disableEditSelection}
              ></CellRenderers>
            );
          };
        }
        return col;
      });
      return updatedColumns;
    } catch (error) {
      console.log("Error in getCellRenderer", error);
    }
  };

  useEffect(() => {
    if (!isEmpty(props?.userAccess)) {
      // Use new userAccess flags
      setIsUserHasEditAccess(canEdit);
      setIsUserHasSetAllAccess(canSetAll);
      setIsUserHasDeleteAccess(canDelete);
      setIsUserHasViewOnlyAccess(!canEdit);
    } else if (props?.orderingAccessControl) {
      // Fall back to old access control
      setIsUserHasViewOnlyAccess(
        !props?.orderingAccessControl?.isEditButton?.isVisible
      );
      setIsUserHasEditAccess(true);
      setIsUserHasSetAllAccess(true);
      setIsUserHasDeleteAccess(true);
    }
  }, [
    props?.userAccess,
    props?.orderingAccessControl,
    canEdit,
    canSetAll,
    canDelete,
  ]);

  const onClickColumn = async (data) => {
    try {
      setPackConfigDetailsPayloadData(data);
      setActiveChildHierarchyKey(data?.[PACK_ID_STYLE_KEY]);
      setOpenPackConfigDetailSheet(true);
    } catch (error) {
      console.log("Error in onClickColumn", error);
    }
  };

  useEffect(() => {
    const fetchPackOrderIdDetails = async () => {
      try {
        if (props?.isPackOrderingEnabled) {
          setLoader(true);
          let response = await props.getVendorConstraintsStylePackIdMapping({
            filters: [...props.selectedOmsFilters],
          });
          let stylePackIdMapping = cloneDeep(response?.data?.data);
          setPackOrderIdOptions(stylePackIdMapping);
          setIsPackOrderIdsFetched(true);
          setLoader(false);
        } else {
          setIsPackOrderIdsFetched(true);
        }
      } catch (error) {
        console.log("Error in fetching Pack Order Details", error);
      }
    };
    if (props?.selectedOmsFilters && props?.selectedOmsFilters?.length > 0) {
      fetchPackOrderIdDetails();
    }
  }, [props?.selectedOmsFilters]);

  useEffect(() => {
    const fetchColumnConfig = async () => {
      try {
        setIsHide(true);
        props.setVendorConstraintsTableConfigLoader(true);
        let columns = await props.getVendorConstraintsTableConfig({});
        let updatedCols = checkForEditability(columns?.data?.data);

        let listTypeCols = [];
        updatedCols.forEach((col) => {
          if (col.type === "list" && !col.is_editable) {
            const options = col?.extra?.options?.reduce((acc, item) => {
              acc[item.value] = item.label;
              return acc;
            }, {});
            listTypeCols.push({
              column_name: col?.column_name,
              options: options,
            });
          } else if (col?.column_name === "moq_tolerance") {
            col.extra = { ...col.extra, multiplier: 1 };
          }
          col.onClick = (tableInfo) => {
            onClickColumn(tableInfo?.cellData?.data || {});
          };
        });
        setViewableListColumns(listTypeCols);
        const formattedCols = agGridColumnFormatter(
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
        props.setVendorConstraintsTableConfigLoader(false);
        setConstraintsTableColumns(formattedColumns);
        setCsvHeaders(getHeaderForExcel(cloneDeep(formattedColumns)));
        setRender(true);
        scrollIntoView(allocationRef);
      } catch (error) {
        console.log("Error in fetchColumnConfig", error);
      }
    };
    if (
      props.selectedOmsFilters &&
      props.selectedOmsFilters.length > 0 &&
      isUserHasViewOnlyAccess !== null &&
      isPackOrderIdsFetched
    ) {
      fetchColumnConfig();
    }
  }, [
    props?.selectedOmsFilters,
    isUserHasViewOnlyAccess,
    isPackOrderIdsFetched,
  ]);

  useEffect(() => {
    !isEmpty(props.selectedOmsFilters) && setRender(false);
  }, [props.selectedOmsFilters]);

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setVendorConstraintsTableDataLoader(true);

      //For List Component in AG Grid
      let searchParameters = manualbody.search;
      if (searchParameters.length > 0) {
        searchParameters.forEach((item) => {
          if (item.type === "list") {
            item.type = "str";
          }
        });
      }

      const selection = {
        data: getValidCheckConfiguration(
          omsRulesConstraintsTableGridInstance?.current?.api?.checkConfiguration
        ),
        unique_columns: [RULES_CONSTRAINTS_ROW_ID],
      };
      let body = {
        filters: [...props.selectedOmsFilters],
        meta: manualbody
          ? {
              ...manualbody,
              sort: [
                manualbody?.sort.length > 0
                  ? manualbody.sort[0]
                  : { column: "is_default", order: "desc" },
              ],
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
      let response = await props.getVendorConstraintsTableData(body);
      if (response.data.status) {
        const dataResponse = cloneDeep(response.data.data);

        let numberTypeColumns = [];
        SETALL_FORMDATA_FIELDS.map((field) => {
          if (
            field.value_type === "number" ||
            field.value_type === "percentage"
          ) {
            numberTypeColumns.push(field.accessor);
          }
        });
        dataResponse.forEach((row) => {
          numberTypeColumns.forEach((key) => {
            if (row?.[key] === null) {
              row[key] = 0;
            }
          });
        });

        // For List Component in AG Grid which is not editable
        if (viewableListColumns.length > 0) {
          dataResponse.forEach((row) => {
            viewableListColumns.forEach((col) => {
              if (row?.[col?.column_name]) {
                const columnName = col.column_name;
                const columnValue = row[columnName];
                row[columnName] = col?.options?.[columnValue] || columnValue;
              }
            });
          });
        }

        if (props?.isPackOrderingEnabled) {
          dataResponse.forEach((row) => {
            const packSelectionColumnOptions = constraintsTableColumns.filter(
              (col) => col.column_name === "pack_selection"
            )[0]?.extra?.options;

            //Set the pack config details and pack selection
            if (row?.[VIEW_PACK_CONFIG_DETAILS_KEY]) {
              row.pack_config_details = "View Pack Details";
              row.is_rule_style_level = true;
            } else {
              if (row?.pack_selection === null) {
                row.is_rule_style_level = false;
              }
            }

            //Set the default pack selection if it is null or not present
            if (
              row?.pack_selection === null ||
              !row.hasOwnProperty("pack_selection")
            ) {
              const packSelectionDefaultOption =
                packSelectionColumnOptions[0]?.value;
              row.pack_selection = packSelectionDefaultOption || "Manual";
            }

            //Set the pack selection label when pack ids are selected
            if (
              row?.pack_selection?.length &&
              row.pack_selection !== "manual"
            ) {
              const selectedPackIds = row.pack_selection;

              const selectedStylePackIdMapping =
                packOrderIdOptions?.filter(
                  (data) => data.style === row?.[PACK_ID_STYLE_KEY]
                )?.[0]?.packs || [];

              const selectedPackIdOptions =
                selectedStylePackIdMapping?.filter((item) =>
                  selectedPackIds.includes(item.value)
                ) || [];
              row.pack_selection = [
                {
                  ...packSelectionColumnOptions[1],
                  children: selectedPackIdOptions,
                },
              ];
            }
          });
        }

        let formatedData = agGridRowFormatter(
          dataResponse,
          getValidCheckConfiguration(params?.api?.checkConfiguration),
          RULES_CONSTRAINTS_ROW_ID
        );
        setTotalCount(response.data.total);

        props.setVendorConstraintsTableDataLoader(false);
        return { data: formatedData, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setVendorConstraintsTableDataLoader(false);
        return defaultTableData;
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setVendorConstraintsTableDataLoader(false);
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
    omsRulesConstraintsTableGridInstance.current = params;
  };

  const displaySnackMessages = (message, variance) => {
    props.closeSnack();
    setTimeout(() => {
      props.addSnack({
        message: message,
        options: {
          variant: variance,
          autoHideDuration: 8000, // 8 seconds
          key: `vendor-constraints-${Date.now()}`, // Unique key to prevent duplicates
        },
      });
    }, 100);
  };

  const onSelectionChanged = (event) => {
    let selectedRows = [];
    omsRulesConstraintsTableGridInstance.current.api.forEachNode((node) => {
      node.selected && selectedRows.push({ ...node.data });
    });
    setSelectedSetAllRows(selectedRows);
    let l_selections = event.api.getSelectedRows().length;
    let l_buttonEnabled =
      omsRulesConstraintsTableGridInstance.current.api.buttonEnabled;
    if (l_selections) {
      !l_buttonEnabled && setButtonEnabled(true);
    } else {
      l_buttonEnabled && setButtonEnabled(false);
    }
    props?.setOMSSelectedRulesList(selectedRows);
  };

  useEffect(() => {
    if (omsRulesConstraintsTableGridInstance?.current) {
      omsRulesConstraintsTableGridInstance.current.api.checkAllSetAllRequest = checkAllSetAllRequest;
      omsRulesConstraintsTableGridInstance.current.api.buttonEnabled = buttonEnabled;
    }
  }, [checkAllSetAllRequest, buttonEnabled]);

  const createPayloadItem = (data) => {
    let payloadObject = {};
    payloadObject[RULES_CONSTRAINTS_ROW_ID] = data?.[RULES_CONSTRAINTS_ROW_ID];
    for (let rowKey in data) {
      if (
        data.hasOwnProperty(rowKey) &&
        Object.keys(SETALL_MAPPING).includes(rowKey)
      ) {
        payloadObject[rowKey] = data[rowKey];
      }
    }
    return payloadObject;
  };

  const validateUserInputThreshold = (data) => {
    let validatedUserInputThreshold = data.moq_tolerance || 0;
    if (data.moq_tolerance < THRESHOLD_MIN_VALUE) {
      validatedUserInputThreshold = THRESHOLD_MIN_VALUE;
    }
    if (data.moq_tolerance > THRESHOLD_MAX_VALUE) {
      validatedUserInputThreshold = THRESHOLD_MAX_VALUE;
    }
    if (Math.round(data.moq_tolerance) !== data.moq_tolerance) {
      validatedUserInputThreshold = Math.round(data.moq_tolerance);
    }
    return validatedUserInputThreshold;
  };

  const onCellValueChanged = (event) => {
    if (event?.colDef?.column_name === "pack_selection") {
      let isEditedBefore = false;
      rulesConstraintsEditPayload.current.filter((code) => {
        if (
          code[RULES_CONSTRAINTS_ROW_ID] ===
          event?.data?.[RULES_CONSTRAINTS_ROW_ID]
        ) {
          code.pack_selection = event?.newValue;
          isEditedBefore = true;
        }
      });
      if (!isEditedBefore) {
        rulesConstraintsEditPayload.current.push(
          createPayloadItem(event?.data)
        );
      }
      // Update the data in the row to reflect the new pack_selection value
      event.data.pack_selection = event?.newValue;

      // Refresh order_multiple column when pack_selection changes
      if (omsRulesConstraintsTableGridInstance?.current?.api) {
        // Refresh the specific row that changed
        omsRulesConstraintsTableGridInstance.current.api.forEachNode((node) => {
          if (
            node.data[RULES_CONSTRAINTS_ROW_ID] ===
            event?.data?.[RULES_CONSTRAINTS_ROW_ID]
          ) {
            omsRulesConstraintsTableGridInstance.current.api.refreshCells({
              force: true,
              suppressFlash: false,
              rowNodes: [node],
              columns: ["order_multiple"],
            });
          }
        });
      }
    }
  };

  const onBlur = (_e, data, column, isChanged) => {
    setIsHide(false);

    if (column.colId === "moq_tolerance") {
      let isEditedBefore = false;
      rulesConstraintsEditPayload.current.filter((code) => {
        if (code[RULES_CONSTRAINTS_ROW_ID] === data[RULES_CONSTRAINTS_ROW_ID]) {
          let validatedServiceLevel = validateUserInputThreshold(data);

          omsRulesConstraintsTableGridInstance.current.api.forEachNode(
            (node) => {
              if (
                node.data[RULES_CONSTRAINTS_ROW_ID] ===
                data?.[RULES_CONSTRAINTS_ROW_ID]
              ) {
                if (node.data.moq_tolerance !== validatedServiceLevel) {
                  node.data.moq_tolerance = validatedServiceLevel;
                }
              }
              omsRulesConstraintsTableGridInstance.current.api.refreshCells({
                force: true,
                suppressFlash: false,
                rowNodes: [node],
                columns: [column.colId],
              });
            }
          );
          code.moq_tolerance = validatedServiceLevel;
          isEditedBefore = true;
        }
      });
      if (!isEditedBefore) {
        let validatedServiceLevel = validateUserInputThreshold(data);

        omsRulesConstraintsTableGridInstance.current.api.forEachNode((node) => {
          if (
            node.data[RULES_CONSTRAINTS_ROW_ID] ===
            data?.[RULES_CONSTRAINTS_ROW_ID]
          ) {
            node.data.moq_tolerance = validatedServiceLevel;
          }
          omsRulesConstraintsTableGridInstance.current.api.refreshCells({
            force: true,
            suppressFlash: false,
            rowNodes: [node],
            columns: [column.colId],
          });
        });

        if (isChanged) {
          rulesConstraintsEditPayload.current.push(createPayloadItem(data));
        }
      }
    } else if (column.colId === "order_multiple") {
      let isEditedBefore = false;
      rulesConstraintsEditPayload.current.filter((code) => {
        if (code[RULES_CONSTRAINTS_ROW_ID] === data[RULES_CONSTRAINTS_ROW_ID]) {
          let validatedOrderMultiple = data.order_multiple;
          if (!validatedOrderMultiple) {
            validatedOrderMultiple = ORDER_MULTIPLE_MIN_VALUE;
            displaySnackMessages(INVALID_ORDER_MULTIPLE, "info");
          }
          omsRulesConstraintsTableGridInstance.current.api.forEachNode(
            (node) => {
              if (
                node.data[RULES_CONSTRAINTS_ROW_ID] ===
                data?.[RULES_CONSTRAINTS_ROW_ID]
              ) {
                if (node.data.order_multiple !== validatedOrderMultiple) {
                  node.data.order_multiple = validatedOrderMultiple;
                }
              }
              omsRulesConstraintsTableGridInstance.current.api.refreshCells({
                force: true,
                suppressFlash: false,
                rowNodes: [node],
                columns: [column.colId],
              });
            }
          );

          code.order_multiple = validatedOrderMultiple;
          isEditedBefore = true;
        }
      });
      if (!isEditedBefore) {
        let validatedOrderMultiple = data.order_multiple;
        if (!validatedOrderMultiple) {
          validatedOrderMultiple = ORDER_MULTIPLE_MIN_VALUE;
          displaySnackMessages(INVALID_ORDER_MULTIPLE, "info");
        }

        omsRulesConstraintsTableGridInstance.current.api.forEachNode((node) => {
          if (
            node.data[RULES_CONSTRAINTS_ROW_ID] ===
            data?.[RULES_CONSTRAINTS_ROW_ID]
          ) {
            node.data.order_multiple = validatedOrderMultiple;
          }
          omsRulesConstraintsTableGridInstance.current.api.refreshCells({
            force: true,
            suppressFlash: false,
            rowNodes: [node],
            columns: [column.colId],
          });
        });

        if (isChanged) {
          rulesConstraintsEditPayload.current.push(createPayloadItem(data));
        }
      }
    } else {
      let isInputValueValid = true;
      let validatedInputValue;
      if (
        column.colId === "min_replenishment_quantity" ||
        column.colId === "max_replenishment_quantity"
      ) {
        if (
          data?.max_replenishment_quantity <=
            data?.min_replenishment_quantity ||
          data?.min_replenishment_quantity < MINIMUM_QTY_MIN_VALUE
        ) {
          isInputValueValid = false;
          omsRulesConstraintsTableGridInstance.current.api.forEachNode(
            (node) => {
              if (
                node.data[RULES_CONSTRAINTS_ROW_ID] ===
                data?.[RULES_CONSTRAINTS_ROW_ID]
              ) {
                if (column.colId === "max_replenishment_quantity") {
                  node.data.max_replenishment_quantity =
                    data?.min_replenishment_quantity;
                  validatedInputValue = data?.min_replenishment_quantity;
                  displaySnackMessages(MAX_MIN_VALIDATION, "info");
                } else {
                  if (
                    data?.min_replenishment_quantity < MINIMUM_QTY_MIN_VALUE
                  ) {
                    displaySnackMessages(INVALID_MIN_QTY, "info");
                  } else {
                    displaySnackMessages(MIN_MAX_VALIDATION, "info");
                  }
                  node.data.min_replenishment_quantity =
                    data?.max_replenishment_quantity;
                  validatedInputValue = data?.max_replenishment_quantity;
                }
              }
            }
          );

          omsRulesConstraintsTableGridInstance.current.api.refreshCells({
            force: true,
            suppressFlash: false,
            columns: [column.colId],
          });
        }
        if (data?.min_replenishment_quantity < MINIMUM_QTY_MIN_VALUE) {
          isInputValueValid = false;
          omsRulesConstraintsTableGridInstance.current.api.forEachNode(
            (node) => {
              if (
                node.data[RULES_CONSTRAINTS_ROW_ID] ===
                data?.[RULES_CONSTRAINTS_ROW_ID]
              ) {
                node.data.min_replenishment_quantity =
                  data?.max_replenishment_quantity - 1;
                validatedInputValue = data?.max_replenishment_quantity - 1;
              }
            }
          );

          omsRulesConstraintsTableGridInstance.current.api.refreshCells({
            force: true,
            suppressFlash: false,
            columns: [column.colId],
          });
        }
      }
      let isEditedBefore = false;
      rulesConstraintsEditPayload.current.filter((node) => {
        if (node[RULES_CONSTRAINTS_ROW_ID] === data[RULES_CONSTRAINTS_ROW_ID]) {
          if (isInputValueValid) {
            node[column.colId] = data?.[column.colId];
          } else {
            node[column.colId] = validatedInputValue;
          }
          isEditedBefore = true;
        }
      });
      if (!isEditedBefore && (isChanged || column.colDef.type === "list")) {
        rulesConstraintsEditPayload.current.push(createPayloadItem(data));
      }
    }
  };

  const openSetAllPopUp = () => {
    setOpenPopUp(true);
  };

  const updateEdit = async () => {
    // For each edited row, a save api needs to be called.
    if (rulesConstraintsEditPayload.current?.length !== 0) {
      let isPayloadValid = true;
      let rulesUpdated = [];

      let numberTypeColumns = [];
      SETALL_FORMDATA_FIELDS.map((field) => {
        if (
          field.value_type === "number" ||
          field.value_type === "percentage"
        ) {
          numberTypeColumns.push(field.accessor);
        }
      });
      const constraints = rulesConstraintsEditPayload?.current?.map((rule) => {
        let row_update = {};
        row_update[RULES_CONSTRAINTS_ROW_ID] = rule?.[RULES_CONSTRAINTS_ROW_ID];

        let constraint = Object.keys(rule)
          .filter((key) => key !== RULES_CONSTRAINTS_ROW_ID)
          .map((key) => {
            if (numberTypeColumns.includes(key)) {
              if (!isNumber(rule[key])) {
                isPayloadValid = false;
              } else {
                return {
                  attribute_name: key,
                  attribute_value: Math.round(rule[key]),
                };
              }
            }

            if (key === "pack_selection") {
              let packSelectionValue = extractPackValues(rule[key]);
              if (Array.isArray(packSelectionValue)) {
                if (packSelectionValue.length) {
                  packSelectionValue = JSON.stringify(packSelectionValue);
                } else {
                  isPayloadValid = false;
                }
              }
              return {
                attribute_name: key,
                attribute_value: packSelectionValue,
              };
            }

            return { attribute_name: key, attribute_value: rule[key] };
          });

        let payload = {
          constraint: [constraint],
          row_update: [row_update],
          filters: [...props.appliedFilterDependencyData],
          meta: {
            ...tableConfigurationMetaData.meta,
            limit: {
              limit: 10,
              page: 1,
            },
          },
        };
        rulesUpdated.push(payload);
      });

      if (!isPayloadValid) {
        // displaySnackMessages(INVALID_VALUE_MESSAGE, "error");
        setAlertVariant("error");
        setAlertMessage(INVALID_VALUE_MESSAGE);
        setTimeout(() => setAlertMessage(null), 5000);
        return;
      }

      const promises = rulesUpdated.map(
        async (editedRule) => await props.setRulesConstraintsData(editedRule)
      );

      Promise.all(promises)
        .then(async (responses) => {
          let responseStatus = responses.map((response) => {
            return response?.status;
          });
          if (responseStatus.includes(false)) {
            // displaySnackMessages(ERROR_MESSAGE, "error");
            setAlertVariant("error");
            setAlertMessage(ERROR_MESSAGE);
            setTimeout(() => setAlertMessage(null), 5000);
          } else {
            // displaySnackMessages(UPDATED_MESSAGE, "success");
            setAlertVariant("success");
            setAlertMessage(UPDATED_MESSAGE);
            omsRulesConstraintsTableGridInstance.current.api.refreshCells({
              force: true,
              suppressFlash: false,
            });
            setTimeout(() => setAlertMessage(null), 5000);
          }
          rulesConstraintsEditPayload.current = [];
          setIsHide(true);
        })
        .catch((error) => {
          // displaySnackMessages(ERROR_MESSAGE, "error");
          setAlertVariant("error");
          setAlertMessage(ERROR_MESSAGE);
          setTimeout(() => setAlertMessage(null), 5000);
        });
    } else {
      // displaySnackMessages("No edit data", "error");
      setAlertVariant("error");
      setAlertMessage("No edit data");
      setTimeout(() => setAlertMessage(null), 5000);
    }
  };

  const updateSetAllData = async (payload) => {
    try {
      const isAllRowsSelected =
        omsRulesConstraintsTableGridInstance?.current?.api?.isSelectAllRecords;

      let rulesUpdated = [];
      if (!isAllRowsSelected) {
        rulesUpdated = selectedSetAllRows.map((row) => {
          return {
            rule_code: row[RULES_CONSTRAINTS_ROW_ID],
          };
        });
      }

      //Validation for size related rules
      if (payload["level_of_application"] === SIZE_RELATED_RESTRICTED_LOA) {
        let isSizeRelated = false;
        selectedSetAllRows.forEach((row) => {
          if (row?.is_rule_size_related) {
            isSizeRelated = true;
          }
        });
        if (isSizeRelated) {
          displaySnackMessages(
            "Save failed due to validation on level of application.",
            "error"
          );
          return;
        }
      }

      const constraints = Object.keys(payload)
        .filter((key) => key !== RULES_CONSTRAINTS_ROW_ID)
        .map((key) => {
          return {
            attribute_name: key,
            attribute_value: payload[key],
          };
        });

      const selection = {
        data: getValidCheckConfiguration(
          omsRulesConstraintsTableGridInstance?.current?.api?.checkConfiguration
        ),
        unique_columns: [RULES_CONSTRAINTS_ROW_ID],
      };
      let body = {
        constraint: [constraints],
        row_update: rulesUpdated,
        filters: [...props.appliedFilterDependencyData],
        selection,
        isSelectAllRecords: isAllRowsSelected,
        meta: tableConfigurationMetaData.meta,
      };
      let response = await props.setRulesConstraintsData(body);
      if (response.data.status) {
        displaySnackMessages(UPDATED_MESSAGE, "success");
        omsRulesConstraintsTableGridInstance?.current?.api?.deselectAll(true);
        omsRulesConstraintsTableGridInstance?.current?.api?.setCheckConfiguration(
          []
        );
        omsRulesConstraintsTableGridInstance?.current?.api?.refreshServerSideStore(
          {
            purge: true,
          }
        );
      }
    } catch (error) {
      const errorString = error?.response?.data?.message?.split("ERROR:");
      if (errorString?.length > 1) {
        const errorMessage = errorString[1].split("\n")[0].trim();
        if (errorMessage) {
          displaySnackMessages(errorMessage, "error");
          return;
        }
      }
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  useEffect(() => {
    if (!isEmpty(props.selectedDependencyValue)) {
      filterDependencies.current = props.selectedDependencyValue;
      omsRulesConstraintsTableGridInstance.current?.api?.refreshServerSideStore(
        { purge: true }
      );
    } else {
      filterDependencies.current = {};
    }
    props.setOMSSelectedRulesList([]);
    omsRulesConstraintsTableGridInstance?.current?.api?.deselectAll();
    omsRulesConstraintsTableGridInstance?.current?.api?.setCheckConfiguration(
      []
    );
  }, [props.selectedDependencyValue]);

  const onDelete = async (tableData) => {
    try {
      const isAllRowsSelected =
        omsRulesConstraintsTableGridInstance?.current?.api?.isSelectAllRecords;

      const selection = {
        data: getValidCheckConfiguration(
          omsRulesConstraintsTableGridInstance?.current?.api?.checkConfiguration
        ),
        unique_columns: [RULES_CONSTRAINTS_ROW_ID],
      };

      let payloadToDelete = {
        filters: isUndefined(filterDependencies?.current?.filters)
          ? []
          : filterDependencies?.current?.filters,
        selection,
        isSelectAllRecords: isAllRowsSelected,
        meta: {
          limit: { limit: props.pageSize || 10, page: 1 },
          ...(isUndefined(filterDependencies?.current?.meta)
            ? tableConfigurationMetaData.meta
            : filterDependencies?.current?.meta),
        },
        row_delete: isAllRowsSelected ? [] : props?.selectedRules,
      };
      props?.setVendorConstraintsTableDataLoader(true);

      let response = await deleteOrderingRules(payloadToDelete);
      omsRulesConstraintsTableGridInstance?.current.api.refreshServerSideStore({
        purge: true,
      });
      props?.setVendorConstraintsTableDataLoader(false);
      props?.setOMSSelectedRulesList([]);
      omsRulesConstraintsTableGridInstance?.current?.api?.deselectAll();
      omsRulesConstraintsTableGridInstance?.current?.api?.setCheckConfiguration(
        []
      );
      displaySnackMessages(response?.data?.message, "success");
    } catch (error) {
      props?.setVendorConstraintsTableDataLoader(false);
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
      : ishide;

    // Determine if Delete should be disabled
    const isDeleteDisabled = !isEmpty(props?.userAccess)
      ? !isUserHasDeleteAccess || !buttonEnabled || DISABLE_DELETE_RULE_BUTTON
      : isUserHasViewOnlyAccess || !buttonEnabled || DISABLE_DELETE_RULE_BUTTON;

    if (selectedSetAllRows?.length > 0) {
      options.push(
        <div>
          <Tooltip title="Delete" variant="tertiary">
            <Button
              variant="secondary"
              color="primary"
              type="destructive"
              className={classes.button}
              onClick={() => onDelete()}
              disabled={isDeleteDisabled}
              icon={<DeleteOutlinedIcon fontSize="small" />}
            >
              {/* <DeleteIcon fontSize="small"></DeleteIcon> */}
            </Button>
          </Tooltip>
        </div>
      );
    }

    if (selectedSetAllRows?.length > 0) {
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
      <div>
        <Button
          variant="primary"
          color="primary"
          className={classes.button}
          onClick={updateEdit}
          disabled={isUpdateDisabled}
        >
          Update
        </Button>
      </div>
    );
    return options;
  };

  const getTopCenterOptions = () => {
    if (alertMessage) {
      return <Alert severity={alertVariant} title={alertMessage} onClose={() => setAlertMessage(null)}></Alert>;
    }
    return null;
  };

  const getCustomLabel = (cellProps) => {
    try {
      const dropDownOptions = cellProps?.colDef?.extra?.options || [];
      if (dropDownOptions?.length) {
        const selectedOption = dropDownOptions.filter(
          (option) => option.value === cellProps?.value
        );
        return <p>{selectedOption[0]?.label || "Applicable to All"}</p>;
      }

      let value = cellProps?.value;

      // Handle different column types with switch case
      switch (cellProps?.colDef?.column_name) {
        case "moq_tolerance":
          if (value !== null && value !== undefined) {
            let roundOffTo = 2;
            switch (cellProps?.colDef?.formatter) {
              case "roundOff":
                roundOffTo = 0;
                break;
              case "roundOfftoOneDecimals":
                roundOffTo = 1;
                break;
              case "roundOfftoThreeDecimals":
                roundOffTo = 3;
                break;
              default:
                roundOffTo = 2;
                break;
            }
            const formattedValue = Number(value).toFixed(roundOffTo);
            return <p style={{ textAlign: "right" }}>{formattedValue}%</p>;
          }
          return <p style={{ textAlign: "right" }}>{value}</p>;
        default:
          return <p style={{ textAlign: "right" }}>{value}</p>;
      }
    } catch (error) {
      console.log("Error in getting Label", error);
    }
  };

  const isRowSelectable = (params) => {
    return params?.data?.is_default ? false : true;
  };

  return (
    <div className={globalClasses.marginVertical1rem}>
      <div className={globalClasses.marginVertical1rem}>
        <Loader
          loader={
            loader ||
            props.vendorConstraintsTableDataLoader ||
            props.vendorConstraintsTableConfigLoader
          }
          minHeight={"260px"}
        >
          {render && isPackOrderIdsFetched && (
            <div ref={allocationRef}>
              <AgGridComponent
                columns={constraintsTableColumns}
                manualCallBack={(body, pageIndex, params) =>
                  manualCallBack(body, pageIndex, params)
                }
                loadTableInstance={loadTableInstance}
                onSelectionChanged={onSelectionChanged}
                onBlur={onBlur}
                onCellValueChanged={onCellValueChanged}
                pagination={true}
                totalCount={totalCount}
                cacheBlockSize={10}
                serverSideStoreType="partial"
                rowModelType="serverSide"
                uniqueRowId={RULES_CONSTRAINTS_ROW_ID}
                rowSelection="multiple"
                onRowSelected
                selectAllHeaderComponent={true}
                hideSelectAllRecords={false}
                tableHeader={`Details`}
                topRightOptions={getTopRightOptions()}
                topCenterOptions={getTopCenterOptions()}
                isRowSelectable={isRowSelectable}
                suppressClickEdit={true}
                customCellRenderer={(cellProps) => {
                  if (
                    cellProps?.column?.colId === "level_of_application" &&
                    cellProps?.data?.is_rule_size_related
                  ) {
                    const label = getCustomLabel(cellProps);
                    return label;
                  }
                  if (cellProps?.data?.is_default) {
                    const label = getCustomLabel(cellProps);
                    return label;
                  }
                }}
              />
            </div>
          )}
        </Loader>
        {openPopUp && (
          <VendorConstraintsSetAllPopUp
            setShowSetAllModal={setOpenPopUp}
            rowsData={selectedSetAllRows}
            setAll={updateSetAllData}
            setCheckAllSetAllRequest={setCheckAllSetAllRequest}
            agGridInstance={omsRulesConstraintsTableGridInstance?.current}
            displaySnackMessages={displaySnackMessages}
            ruleRowId={RULES_CONSTRAINTS_ROW_ID}
            SETALL_MAPPING={SETALL_MAPPING}
            SETALL_FORMDATA_FIELDS={SETALL_FORMDATA_FIELDS}
            isCalledFromRCLCreation={false}
            isPartialSaveEnabled={IS_PARTIAL_SAVE_ENABLED}
          />
        )}
        {openPackConfigDetailSheet && (
          <PackConfigBottomSheet
            screenName={"vendor_constraints"}
            l1DisplayName={"Style"}
            activeChildHierarchyKey={activeChildHierarchyKey}
            packConfigDetailsPayloadData={packConfigDetailsPayloadData}
            openPackConfigDetailSheet={openPackConfigDetailSheet}
            setOpenPackConfigDetailSheet={setOpenPackConfigDetailSheet}
          />
        )}
      </div>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    vendorConstraintsTableDataLoader:
      store.omsReducer.orderingConstraintsService
        .vendorConstraintsTableDataLoader,
    vendorConstraintsTableConfigLoader:
      store.omsReducer.orderingConstraintsService
        .vendorConstraintsTableConfigLoader,
    selectedRules: store.omsReducer.orderingConstraintsService.selectedRules,
    selectedOmsFilters:
      store.omsReducer.orderingConstraintsService.selectedOmsFilters,
    appliedFilterDependencyData:
      store.filterReducer.filterDashboardConfiguration[
        "vendorConstraintsOrderManagementFilterConfiguration"
      ]?.appliedFilterData?.dependencyData,

    isPackOrderingEnabled:
      store.omsReducer.orderingCommonService?.orderingPackOrderConfig
        ?.pack_ordering,
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
  getVendorConstraintsTableConfig: () =>
    dispatch(getVendorConstraintsTableConfig()),
  getVendorConstraintsTableData: (payload) =>
    dispatch(getVendorConstraintsTableData(payload)),
  setVendorConstraintsTableConfigLoader: (payload) =>
    dispatch(setVendorConstraintsTableConfigLoader(payload)),
  setVendorConstraintsTableDataLoader: (payload) =>
    dispatch(setVendorConstraintsTableDataLoader(payload)),
  setOMSSelectedRulesList: (payload) =>
    dispatch(setOMSSelectedRulesList(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  setRulesConstraintsData: (payload) =>
    dispatch(setRulesConstraintsData(payload)),
  getVendorConstraintsStylePackIdMapping: (payload) =>
    dispatch(getVendorConstraintsStylePackIdMapping(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(VendorConstraintsTable);
