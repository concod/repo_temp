import AddIcon from "@mui/icons-material/Add";
import Delete from "@mui/icons-material/Delete";
import { IconButton } from "@mui/material";
import { Button, Chips } from "impact-ui-v3";
import DownloadIcon from "@mui/icons-material/Download";
import makeStyles from "@mui/styles/makeStyles";
import colours from "core/Styles/colours";
import globalStyles from "core/Styles/globalStyles";
import {
  dynamicLabelKeysBasedOnTenant,
  dynamicLabelsBasedOnTenant,
} from "core/Utils/DynamicLabels";
import AgGridComponent from "core/Utils/agGrid";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import SetAllMultiRow from "core/Utils/agGrid/setall-multirow-form";
import { isDateRangeConflict } from "core/Utils/functions/helpers/validation-helpers";
import { setFilterConfiguration } from "core/actions/filterAction";
import { addSnack } from "core/actions/snackbarActions";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  addCustomStatusDependency,
  fetchFilterFieldValues,
  formattedFilterConfiguration,
  getActiveEntityFilter,
} from "core/commonComponents/coreComponentScreen/utils";
import { Prompt as IaPrompt, Switch } from "impact-ui-v3";
import { capitalize, cloneDeep, isEmpty, isEqual, isNull, uniq } from "lodash";
import moment from "moment";
import ConflictResolutionModal from "core/pages/storeStatus/components/conflict-resolution-modal";
import {
  checkConflictInAttributeType,
  checkDateValidationInAttributeType,
  dateValidation,
  formatAttribute,
  getNextInactiveStatus,
  getUpdatedSetAllData,
  isDateFieldChangeValid,
  isValidDates,
} from "core/pages/storeStatus/utils";
import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { Prompt } from "react-router";
import Loader from "../../Utils/Loader/loader";
import ConfirmBox from "../../Utils/confirmPrompt/confirmPopup";
import {
  createNewProduct,
  getProductStatusData,
  getProductStatusStyleData,
  getStatusData,
  setStatusData,
  setUpdateStatusData,
  downloadTableData,
  setVIRConstraintFlag,
  setVIRConstraintFlagSetAll,
} from "../../actions/productStoreStatusActions";
import {
  getColumnsAg,
  resetTableRecentChanges,
} from "../../actions/tableColumnActions";
import {
  DEFAULT_LEVELS,
  END_DATE,
  SKU_STORE_STATUS_START_DATE,
} from "../../../config/constants";
import "./ProductFilter.scss";
import CreateProductModal from "./components/create-product";

import { INVENTORY_SUBMODULES_NAMES } from "core/Utils/constants/inventorySmart-constants";
import { captializeStringIfCamelCase } from "core/Utils/formatter";
import { isActionAllowedOnSubModule } from "core/Utils/utils";
import { useNavigate } from "react-router-dom-v5-compat";
import { isStartDateBiggerThanEndDate } from "core/Utils/utils";
import ImageCellRenderer from "../../Utils/agGrid/cellsToBeRendered/ImageCellRenderer";
import commentingColumnFormatter from "../../Utils/agGrid/commentingColumnFormatter";
import { IS_OVERRIDEN_CORE_BUTTON_WIDTH,IS_OVERRIDEN_CORE_BUTTON_PLACEMENT } from "core/constants";

const useStyles = makeStyles((theme) => ({
  actionButton: {
    padding: "0px",
  },
}));

