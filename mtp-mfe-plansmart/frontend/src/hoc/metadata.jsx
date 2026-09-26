import React, { useEffect } from "react";
import { getTenantId, verifyTokenStatus } from "../actions/authActions";
import { connect } from "react-redux";
import firebaseobj from "../core/commonComponents/auth/firebase";
const MetaDataComponent = (props) => {
  const checkUsrSession = () => {
    props.checkUserSession();
  };
  const fetchDomainDetails = () => {
    let loc = new URL(window.location.origin);
    props.fetchTenantInfo(localStorage.getItem("baseUrl"));
  };
  useEffect(() => {
    fetchDomainDetails();
  }, []);
  useEffect(() => {
    if (props.isTenantInfoFetched) {
      firebaseobj.auth().tenantId =
        props.tenantDetails?.["google_tenant_identity"];
      checkUsrSession();
    }
  }, [props.isTenantInfoFetched]);
  return <>{props.children}</>;
};

const mapStateToProps = (state) => ({
  isTenantInfoFetched: state.authReducer.isTenantInfoFetched,
  tenantDetails: state.authReducer.tenantId
});
const mapActionToProps = {
  fetchTenantInfo: getTenantId,
  checkUserSession: verifyTokenStatus
};

export default connect(mapStateToProps, mapActionToProps)(MetaDataComponent);
