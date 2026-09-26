import { Container } from "@mui/material";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import { Prompt as IaPrompt } from "impact-ui";
import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { Prompt } from "react-router";
import HeaderBreadCrumbs from "../../Utils/HeaderBreadCrumbs";
import ModifyMapping from "./components/modify-mapping";
import ProductToDCFC from "./components/store-To-dcfc";
import StoreProductBand from "./components/store-product-band";
import { setIsAggregated } from "./services/storeMappingService";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import TabsComponent from "core/commonComponents/tabs";
import { getCurrentApplicationDetails } from "core/commonComponents/coreComponentScreen/utils";
import { cloneDeep, isEmpty } from "lodash";
import { isActionAllowedOnSubModule } from "core/Utils/utils";

function StoreMapping(props) {
  const [value, setValue] = React.useState(0);
  const [modifyMapping, setModifyMapping] = useState(false);
  const [flagEdit, setFlagEdit] = useState(false);
  const [confirmBox, setConfirmBox] = useState(false);
  const [selectedStores, updateselectedStores] = useState([]);
  const [changedTabValue, setChangedtabValue] = useState(0);
  const [selectAll, setSelectAll] = useState(false);
  const [selectAllDependency, setSelectAllDependency] = useState(null);
  const [storeMappingTabs, setStoreMappingTabs] = useState([]);
  const isRedirectedFromMappedDialog = useRef(false);
  const navigate = useNavigate();
  let location = useLocation();

  const handleChange = (newValue) => {
    setChangedtabValue(newValue);
    if (flagEdit) {
      setConfirmBox(true);
    } else {
      setValue(newValue);
      return true;
    }
  };
  const updateFlagEdit = (flag) => {
    setFlagEdit(flag);
  };

  const toggleModifyMapping = (data, payload, isRedirected = false) => {
    if (isRedirected) {
      isRedirectedFromMappedDialog.current = true;
    }
    setSelectAllDependency(payload);
    setSelectAll(false);
    updateselectedStores(data.selectedStores);
    setModifyMapping(true);
  };

  const toggleSelectAllModify = async (payload, isRedirected = false) => {
    if (isRedirected) {
      isRedirectedFromMappedDialog.current = true;
    }
    setSelectAllDependency(payload);
    setSelectAll(true);
    setModifyMapping(true);
  };

  const storeToProductMappingObj = {
    label: `Store-${dynamicLabelsBasedOnTenant("product", "core")}`,
    id: "Store Mapping",
    TabPanel: (
      <StoreProductBand
        updateFlagEdit={updateFlagEdit}
        toggleModifyMapping={toggleModifyMapping}
        toggleSelectAllModify={toggleSelectAllModify}
        module={props.module}
        roleBasedAccess={props.roleBasedAccess}
        screenName={props.screenName}
      ></StoreProductBand>
    ),
  };
  const storeToProductDCFCMappingObj = {
    label: "Store-DC",
    id: "Store to DC/FC Mapping",
    TabPanel: (
      <ProductToDCFC
        isredirect={
          location?.state && location?.state?.isRedirect
            ? location.state.isRedirect
            : null
        }
        updateFlagEdit={updateFlagEdit}
        module={props.module}
        roleBasedAccess={props.roleBasedAccess}
        screenName={props.screenName}
      >
        {" "}
      </ProductToDCFC>
    ),
  };
  let storeMappingTabsData = [
    storeToProductMappingObj,
    storeToProductDCFCMappingObj,
  ];

  useEffect(() => {
    const setAggregated = async () => {
      const displayLevelsResp = await props.getTenantConfigApplicationLevel(3, {
        attribute_name: "display_levels",
      });
      if (
        displayLevelsResp?.data?.data?.[0]?.["attribute_value"] &&
        displayLevelsResp?.data?.data?.[0]?.["attribute_value"]?.["value"]?.[
          "product"
        ]
      ) {
        const hidden_levels =
          displayLevelsResp?.data?.data?.[0]?.["attribute_value"]?.["value"]?.[
            "product"
          ]?.["hidden_levels"];
        if (hidden_levels?.includes("product")) {
          props.setIsAggregated(true);
        }
      }
    };
    setAggregated();
    if (location?.state && location?.state?.isRedirect) {
      setValue(1);
    }
    const params = new URLSearchParams(location?.search);
    if (params.get("tab") === "Store-DC/FC") {
      setValue(1);
    }
  }, []);

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props?.inventorysmartModulesPermission,
      props?.module,
      subModuleName,
      action
    );
  };
  useEffect(() => {
    const applicationDetails = getCurrentApplicationDetails();
    let storeMappingTabsDataCopy = cloneDeep(storeMappingTabsData);
    if (
      applicationDetails?.applicationCode === 1 &&
      !isEmpty(props?.inventorysmartModulesPermission)
    ) {
      let hiddenTabs =
        props.inventorysmartScreenConfig?.[props?.module]?.drillDown
          ?.hiddenTabs || [];
      let storeMappingHasAccess = canTakeActionOnModules(
        "Store Mapping",
        "view"
      );
      let storeMappingStoreToDcFcHasAccess = canTakeActionOnModules(
        "Store to DC/FC Mapping",
        "view"
      );
      // if user does not have any access to store Mapping, remove the tab
      if (
        hiddenTabs.includes("store to product mapping") ||
        !storeMappingHasAccess
      ) {
        storeMappingTabsDataCopy = storeMappingTabsDataCopy.slice(1);
      }
      // if user does not have any access to store to dc/fc Mapping, remove the tab
      if (
        hiddenTabs.includes("store to dc/fc") ||
        !storeMappingStoreToDcFcHasAccess
      ) {
        storeMappingTabsDataCopy.pop();
      }
      setStoreMappingTabs(storeMappingTabsDataCopy);
    } else {
      setStoreMappingTabs(cloneDeep(storeMappingTabsData));
    }
  }, [props?.inventorysmartModulesPermission]);

  useEffect(() => {
    let activeTabName = value === 0 ? "tab=Store-Product" : "tab=Store-DC/FC";
    navigate({
      pathname: window.location.pathname,
      search: activeTabName,
    });
  }, [value]);

  const updateModify = () => {
    if (flagEdit) {
      setConfirmBox(true);
    } else {
      setModifyMapping(false);
    }
  };
  return (
    <>
      {!props.hideBreadCrumbs && (
        <HeaderBreadCrumbs
          options={
            modifyMapping
              ? [
                  {
                    label: "Store Mapping",
                    id: 1,
                    action: () => {
                      updateModify();
                    },
                  },
                  {
                    label: "Modify Mapping",
                    id: 2,
                    action: () => null,
                  },
                ]
              : [
                  {
                    label: "Store Mapping",
                    id: 1,
                    action: () => {
                      setModifyMapping(false);
                    },
                  },
                ]
          }
        ></HeaderBreadCrumbs>
      )}
      <Container maxWidth={false}>
        <IaPrompt
          isOpen={confirmBox}
          title="Unsaved Changes"
          subHeading="Your changes will be lost. Do you want to proceed?"
          infoList={[]}
          primaryButtonProps={{
            children: "Confirm",
            onClick: () => {
              if (!modifyMapping) {
                setValue(changedTabValue);
              }
              setModifyMapping(false);
              setFlagEdit(false);
              setConfirmBox(false);
            },
          }}
          tertiaryButtonProps={{
            children: "Cancel",
            onClick: () => setConfirmBox(false),
          }}
        />
        {!modifyMapping && (
          <div>
            {" "}
            <Prompt when={flagEdit} message="" />
            <TabsComponent
              tabPannelStyle={{ padding: "0px" }}
              tabContainerstyle={{padding: "0px"}}
              tabsData={storeMappingTabs}
              customSelectedtab={value}
              handleChange={handleChange}
            />
          </div>
        )}
        {modifyMapping && (
          <ModifyMapping
            ref={isRedirectedFromMappedDialog}
            selectedDimension={"store"}
            selectedProducts={selectedStores}
            dependency={selectAllDependency}
            isSelectAll={selectAll}
            updateFlagEdit={updateFlagEdit}
            closeModify={() => {
              setModifyMapping(false);
              updateselectedStores([]);
            }}
            screenName={props.screenName}
          ></ModifyMapping>
        )}
      </Container>
    </>
  );
}

const mapStateToProps = (store) => {
  return {
    inventorysmartModulesPermission:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    inventorysmartScreenConfig:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
  };
};

const mapActionsToProps = {
  setIsAggregated,
  getTenantConfigApplicationLevel,
};

export default connect(mapStateToProps, mapActionsToProps)(StoreMapping);
