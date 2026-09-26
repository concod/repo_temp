import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import makeStyles from "@mui/styles/makeStyles";
import { findIndex, forEach, isEmpty, uniqBy } from "lodash";
import {
  ERROR_MESSAGE,
  INVENTORY_SUBMODULES_NAMES,
  NO_DATA_FOUND,
  POP_UP_TYPE,
  PRODUCT_RULE_POP_UP_TITLE,
  UPDATED_MESSAGE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";

import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { getSelectedFiltersFromConfig } from "core/commonComponents/coreComponentScreen/utils";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

import { addSnack } from "core/actions/snackbarActions";

import {
  getProductRulePOPUPTableData,
  getRuleHeaderConfiguration,
  saveProductRulePOPUPTableData,
  setProductRulePopUpLoader,
  setSavePayloadForPopUp,
  setSelectedStoreGroupDataPopUp,
} from "modules/inventorysmart/services-inventorysmart/Product-Profile/product-rule-services";

import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { isActionAllowedOnSubModule } from "../../inventorysmart-utility";
import { getAllocationRules } from "modules/inventorysmart/services-inventorysmart/Auto-Allocation-Rules/auto-allocation-rules-service";

const ALLOCATION_OPTIONS = [
  {
    label: "Scheduler View",
    value: "scheduler",
  },
  {
    label: "Store View",
    value: "store",
  },
];
const useStyles = makeStyles((theme) => ({
  labelPopUp: {
    marginRight: "1.25rem",
    fontWeight: 500,
  },
  dialogPaper: {
    minHeight: "30vh",
    maxHeight: "60vh",
  },
  selectedGroup: {
    display: "flex",
    margin: "1rem 0",
    alignItems: "center",
  },
  hideCheckBox: {
    display: "none",
  },
  labelContainer: {
    paddingRight: "0.5rem",
  },
  selectedGroupLabel: {
    marginRight: "1.25rem",
  },
}));
const ProductRulePopUp = ({
  active,
  _openModal,
  closeModal,
  _filters,
  popUpColumnData,
  popUpROWData,
  ...props
}) => {
  const classes = useStyles();
  const [storeGroupRowData, setStoreGroupRowData] = useState([]);
  const [
    storeGroupDefaultSelectedRowData,
    setStoreGroupDefaultSelectedRowData,
  ] = useState([]);
  const [productDCMappingDefault, setProductDCMappingDefault] = useState([]);
  const [dcAndProductColumn, setDcAndProductColumn] = useState([]);
  const [productDCMappingRowData, setProductDCMappingRowData] = useState([]);
  const [agGridInstance, setSetGridInstance] = useState({});
  const [popUpType, setPopUpType] = useState("");

  const [columnDefs, setColumnDefs] = useState([]);
  const mappingTableGridInstance = useRef(null);
  const [selectedGroupsValue, setSelectedGroupsValue] = useState("");
  const [dimension, setDimension] = useState("scheduler");
  const [render, setRender] = useState(true);
  const [updatedStoreList ,setUpdatedStoreList] = useState({});
  const updatedStoreListRef = useRef(updatedStoreList);

  // Update the ref whenever the updatedStoreList state changes
  // the ref is required as the callback functions like manualCallBackStoregroup 
  // will not have the latest updated state value for updatedStoreList.
  useEffect(() => {
    updatedStoreListRef.current = updatedStoreList;
  }, [updatedStoreList]);

  useEffect(() => {
    setRender(true);
  }, [dimension]);

  const loadTableInstance = (params) => {
    setSetGridInstance(params);
    mappingTableGridInstance.current = params;
  };
  const autoGroupColumnDef = {
    headerName: "Store Group",
    minWidth: 200,
    width: 350,
  };

  const fetchStoreMappingData = async () => {
    try {
      props.setProductRulePopUpLoader(true);
      let bodyPayload = {};
      if (popUpColumnData?.accessor === "dc_mapped") {
        bodyPayload = {
          selection_type: "dc",
          article: popUpROWData?.article,
          application_code: 1,
          ph_code: popUpROWData?.ph_code,
          channel: setChannel(),
          retail_region:setRetailRegion(),
          available: popUpROWData?.dc_available || [],
          default: popUpROWData?.default_dcs || [],
        };
      } else if (popUpColumnData?.accessor === "product_profile_name") {
        // payload to be changed once api is up
        bodyPayload = {
          selection_type: "product_profile",
          ph_code: popUpROWData?.ph_code,
          channel: popUpROWData?.channel,
          available: popUpROWData?.product_profile_available || 0,
          default:
            popUpROWData?.default_product_profile == null
              ? []
              : [popUpROWData?.default_product_profile],
        };
      }

      let response = await props.getProductRulePOPUPTableData(
        bodyPayload,
        "mapping-details"
      );
      if (response?.data?.available.length > 0) {
        let selectedRows = response.data.available
          .filter((row) => {
            let isItemPresent = response.data.selected.indexOf(
              row.dc_code || row.pp_code
            );
            if (isItemPresent > -1) {
              return row.dc_code || row.pp_code;
            }
          })
          .map((modifiedRow) => modifiedRow.dc_code || modifiedRow.pp_code);

        let selectedRowsWithCode = uniqBy(selectedRows, function (e) {
          return e;
        });

        setProductDCMappingRowData(response?.data?.available);
        setProductDCMappingDefault(selectedRowsWithCode);
        props.setProductRulePopUpLoader(false);
      } else {
        displaySnackMessages(NO_DATA_FOUND, "success");
        setProductDCMappingRowData([]);
        props.setProductRulePopUpLoader(false);
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const manualCallBackStoregroup = async (manualbody, pageIndex, params) => {
    try {
      props.setProductRulePopUpLoader(true);
      let bodyPayload = {};
      if (popUpColumnData?.accessor === "store_group_mapped_display") {
        setPopUpType(POP_UP_TYPE.store);
        bodyPayload = {
          article: popUpROWData?.article,
          channel: setChannel(),
          retail_region:setRetailRegion(),
          selection_type: "store",
          application_code: 1,
          available: popUpROWData?.store_group_available || [],
          meta: {
            ...manualbody,
            limit: { limit: 10, page: pageIndex + 1 },
          },
          default:
            popUpROWData?.default_store_groups == null
              ? []
              : popUpROWData?.default_store_groups,
        };
      }
      let response = await props.getProductRulePOPUPTableData(
        bodyPayload,
        "mapping-details"
      );

      if (response.data.available.length === 0) {
        displaySnackMessages(NO_DATA_FOUND, "success");
        props.setProductRulePopUpLoader(false);
        setStoreGroupRowData([]);
      }
      let selectedRows = response.data.available
        .filter((row) => {
          let isItemPresent = response.data.selected.indexOf(row.sg_code);
          if (isItemPresent > -1) {
            return row.sg_name;
          }
        })
        .map((modifiedRow) => modifiedRow.sg_name);

      let selectedRowsWithName = uniqBy(selectedRows, function (e) {
        return e;
      });
      response.data.available.forEach((row) => {
        let isItemPresent = response.data.selected.indexOf(row.sg_code);
        if (isItemPresent > -1) {
          row.is_selected = true;
        } else {
          row.is_selected = false;
        }
        row.isGroupFlag = !row.is_disabled;
      });
      let selectedConfig = response.data.selected
        ? [
            { checkedRows: response.data.selected },
            ...(params?.api?.checkConfiguration
              ? params?.api?.checkConfiguration
              : []),
          ]
        : params?.api?.checkConfiguration;
      let formattedData = agGridRowFormatter(
        response.data.available,
        selectedConfig,
        "sg_code"
      );

      if (!isEmpty(updatedStoreListRef.current)) {
        formattedData.forEach((row) => {
          if (updatedStoreListRef.current?.available.hasOwnProperty(row.sg_code)) {
            row.is_selected = updatedStoreListRef.current?.available[row.sg_code];
            row.available = updatedStoreListRef.current?.available[row.sg_code];
          }
          if (updatedStoreListRef.current?.default.hasOwnProperty(row.sg_code)) {
            row.selected = updatedStoreListRef.current?.default[row.sg_code];
          }
        });
      }
      
      const finalTableData = formattedData.sort(
        (a, b) => Number(b.is_selected) - Number(a.is_selected)
      );
      setStoreGroupRowData(finalTableData);
      setStoreGroupDefaultSelectedRowData(selectedRowsWithName);
      props.setProductRulePopUpLoader(false);
      return {
        data: finalTableData,
        totalCount: response.data?.total,
      };
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setProductRulePopUpLoader(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };
  const setChannel = () => {
    let allFiltersData = props.filterDashboardConfigurationObj.filter(
      (item) => item.screen_name === "Inventorysmart Configurations"
    )[0];
    let channel = [];
    let alreadySelectedChannel = getSelectedFiltersFromConfig(
      props.filterDashboardConfigurationObj,
      0,
      props.filterReducer
    )
      ?.filter((item) => item.filter_id === "channel")
      .map((item) => item.values)[0];
    if (alreadySelectedChannel && alreadySelectedChannel?.length > 0) {
      channel = alreadySelectedChannel;
    } else {
      let allChannelData = allFiltersData?.filterDashboardData
        ?.filter((item) => item.column_name === "channel")
        .map((item) => item.initialData)[0];
      channel = allChannelData?.map((item) => item.value);
    }
    return channel ? channel : [];
  };
  const setRetailRegion = () => {
    let allFiltersData = props.filterDashboardConfigurationObj.filter(
      (item) => item.screen_name === "Inventorysmart Configurations"
    )[0];
    let retailRegion = [];
    let alreadySelectedRetailRegion = getSelectedFiltersFromConfig(
      props.filterDashboardConfigurationObj,
      0,
      props.filterReducer
    )
      ?.filter((item) => item.filter_id === "retail_region")
      .map((item) => item.values)[0];
    if (alreadySelectedRetailRegion && alreadySelectedRetailRegion?.length > 0) {
      retailRegion = alreadySelectedRetailRegion;
    } else {
      let allRetailRegionData = allFiltersData?.filterDashboardData
        ?.filter((item) => item.column_name === "retail_region")
        .map((item) => item.initialData)[0];
      retailRegion = allRetailRegionData?.map((item) => item.value);
    }
    return retailRegion ? retailRegion : [];
  };

  const manualCallBackProductProfileMapped = async (manualbody, pageIndex) => {
    try {
      props.setProductRulePopUpLoader(true);
      let bodyPayload = {
        selection_type: "product_profile",
        channel: setChannel(),
        retail_region:setRetailRegion(),
        article: popUpROWData?.article,
        application_code: 1,
        available: popUpROWData?.product_profile_available || 0,
        meta: {
          ...manualbody,
          limit: { limit: 10, page: pageIndex + 1 },
        },
        default:
          popUpROWData?.default_product_profile == null
            ? []
            : [popUpROWData?.default_product_profile],
      };

      let response = await props.getProductRulePOPUPTableData(
        bodyPayload,
        "mapping-details"
      );
      if (response?.data?.available.length > 0) {
        response.data.available = response.data.available.map((row) => {
          let isItemPresent = response.data.selected.indexOf(
            row.dc_code || row.pp_code
          );
          if (isItemPresent > -1) {
            row.is_selected = true;
          }
          return row;
        });

        setProductDCMappingRowData(response?.data?.available);
        props.setProductRulePopUpLoader(false);
        return {
          data: response?.data?.available,
          totalCount: response.data?.total,
        };
      } else {
        displaySnackMessages(NO_DATA_FOUND, "success");
        setProductDCMappingRowData([]);
        props.setProductRulePopUpLoader(false);
        return {
          data: [],
          totalCount: 0,
        };
      }
    } catch (err) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setProductRulePopUpLoader(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const manualCallAllocationRuleMapped = async (
    manualbody,
    pageIndex,
    params,
    currentSelectedRadio
  ) => {
    try {
      props.setProductRulePopUpLoader(true);
      let l_channel = setChannel();
      let bodyPayload = {
        channel: l_channel[0],
        article: popUpROWData?.article,
        meta: {
          ...manualbody,
          limit: { limit: 10, page: pageIndex + 1 },
        },
        ...(currentSelectedRadio === "store" && { filters: props.filters }),
       
        // for BE to understand it is for Schedular or Store API
    };

      let response = await props.getProductRulePOPUPTableData(
        bodyPayload,
        currentSelectedRadio === "store"
          ? "stores-allocation-schedulers"
          : "allocation-schedulers"
      );
      if (response?.data.length) {
        setProductDCMappingRowData(response?.data);
        props.setProductRulePopUpLoader(false);
        return {
          data: response?.data,
          totalCount: response.data.length,
        };
      } else {
        displaySnackMessages(NO_DATA_FOUND, "success");
        setProductDCMappingRowData([]);
        props.setProductRulePopUpLoader(false);
        return {
          data: [],
          totalCount: 0,
        };
      }
    } catch (err) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setProductRulePopUpLoader(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const saveHandlerPopUp = async () => {
    props.setProductRulePopUpLoader(true);
    let selectedRowData;
    let selectedRowsForLocalUpdate;
    let channel = [];

    let allFiltersData = props.filterDashboardConfigurationObj.filter(
      (item) => item.screen_name === "Inventorysmart Configurations"
    )[0];
    if (popUpType === POP_UP_TYPE.store) {
      selectedRowData = agGridInstance.api.getSelectedNodes().map((row) => {
        return row?.data?.sg_code;
      });
      selectedRowsForLocalUpdate = [];
      agGridInstance.api.getSelectedNodes().forEach((masterRow) => {
        selectedRowsForLocalUpdate.push(masterRow.group);
      });
    } else if (popUpType === POP_UP_TYPE.auto_allocation) {
      selectedRowsForLocalUpdate = agGridInstance.api
        .getSelectedNodes()
        .map((row) => {
          return row.data;
        });

      selectedRowData = selectedRowsForLocalUpdate.map((selectedItems) => {
        return selectedItems?.rule_code;
      });
    } else {
      selectedRowsForLocalUpdate = agGridInstance.api
        .getSelectedNodes()
        .map((row) => {
          return row.data;
        });

      selectedRowData = selectedRowsForLocalUpdate.map((selectedItems) => {
        return selectedItems?.dc_code || selectedItems?.pp_code;
      });
    }
    let alreadySelectedChannel = allFiltersData?.filterDependencyData
      ?.filter((item) => item.filter_id === "channel")
      .map((item) => item.values)[0];
    if (alreadySelectedChannel && alreadySelectedChannel?.length > 0) {
      channel = alreadySelectedChannel;
    } else {
      let allChannelData = allFiltersData?.filterDashboardData
        ?.filter((item) => item.column_name === "channel")
        .map((item) => item.initialData)[0];
      channel = allChannelData?.map((item) => item.value);
    }
    if (popUpType === POP_UP_TYPE.product_profile) {
      let allChannelData = allFiltersData?.filterDashboardData
        ?.filter((item) => item.column_name === "channel")
        .map((item) => item.initialData)[0];
      channel = allChannelData?.map((item) => item.value);
    }
    let l_selectedValues,
      l_defaultValues = [];
    if (
      props.defaultAndAvailableSelections &&
      popUpType === POP_UP_TYPE.store
    ) {
      let l_popUpData = [];
      mappingTableGridInstance.current?.api?.forEachNode((node) => {
        l_popUpData.push(node?.data);
      });
      l_selectedValues = l_popUpData
        ?.filter((val) => val.available)
        ?.map((value) => value?.sg_code);
      l_defaultValues = l_popUpData
        ?.filter((val) => val.selected)
        ?.map((value) => value?.sg_code);
    } else {
      l_selectedValues =
        popUpType === POP_UP_TYPE.store ||
        popUpType === POP_UP_TYPE.dc ||
        popUpType === POP_UP_TYPE.auto_allocation
          ? selectedRowData
          : selectedRowData[0];
    }
    let updatedSelectedValues = [];
    let updatedDefaultValues = [];
    const availableUnSelected = [];
    const defaultUnSelected = [];
    const available = [];
    const defaultItems = [];
    if (popUpType === POP_UP_TYPE.store) {
      forEach(updatedStoreListRef.current?.default, (item, key) => {
        if (item) defaultItems.push(Number(key));
        else defaultUnSelected.push(Number(key));
      });

      updatedDefaultValues = [...new Set([...l_defaultValues, ...defaultItems])];

      forEach(updatedStoreListRef.current?.available, (item, key) => {
        if (item) {
          available.push(Number(key));
        } else {
          availableUnSelected.push(Number(key));
          
          if (updatedDefaultValues.includes(Number(key))) {
            defaultUnSelected.push(Number(key));
            updatedDefaultValues = updatedDefaultValues.filter(value => value !== Number(key));
          }
        }
      });
      updatedSelectedValues = [...new Set([...l_selectedValues, ...available])];
    }


    let updatePayload = {
      selection_type: popUpType,
      ph_code: popUpROWData?.ph_code,
      channel: channel ? channel : [],
      selectedRowData: [...selectedRowsForLocalUpdate],
      selected_values: popUpType === POP_UP_TYPE.store ? updatedSelectedValues : l_selectedValues,
      default_selected: popUpType === POP_UP_TYPE.store ? updatedDefaultValues : l_defaultValues,
      available_unselected: availableUnSelected,
      default_unselected: defaultUnSelected
    };    
    
    
    try {
      let saveResponse = await props.saveProductRulePOPUPTableData(
        updatePayload
      );
      if (!saveResponse.message) {
        throw ERROR_MESSAGE;
      }
      props.setProductRulePopUpLoader(true);
      props.setSavePayloadForPopUp(updatePayload);
      displaySnackMessages(UPDATED_MESSAGE, "success");
      props.setProductRuleTableLoader(true);
      props.agGridInstance.api?.deselectAll();
      props.agGridInstance.api?.setCheckConfiguration([]);

      // fetch table data to show the updated store group/stores mapped count
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      setStoreGroupRowData([]);
      setProductDCMappingRowData([]);
      closeModal();
      props.agGridInstance.api?.refreshServerSideStore({ purge: true });
    }
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };
  const getRowStyle = (params) => {
    if (params?.data?.is_disabled) {
      return { background: "#f7f7f7" };
    }
  };
  const setCustomClassName = (row, item) => {
    if (row?.sg_name) {
      return {};
    } else {
      return classes.hideCheckBox;
    }
  };

  const fetchStoreData = async () => {
    try {
      props.setProductRulePopUpLoader(true);
      let l_channel = setChannel();
      let bodyPayload = {
        channel: l_channel[0],
        article: popUpROWData?.article,
        filters:props.filters
        // for BE to understand it is for Schedular or Store API
      };

      let response = await props.getProductRulePOPUPTableData(
        bodyPayload,
        "stores-allocation-schedulers"
      );
      if (response?.data.length) {
        setProductDCMappingRowData(response?.data);
        props.setProductRulePopUpLoader(false);
      } else {
        displaySnackMessages(NO_DATA_FOUND, "success");
        setProductDCMappingRowData([]);
        props.setProductRulePopUpLoader(false);
      }
    } catch (err) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setProductRulePopUpLoader(false);
    }
  };

  useEffect(() => {
    const fetchColumnData = async () => {
      let columns = [];

      if (popUpColumnData?.accessor === "store_group_mapped_display") {
        columns = await getRuleHeaderConfiguration(
          "inventorysmart_pr_store_groups"
        )();
        // fetch row data
        // getSGGroupingTableData();

        //set type of popup
        setPopUpType(POP_UP_TYPE.store);
        columns.forEach((column) => {
          if (column?.column_name === "sg_name") {
            column["cellRenderer"] = "agGroupCellRenderer";
            column.rowGroup = true;
          }
          if (
            column?.column_name === "available" ||
            column?.column_name === "selected"
          ) {
            column.customClassName = setCustomClassName;
          }
        });

        //set column data
        setColumnDefs(columns);
        return;
        /* return from function as grouping table has different logic for displaying table
            Set -> Column definition & Popup Type
         */
      } else if (popUpColumnData?.accessor === "dc_mapped") {
        columns = await getRuleHeaderConfiguration(
          "inventorysmart_pr_dc_mapping"
        )();
        columns.map((column) => (column["width"] = "350"));
        setPopUpType(POP_UP_TYPE.dc);
        fetchStoreMappingData();
      } else if (popUpColumnData?.accessor === "product_profile_name") {
        setPopUpType(POP_UP_TYPE.product_profile);
        columns = await await getRuleHeaderConfiguration(
          "inventorysmart_pr_product_profile_mapping"
        )();
      } else if (popUpColumnData?.accessor === "rule_name") {
        setPopUpType(POP_UP_TYPE.auto_allocation);
        if (dimension === "store") {
          columns = await getRuleHeaderConfiguration(
            "inventorysmart_pr_alloc_rule_store_view"
          )();
          fetchStoreData();
        } else {
          columns = await getRuleHeaderConfiguration(
            "inventorysmart_pr_allocation_rule_details"
          )();
        }
      }
      let formattedColumns = agGridColumnFormatter(columns);
      setDcAndProductColumn(formattedColumns);
    };

    if (active) {
      fetchColumnData();
    }

    return () => {
      setProductDCMappingRowData([]);
      setStoreGroupRowData([]);
    };
  }, [active, dimension]);

  const gridSelectionType = () => {
    if (popUpType === POP_UP_TYPE.store || popUpType === POP_UP_TYPE.dc) {
      return "multiple";
    }
    return "single";
  };

  const gridUniqueKey = () => {
    if(popUpType === POP_UP_TYPE.auto_allocation && dimension === "store"){
      return "retail_facility_code";
    }
    if(popUpType === POP_UP_TYPE.auto_allocation && dimension === "scheduler"){
      return "rule_name";
    }
    if (popUpType === POP_UP_TYPE.store || popUpType === POP_UP_TYPE.dc) {
      return "dc_code";
    } else if (popUpType === POP_UP_TYPE.auto_allocation) {
      return "rule_code";
    }
    return "pp_code";
  };

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      props.module,
      subModuleName,
      action
    );
  };
  const setReadonlyStyleValue = () => {
    if (popUpROWData?.human_readable_color) {
      return replaceSpecialCharacter(popUpROWData?.human_readable_color);
    }
    if (popUpROWData?.color) {
      return replaceSpecialCharacter(popUpROWData?.color);
    }
    if (popUpROWData?.style) {
      return replaceSpecialCharacter(popUpROWData?.style);
    }

    return "-";
  };
  const setReadOnlyStyleDescValue = () => {
    if (popUpROWData?.style_description) {
      return replaceSpecialCharacter(popUpROWData?.style_description);
    }
    if (popUpROWData?.product_description) {
      return replaceSpecialCharacter(popUpROWData?.product_description);
    }
    return "-";
  };

  const onCheckBoxChange = (p_checked, p_rowData, p_column) => {
    if (p_column?.colId === "selected" && p_checked) {
      p_rowData.available = true;
      mappingTableGridInstance?.current?.api?.refreshCells();
    }
    setUpdatedStoreList((prevUpdatedStoreList) => {
      const editedStoreObject = {
        available: { ...prevUpdatedStoreList.available },
        default: { ...prevUpdatedStoreList.default },
      };
  
      if (p_column?.colId === "selected") {
        editedStoreObject.default[p_rowData.sg_code] = p_checked;
        if (p_checked) {
          editedStoreObject.available[p_rowData.sg_code] = p_checked;
        }
      } else {
        editedStoreObject.available[p_rowData.sg_code] = p_checked;
      }
  
      return editedStoreObject;
    });
  };
  const selectedStoreGroupsText = (params) => {
    let selectedRowsForLocalUpdate = params?.api
      ?.getSelectedNodes()
      .map((row) => {
        return row?.data?.sg_name;
      });
    let finalText =
      selectedRowsForLocalUpdate?.length > 0
        ? replaceSpecialCharacter(selectedRowsForLocalUpdate.join(", "))
        : "";
    setSelectedGroupsValue(finalText);
  };

  const dimensionHandleChange = (event) => {
    setRender(false);
    setDimension(event.target.value);
  };

  return active ? (
    <Dialog
      classes={{ paper: classes.dialogPaper }}
      id="productRulePopup"
      aria-labelledby="product-rule-dialog"
      open={active}
      maxWidth="lg"
      fullWidth={true}
      disableEscapeKeyDown={true}
      onClose={(_event, reason) => {
        if (reason === "backdropClick") {
          return;
        }
        closeModal();
      }}
    >
      <DialogTitle id="product-rule-dialog">
        {PRODUCT_RULE_POP_UP_TITLE[popUpColumnData?.accessor]}
      </DialogTitle>
      <DialogContent dividers style={{ height: "350px" }}>
        <Grid
          container
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          style={{ margin: "1rem 0" }}
        >
          {popUpType === POP_UP_TYPE.auto_allocation && (
            <Grid>
              <label className={classes.labelPopUp}>Channel:</label>
              <label>{popUpROWData.channel || "-"}</label>
            </Grid>
          )}
          <Grid>
            <label className={classes.labelPopUp}>
              {props.dynamicLabels?.style_color ||
                props.dynamicLabels?.article_number ||
                "Article ID"}
              :
            </label>{" "}
            <label>{popUpROWData?.article || "-"}</label>
          </Grid>
          {props.articleHeading !== "SKU" &&
            props.dynamicLabels?.style_color !== "Article ID" &&
            props.dynamicLabels?.style_color !== "Style Color ID" && (
              <Grid>
                <label className={classes.labelPopUp}>
                  {props.dynamicLabels?.style_color || "Style Color"}:
                </label>{" "}
                <label>{setReadonlyStyleValue()}</label>
              </Grid>
            )}
          <Grid className={classes.labelContainer}>
            <label className={classes.labelPopUp}>
              {props.dynamicLabels?.article_description}:
            </label>{" "}
            <label>{setReadOnlyStyleDescValue()}</label>
          </Grid>
        </Grid>
        {/* Grid for row grouped store grouping table */}
        {popUpType === POP_UP_TYPE.store && (
          <>
            <div className={classes.selectedGroup}>
              <Typography
                className={classes.selectedGroupLabel}
                component="h1"
                variant="h4"
              >
                Selected Store Groups:
              </Typography>

              <span>{selectedGroupsValue}</span>
            </div>
            <Loader loader={props.productRulePopUpLoader} minHeight={"350px"}>
              {columnDefs?.length > 0 && (
                <>
                  <AgGridComponent
                    columns={columnDefs}
                    manualCallBack={(body, pageIndex, params) =>
                      manualCallBackStoregroup(body, pageIndex, params)
                    }
                    onCheckBoxChange={onCheckBoxChange}
                    getRowStyle={getRowStyle}
                    onRowSelected
                    rowModelType={"serverSide"}
                    serverSideStoreType="partial"
                    hideChildSelection={true}
                    hideSelectAllRecords={true}
                    loadTableInstance={loadTableInstance} // to make use of available grid api's
                    treeData={true}
                    sizeColumnsToFitFlag={true}
                    groupDisplayType={"custom"}
                    cacheBlockSize={10}
                    childKey={"store_details"}
                    checkRowMasterKey={"isGroupFlag"}
                    totalCount={100} // to set the total count once received from BE
                    uniqueRowId={"sg_code"}
                    rowSelection="multiple"
                    onSelectionChanged={(params) => {
                      selectedStoreGroupsText(params);
                    }}
                    ignoreClearSelectionOnSearchandSort={true}
                    selectAllHeaderComponent={
                      !props.defaultAndAvailableSelections
                    }
                  />
                </>
              )}
            </Loader>
          </>
        )}

        {/* Grid for DC and product profiling table */}
        {popUpType === POP_UP_TYPE.dc && (
          <Loader
            loader={
              props.productRulePopUpLoader
              // &&
              // !props.inventorysmartScreenConfigForInfiniteScrolling?.includes("CMMaterialDCMapped")
            }
            minHeight={"350px"}
          >
            {dcAndProductColumn?.length > 0 && productDCMappingRowData && (
              <>
                <AgGridComponent
                  selectAllHeaderComponent={true}
                  columns={dcAndProductColumn}
                  rowdata={productDCMappingRowData}
                  pagination={
                    !props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
                      "CMMaterialDCMapped"
                    )
                  }
                  uniqueRowId={gridUniqueKey()}
                  rowSelection={gridSelectionType()}
                  loadTableInstance={loadTableInstance} // to make use of available grid api's
                  selectEachRow={false}
                  sizeColumnsToFitFlag={true}
                  hideSelectCurrentPageRecords={props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
                    "CMMaterialDCMapped"
                  )}
                  selectedRows={productDCMappingDefault || []}
                />
              </>
            )}
          </Loader>
        )}
        {popUpType === POP_UP_TYPE.product_profile && (
          <Loader loader={props.productRulePopUpLoader} minHeight={"350px"}>
            {dcAndProductColumn?.length > 0 && productDCMappingRowData && (
              <>
                <AgGridComponent
                  columns={dcAndProductColumn}
                  manualCallBack={(body, pageIndex, params) =>
                    manualCallBackProductProfileMapped(body, pageIndex, params)
                  }
                  rowModelType={"serverSide"}
                  serverSideStoreType="partial"
                  selectAllHeaderComponent={true}
                  uniqueRowId={gridUniqueKey()}
                  rowSelection={"single"}
                  hideHeaderCheckboxComponent={true}
                  sizeColumnsToFitFlag={true}
                  selectedRows={productDCMappingDefault || []}
                  cacheBlockSize={10}
                  loadTableInstance={loadTableInstance} // to make use of available grid api's
                />
              </>
            )}
          </Loader>
        )}
        {popUpType === POP_UP_TYPE.auto_allocation && (
          <Loader loader={props.productRulePopUpLoader} minHeight={"350px"}>
            <RadioGroup
              row
              aria-label="gender"
              name="controlled-radio-buttons-group"
              value={dimension}
              onChange={dimensionHandleChange}
            >
              {ALLOCATION_OPTIONS.map((item) => {
                return (
                  <FormControlLabel
                    value={item.value}
                    control={<Radio color="primary" />}
                    label={item.label}
                  />
                );
              })}
            </RadioGroup>
            {dcAndProductColumn?.length > 0 &&
              productDCMappingRowData &&
              render && (
                <>
                  <AgGridComponent
                    columns={dcAndProductColumn}
                    manualCallBack={(body, pageIndex, params) =>
                      manualCallAllocationRuleMapped(
                        body,
                        pageIndex,
                        params,
                        dimension
                      )
                    }
                    rowdata={
                      dimension === "store" ? productDCMappingRowData : {}
                    }
                    rowModelType={dimension === "store" ? "" : "serverSide"}
                    serverSideStoreType="partial"
                    selectAllHeaderComponent={
                      popUpType != POP_UP_TYPE.auto_allocation
                    }
                    hideHeaderCheckboxComponent={true}
                    hideSelectAllRecords={true}
                    uniqueRowId={gridUniqueKey()}
                    rowSelection={"single"}
                    sizeColumnsToFitFlag={true}
                    onRowSelected
                    cacheBlockSize={10}
                    loadTableInstance={loadTableInstance} // to make use of available grid api's
                  />
                </>
              )}
          </Loader>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={closeModal}
          id="productRulePopCancelBtn"
          color="primary"
          variant="outlined"
        >
          Cancel
        </Button>
        {popUpType !== POP_UP_TYPE.auto_allocation && (
          <Button
            onClick={saveHandlerPopUp}
            id="productRulePopCancelBtn"
            color="primary"
            variant="contained"
            disabled={
              props.productRulePopUpLoader ||
              (popUpColumnData?.accessor === "store_group_mapped_display" &&
                !storeGroupRowData.length) ||
              (popUpColumnData?.accessor === "product_profile_name" &&
                !productDCMappingRowData.length) ||
              !canTakeActionOnModules(
                INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_RULES,
                "edit"
              )
            }
          >
            Update and Save
          </Button>
        )}
      </DialogActions>
    </Dialog>
  ) : null;
};

const mapStateToProps = (store) => {
  return {
    inventorysmartScreenConfigForInfiniteScrolling:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfigForInfiniteScrolling,
    productRulePopUpLoader:
      store.inventorysmartReducer.productRuleService.productRulePopUpLoader,
    filterDashboardConfigurationObj:
      store.filterReducer.filterDashboardConfiguration
        .productRuleFilterConfiguration.filterConfig,
    articleHeading:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig.dynamicLabels.article,
    dynamicLabels:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig.dynamicLabels,
    defaultAndAvailableSelections:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig.defaultAndAvailableSelections,
    inventorysmartModulesPermission:
      store.inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    filterReducer: store.filterReducer,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setProductRulePopUpLoader: (payload) =>
    dispatch(setProductRulePopUpLoader(payload)),
  getProductRulePOPUPTableData: (body, screen) =>
    dispatch(getProductRulePOPUPTableData(body, screen)),
  setSelectedStoreGroupDataPopUp: (body) =>
    dispatch(setSelectedStoreGroupDataPopUp(body)),
  saveProductRulePOPUPTableData: (body) =>
    dispatch(saveProductRulePOPUPTableData(body)),
  setSavePayloadForPopUp: (body) => dispatch(setSavePayloadForPopUp(body)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  getAllocationRules: (body) => dispatch(getAllocationRules(body)),
});

export default connect(mapStateToProps, mapDispatchToProps)(ProductRulePopUp);
