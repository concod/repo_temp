import PropTypes from "prop-types";
import React, { useEffect, useState } from "react";
import {ButtonGroup, Modal} from "impact-ui-v3"
import ConfirmPrompt from "core/commonComponents/confirmPrompt";
import Form from "core/Utils/form";
import Loader from "core/Utils/Loader/loader";
import { isEmpty, isNull, isUndefined, update } from "lodash";
import { Grid, Paper, Tab, Tabs } from "@mui/material";
import { Box } from "@mui/system";
import {
  ERROR_MESSAGE,
  SET_ALL_FUNCTIONALITY_TABS_STORE_DC,
  SET_ALL_FUNCTIONALITY_TABS,
  UPDATED_MESSAGE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import moment from "moment";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import SetAllModal from "./set-all-modal";
import {
  saveDcStoreData,
  partialSaveDcStoreData,
} from "modules/inventorysmart/services-inventorysmart/DC-Store-Policy/dc-store-strategy";
import {
  setSetAllModalLoader,
  setSavedEditedRules,
} from "modules/inventorysmart/services-inventorysmart/DC-Store-Policy/dc-store-strategy";
import { saveRcl } from "modules/inventorysmart/services-inventorysmart/Rules-Contraints/rules-contraints-services";
import { displaySnackMessages } from "../../../inventorysmart-utility";
import { handleErrorMessage } from "../dCStoreStrategyTable";
export const EDIT_RULES = "/inventory-smart/edit-rules";
import { tableConfigurationMetaData } from "modules/inventorysmart/constants-inventorysmart/stringConstants";

const tabProps = (tabOption) => {
  return {
    id: `simple-tab-${tabOption?.label}`,
    label: tabOption?.label,
    value: tabOption?.value,
    "aria-controls": `simple-tabpanel-${tabOption?.label}`,
  };
};

const SetAllModalComponent = (props) => {
  // instance of the Main table. To refresh the table when we save in set all.
  const { isManageRclFlow, agGridInstance, resetSelectedRules } = props;

  const [rowData, setRowData] = useState([]);
  const { selectedRules, setAllModalVisibility, isSetAllModalVisible } = props;
  const [selectedTab, setSelectedTab] = useState(null);
  const [tabsList, setTabsList] = useState([]);
  const [isPartialSetAll, setIsPartialSetAll] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let ALLTabs = isManageRclFlow
      ? SET_ALL_FUNCTIONALITY_TABS_STORE_DC
      : SET_ALL_FUNCTIONALITY_TABS;
    setTabsList(ALLTabs);
  }, [isManageRclFlow]);

  useEffect(() => {
    setSelectedTab(tabsList[0]?.value);
  }, [tabsList]);


  const handleTabChange = (event, tabValue) => {
    setSelectedTab(tabValue);
    setIsPartialSetAll(tabValue === "partial-set-all");
  };

  const isDataNull = (data) => {
    let isAllDatePresent = true;
    data.forEach((row) => {
      if (isNull(row["start_date"]) || isNull(row["end_date"])) {
        isAllDatePresent = false;
      }
    });
    return isAllDatePresent;
  };
  const saveData = async () => {
    if (!isDataNull(rowData)) {
      displaySnackMessages(
        "Please provide start dates and end dates before saving.",
        "error",
        props
      );
      return;
    }
    if (error) {
      handleErrorMessage(error, props);
      return;
    }
    props?.setSetAllModalLoader(true);
    let configuration = [];
    rowData.forEach((thisStore) => {
      let row = [];
      let keys = [
        "auto_allocation_rule",
        "dc_store_rule",
        "default_product_profile",
        "default_store_groups",
        "start_date",
        "end_date",
        "rule_name",
        "auto_allocation_schedular",
      ];
      if (props.redirectedFromNetworkTab) {
        keys = ["supply_network_id", "start_date", "end_date"];
      }
      keys.forEach((thisKey) => {
        if (thisKey === "start_date" || thisKey === "end_date") {
          row.push({
            attribute_name: thisKey,
            attribute_value: moment(thisStore[thisKey]).format("YYYY-MM-DD"),
          });
        } else if(thisStore[thisKey]){
          row.push({
            attribute_name: thisKey,
            attribute_value: thisStore[thisKey],
          });
        }
      });
      configuration.push(row);
    });

    let isAllRowsSelected = agGridInstance?.current?.api?.isSelectAllRecords;
    let selectedFilters = isManageRclFlow
      ? [...props?.selectedDependencyValue]
      : [...props?.filterDependencies?.current?.filters];
    let body = {
      configuration,
      row_update: isAllRowsSelected
        ? []
        : selectedRules.map((thisData) => {
            return {
              rule_code: thisData.c_rule_code,
            };
          }),

      filters: isAllRowsSelected ? selectedFilters : [],
      meta: {
        ...(props.filtersWithSearch?.meta || tableConfigurationMetaData.meta),
        limit: { limit: 10, page: 1 },
      },
      table_name: isManageRclFlow ? props.rclRulesTableName : undefined,
    };
    if (props.excludeDeselections) {
      body = {
        ...body,
        excluded_rows: isAllRowsSelected
          ? props.deSelectedRules
            ? props.deSelectedRules
            : []
          : [],
        is_all_records_selected: isAllRowsSelected,
      };
    }
    if (props.redirectedFromNetworkTab) {
      body.network = configuration;
      delete body.configuration;
    }
    try {
      let isDCNetworkFlow = props.redirectedFromNetworkTab;
      let response = await props.saveDcStoreData(
        body,
        isManageRclFlow,
        isDCNetworkFlow
      );
      // Here We Save in temp table (Set All)
      if (isManageRclFlow) {
        props?.setSavedEditedRules([
          ...props.savedEditedRules,
          ...selectedRules,
        ]);
      }
      resetSelectedRules([]);
      props?.setSetAllModalLoader(false);
      displaySnackMessages(response?.message, "success", props);
      agGridInstance.current.api.refreshServerSideStore({
        purge: true,
      });
      agGridInstance.current.api?.deselectAll();
    } catch (error) {
      console.log("🚀 ~ saveData ~ error:", error);
      props?.setSetAllModalLoader(false);
      handleErrorMessage(error, props);
    }
    setIsPartialSetAll(false);
    setRowData([]);
    setSelectedTab(tabsList?.[0]?.value);
    setAllModalVisibility(!isSetAllModalVisible);
  };
