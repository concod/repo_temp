import React from "react";
import { connect } from "react-redux";
import makeStyles from "@mui/styles/makeStyles";
import {Modal} from "impact-ui-v3";
import SetAllTable from "./SetAllTables";
import { addSnack } from "core/actions/snackbarActions";

import {
  getProductRulePOPUPTableData,
  saveProductRulePOPUPTableData,
  setProductRulePopUpLoader,
  setSavePayloadForPopUp,
  setSelectedStoreGroupDataPopUp,
} from "modules/inventorysmart/services-inventorysmart/Product-Profile/product-rule-services";

import TabsComponentScreen from "core/commonComponents/tabs";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import AutoAllocationTab from "./AutoAllocation";

const useStyles = makeStyles((theme) => ({
  dialogPaper: {
    minHeight: "30vh",
    maxHeight: "80vh",
  },
  dialogBody: {
    marginBottom: "-2rem",
  },
}));
const ProductRulePopUp = (props) => {
  const classes = useStyles();

  let tabsData = [
    {
      label: "Store Group Mapping",
      id: "store_group",
      TabPanel: (
        <SetAllTable
          modalKey={"store_group_mapped_display"}
          {...props}
          dimension="store_group"
          module={props?.module}
          classes={classes}
          screenName={props?.screenName}
          roleBasedAccess={props.inventorysmartScreenConfig?.roleBasedAccess}
        />
      ),
    },
    {
      label: "DC Mapped",
      id: "dc_mapped",
      TabPanel: (
        <SetAllTable
          {...props}
          modalKey="dc_mapped"
          dimension="dc_mapped"
          module={props?.module}
          screenName={props?.screenName}
          roleBasedAccess={props.inventorysmartScreenConfig?.roleBasedAccess}
          hideStoreDimensionSubTabs={
            props.inventorysmartScreenConfig?.inventorysmart_configuration
              ?.drillDown?.hiddenTabs
          }
        />
      ),
    },
    {
      label: dynamicLabelsBasedOnTenant("product") + " Profile Mapped",
      id: "sku_profile",
      TabPanel: (
        <SetAllTable
          {...props}
          dimension="sku_profile"
          module={props?.module}
          modalKey="product_profile_name"
          screenName={props?.screenName}
          inventorysmartModulesPermission={
            props.inventorysmartModulesPermission
          }
          hideDCDimensionSubTabs={
            props.inventorysmartScreenConfig?.inventorysmart_configuration
              ?.drillDown?.hiddenTabs
          }
          roleBasedAccess={props.inventorysmartScreenConfig?.roleBasedAccess}
        />
      ),
    },
  ];
  if (props.autoAllocationBtn) {
    tabsData.push({
      label: "Auto Allocation",
      id: "auto_allocation",
      TabPanel: (
        <AutoAllocationTab
          {...props}
          modalKey="dc_mapped"
          dimension="dc_mapped"
          module={props?.module}
          screenName={props?.screenName}
          roleBasedAccess={props.inventorysmartScreenConfig?.roleBasedAccess}
          hideStoreDimensionSubTabs={
            props.inventorysmartScreenConfig?.inventorysmart_configuration
              ?.drillDown?.hiddenTabs
          }
        />
      ),
    });
  }
  return (
    <Modal
      id="productRulePopup"
      aria-labelledby="product-rule-dialog"
      open={true}
      size="large"
      onClose={(_event, reason) => {
        if (reason === "backdropClick") {
          return;
        }
        props.closeModal();
      }}
      title="SET ALL"
    >
      <div className={classes.dialogBody}>
        <TabsComponentScreen
          tabPannelStyle={{ padding: "0px" }}
          tabsData={tabsData}
        />
      </div>
    </Modal>
  );
};

const mapStateToProps = (store) => {
  return {
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
    inventorysmartModulesPermission:
      store.inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setProductRulePopUpLoader: (payload) =>
    dispatch(setProductRulePopUpLoader(payload)),
  getProductRulePOPUPTableData: (body) =>
    dispatch(getProductRulePOPUPTableData(body)),
  setSelectedStoreGroupDataPopUp: (body) =>
    dispatch(setSelectedStoreGroupDataPopUp(body)),
  saveProductRulePOPUPTableData: (body) =>
    dispatch(saveProductRulePOPUPTableData(body)),
  setSavePayloadForPopUp: (body) => dispatch(setSavePayloadForPopUp(body)),

  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(ProductRulePopUp);
