import React, { useEffect } from "react";
import { connect } from "react-redux";
import { getTenantId, verifyTokenStatus } from "actions/authActions";
import Alert from "@mui/material/Alert";
import { Container } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import Tooltip from "@mui/material/Tooltip";
import "./domain.scss";
import makeStyles from "@mui/styles/makeStyles";
const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginTop: "10%",
  },
});
const DomainComponent = (props) => {
  const classes = useStyles();
  const fetchDomainDetails = () => {
    let loc = new URL(window.location.origin);
    props.fetchDomainInfo(loc.hostname);
  };

  return (
    <>
      <div id="domainAlertCont" className="domain-alert-container">
        <div className="alert-display-style">
          <Alert
            variant="filled"
            severity={props.alertProperties.Type}
            style={{ padding: 5 }}
          >
            {props.alertProperties.Text}
          </Alert>
          {props.isTenantFetchFailed ? (
            <Tooltip title="please try again">
              <IconButton
                style={{ marginLeft: 10 }}
                color="primary"
                onClick={fetchDomainDetails}
                size="large"
              >
                <RefreshRoundedIcon fontSize="medium" />
              </IconButton>
            </Tooltip>
          ) : null}
        </div>
        <Container
          classes={{
            root: classes.root,
          }}
        >
          <h3 className="welcome-text">Welcome to</h3>
          <h2 className="title-text">IA SMART PLATFORM</h2>
        </Container>
      </div>
    </>
  );
};
const mapStateToProps = (state) => {
  return {
    alertProperties: state.authReducer.alertProperties,
    showAlert: state.authReducer.showAlert,
    isTenantFetchFailed: state.authReducer.isTenantFetchFailed,
  };
};
const mapDispatchToProps = (dispatch) => {
  return {
    fetchDomainInfo: (domain) => dispatch(getTenantId(domain)),
  };
};
export default connect(mapStateToProps, mapDispatchToProps)(DomainComponent);