console.log(rowData)
  const savePartialData = async () => {
    // New Save function to make sure no issue is introduced in existing flow.
    let configuration = [];
    rowData.forEach((thisStore) => {
      let row = [];
      const keys = [
        "rule_name",
        "auto_allocation_rule",
        "dc_store_rule",
        "default_product_profile",
        "default_store_groups",
        "auto_allocation_schedular",
      ];
      keys.forEach((thisKey) => {
        if (isNull(thisStore[thisKey])) {
          return;
        }
        if(thisKey === "rule_name" && isEmpty(thisStore[thisKey])){
          return
        }
        if (thisKey === "default_store_groups" && isEmpty(thisStore[thisKey])) {
          return;
        }
        row.push({
          attribute_name: thisKey,
          attribute_value: thisStore[thisKey],
        });
      });
      configuration.push(row);
    });

    if (configuration[0].length === 0) {
      displaySnackMessages("Nothing to update", "error", props);
      return;
    }
    props?.setSetAllModalLoader(true);
    let isAllRowsSelected = agGridInstance?.current?.api?.isSelectAllRecords;
    let selectedFilters = [...props?.filterDependencies?.current?.filters];
    let body = {
      configuration,
      row_update: isAllRowsSelected
        ? []
        : selectedRules.map((thisData) => {
            return {
              rule_code: thisData.c_rule_code,
            };
          }),

      filters: isAllRowsSelected ? selectedFilters : [],
      meta: {
        search: [],
        sort: [],
        range: [],
        limit: {
          limit: 10,
          page: 1,
        },
      },
    };
    if (props.excludeDeselections) {
      body = {
        ...body,
        excluded_rows: isAllRowsSelected
          ? props.deSelectedRules
            ? props.deSelectedRules
            : []
          : [],
        is_all_records_selected: isAllRowsSelected,
      };
    }
    try {
      let response = await props.partialSaveDcStoreData(body, isManageRclFlow);
      resetSelectedRules([]);
      props?.setSetAllModalLoader(false);
      displaySnackMessages(response?.message, "success", props);
      agGridInstance.current.api.refreshServerSideStore({
        purge: true,
      });
      agGridInstance.current.api?.deselectAll();
    } catch (error) {
      handleErrorMessage(error, props);
    } finally {
      props?.setSetAllModalLoader(false);
    }
    setIsPartialSetAll(false);
    setRowData([]);
    setSelectedTab(tabsList?.[0]?.value);
    setAllModalVisibility(!isSetAllModalVisible);
  };

  const onClose = ()=>{
    setIsPartialSetAll(false);
    setSelectedTab(tabsList?.[0]?.value);
    setAllModalVisibility(false);
    setError(false);
  }
  return (
    <Modal
      open={isSetAllModalVisible}
      title="Update Mappings"
      size="large"
      disablePrimary={props.setAllModalLoader || rowData?.[0]?.length <= 0}
      onClose = {()=>onClose()}
      onPrimaryButtonClick={() =>  !isPartialSetAll
        ? saveData()
        : savePartialData()}
      primaryButtonLabel="Apply"
      secondaryButtonLabel="Cancel"
      onSecondaryButtonClick= {()=>onClose()}
    >
      <SetAllModal
            {...props}
            setRowData={setRowData}
            rowData={rowData}
            setError={setError}
            isPartialSetAll={isPartialSetAll}
            Options = {   [<ButtonGroup
              selectedOption={selectedTab}
              onChange={handleTabChange}
              options = {tabsList}
            >
            </ButtonGroup>]}
            selectedTab = {selectedTab}
          />
    </Modal>
  );
};

