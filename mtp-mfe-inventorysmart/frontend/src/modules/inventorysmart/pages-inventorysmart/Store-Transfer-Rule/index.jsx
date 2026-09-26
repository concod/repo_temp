import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom-v5-compat";
import { Button, useTranslation } from "impact-ui-v3";
import DeleteIcon from "@mui/icons-material/Delete";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import { addSnack } from "core/actions/snackbarActions";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { cloneDeep } from "lodash";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import globalStyles from "core/Styles/globalStyles";
import { INVENTORY_SUBMODULES_NAMES, ERROR_MESSAGE } from "../../constants-inventorysmart/stringConstants";
import { ADD_NEW_STORE_TRANSFER_RULE } from "../../constants-inventorysmart/routesConstants";
import { isActionAllowedOnSubModule } from "../inventorysmart-utility";
import {
  fetchStoreTransferRules,
  deleteStoreTransferRules,
  setStoreTransferRuleLoader,
} from "../../services-inventorysmart/Store-Transfer-Rule/store-transfer-rule";
import RuleDetailsModal from "./components/RuleDetailsModal";
import {Prompt} from "impact-ui-v3";

const StoreTransferRule = (props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [storeTransferRuleColumnConfig, setStoreTransferRuleColumnConfig] = useState([]);
  const [storeTransferRuleRowData, setStoreTransferRuleRowData] = useState([]);
  const [storeTransferRuleLoader, setStoreTransferRuleLoader] = useState(false);
  const [showRuleDetailModal, setShowRuleDetailModal] = useState(false);
  const [selectedRuleId, setSelectedRuleId] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const storeTransferRuleTableInstance = useRef({});
  const globalClasses = globalStyles();

  const handleErrorMessage = (e, defaultError = ERROR_MESSAGE) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(defaultError, "error");
  };

  useEffect(() => {
    getStoreTransferRuleData();
  }, []);

  const handleRuleNameClick = (data) => {
    if (data && data.rule_id) {
      setSelectedRuleId(data.rule_id);
      setShowRuleDetailModal(true);
    }
  };

  const handleCloseRuleDetailModal = () => {
    setShowRuleDetailModal(false);
    setSelectedRuleId(null);
  };

  const ruleActions = {
    rule_name: handleRuleNameClick
  };

  const getStoreTransferRuleData = async () => {
    setStoreTransferRuleLoader(true);
    try {
      let cols = [];
      cols = await getColumnsAg("table_name=Store_Transfer_all_dashboard")();
      let colActions = agGridColumnFormatter(
        cloneDeep(cols),
        null,
        ruleActions
      );
      setStoreTransferRuleColumnConfig(colActions);
      
      let response = await props.fetchStoreTransferRules();
      if (response.data?.data) {
        setStoreTransferRuleRowData(response.data?.data);
      } else {
        setStoreTransferRuleRowData([]);
      }
      
      if (response.data?.show_message) {
        displaySnackMessages(response.data?.message, "success");
      }
      
      setStoreTransferRuleLoader(false);
    } catch (e) {
      handleErrorMessage(e);
      setStoreTransferRuleLoader(false);
    }
  };

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        onClose: onClose,
      },
    });
  };

  const loadStoreTransferRuleTableInstance = (params) => {
    storeTransferRuleTableInstance.current = params;
  };

  const canTakeActionOnModules = (subModuleName, action) => {
    console.log("inventorysmartModulesPermission",props.inventorysmartModulesPermission)
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      "inventorysmart_configuration",
      subModuleName,
      action
    );
  };

  
  const handleSelectionChanged = (params) => {
    const selectedNodes = params.api.getSelectedNodes();
    const selectedData = selectedNodes.map(node => node.data);
    setSelectedRows(selectedData);
  };
  
  const canDeleteRules = () => {
    const hasDefaultOrInUseRule = selectedRows.some(rule => rule.is_default || rule.in_use);
    return !hasDefaultOrInUseRule;
  };
  
  const handleDeleteClick = () => {
    if (selectedRows.length === 0) {
      displaySnackMessages(
        t("inventorysmart.noRulesSelectedForDeletion"),
        "warning"
      );
      return;
    }
    
    if (!canDeleteRules()) {
      displaySnackMessages(
        t("inventorysmart.defaultRulesOrRulesInUseCannotBeDeleted"),
        "error"
      );
      return;
    }
    
    setShowDeleteConfirmDialog(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (selectedRows.length === 0) return;
    
    const ruleIds = selectedRows.map(rule => rule.rule_id.toString());
    
    setStoreTransferRuleLoader(true);
    setShowDeleteConfirmDialog(false);
    
    try {
      setStoreTransferRuleRowData([]);
      
      await props.deleteStoreTransferRules(ruleIds);
      displaySnackMessages(
        t("inventorysmart.rulesDeletedSuccessfully"),
        "success"
      );

      await getStoreTransferRuleData();
      
      setSelectedRows([]);
    } catch (e) {
      handleErrorMessage(e);
      
      await getStoreTransferRuleData();
    } finally {
      setStoreTransferRuleLoader(false);
    }
  };
  
  const handleDeleteCancel = () => {
    setShowDeleteConfirmDialog(false);
  };
  
  const navigateToAddNewRule = () => {
    navigate(ADD_NEW_STORE_TRANSFER_RULE,{state:{}});
  };

  const renderTopRightButtons = () => {
    const hasCreatePermission = canTakeActionOnModules(
      INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_TRANSFER_RULE,
      "create"
    );

    const hasDeletePermission = canTakeActionOnModules(
      INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_TRANSFER_RULE,
      "delete"
    );
    let options = [];

    if(selectedRows.length > 0 && hasDeletePermission){
        options.push(
            <Button
            variant="tertiary"
            onClick={handleDeleteClick}
            icon={<DeleteIcon />}
          />
        )
    }
    if (hasCreatePermission) {
      options.push(
        <Button
          variant="primary"
          onClick={navigateToAddNewRule}
          className={globalClasses.marginRight}
        >
          {t("inventorysmart.addNewRule")}
        </Button>
      );
    }
    return options;
  };

  return (
    <Loader loader={props.storeTransferRuleLoader || storeTransferRuleLoader}>
      <div style={{minHeight:"400px"}}>        
        {storeTransferRuleColumnConfig.length > 0 && (
          <AgGridComponent
            columns={storeTransferRuleColumnConfig}
            rowdata={storeTransferRuleRowData}
            uniqueRowId={"rule_id"}
            loadTableInstance={loadStoreTransferRuleTableInstance}
            pagination={true}
            paginationPageSize={100}
            tableHeader={t("inventorysmart.storeTransferRules")}
            rowSelection={"multiple"}
            onSelectionChanged={handleSelectionChanged}
            topRightOptions={renderTopRightButtons()}
            selectAllHeaderComponent={true}
          />
        )}
      </div>
      
      <RuleDetailsModal 
        isOpen={showRuleDetailModal}
        onClose={handleCloseRuleDetailModal}
        ruleId={selectedRuleId}
      />
      
      <Prompt
        isOpen={showDeleteConfirmDialog}
        title={t("inventorysmart.deleteRules")}
        onPrimaryButtonClick={handleDeleteConfirm}
        onSecondaryButtonClick={handleDeleteCancel}
        primaryButtonLabel={t("inventorysmart.deleteRules")}
        secondaryButtonLabel={t("inventorysmart.cancel")}
        variant="warning"
      >
        {t("inventorysmart.selectedRulesAreMappedToMultipleMaterials")}
      </Prompt>
    </Loader>
  );
};

const mapStateToProps = (store) => {
  return {
    storeTransferRuleLoader:
      store.inventorysmartReducer.storeTransferRuleService
        .storeTransferRuleLoader,
    inventorysmartModulesPermission:
      store.inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    pageSize:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig?.inventorysmart_page_count,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setStoreTransferRuleLoader: (payload) =>
      dispatch(setStoreTransferRuleLoader(payload)),
    fetchStoreTransferRules: () => dispatch(fetchStoreTransferRules()),
    deleteStoreTransferRules: (ruleIds) => dispatch(deleteStoreTransferRules(ruleIds)),
    addSnack: (snack) => dispatch(addSnack(snack)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(StoreTransferRule);
