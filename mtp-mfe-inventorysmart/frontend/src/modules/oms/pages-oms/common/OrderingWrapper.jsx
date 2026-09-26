import React from "react";
import { connect } from "react-redux";
import Loader from "core/Utils/Loader/loader";

const OrderingWrapper = ({
  orderingRoleConfigSuccess,
  WrappedComponent,
  ...props
}) => {
  if (!orderingRoleConfigSuccess) {
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

  if (!WrappedComponent) {
    return null;
  }

  return <WrappedComponent {...props} />;
};

const mapStateToProps = (store) => ({
  orderingRoleConfigSuccess:
    store.omsReducer?.orderingCommonService?.orderingRoleConfigSuccess,
});

export default connect(mapStateToProps)(OrderingWrapper);