SetAllModalComponent.propTypes = {
  agGridInstance: PropTypes.shape({
    current: PropTypes.shape({
      api: PropTypes.shape({
        deselectAll: PropTypes.func,
        isSelectAllRecords: PropTypes.any,
        refreshServerSideStore: PropTypes.func,
      }),
    }),
  }),
  filterDependencies: PropTypes.shape({
    current: PropTypes.shape({
      filters: PropTypes.any,
    }),
  }),
  inventorysmartModulesPermission: PropTypes.any,
  inventorysmartScreenConfig: PropTypes.shape({
    inventorysmart_constraints: PropTypes.shape({
      drillDown: PropTypes.shape({
        hidden: PropTypes.shape({
          indexOf: PropTypes.func,
        }),
        showSingleMergedRows: PropTypes.any,
      }),
    }),
  }),
  resetSelectedRules: PropTypes.func,
  selectedRules: PropTypes.any,
  setAllModalLoader: PropTypes.any,
  setSetAllModalLoader: PropTypes.func,
  setAllModalVisibility: PropTypes.func,
  isSetAllModalVisible: PropTypes.any,
  isManageRclFlow: PropTypes.any,
  rclRulesTableName: PropTypes.any,
  selectedDependencyValue: PropTypes.any,
  history: PropTypes.any,
  deSelectedRows: PropTypes.arrayOf(
    PropTypes.shape({
      rule_code: PropTypes.number,
    })
  ),
  excludeDeselections: PropTypes.bool,
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    setAllModalLoader:
      inventorysmartReducer?.dcStoreStrategyReducer?.setAllModalLoader,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    savedEditedRules:
      inventorysmartReducer?.dcStoreStrategyReducer?.savedEditedRules,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (body) => dispatch(addSnack(body)),
    setSetAllModalLoader: (body) => dispatch(setSetAllModalLoader(body)),
    saveDcStoreData: (body, isManageRclFlow, isDCNetworkFlow) =>
      dispatch(saveDcStoreData(body, isManageRclFlow, isDCNetworkFlow)),
    partialSaveDcStoreData: (body) => dispatch(partialSaveDcStoreData(body)),
    setSavedEditedRules: (body) => dispatch(setSavedEditedRules(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SetAllModalComponent);
