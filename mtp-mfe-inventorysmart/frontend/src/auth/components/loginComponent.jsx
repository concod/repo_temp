import React, { Component } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import {
  loginUser,
  forgotPassword,
  setUser,
  checkUserProvider,
} from "../../core/actions/authActions";
import "../index.scss";
import logo from "assets/header_logo.svg?url";
import {
  getDropdownValues,
  setHelpDesk,
} from "../../core/actions/tenantConfigActions";
import { firebaseobj } from "../firebase";
import { bindActionCreators } from "redux";
import LoadingOverlay from "../../core/Utils/Loader/loader";
import * as firebaseui from "firebaseui";
import { VALID_EMAIL } from "../regex";
import { Grid, Link, Divider, Box, Typography } from "@mui/material";
import LoginForm from "./login";
import FirebaseLogin from "./firebaseUI";
import MarketingBanner from "./marketingBanner";
import DomainComponent from "./domain";
import {
  TENANT_SIGN_IN_OPTIONS,
  TENANT_SAML_PROVIDER_BUTTON_LABEL,
} from "config/constants";
class Login extends Component {
  constructor(props) {
    super();
    this.state = {
      email: "",
      password: "",
      errors: {},
      isEmailUser: false,
      uiconfigs: [],
      FirebaseUIConfig: {
        signInOptions: [],
        credentialHelper: "none",
        signInFlow: "popup",
        callbacks: {
          signInSuccessWithAuthResult: (authResult, redirectUrl) => {
            return false;
          },
          signInFailure: (error) => {},
        },
      },
      inputError: {},
    };
    this.onChange = this.onChange.bind(this);
  }

  componentDidMount() {
    // let loc = new URL(window.location.origin);
    //To configure Tenant UI info. Currently For POC, all the three providers have been included
    //Here make an api call to get the tenantID
    //TO do API call using axios and get the sign in options
    //If there is no tenant ID coming from the backend, we won't display any signin options to the user
    // if (!this.props.authReducer.isAuthenticated && this.props.tenantId) {
    if (!this.props.authReducer.isAuthenticated && this.props.tenantId) {
      this.setFirebaseUI(this.props.tenantId);
    }
    this.unregisterAuthObserver = firebaseobj
      .auth()
      .onAuthStateChanged((user) => {
        if (
          user &&
          this.props.authReducer.isTokenVerified &&
          this.props.authReducer.isAuthenticated
        ) {
          this.props.history.push(this.props.landingPage);
        } else if (
          this.state.uiconfigs.length > 0 &&
          (this.state.uiconfigs[0] || this.state.uiconfigs[1])
        ) {
          let firebaseUIInstance = firebaseui.auth.AuthUI.getInstance();
          if (!firebaseUIInstance) {
            firebaseUIInstance = new firebaseui.auth.AuthUI(firebaseobj.auth());
          } else {
            firebaseUIInstance.reset();
          }
          firebaseUIInstance.start(
            "#firebaseui_container",
            this.state.FirebaseUIConfig
          );
        }
      });
  }

  componentWillUnmount() {
    //Unregistering the auth oberserver that is called inside component did mount
    //This will clean the memory for the observer
    this.unregisterAuthObserver();
  }

  setFirebaseUI(tenantId) {
    let signInBooleanArray = TENANT_SIGN_IN_OPTIONS; //This enables the respective sign in option => 1. Google 2. SAML 3. Email/Password
    let signInOptions = tenantId.sign_in_option;
    for (const option of signInOptions) {
      signInBooleanArray[parseInt(option) - 1] = true;
    }
    let FirebaseUIobj = this.state.FirebaseUIConfig;
    if (signInBooleanArray[0]) {
      FirebaseUIobj["signInOptions"].push({
        provider: firebaseobj.auth.GoogleAuthProvider.PROVIDER_ID,
        fullLabel: false,
      });
    }

    if (signInBooleanArray[1]) {
      FirebaseUIobj["signInOptions"].push({
        provider: tenantId.saml_id,
        providerName: tenantId.saml_provider_name,
        buttonColor: "#fff",
        fullLabel: TENANT_SAML_PROVIDER_BUTTON_LABEL,
        iconUrl: tenantId.saml_provider_icon,
      });
    }

    this.setState({
      uiconfigs: signInBooleanArray,
      FirebaseUIConfig: FirebaseUIobj,
    });
  }

  onChange(e) {
    if (e.target.name == "email") {
      this.setState({ isEmailUser: false });
    }
    this.setState({ [e.target.name]: e.target.value });
  }

  ResetPassword = async () => {
    await this.checkUserProvider();
    if (this.verifyUserData() && this.state.isEmailUser) {
      this.props.forgotPassword(this.state.email);
      this.clearError();
    } else {
      this.setState({ inputError: { email: "Please input a valid email" } });
    }
  };

