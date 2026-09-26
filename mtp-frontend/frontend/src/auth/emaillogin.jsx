import React, { useEffect } from "react";
import { connect } from "react-redux";
import LoginComponent from "./components/loginComponent";

const setSignInOptions = (tenantId) => {
  if (!tenantId) {
    return tenantId;
  }
  const updatedTenantObject = { ...tenantId };
  updatedTenantObject["sign_in_options"] = [3];
  return updatedTenantObject;
};
const EmailAuth = (props) => {
  return (
    <>
      <LoginComponent tenantId={setSignInOptions(props.tenantId)} />
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    tenantId: state.authReducer.tenantId,
  };
};

export default connect(mapStateToProps, null)(EmailAuth);
