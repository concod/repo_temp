import React from "react";
import { connect } from "react-redux";
import Loader from "core/Utils/Loader/loader";
import OMSTabPanel from "modules/oms/pages-oms/Constraints/ConstraintsTab.jsx";

const OMSConstraints = (props) => {
  if (!props.orderingRoleConfigSuccess) {
    return (
      <Loader
        loader={true}
        popUp={false}
        children={null}
        minHeight={null}
        gridLoader={false}
        text={"Loading"}
        showingLoadingOnTop={false}
        isCustomLoader={false}
        size={null}
        showSkeleton={false}
        customZIndex={null}
        applyDefaultCenterStyle
      />
    );
  }

  return (
    <OMSTabPanel
      tabProps={props.tabProps}
      screenName={props.screenName}
      omsTabs={props.omsTabs}
      omsModuleConfig={props.omsModuleConfig}
      inventorysmartModulesPermission={props.inventorysmartModulesPermission}
      module={props.module}
      selectedSubTab={props.selectedSubTab}
      handleSubTabChange={props.handleSubTabChange}
      selectedDeliveryTab={props.selectedDeliveryTab}
      handleDeliveryTabChange={props.handleDeliveryTabChange}
      constraintsConfigs={props.constraintsConfigs}
    />
  );
};

const mapStateToProps = (store) => ({
  orderingRoleConfigSuccess:
    store.omsReducer?.orderingCommonService?.orderingRoleConfigSuccess,
});

export default connect(mapStateToProps)(OMSConstraints);
