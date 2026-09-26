import React from "react";
import { connect } from "react-redux";
import Loader from "core/Utils/Loader/loader";
import ConfigurationsTab from "./ConfigurationsTab.jsx";

const OMSConfiguration = (props) => {
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
    <ConfigurationsTab module={props?.module} screenName={props?.screenName} />
  );
};

const mapStateToProps = (store) => ({
  orderingRoleConfigSuccess:
    store.omsReducer?.orderingCommonService?.orderingRoleConfigSuccess,
});

export default connect(mapStateToProps)(OMSConfiguration);
