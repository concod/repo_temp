import React from "react";
import { connect } from "react-redux";
import Loader from "core/Utils/Loader/loader";
import OMSVendorDCReporting from "modules/oms/pages-oms/Reports/Vendor-DC";
import OMSVendorStoreReporting from "modules/oms/pages-oms/Reports/Vendor-Store";

const OMSReports = (props) => {
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

  if (props.variant === "vendor_store") {
    return <OMSVendorStoreReporting {...props} />;
  }

  return <OMSVendorDCReporting {...props} />;
};

const mapStateToProps = (store) => ({
  orderingRoleConfigSuccess:
    store.omsReducer?.orderingCommonService?.orderingRoleConfigSuccess,
});

export default connect(mapStateToProps)(OMSReports);
