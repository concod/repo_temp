import { connect } from "react-redux";
import IngestionLoader from "core/commonComponents/ingestionLoader";
import LoginComponent from "./components/loginComponent";

const Auth = (props) => {
  return (
    <>
      <LoginComponent tenantId={props.tenantId} />
      {props.ingestionEnabled ? <IngestionLoader/> : null}
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    tenantId: state.authReducer.tenantId,
    ingestionEnabled: state.layoutReducer.ingestionEnabled,
  };
};

export default connect(mapStateToProps, null)(Auth);