  componentDidUpdate() {
    if (
      this.props.authReducer.isTokenVerified &&
      this.props.authReducer.isAuthenticated
    ) {
      this.props.history.push(this.props.landingPage);
    }
    if (
      !this.props.authReducer.isAuthenticated &&
      this.props.authReducer.tenantId &&
      this.state.uiconfigs.length === 0
    ) {
      this.setFirebaseUI(this.props.tenantId);
    }
    if (this.props.errors) {
      this.setState({ errors: this.props.errors });
    }
  }

  verifyUserData = () => {
    let error = {};
    if (!this.state.email || !VALID_EMAIL.test(this.state.email)) {
      error.email = "Please input valid email id";
    }
    if (!this.state.password) {
      error.password = "Please enter password";
    }
    if (Object.keys(error).length) {
      this.setState({ inputError: error });
      return false;
    } else {
      return true;
    }
  };

  clearError = () => {
    if (Object.keys(this.state.inputError).length) {
      this.setState({ inputError: {} });
    }
  };

  onSubmit = (e) => {
    e.preventDefault();
    if (this.verifyUserData()) {
      this.clearError();
      const userData = {
        email: this.state.email,
        password: this.state.password,
      };
      this.props.loginUser(userData);
    }
  };

  checkUserProvider = async (e) => {
    if (VALID_EMAIL.test(this.state.email)) {
      try {
        const providers = await this.props.checkUserProvider(this.state.email);
        if (providers[0] == "password") {
          this.setState({ isEmailUser: true });
        } else {
          this.setState({ isEmailUser: false });
        }
      } catch (error) {
        this.setState({ isEmailUser: false });
      }
    }
  };

  render() {
    var firebaseSignInOptionsDivClass = this.state.uiconfigs[2]
      ? "firebase-sign-in"
      : "firebase-without-emailLogin";
    return (
      <>
        <LoadingOverlay
          loader={this.props.overlayLoaderState}
          text={this.props.loaderText}
          spinner
        >
          <Grid container>
            <Grid item xs={12}>
              <div className="signin-form__header">
                <img src={logo} alt="logo" />
                <Typography
                  component="h1"
                  variant="h4"
                  className="brand__title"
                >
                  Smart Platform
                </Typography>
              </div>
            </Grid>
            <Grid item xs={6}>
              {!this.props.isTenantInfoFetched ? (
                <DomainComponent />
              ) : (
                <div id="signInForm" className="h-md-100 signin-form-container">
                  <div className="signin-text-div"></div>
                  <div className="login-options">
                    <div className="login__wrapper">
                      <Typography
                        id="signInText"
                        className="sign-in-text"
                        variant="h2"
                      >
                        Sign in to your account.
                      </Typography>
                      {this.state.uiconfigs[2] && (
                        <LoginForm
                          email={this.state.email}
                          password={this.state.password}
                          onChange={this.onChange}
                          ResetPassword={this.ResetPassword}
                          onSubmit={this.onSubmit}
                          error={this.state.inputError}
                        />
                      )}
                      {(this.state.uiconfigs[0] || this.state.uiconfigs[1]) && (
                        <>
                          {this.state.uiconfigs[2] && (
                            <Divider variant="middle">
                              <Typography variant="h4" className="hr-text">
                                or continue with
                              </Typography>
                            </Divider>
                          )}
                          <Box
                            id="firebaseSignInOptionsDiv"
                            className={firebaseSignInOptionsDivClass}
                          >
                            <FirebaseLogin
                              FirebaseUIConfig={this.state.FirebaseUIConfig}
                              firebaseobj={firebaseobj}
                            />
                          </Box>
                        </>
                      )}
                      {
                        <Typography
                          variant="body"
                          component="p"
                          className="contact"
                          textAlign="center"
                        >
                          Need any help?{" "}
                          <Link href={this.props.helpDeskUrl} underline="none">
                            {"Contact now"}
                          </Link>
                        </Typography>
                      }
                    </div>
                  </div>
                </div>
              )}
            </Grid>
            <Grid item xs={6}>
              <MarketingBanner />
            </Grid>
          </Grid>
        </LoadingOverlay>
      </>
    );
  }
}

Login.propTypes = {
  loginUser: PropTypes.func.isRequired,
  // errors: PropTypes.object.isRequired,
  // success: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
  authReducer: state.authReducer,
  isTenantInfoFetched: state.authReducer.isTenantInfoFetched,
  isUsrSessionChecked: state.authReducer.isUsrSessionChecked,
  overlayLoaderState: state.loaderReducer.overlayLoaderState,
  loaderText: state.loaderReducer.loaderText,
  errors: state.errors,
  showAlert: state.authReducer.showAlert,
  authErrMsgProperties: state.authReducer.alertProperties,
  // success: state.success,
  helpDeskUrl: state.tenantConfigReducer.helpDesk || "#",
  landingPage: state.authReducer.landingPage,
});

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      loginUser,
      setUser,
      forgotPassword,
      checkUserProvider,
      getDropdownValues,
      setHelpDesk,
    },
    dispatch
  );
};

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(Login));
