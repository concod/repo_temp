import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom-v5-compat";
import { Breadcrumbs, useTranslation } from "impact-ui-v3";
import { addSnack } from "core/actions/snackbarActions";
import { cloneDeep } from "lodash";
import globalStyles from "core/Styles/globalStyles";
import { CONFIGURATION } from "../../../constants-inventorysmart/routesConstants";
import { 
  setFormState, 
  setIsFromReview, 
  clearFormState 
} from "../../../services-inventorysmart/Store-Transfer-Rule/store-transfer-rule";
import { setTabLevelData } from "../../../services-inventorysmart/Configuration/inventory-smart-configuration-services";
import { ADD_NEW_STORE_TRANSFER_RULE } from "../../../constants-inventorysmart/routesConstants";
import { getModuleLevelAccessUtility } from "core/actions/userAccessActions"
import { INVENTORY_SUBMODULES_NAMES, FULL_ACCESS_PERMISSIONS_LIST ,APP_NAME} from "../../../constants-inventorysmart/stringConstants";
import { 
  setInventorySmartModulesPermissions 
} from "../../../services-inventorysmart/common/inventory-smart-common-services";


import AddNewRule from "../components/AddNewRule";
import RuleReviewScreen from "../components/RuleReviewScreen";

const CreateRuleFlow = (props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formDataForReview, setFormDataForReview] = useState({});
  const globalClasses = globalStyles();
  
  useEffect(() => {
    //always fetch the module permission list on Load. This is required for case when user is redirected to this route from another route and reloads the page
    const fetchModulesAccess = async () => {
      try {
        const moduleName = 'inventorysmart_configuration';
        const subModules = [INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_TRANSFER_RULE];

        let rolesBasedModulesPermission = {};
        if (props?.inventorysmartScreenConfig?.roleBasedAccess) {
          let accessDataResponse = null;
          accessDataResponse = await getModuleLevelAccessUtility({
            app: APP_NAME,
            module: subModules,
          })();
          rolesBasedModulesPermission = Object.fromEntries(
            Object.entries(accessDataResponse).map(([module, actions]) => [
              module,
              Object.keys(actions),
            ])
          );
        } else {
          subModules.forEach((subModule) => {
            rolesBasedModulesPermission[subModule] = FULL_ACCESS_PERMISSIONS_LIST;
          });
        }
        
        props.setInventorySmartModulesPermissions({
          [moduleName]: rolesBasedModulesPermission,
        });
      } catch (error) {
        console.error("Error fetching module access:", error);
      } 
    };
    
    if (props.inventorysmartScreenConfig.roleBasedAccess) {
      fetchModulesAccess();
    } 
  }, [props.inventorysmartScreenConfig]);

  const paths = [
    {
      label: t("inventorysmart.home"),
      to: "/home",
    },
    {
      label: t("inventorysmart.configurations"),
      to: CONFIGURATION,
    },
    {
      label: t("inventorysmart.createNewRule"),
      to: "#",
    },
  ];

  const handleMoveToReview = (formData) => {
    setFormDataForReview(formData);
    
    props.setFormState(cloneDeep(formData));
    
    setCurrentStep(2);
  };

  const handleBackToForm = () => {
    props.setIsFromReview(true);
    
    setCurrentStep(1);
  };

  const navigateToConfigWithStoreTransferTab = () => {
    navigate(CONFIGURATION, {
      state: ADD_NEW_STORE_TRANSFER_RULE,
    });
  };

  const handleRuleCreated = () => {
    props.clearFormState();   
    setTimeout(() => navigateToConfigWithStoreTransferTab(), 1000);
  };

  const handleCancel = () => {
    props.clearFormState();
    navigateToConfigWithStoreTransferTab();
  };

  return (
      <div className={globalClasses.paddingAround}>
        <Breadcrumbs list={paths} />       
        <div>
          {currentStep === 1 ? (
            // Step 1: Add New Rule Form
            <AddNewRule 
              onSubmit={handleMoveToReview}
              onCancel={handleCancel}
            />
          ) : (
            // Step 2: Review Screen
            <RuleReviewScreen
              isVisible={true}
              formData={formDataForReview}
              onClose={handleBackToForm}
              onSuccess={handleRuleCreated}
            />
          )}
        </div>
      </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    formState: inventorysmartReducer.storeTransferRuleService?.formState,
    isFromReview: inventorysmartReducer.storeTransferRuleService?.isFromReview,
    inventorysmartModulesPermission:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setTabLevelData: (payload) => dispatch(setTabLevelData(payload)),
    setFormState: (data) => dispatch(setFormState(data)),
    setIsFromReview: (flag) => dispatch(setIsFromReview(flag)),
    clearFormState: () => dispatch(clearFormState()),
    setInventorySmartModulesPermissions: (payload) =>
      dispatch(setInventorySmartModulesPermissions(payload)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(CreateRuleFlow);