function ProductsFilter(props) {
  const [showloader, setloader] = useState(true);
  const [totalRowsCount, setTotalRowsCount] = useState(0);
  const [showDownloadBtn, setShowDownloadBtn] = useState(false);
  // Style Level
  const [styleColumns, setStyleColumns] = useState([]);
  const [selectedStyleRowsIDs, setSelectedStyleRowsIDs] = useState([]);
  // Product Level
  const [productColumns, setProductColumns] = useState([]);
  const [selectedProductRowsIDs, setSelectedProductRowsIDs] = useState([]);
  // Create Product
  const [createProduct, showCreateProduct] = useState(false);
  const [checked, setChecked] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [flag_edit, setFlag_edit] = useState(false);
  const [setAllData, updateSetAllData] = useState({});
  const [setAll, toggleSetAll] = useState(false);
  const [confirmBox, showConfirmBox] = useState(false);
  const [showStyleLevelData, setShowStyleLevelData] = useState(true);
  const [showCreateProductBtn, setShowCreateProductBtn] = useState(true);
  // stores the action to be performed after unsaved changes modal confirm click
  const [onConfirmAction, setOnConfirmAction] = useState({ action: null });
  const [aggregationLevel, setAggregationLevel] = useState(null);
  const classes = useStyles();
  const navigate = useNavigate();
  const globalClasses = globalStyles();
  const onFilterDependency = useRef(null);
  const tableInstance = useRef({});

  const [resolutionType, setResolutionType] = useState("hard_reset");
  const [deleteActionObj, setDeleteActionObj] = useState({});
  const [editActionObj, setEditActionObj] = useState({});
  const [hasEditPermissions, setHasEditPermissions] = useState(false);

  const [displayLevels, setDisplayLevels] = useState(
    DEFAULT_LEVELS["product"].map((level) =>
      dynamicLabelKeysBasedOnTenant(level, "core")
    )
  );
  const [isMultipleStatus, setIsMultipleStatus] = useState(false);
  const setNewTableInstance = (params) => {
    tableInstance.current = params;
  };

  // called when delete icon is clicked and delete object is set
  useEffect(() => {
    if (!isEmpty(deleteActionObj)) {
      updateSetAllDataHandler(deleteActionObj, "delete");
    }
  }, [deleteActionObj]);

  // called when edit icon is clicked and edit object is set
  useEffect(() => {
    if (!isEmpty(editActionObj)) {
      updateSetAllDataHandler(editActionObj, "edit");
    }
  }, [editActionObj]);

  const isCommentFeatureEnabled = Boolean(
    props?.commentingConfig?.inventory_smart_comment_and_thread
      ?.isCommentFeatureEnabled
  );

  const isThreadFeatureEnabled = Boolean(
    props?.commentingConfig?.inventory_smart_comment_and_thread
      ?.isThreadFeatureEnabled
  );

  const updateSetAllDataHandler = (inputActionObj, updateActionType, attributeType = 'status') => {
    const { isEdited, updatedSetAllData } = getUpdatedSetAllData(
      inputActionObj,
      updateActionType,
      setAllData[attributeType] || []
    );

    if (isEdited) {
      // if attribute present then update in existing object
      updateSetAllData(prev => ({...prev, [attributeType]: updatedSetAllData}));
    } else {
      //else add new attribute object
      updateSetAllData(prev => ({...prev, [attributeType]: [...(setAllData?.[attributeType] || []), inputActionObj]}));
    }
  };

  // VIR and IOB capital and status in camelcase.
const getListOptions = (optionList = []) => {
  return optionList.map((item) => {
    const label = item.charAt(0).toUpperCase() + item.slice(1)
    return { label, id: item, value: item };
  });
};

  useEffect(() => {
    const getInitialData = async () => {
      try {
        let displayLevelsResp = await props.getTenantConfigApplicationLevel(1, {
          attribute_name: "product_status_config",
        });
        let permissionCheckToDisable = !!canTakeActionOnModules(
          INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_STATUS,
          "edit"
        );
        let updatedLevels = cloneDeep(displayLevels);
        //By default, we have 2 levels, product and style
        //If user wants to hide any level, we can remove it from visible_levels
        //in the tenant attribute master of product_status_config key
        //Along with that, we can also provide default level key
        if (
          displayLevelsResp?.data?.data?.[0]?.["attribute_value"]?.["visible_levels"]
        ) {
          const config = displayLevelsResp?.data?.data?.[0]?.attribute_value;
          updatedLevels = config.visible_levels.map(level => 
            dynamicLabelKeysBasedOnTenant(level, "core")
          );
          setDisplayLevels(updatedLevels);
          
          if (config.style_view_aggregation_level) {
            setAggregationLevel(config.style_view_aggregation_level);
          }
          
          // If only one level exists, check if it's style level
          if (updatedLevels.length === 1) {
            setChecked(updatedLevels[0] === dynamicLabelKeysBasedOnTenant("style", "core"));
          } else {
            // If multiple levels exist, use defaultLevel from config (default to "product")
            const defaultLevel = config.defaultLevel || "product";
            setChecked(defaultLevel !== "product");
          }
        }
        // Support for old config format
        else if (
          displayLevelsResp?.data?.data?.[0]?.["attribute_value"] &&
          displayLevelsResp?.data?.data?.[0]?.["attribute_value"]?.["value"]?.[
            "product"
          ]
        ) {
          let defaultLvl =
            displayLevelsResp?.data?.data?.[0]?.["attribute_value"]?.[
              "value"
            ]?.["product"]?.["default"];
          const hidden_levels =
            displayLevelsResp?.data?.data?.[0]?.["attribute_value"]?.[
              "value"
            ]?.["product"]?.["hidden_levels"];
          if (hidden_levels) {
            updatedLevels = cloneDeep(updatedLevels).filter(
              (level) =>
                !hidden_levels.includes(
                  dynamicLabelKeysBasedOnTenant(level, "core")
                )
            );
            setDisplayLevels(updatedLevels);
          }
          if (defaultLvl !== "product") {
            setChecked(true);
          }
        }
        // fetch table columns

        let cols = await getColumnsAg("table_name=product_status")();
        let styleCols = [];

        let showStyleLevelDataResp = await props.getTenantConfigApplicationLevel(
          3,
          {
            attribute_name: "core_show_style_level_info",
          }
        );

        if (showStyleLevelDataResp?.data?.data?.[0]?.["attribute_value"]) {
          const showStyleLevel =
            showStyleLevelDataResp?.data?.data?.[0]?.["attribute_value"]?.value;
          setShowStyleLevelData(showStyleLevel);
          styleCols = await getColumnsAg("table_name=product_status_style")();
        }
        const statusValues = await getStatusData("product");
        const virConstraintsValues = await getStatusData("vir_constraint_flag");

        cols = updatedTableColumnsDef(
          cols,
          { status: statusValues, vir_constraint_flag: virConstraintsValues },
          permissionCheckToDisable
        );
        styleCols = updatedTableColumnsDef(
          styleCols,
          { status: statusValues, vir_constraint_flag: virConstraintsValues },
          permissionCheckToDisable
        );
        const data = await fetchFilterFieldValues(
          "product status",
          props.savedFilterSelection,
          props.screenName,
          [getActiveEntityFilter("product")]
        );
        if (isEmpty(props.filterDashboardConfiguration)) {
          let filterConfigData = [
            {
              filterDashboardData: data,
              isCrossDimensionFilter: false,
              screen_name: props.screenName,
            },
          ];
          if (sessionStorage.getItem("currentApp") === "inventorysmart") {
            filterConfigData[0]["saved_filter_screen_name"] =
              "Inventorysmart Product Status";
          }
          const filterConfig = formattedFilterConfiguration(
            "productStatusFilterConfiguration",
            filterConfigData,
            "Product Status"
          );
          props.setFilterConfiguration(filterConfig);
        }
        setProductColumns(commentingColumnFormatter(cols, null, isThreadFeatureEnabled, false));
        setStyleColumns(commentingColumnFormatter(styleCols, null, isThreadFeatureEnabled, false));
        setloader(false);
        setHasEditPermissions(permissionCheckToDisable);
        let showCreateProductBtnResp = await props.getTenantConfigApplicationLevel(
          3,
          {
            attribute_name: "core_show_create_product_store_dc",
          }
        );

        if (showCreateProductBtnResp?.data?.data?.[0]?.["attribute_value"]) {
          setShowCreateProductBtn(
            showCreateProductBtnResp?.data?.data?.[0]?.["attribute_value"]
              ?.value
          );
        }
        const status = await props.getTenantConfigApplicationLevel(2, {
          attribute_name: "core_show_create_product_store_dc",
        });
        setShowDownloadBtn(Boolean(status?.data?.status));
      } catch (error) {
        setloader(false);
      }
    };
    getInitialData();
  }, []);


  const updatedTableColumnsDef = (
    columnsDef,
    statusValues,
    permissionCheckToDisable
  ) => {
    try {
      let areStatusGrouped = false;
      let updatedColumnsDef = cloneDeep(columnsDef);
      if (!isEmpty(columnsDef)) {
        updatedColumnsDef = updatedColumnsDef.map((item) => {
          if (
            item.column_name === "status" ||
            item.column_name === "vir_constraint_flag"
          ) {
            item.showFilter = true;
            item.options = getListOptions(statusValues[item.column_name]);
          }
          if (item.type === "datetime") {
            item.disablePast = false;
            // item.shouldDisableDate = setDisabledDates; //disabled as per signet's requirement
          }
          if (item.extra?.is_grouping_key) {
            areStatusGrouped = true;
            item.cellRenderer = "agGroupCellRenderer";
            item.rowGroup = true;
          }
          if (item?.column_name === "product_image_link") {
            item.cellRenderer = (cellProps) => {
              return ImageCellRenderer(cellProps, false, false);
            };
          }
          return item;
        });

        let isInTableEditEnabled = false;
        setIsMultipleStatus(areStatusGrouped);

        // adding custom renderer on parent group row to aggregate status and type
        // enabling in table edit for status and date columns
        updatedColumnsDef = updatedColumnsDef.map((item) => {
          if (item.column_name === "status") {
            item.cellRenderer = (params, extraProps) => {
              if (params.node.level === 0) {
                if (
                  (!areStatusGrouped && params.data.status_obj) ||
                  (areStatusGrouped && params.data.status)
                ) {
                  isInTableEditEnabled = true;
                  item.disabled = !permissionCheckToDisable;
                  return (
                    <CellRenderers
                      cellData={params}
                      column={item}
                      extraProps={extraProps}
                      actions={null}
                    ></CellRenderers>
                  );
                } else {
                  const valueSet = params.data.status_obj
                    ? uniq(
                        params.data.status_obj.map((value) =>
                          capitalize(value.status)
                        )
                      )
                    : [];
                  return multiValueAggregate(valueSet);
                }
              } else {
                if (item.extra?.in_table_edit) {
                  isInTableEditEnabled = true;
                  item.disabled = !permissionCheckToDisable;
                  return (
                    <CellRenderers
                      cellData={params}
                      column={item}
                      extraProps={extraProps}
                      actions={null}
                    ></CellRenderers>
                  );
                } else {
                  const value = params.data[item.column_name];
                  return value ? value : "-";
                }
              }
            };
          } else if (item.column_name === "vir_constraint_flag") {
            item.cellRenderer = (params, extraProps) => {
              if (
                params.node.level === 0 &&
                areStatusGrouped &&
                params.data.vir_constraint_flag
              ) {
                isInTableEditEnabled = true;
                item.disabled = !permissionCheckToDisable;
                return (
                  <CellRenderers
                    cellData={params}
                    column={item}
                    extraProps={extraProps}
                    actions={null}
                  ></CellRenderers>
                );
              } else {
                if (item.extra?.in_table_edit) {
                  isInTableEditEnabled = true;
                  item.disabled = !permissionCheckToDisable;
                  return (
                    <CellRenderers
                      cellData={params}
                      column={item}
                      extraProps={extraProps}
                      actions={null}
                    ></CellRenderers>
                  );
                } else {
                  const value = params.data[item.column_name];
                  return value ? value : "-";
                }
              }
            };
          } else if (
            item.type === "datetime" ||
            item.type === "DateTimeField"
          ) {
            if (item.extra?.in_table_edit) {
              isInTableEditEnabled = true;
              item.disabled = !permissionCheckToDisable;
            }
            item.cellRenderer = (params, extraProps) => {
              if (params.node.level !== 0 || params.data.status) {
                return (
                  <CellRenderers
                    cellData={params}
                    column={item}
                    extraProps={extraProps}
                    actions={null}
                  ></CellRenderers>
                );
              } else {
                if (params.colDef.extra?.["show-inactive"]) {
                  return getNextInactiveStatus(
                    params.data.status_obj,
                    params.colDef.column_name
                  );
                } else {
                  return "";
                }
              }
            };
          }
          return item;
        });

        // pushing a column for delete action
        isInTableEditEnabled &&
          areStatusGrouped &&
          updatedColumnsDef.push({
            headerName: "Delete Status",
            minWidth: 150,
            cellRenderer: (params, extraProps) => {
              if (params.node.level !== 0 || params.data.status) {
                return (
                  <div>
                    <Button
                      variant="tertiary"
                      onClick={() => onDeleteClick(params)}
                      disabled={
                        params?.node?.parent?.data?.checkbox_disabled ||
                        !canTakeActionOnModules(
                          INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_STATUS,
                          "delete"
                        )
                      }
                      title="Delete"
                      size="large"
                    >
                      <Delete />
                    </Button>
                  </div>
                );
              } else {
                return null;
              }
            },
            editable: false,
            colId: "action",
            suppressMenu: true,
            lockPosition: "right",
          });
      }

      return updatedColumnsDef;
    } catch (err) {
      props.handleErrorMessage(err);
      return [];
    }
  };

  const multiValueAggregate = (value) => {
    value = value.filter((val) => val !== null);
    return value.length > 0 ? value.join(`${","}${" "}`) : "-";
  };

  const productStatusManualCallBack = async (manualbody, pageIndex, params) => {
    if (isNull(onFilterDependency.current)) {
      return {
        data: [],
        totalCount: 0,
      }; // returning for server side pagination on ag grid
    }
    setloader(true);
    let body = {
      filters: onFilterDependency.current,
      meta: {
        ...manualbody,
        search: manualbody.search,
        limit: { limit: props.pageSize || 10, page: pageIndex + 1 },
      },
      headers: [],
      selection: {
        data: tableInstance?.current?.api?.checkConfiguration,
        unique_columns: ["product_code"],
      },
    };
    try {
      const response = await getProductStatusData("product", body)();
      response.data.data = formatProductStatusData(response.data.data);
      response.data.data = response.data.data.map((item) => {
        let newItem = { ...item };

        if (item.status_obj?.length === 1) {
          newItem = {
            ...item,
            ...item.status_obj[0],
            status_obj: null,
          };
        }

        return newItem;
      });
      setTotalRowsCount(
        isNaN(Number(response?.data.total)) ? 0 : response?.data.total
      );
      setloader(false);
      return {
        data: response?.data.data,
        totalCount: response?.data.total,
      }; // returning for server side pagination on ag grid
    } catch (err) {
      setloader(false);
      props.handleErrorMessage(err);
    }
  };

  const productStyleManualCallBack = async (manualbody, pageIndex, params) => {
    if (isNull(onFilterDependency.current)) {
      return {
        data: [],
        totalCount: 0,
      }; // returning for server side pagination on ag grid
    }
    setloader(true);
    let body = {
      filters: onFilterDependency.current,
      meta: {
        ...manualbody,
        search: manualbody.search,
        limit: { limit: props.pageSize || 10, page: pageIndex + 1 },
      },
      headers: [],
      selection: {
        data: tableInstance?.current?.api?.checkConfiguration,
        unique_columns: ["aggregation_code"],
      },
    };
    try {
      let response = await getProductStatusStyleData("product", body)();
      response.data.data = response.data.data.map((item) => {
        item.style_id = `${
          item[dynamicLabelKeysBasedOnTenant("style", "core")]
        }`;
        let newItem = { ...item };

        if (item.status_obj?.length === 1) {
          newItem = {
            ...item,
            ...item.status_obj[0],
            status_obj: null,
          };
        }

        return newItem;
      });
      setTotalRowsCount(
        isNaN(Number(response?.data.total)) ? 0 : response?.data.total
      );
      setloader(false);
      return {
        data: response?.data.data,
        totalCount: response?.data.total,
      }; // returning for server side pagination on ag grid
    } catch (err) {
      setloader(false);
      props.handleErrorMessage(err);
    }
  };

  const formatProductStatusData = (productData) => {
    return productData.map((item) => {
      item.reference_product_codes = item.reference_product_codes?.[0];
      item.replacement_product_codes = item.replacement_product_codes?.[0];
      item.isDisabled = false;
      item.hasConflict = false;
      /**
       * If a product can have only one status we are adding status
       * attribute keys to the parent object
       */
      if (!isMultipleStatus) {
        if (item.status_obj?.[0]) {
          item = { ...item, ...item.status_obj?.[0] };
        } else {
          item.status = null;
          item.status_end_time = null;
          item.status_start_time = null;
        }
      }
      return item;
    });
  };

  const unsavedChangeCheck = (confirmAction) => {
    if (Object.keys(setAllData).length) {
      setOnConfirmAction({ action: confirmAction });
      showConfirmBox(true);
      throw Error("Unsaved changes");
    }
  };

  const onFilter = async (unsavedCheck) => {
    unsavedCheck && unsavedChangeCheck(() => onFilter(false));
    props.resetTableRecentChanges();
    tableInstance.current?.api?.setFilterModel(null);
    tableInstance.current.api?.refreshServerSideStore({ purge: true });
  };

  const onStyleSwitch = async (event) => {
    const checkChecked = event.target.checked;
    unsavedChangeCheck(() => setChecked(checkChecked));
    setSelectedProductRowsIDs([]);
    setSelectedStyleRowsIDs([]);
    setTotalRowsCount(0);
    setChecked(checkChecked);
  };
  const onButtonGroupChange = (event , newValue) => {
    unsavedChangeCheck(() => setChecked(newValue));
    setSelectedProductRowsIDs([]);
    setSelectedStyleRowsIDs([]);
    setTotalRowsCount(0);
    setChecked(newValue);
  }

  const getTopRightTableOptions = () => {
    const options = [];


    if (hasEditPermissions) {
      if((checked && selectedStyleRowsIDs?.length > 0) ||
      (!checked && selectedProductRowsIDs?.length > 0)){
        options.push(
          <Button
            size="large"
            variant="tertiary"
            id="productSetAllBtn"
            onClick={async () => {
              if (Object.keys(setAllData).length) {
                showConfirmBox(true);
              } else if (
                (checked && selectedStyleRowsIDs.length > 0) ||
                (!checked && selectedProductRowsIDs.length > 0)
              ) {
                toggleSetAll(true);
              } else {
                const errMsg = checked
                  ? `Please select atleast one ${dynamicLabelsBasedOnTenant(
                    "style",
                    "core"
                  )}`
                : `Please select atleast one ${dynamicLabelsBasedOnTenant(
                    "product",
                    "core"
                  )}`;
                displaySnackMessages(errMsg, "error");
              }
            }}
            disabled={
              !canTakeActionOnModules(
                INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_STATUS,
                "edit"
              ) || (checked ? selectedStyleRowsIDs.length === 0 : selectedProductRowsIDs.length === 0)
            }
          >
            Set All
          </Button>
        )
      }
      
      options.push(
        <Button
          variant="tertiary"
          id="productCancelBtn"
          onClick={() => {
            unsavedChangeCheck(null);
            tableInstance?.api?.deselectAll(true);
            displaySnackMessages("No changes are made", "warning");
          }}
        >
          Cancel
        </Button>
      )

      options.push(
        <Button
          variant="primary"
          id="productSaveBtn"
          onClick={() => {
            saveRequest();
          }}
          disabled={
            !canTakeActionOnModules(
              INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_STATUS,
              "edit"
            )
          }
        >
          Save
        </Button>
      )
    }

    return options;
  }

  const getTableHeader = () => {
    if (displayLevels.length !== 2) {
      return checked
        ? `Filtered ${dynamicLabelsBasedOnTenant(
            "style",
            "core"
          )}`
        : `Filtered ${dynamicLabelsBasedOnTenant(
            "product",
            "core"
          )}`
    }
    return null;
  }

  const getTopLeftOptions = () => {
    if (displayLevels.length === 2) {
      return (
        <div className={`${globalClasses.flexRow} ${globalClasses.flexWrap} ${globalClasses.gapHalf} ${globalClasses.verticalAlignStart}`}>
          <Chips
            label={`${dynamicLabelsBasedOnTenant("style", "core")} level`}
            isActive={checked === true}
            onClick={() => onButtonGroupChange(null, true)}
            type="single"
          />
          <Chips
            label={`${dynamicLabelsBasedOnTenant("product", "core")} level`}
            isActive={checked === false}
            onClick={() => onButtonGroupChange(null, false)}
            type="single"
          />
        </div>
      );
    }
    return null;
  }
  const getAttributeNames = (p_formattedAttributes) => {
    return [
      ...new Set(p_formattedAttributes.map((attr) => attr.attribute_name))
    ];
  };

  const setAllChanges = async (formattedAttributes) => {
    const attributeNames = getAttributeNames(formattedAttributes);
    let setAllBody = {};

    // Add each key from editableAttributes.current to setAllBody
    for(let key of attributeNames) {
      let attributes = formattedAttributes.filter((ele) => {
        return ele.attribute_name == key;
      });
      key = key === "vir_constraint_flag" ? "vir_constraint_flag" : "status";
      setAllBody[key] = {
        attributes,
        codes: {
          filters: onFilterDependency.current,
          meta: {
            range: [],
            sort: [],
            search: [],
          },
          headers: [],
          selection: {
            data: tableInstance?.current?.api?.checkConfiguration,
            unique_columns: [],
          },
        },
        conflict_resolution: resolutionType,
      }
      if (checked) {
        //style table
        setAllBody[key].codes.selection.unique_columns = ["aggregation_code"];
      } else {
        //product table
        setAllBody[key].codes.selection.unique_columns = ["product_code"];
      }
    }

    toggleSetAll(false);
    // patch api call for set all action
    await onConfirm(setAllBody, true);
  };

  const formatProductRow = (key, id, input) => {
    return {
      attribute_name: key,
      attribute_value: input[`${key}${id}`],
      start_time:
        input[`${key}${"_start_time"}${id}`] &&
        input[`${key}${"_start_time"}${id}`] !== "Invalid date"
          ? input[`${key}${"_start_time"}${id}`]
          : SKU_STORE_STATUS_START_DATE,
      end_time:
        input[`${key}${"_end_time"}${id}`] &&
        input[`${key}${"_end_time"}${id}`] !== "Invalid date"
          ? input[`${key}${"_end_time"}${id}`]
          : END_DATE,
    };
  };

  /**
   * dynamically format multi row set-all data
   * data is formatted before apply action is called
   */
  const formatSetAllData = (input, rowCount) => {
    let setAllOutput = [];

    for (let i = 0; i <= rowCount; i++) {
      const str = "_" + i;
      if (input["status" + str]) {
        const statusRow = formatProductRow("status", str, input);
        if (!dateValidation(statusRow.start_time, statusRow.end_time)) {
          displaySnackMessages(
            "To date must be greater than from date",
            "error"
          );
          throw Error("Date is not correct");
        }
        setAllOutput.push(statusRow);
      }
      if (input["type" + str]) {
        const typeRow = formatProductRow("type", str, input);
        if (!dateValidation(typeRow.start_time, typeRow.end_time)) {
          displaySnackMessages(
            "To date must be greater than from date",
            "error"
          );
          throw Error("Date is not correct");
        }
        setAllOutput.push(typeRow);
      }
      const virKey = "vir_constraint_flag" + str;
      if (input[virKey]) {
        const row1 = {
          attribute_name: "vir_constraint_flag",
          attribute_value: input[virKey],
        };
        setAllOutput.push(row1);
      }
    }

    let statusDateRangeList = setAllOutput.filter(
      (item) => item.attribute_name === "status"
    );
    let typeDateRangeList = setAllOutput.filter(
      (item) => item.attribute_name === "type"
    );

    // checking if conflict exists in date ranges
    const statusHasConflict = isDateRangeConflict(
      statusDateRangeList,
      "YYYY-MM-DD",
      "[]"
    );
    const typeHasConflict = isDateRangeConflict(
      typeDateRangeList,
      "YYYY-MM-DD",
      "[]"
    );

    if (statusHasConflict || typeHasConflict) {
      displayConflictError();
    }

    return setAllOutput;
  };

  const saveRequest = () => {
    if (Object.keys(setAllData).length) {
      setShowModal(true);
    } else {
      displaySnackMessages("There is no change to save", "warning");
    }
  };

  const displayConflictError = () => {
    displaySnackMessages("Please resolve overlapping date ranges", "error");
    throw Error("Date is overlapping");
  };

  // checks if conflict error is present in tabledata after edit/delete
  const isDateRangeConflictInData = () => {
    let hasConflictFlag = false;

    tableInstance.current.api.getRenderedNodes().forEach((item) => {
      if (item.data.hasConflict) {
        hasConflictFlag = true;
      }
    });

    if (hasConflictFlag) {
      displayConflictError();
    }
  };

  const onConfirm = async (payloadData, isSetAllAction) => {
    try {
      let statusResponse;
      let virResponse;
      let statusSuccessMessage = "";
      let virSuccessMessage = "";

      setloader(true);
      setShowModal(false);
      
      // set all patch api call
      if (isSetAllAction) {
        if(payloadData["status"]) {
          const formattedPayload = Array.isArray(payloadData["status"])
            ? payloadData["status"]
            : [payloadData["status"]];
          if (isStartDateBiggerThanEndDate(formattedPayload)) {
            displaySnackMessages(
              "From date cannot be greater than To date",
              "error"
            );
            setloader(false);
            return;
          }
          statusResponse = await setStatusData(
            `${"product?level="}${checked ? "aggregate" : "product"}`,
            payloadData["status"]
          )();
          statusSuccessMessage = `${
            statusResponse.data?.status || statusResponse?.data?.show_message
              ? statusResponse?.data?.message
              : "Updation request has been queued successfully. You will be notified once completed."
          }`;
        }
        if (payloadData["vir_constraint_flag"]) {
          virResponse = await setVIRConstraintFlagSetAll(payloadData["vir_constraint_flag"]);
          virSuccessMessage = `${
            virResponse.data?.status || virResponse?.data?.show_message
              ? virResponse?.data?.message
              : "Updated successfully"
          }`;
        } 
      }
      
      // edit/delete patch api call
      if (!isSetAllAction) {
        // check if conflicts present in data
        if (payloadData["status"]) {
          isDateRangeConflictInData();
          statusResponse = await setUpdateStatusData(
            "product",
            checked ? "aggregation" : "product",
            {
              body: payloadData["status"],
            }
          )();
          statusSuccessMessage = `${
            statusResponse.data?.status || statusResponse?.data?.show_message
              ? statusResponse?.data?.message
              : "Updated successfully"
          }`;
        }
        if (payloadData["vir_constraint_flag"]) {
          virResponse = await setVIRConstraintFlag({
            body: payloadData["vir_constraint_flag"],
          });
          virSuccessMessage = `${
            virResponse.data?.status || virResponse?.data?.show_message
              ? virResponse?.data?.message
              : "Updated successfully"
          }`;
        }
      } else {
        tableInstance.current?.api?.setCheckConfiguration([]);
        tableInstance.current?.api?.setPrevAction(null);
      }

      setFlag_edit(false);
      tableInstance.current.api?.deselectAll(true);
      tableInstance.current?.api?.setFilterModel(null);
      updateSetAllData({});
      setloader(false);
      tableInstance.current.api?.refreshServerSideStore({ purge: false });
      statusSuccessMessage && displaySnackMessages(statusSuccessMessage, "success");
      virSuccessMessage && displaySnackMessages(virSuccessMessage, "success");
    } catch (err) {
      const errMsg = !isEmpty(err.response?.data.message)
        ? err.response.data.message
        : `Unsuccessfull at updating ${captializeStringIfCamelCase(
            dynamicLabelsBasedOnTenant("product", "core")
          )} attributes`;
      displaySnackMessages(errMsg, "error");
      setloader(false);
    }
  };

  const handleConfirmBox = () => {
    tableInstance.current.api?.refreshServerSideStore({ purge: false });
    tableInstance.current.api?.deselectAll(true);
    onConfirmAction.action?.();
    updateSetAllData({});
    setFlag_edit(false);
    showConfirmBox(false);
    setOnConfirmAction({ action: null });
  };

  const createNewProducFunc = async (dataObj, newSetAllData) => {
    setloader(true);
    try {
      let body = [];
      let setAllBody = {
        attributes: [
          {
            attribute_name: "status",
            attribute_value: newSetAllData.status,
            start_time: moment(newSetAllData.start_time).format("YYYY-MM-DD"),
            end_time: moment(newSetAllData.end_time).format("YYYY-MM-DD"),
          },
          {
            attribute_name: "type",
            attribute_value: newSetAllData.type,
            start_time: moment(newSetAllData.start_time).format("YYYY-MM-DD"),
            end_time: moment(newSetAllData.end_time).format("YYYY-MM-DD"),
          },
        ],
        codes: [dataObj.product_code],
      };
      Object.keys(dataObj).forEach((key) => {
        if (key !== "product_code" && dataObj[key]) {
          let obj = {
            attribute_name: key,
            attribute_value: dataObj[key],
          };
          body.push(obj);
        }
      });
      let reqBody = {
        attributes: body,
        code: dataObj.product_code,
      };
      if (
        dateValidation(
          setAllBody.attributes[0].start_time,
          setAllBody.attributes[0].end_time
        )
      ) {
        throw Error("Date is not correct");
      }

      if (dataObj.product_code) {
        const response = await createNewProduct("product", reqBody)();
        const successMsg =
          response.data?.status || response.data?.show_message
            ? response?.data?.message
            : "Product created successfully";
        if (Object.keys(newSetAllData).length > 0)
          await setStatusData("product", setAllBody)();
        displaySnackMessages(successMsg, "success");
        onFilter();
        return true;
      } else {
        displaySnackMessages("Please enter Product Id", "error");
      }
      setloader(false);
    } catch (err) {
      props.handleErrorMessage(
        err,
        "Failed to create a product. Please try again with different product ID"
      );
      setloader(false);
    }
  };

  /**
   * set editable product and style fields and pass to set-all component
   */
  const editableFieldsList = React.useMemo(() => {
    const cloneColumns = cloneDeep(checked ? styleColumns : productColumns);
    let editableProductFields = cloneColumns.filter(
      (item) => !item.is_hidden && item.is_editable && !item.system_field && !item.extra?.is_custom_field
    );

    editableProductFields = editableProductFields.map((item) => {
      if (item.type === "datetime") {
        item.type = "DateTimeField";
        item.disablePast = false; //disabled as per signet's requirement
      }
      return item;
    });

    let setAllFieldsList = [
      {
        fields: [...editableProductFields],
        addRowLabel: "Add Status",
        id: "status",
        rowCount: 0,
        hideRowLabel: !isMultipleStatus,
      },
    ];

    return setAllFieldsList;
  }, [productColumns, styleColumns]);

  const customEditableFieldsList = React.useMemo(() => {
    const cloneColumns = cloneDeep(checked ? styleColumns : productColumns);
    let customEditableFields = cloneColumns.filter(
      (item) => item.extra?.is_custom_field
    );

    return [
      {
        fields: customEditableFields,
        addRowLabel: "Add Status",
        id: "vir_constraint_flag",
        rowCount: 0,
        hideRowLabel: false,
      },
    ];
  }, [productColumns, styleColumns]);

  const onProductSelectionChanged = (event) => {
    const selectedRows = event.api?.getSelectedRows() || [];
    let selections = selectedRows.map((item) => {
      return {
        product_code: item.product_code,
      };
    });
    setSelectedProductRowsIDs(selections);
  };

  const onStyleSelectionChanged = (event) => {
    const selectedRows = event.api?.getSelectedRows() || [];
    let selections = selectedRows.map((item) => {
      return {
        [dynamicLabelKeysBasedOnTenant("style", "core")]: item[
          dynamicLabelKeysBasedOnTenant("style", "core")
        ],
        codes: item.products?.map((product) => product.product_code || product),
      };
    });
    setSelectedStyleRowsIDs(selections);
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  // function is called on delete action in table
  const onDeleteClick = (event) => {
    const attributeId = event.data.time_attr_id;
    const attributeRowNode = event.node.parent;
    let parentRowNode = event.node.parent;
    const attributeType = "status";

    if (parentRowNode?.level === -1) {
      parentRowNode.id = event.node.id;
      parentRowNode.data = {
        status_obj: [
          {
            status: event.data?.status,
            status_end_time: event.data?.status_end_time,
            status_start_time: event.data?.status_start_time,
            time_attr_id: event.data?.time_attr_id,
          },
        ],
        ...event.data,
      };
      parentRowNode.rowIndex = event.node.rowIndex;
      parentRowNode.rowTop = event.node.rowTop;
    }

    // removing deleted status
    const updated_attribute_obj = parentRowNode?.data?.[
      `${attributeType}${"_obj"}`
    ]?.filter((item) => item.time_attr_id != attributeId);

    // updating parent row sub rows data
    const updated_data = {
      ...parentRowNode.data,
      [`${attributeType}${"_obj"}`]: isEmpty(updated_attribute_obj)
        ? null
        : updated_attribute_obj,
    };

    parentRowNode.setData(updated_data);
    conflictResolutionCheck(parentRowNode);
    const setAllObject = formatAttribute(
      parentRowNode.id,
      event,
      attributeType,
      "delete"
    );
    setDeleteActionObj(setAllObject);
    setFlag_edit(true);
    // table actions
    if (parentRowNode?.level === -1) {
      delete event.data.status;
      delete event.data.status_end_time;
      delete event.data.status_start_time;
      delete event.data.time_attr_id;
      event.node.setData(event.node.data);
    } else {
      attributeRowNode?.setExpanded(false);
    }
    tableInstance.current.api.flashCells({ rowNodes: [attributeRowNode] });
    if (updated_data[`${attributeType}${"_obj"}`])
      attributeRowNode.setExpanded(true);
  };

  // checks and manages conflict error in store status data
  const conflictResolutionCheck = (parentRowNode, params) => {
    const currentDateRangeConflict = parentRowNode.data.hasConflict;
    const statusObj = cloneDeep(parentRowNode.data.status_obj);
    const typeObj = cloneDeep(parentRowNode.data.type_obj);
    if (
      (typeObj || statusObj) &&
      (!params || !moment.isMoment(params.newValue)) &&
      !currentDateRangeConflict
    ) {
      return;
    }
    if (statusObj) {
      // check if date validation is passing. from date should be lesser than to date
      const hasConflict = hasConflicts(
        currentDateRangeConflict,
        statusObj,
        params
      );
      parentRowNode.setData({
        ...parentRowNode.data,
        hasConflict: hasConflict,
      });
    } else if (typeObj) {
      // check if date validation is passing. from date should be lesser than to date
      const hasConflict = hasConflicts(
        currentDateRangeConflict,
        statusObj,
        params
      );
      parentRowNode.setData({
        ...parentRowNode.data,
        hasConflict: hasConflict,
      });
    } else {
      parentRowNode.setData({ ...parentRowNode.data, hasConflict: false });
    }
  };

  /**
   * @func
   * @desc Check for different conflict cases withtin the date range.
   * @param {Boolean} currentDateRangeConflict
   * @param {Object} statusObj
   * @param {Object} params
   * @return {Boolean}
   */
  const hasConflicts = (currentDateRangeConflict, statusObj, params) => {
    const isNewDateValid = isDateFieldChangeValid(params);
    const newDateRangeConflict = checkConflictInAttributeType(
      statusObj,
      "status"
    );
    const hasDateRangeInValid = checkDateValidationInAttributeType(
      statusObj,
      "status"
    );
    const isValidDate = isValidDates(statusObj, "status");
    let hasConflict =
      !isNewDateValid || Boolean(!isValidDate || hasDateRangeInValid);
    if (hasConflict && isNewDateValid && isValidDate) {
      displaySnackMessages("To date must be greater than from date", "error");
    }
    // check if date validation is passing for current row change
    if (
      currentDateRangeConflict &&
      !newDateRangeConflict &&
      (!hasConflict || !hasDateRangeInValid)
    ) {
      displaySnackMessages(
        "Successfully resolved overlapping date ranges and conflicts",
        "success"
      );
      return false;
    } else if (newDateRangeConflict && !hasDateRangeInValid) {
      // check if date validation is passing and no overlaps for current row change
      displaySnackMessages(
        "Please resolve overlapping date ranges or To date must be greater than from date",
        "error"
      );
      return true;
    }
    return hasConflict;
  };

  // function is called on edit action in table
  const onCellValueChanged = (params) => {
    let parentRowNode = isMultipleStatus ? params.node.parent : params.node;
    if (parentRowNode?.level === -1) {
      parentRowNode.data = {
        ...params.node,
      };
      parentRowNode.id = params.node.id;
    }
    let isInputValueSame = false;

    if (moment.isMoment(params.newValue)) {
      isInputValueSame = moment(params.newValue).isSame(params.oldValue);
    } else {
      isInputValueSame = isEqual(params.oldValue, params.newValue);
    }

    if (!isInputValueSame) {
      const attributeType = params.colDef.column_name === "vir_constraint_flag" ? "vir_constraint_flag" : "status";
      isMultipleStatus && conflictResolutionCheck(parentRowNode, params);
      const setAllObject = formatAttribute(
        parentRowNode.id,
        params,
        attributeType,
        "edit"
      );
      if (attributeType === "status") {
        setEditActionObj(setAllObject);
      } else {
        delete setAllObject.attributes[0].time_attr_id;
        delete setAllObject.attributes[0].start_time;
        delete setAllObject.attributes[0].end_time;
        updateSetAllDataHandler(setAllObject, "edit", attributeType);
      }
      // table actions
      tableInstance.current.api.refreshCells({
        force: true,
        suppressFlash: false,
        rowNodes: [parentRowNode],
      });
      setFlag_edit(true);
      tableInstance.current.api.flashCells({ rowNodes: [parentRowNode] });
    }
  };

  // row highlighting based on conflict present in status
  const getRowStyle = (params) => {
    if (params.node.level === 0 && params.node.data) {
      if (params.node.data.hasConflict) return { background: colours.wispPink };
    }

    return null;
  };

  const onFilterDashboardClick = (dependencyData) => {
    onFilterDependency.current = dependencyData;
    onFilter(true);
  };

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      // inventorysmartModulesPermission, module  will be undefined in work flow input center flow
      props?.inventorysmartModulesPermission,
      props?.module,
      subModuleName,
      action
    );
  };

  const getCustomDependencyFilter = (initialDependency) => {
    return addCustomStatusDependency(initialDependency, "product");
  };

  /**
   * @function
   * @description Prepare payload and request table data download which will be updated via notification
   */
  const downloadData = async () => {
    const origin = window.location.origin;
    const unique_col = checked ? "aggregation_code" : "product_code";
    try {
      const primaryColsMap = cloneDeep(
        tableInstance.current.columnApi.columnModel.primaryColumnsMap
      );
      const filterBody = tableInstance.current.api.gridOptionsWrapper
        .gridOptions.filterBody || { search: [], range: [], sort: [] };
      // Function to flatten columns and extract subheaders
      const flattenColumns = (columns) => {
        const flattened = [];
        columns.forEach((item) => {
          if (item.sub_headers && item.sub_headers.length > 0) {
            // If column has subheaders, add only the subheaders (children)
            item.sub_headers.forEach((subHeader) => {
              if (
                subHeader.column_name &&
                primaryColsMap[subHeader.column_name] &&
                primaryColsMap[subHeader.column_name].visible
              ) {
                flattened.push({
                  label: subHeader.label,
                  column_name: subHeader.column_name,
                });
              }
            });
          } else {
            // If no subheaders, add the column itself
            if (
              item.column_name &&
              primaryColsMap[item.column_name] &&
              primaryColsMap[item.column_name].visible
            ) {
              flattened.push({
                label: item.label,
                column_name: item.column_name,
              });
            }
          }
        });
        return flattened;
      };

      let columns = flattenColumns(checked ? styleColumns : productColumns);
      const body = {
        table_payload: {
          total_count: Number(totalRowsCount),
          columns: columns,
          filters: onFilterDependency.current,
          meta: {
            ...filterBody,
            limit: { limit: -1, page: 0 },
          },
          headers: [],
          selection: {
            data: tableInstance?.current?.api?.checkConfiguration,
            unique_columns: [unique_col],
          },
        },
        table_api: `${origin}/api/v2/master/dimension-table/product`,
      };
      let response = await downloadTableData(body);
      if (response.data.status) {
        displaySnackMessages(
          "Please wait for download notification to be received shortly",
          "success"
        );
      } else throw response.data.status;
    } catch (error) {
      props.handleErrorMessage(error);
    }
  };

  let noOfItems = 0
  if (!isEmpty(editableFieldsList)) {
    noOfItems = editableFieldsList[0]?.fields?.length + 1
  }
  const renderContent = () => {
    return (
    <div style={{marginTop:IS_OVERRIDEN_CORE_BUTTON_PLACEMENT}}>
      <CoreComponentScreen
        IscoreButtonWidth = {IS_OVERRIDEN_CORE_BUTTON_WIDTH}
        // pageLabel={dynamicLabelsBasedOnTenant("product_status", "core")}
        showPageRoute={props.hideBreadCrumbs ? false : true}
        showPageHeader={false}
        routeOptions={[
          {
            label: `${captializeStringIfCamelCase(
              dynamicLabelsBasedOnTenant("product", "core")
            )} Status`,
            id: 1,
            action: () => {
              navigate("/product-status");
            },
          },
        ]}
        // Filter dashboard props
        showFilterDashboard={true}
        filterConfigKey={"productStatusFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={true}
        screenName={"product status"}
        autoHideFilterButton={true}
        // customDependencyValue={getCustomDependencyFilter}
      >
        <Loader loader={showloader}>
          <div data-testid="filterContainer">
            <Prompt when={flag_edit} message={""} />
            <IaPrompt
              isOpen={showModal}
              title="Confirm Changes"
              onPrimaryButtonClick={() => {
                  onConfirm(setAllData, false);
                  setShowModal(false);
                }}
              onSecondaryButtonClick={() => setShowModal(false)}
              primaryButtonLabel="Update"
              secondaryButtonLabel="Close"
              handleClose={() => setShowModal(false)}
              variant="info"
            >
                  Are you sure to save all your changes?
            </IaPrompt>

            {confirmBox && (
              <ConfirmBox
                onClose={() => {
                  showConfirmBox(false);
                }}
                onConfirm={() => handleConfirmBox()}
              />
            )}
            {createProduct && (
              <CreateProductModal
                onApply={createNewProducFunc}
                toggleError={(errMsg) => {
                  displaySnackMessages(errMsg, "error");
                }}
                handleModalClose={() => showCreateProduct(false)}
                accessData={[]}
              ></CreateProductModal>
            )}

            {productColumns.length > 0 && (
              <div>
                {setAll && (
                  <SetAllMultiRow
                    updateDefaultValue={false}
                    setDefaultDateFieldValues={true}
                    onApply={setAllChanges}
                    fieldList={editableFieldsList}
                    customFieldList={customEditableFieldsList}
                    handleModalClose={() => toggleSetAll(false)}
                    formatMultiRowData={formatSetAllData}
                    additionalContainer={
                      isMultipleStatus && (
                        <ConflictResolutionModal
                          resolutionType={resolutionType}
                          setResolutionType={setResolutionType}
                        />
                      )
                    }
                    isMultipleStatus={isMultipleStatus}
                    size = "large"
                    layout={noOfItems > 4 ? "vertical" : "clusterGraph"}
                    alignFields = "end"
                  />
                )}
                {checked && (
                  <AgGridComponent
                    columns={styleColumns}
                    selectAllHeaderComponent={hasEditPermissions}
                    onSelectionChanged={onStyleSelectionChanged}
                    onGridChanged
                    manualCallBack={(body, pageIndex, params) =>
                      productStyleManualCallBack(body, pageIndex, params)
                    }
                    rowModelType="serverSide"
                    serverSideStoreType="partial"
                    cacheBlockSize={props.pageSize || 10}
                    paginationPageSize={props.pageSize || 10}
                    uniqueRowId={dynamicLabelKeysBasedOnTenant("style", "core")}
                    hideChildSelection={true}
                    loadTableInstance={setNewTableInstance}
                    showSetAll={false}
                    purgeClosedRowNodes={true}
                    suppressAggFuncInHeader={true}
                    suppressClickEdit={true}
                    rowSelection={"multiple"}
                    onCellValueChanged={onCellValueChanged}
                    getRowStyle={getRowStyle}
                    groupDisplayType={"custom"}
                    treeData={true}
                    childKey={"status_obj"}
                    onRowSelected
                    tableName={"product_status_style"}
                    topRightOptions = {getTopRightTableOptions()}
                    topLeftOptions = {getTopLeftOptions()}
                    tableHeader = {getTableHeader()}
                    showDownloadButton = {showDownloadBtn && totalRowsCount > 0}
                    onDownloadButtonClick = {() => downloadData()}
                    isChatEnabled={isThreadFeatureEnabled}
                    enableCellComment={false}
                    appliedFilters={onFilterDependency.current}
                    selectedRowsIDs={selectedStyleRowsIDs}
                    requestUrl={`/master/dimension-table/aggregate/product`}
                  />
                )}
                {!checked && (
                  <AgGridComponent
                    columns={productColumns}
                    selectAllHeaderComponent={hasEditPermissions}
                    onSelectionChanged={onProductSelectionChanged}
                    onGridChanged
                    manualCallBack={(body, pageIndex, params) =>
                      productStatusManualCallBack(body, pageIndex, params)
                    }
                    rowModelType="serverSide"
                    serverSideStoreType="partial"
                    cacheBlockSize={props.pageSize || 10}
                    paginationPageSize={props.pageSize || 10}
                    uniqueRowId={"product_code"}
                    hideChildSelection={true}
                    loadTableInstance={setNewTableInstance}
                    showSetAll={false}
                    purgeClosedRowNodes={true}
                    suppressAggFuncInHeader={true}
                    rowSelection={"multiple"}
                    suppressClickEdit={true}
                    onCellValueChanged={onCellValueChanged}
                    getRowStyle={getRowStyle}
                    groupDisplayType={"custom"}
                    treeData={true}
                    childKey={"status_obj"}
                    onRowSelected
                    onColumnGroupOpened={(params) => {
                      params.api.resizeGridColumns(params);
                    }} //resize columns to fit content when column group is opened
                    suppressColumnVirtualisation={true}
                    topRightOptions = {getTopRightTableOptions()}
                    topLeftOptions = {getTopLeftOptions()}
                    tableHeader = {getTableHeader()}
                    showDownloadButton = {showDownloadBtn && totalRowsCount > 0}
                    onDownloadButtonClick = {() => downloadData()}
                    isChatEnabled={isThreadFeatureEnabled}
                    enableCellComment={false}
                    tableName={"product_status"}
                    requestUrl={`/master/dimension-table/product`} 
                    appliedFilters={onFilterDependency.current}
                    selectedRowsIDs={selectedProductRowsIDs}
                  />
                )}
              </div>
            )}
          </div>
        </Loader>
      </CoreComponentScreen>
    </div>
    );
  };

  return <React.Fragment>{renderContent()}</React.Fragment>;
}
const mapDispatchToProps = {
  addSnack,
  getTenantConfigApplicationLevel,
  setFilterConfiguration,
  resetTableRecentChanges,
};
const mapStateToProps = (state) => {
  return {
    selectedFilters: state.filterReducer.selectedFilters["product status"],
    userAccessList:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer.userAccessList,
    filterDashboardConfiguration:
      state.filterReducer.filterDashboardConfiguration[
        "productStatusFilterConfiguration"
      ],
    inventorysmartModulesPermission:
      state.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    savedFilterSelection: state.filterReducer.savedFilterSelection,
    pageSize: state.inventorysmartReducer.inventorySmartCommonService.inventorysmartScreenConfig?.inventorysmart_page_count,
    inventorysmartScreenConfig:
      state.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
    commentingConfig: state?.tenantConfigReducer?.commentingConfig
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(ProductsFilter);
