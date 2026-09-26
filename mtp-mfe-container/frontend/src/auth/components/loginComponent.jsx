import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import { loginUser } from "core/actions/authActions";
import {
  validateLoginFields,
  resetPasswordWithContinueUrl,
  initMfaSession,
  clearMfaSession,
  handleGoogleSignIn,
  handleSSOSignIn,
} from "./authUtils";
import "../index.scss";
import { firebaseobj } from "../firebase";
import LoadingOverlay from "core/Utils/Loader/loader";
import * as firebaseui from "firebaseui";
import { Link, Divider, Box, Typography } from "@mui/material";
import LoginForm from "./login";
import FirebaseLogin from "./firebaseUI";
import MarketingBanner from "./marketingBanner";
import DomainComponent from "./domain";
import {
  TENANT_SIGN_IN_OPTIONS,
  TENANT_SAML_PROVIDER_BUTTON_LABEL,
} from "config/constants";
import { makeStyles } from "@mui/styles";
import { isUndefined, throttle } from "lodash";
import LoginHeader from "./loginHeader";
import styles from "./loginComponentStyles";
import { Button } from "impact-ui-v3";
import GoogleIcon from "assets/google-icon.svg";
import globalStyles from "core/Styles/globalStyles";

const useStyles = makeStyles(styles);

const Login = () => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const globalClasses = globalStyles()
  // Redux state
  const authReducer = useSelector((state) => state.authReducer);
  const isTenantInfoFetched = useSelector((state) => state.authReducer.isTenantInfoFetched);
  const overlayLoaderState = useSelector((state) => state.loaderReducer.overlayLoaderState);
  const loaderText = useSelector((state) => state.loaderReducer.loaderText);
  const helpDeskUrl = useSelector((state) => state.tenantConfigReducer.helpDesk || "#");
  const landingPage = useSelector((state) => state.authReducer.landingPage);
  const tenantId = useSelector((state) => state.authReducer.tenantId);
  const mfaRequired = useSelector((state) => state.authReducer.mfaRequired);
  const isSessionAuthEnabled = useSelector((state) => state?.authReducer?.tenantId?.session_auth_enabled ?? false);

  // Local state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [uiconfigs, setUiconfigs] = useState([]);
  const [FirebaseUIConfig, setFirebaseUIConfig] = useState({
    signInOptions: [],
    credentialHelper: "none",
    signInFlow: "popup",
    callbacks: {
      signInSuccessWithAuthResult: (authResult, redirectUrl) => {
        sessionStorage.setItem("ssoLoginInProgress", "true")
        return false;
      }, 
      signInFailure: (error) => {
        console.error("Sign in failure:", error);
      },
    },
  });
  const [inputError, setInputError] = useState({});
  const isEmailLoginDisabled = useMemo(
    () => !uiconfigs?.[2],
    [uiconfigs]
  );
  // Refs
  const lastRedirectPathRef = useRef(null);
  const uiconfigsRef = useRef(uiconfigs);
  const firebaseUIConfigRef = useRef(FirebaseUIConfig);

  // Keep refs in sync with state
  useEffect(() => {
    uiconfigsRef.current = uiconfigs;
  }, [uiconfigs]);

  useEffect(() => {
    firebaseUIConfigRef.current = FirebaseUIConfig;
  }, [FirebaseUIConfig]);

  // Throttled redirect
  const throttledRedirect = useMemo(
    () =>
      throttle(
        (path) => {
          // Skip redirect if we're already redirecting to the same path
          if (lastRedirectPathRef.current !== path) {
            lastRedirectPathRef.current = path;
            navigate(path);
          }
        },
        1500,
        { leading: true, trailing: false }
      ),
    [navigate]
  );

  // setFirebaseUI
  const setFirebaseUI = useCallback(
    (tid) => {
      let signInBooleanArray = TENANT_SIGN_IN_OPTIONS; //This enables the respective sign in option => 1. Google 2. SAML 3. Email/Password
      let signInOptions = tid.sign_in_option;
      for (const option of signInOptions) {
        signInBooleanArray[parseInt(option) - 1] = true;
      }
      let FirebaseUIobj = { ...firebaseUIConfigRef.current };
      FirebaseUIobj.signInOptions = []; // Initialising this to empty in order to avoid duplicates on re-render
      if (signInBooleanArray[0]) {
        FirebaseUIobj["signInOptions"].push({
          provider: firebaseobj.auth.GoogleAuthProvider.PROVIDER_ID,
          fullLabel: false,
        });
      }

      if (signInBooleanArray[1]) {
        FirebaseUIobj["signInOptions"].push({
          provider: tid.saml_id,
          providerName: tid.saml_provider_name,
          buttonColor: "#fff",
          fullLabel: TENANT_SAML_PROVIDER_BUTTON_LABEL,
          iconUrl: tid.saml_provider_icon,
        });
      }

      setUiconfigs([...signInBooleanArray]);
      setFirebaseUIConfig(FirebaseUIobj);
    },
    []
  );


  // componentDidMount equivalent
  useEffect(() => {
    // let loc = new URL(window.location.origin);
    //To configure Tenant UI info. Currently For POC, all the three providers have been included
    //Here make an api call to get the tenantID
    //TO do API call using axios and get the sign in options
    //If there is no tenant ID coming from the backend, we won't display any signin options to the user
    // If we are on the login route, clear any stale MFA session flags so Back from MFA doesn't bounce
    try {
      const currentPathOnMount = location?.pathname;
      if (currentPathOnMount === "/login") {
        // Ensure Firebase UI is initialized when returning to login, even if authenticated
        if (tenantId && uiconfigsRef.current.length === 0) {
          setFirebaseUI(tenantId);
        }
      }
    } catch (e) {}
    if (!authReducer.isAuthenticated && tenantId && uiconfigsRef.current.length === 0) {
      setFirebaseUI(tenantId);
    }
    const unregisterAuthObserver = firebaseobj
      .auth()
      .onAuthStateChanged((user) => {
        // Do not auto-redirect away from the login page; allow switching accounts/back navigation
        const currentPath = location?.pathname;
        if (currentPath === "/login" && !isUndefined(mfaRequired) && mfaRequired) {
          return;
        }
        if (
          user &&
          authReducer.isTokenVerified &&
          authReducer.isAuthenticated
        ) {
          let mfaFlow = null;
          let isMfaVerified = false;
          mfaFlow = sessionStorage.getItem("mfaFlow");
          isMfaVerified = sessionStorage.getItem("mfaVerified") === "true";
          if (mfaRequired && !isMfaVerified) {
            // Ensure MFA session is initialized for SSO/SAML logins too
            if (!mfaFlow) {
              initMfaSession(user?.email || "");
            }
            throttledRedirect("/mfa");
          } else {
            throttledRedirect(landingPage);
          }
        } else if (
          uiconfigsRef.current.length > 0 &&
          (uiconfigsRef.current[0] || uiconfigsRef.current[1])
        ) {
          let firebaseUIInstance = firebaseui.auth.AuthUI.getInstance();
          if (!firebaseUIInstance) {
            firebaseUIInstance = new firebaseui.auth.AuthUI(firebaseobj.auth());
          } else {
            firebaseUIInstance.reset();
          }
          const container = document.getElementById("firebaseui_container");
          if (container) {
            firebaseUIInstance.start(
              "#firebaseui_container",
              firebaseUIConfigRef.current
            );
          }
        }
      });

    //Unregistering the auth oberserver that is called inside component did mount
    //This will clean the memory for the observer
    return () => {
      unregisterAuthObserver();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // componentDidUpdate equivalent
  useEffect(() => {
    // This part handles the auto-login flow, commenting it out for now
    const isFromLoginForm = sessionStorage.getItem("isLoggingIn") === "true";
    if (
      !isFromLoginForm &&
      authReducer.isTokenVerified &&
      authReducer.isAuthenticated
    ) {
      let mfaFlow = sessionStorage.getItem("mfaFlow") || false;
      let isMfaVerified = sessionStorage.getItem("mfaVerified") === "true" || false;
      if (!mfaFlow || isMfaVerified) {
        throttledRedirect(landingPage);
      }
    }
    // If on login route, always ensure Firebase UI is initialized for switching accounts
    try {
      const currentPath = location?.pathname;
      if (
        (currentPath === "/login" || currentPath === "/") &&
        tenantId &&
        uiconfigs.length === 0
      ) {
        setFirebaseUI(tenantId);
      }
    } catch (e) {}
  });

  const onChange = (e) => {
    if (e.target.name === "email") {
      setEmail(e.target.value);
    } else if (e.target.name === "password") {
      setPassword(e.target.value);
    }
  };

  const verifyUserData = (passwordResetflag = false) => {
    const errors = validateLoginFields(email, password, passwordResetflag);
    if (errors) {
      setInputError(errors);
      return false;
    }
    return true;
  };

  const clearError = () => {
    if (Object.keys(inputError).length) {
      setInputError({});
    }
  };

  const ResetPassword = () => {
    if (verifyUserData(true)) {
      resetPasswordWithContinueUrl(email, dispatch);
      clearError();
    } else {
      setInputError({ email: "Please input a valid email" });
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (verifyUserData()) {
      clearError();
      const userData = { email, password };
      try {
        sessionStorage.setItem("isLoggingIn", "true");
        const result = await dispatch(loginUser(userData, isSessionAuthEnabled));
        const resolvedLandingPage = result?.landingPage || landingPage;
        const mfaRequiredFromApi = result?.mfaRequired;

        // Clear previous MFA state
        clearMfaSession();

        if (mfaRequiredFromApi) {
          initMfaSession(email);
          throttledRedirect("/mfa");
        } else {
          throttledRedirect(resolvedLandingPage);
        }
        setTimeout(() => sessionStorage.removeItem("isLoggingIn"), 2000);
      } catch (error) {
        sessionStorage.removeItem("isLoggingIn");
        setInputError({
          password: error?.message || "Authentication failed",
        });
      }
    }
  };

  var firebaseSignInOptionsDivClass = uiconfigs[2]
    ? "firebase-sign-in"
    : "firebase-without-emailLogin";

  return (
    <>
      <LoadingOverlay
        loader={overlayLoaderState}
        text={loaderText}
        spinner
      >
        <section className="ia-login-page">
          <LoginHeader />
          <main className={`ia-login-body ${classes.mainIABody}`}>
            <div className="ia-login-form">
              {!isTenantInfoFetched ? (
                <DomainComponent />
              ) : (
                <div
                  id="signInForm"
                  className={`h-md-100 signin-form-container ${classes.signinFormContainer}`}
                >
                  {/* {!overlayLoaderState && <PromotionBanner />} */}
                  <div className="signin-text-div"></div>
                  <div className={`login-options ${classes.loginOptions}`}>
                    <div className="login__wrapper">
                      <Typography
                        id="signInText"
                        className={`sign-in-text ${classes.signInText} ${isEmailLoginDisabled && 'google-only'}`}
                        variant="h2"
                      >
                        Sign in to your accounts
                      </Typography>
                      {uiconfigs[2] && (
                        <LoginForm
                          email={email}
                          password={password}
                          onChange={onChange}
                          ResetPassword={ResetPassword}
                          onSubmit={onSubmit}
                          error={inputError}
                        />
                      )}
                      {(uiconfigs[0] || uiconfigs[1]) && (
                        <>
                          {uiconfigs[2] && (
                            <>
                              <Divider variant="middle" className={classes.hrTextDesktop}>
                                <Typography variant="h4" className="hr-text">
                                  or continue with
                                </Typography>
                              </Divider>
                              <Typography variant="h4" className={classes.hrTextMobile}>
                                Or continue with
                              </Typography>
                            </>
                          )}
                          <Box
                            id="firebaseSignInOptionsDiv"
                            className={`${firebaseSignInOptionsDivClass} ${classes.firebaseOverrides}`}
                          >
                              {isEmailLoginDisabled && FirebaseUIConfig?.signInOptions?.length ? (
                                <div className={globalClasses.centerAlign}>
                                  {uiconfigs[0] && <Button className={classes.loginBtn} icon={<GoogleIcon />} onClick={() => handleGoogleSignIn(dispatch)}>Sign in with Google</Button>}
                                  {uiconfigs[1] && <Button className={classes.loginBtn} icon={<img src={FirebaseUIConfig?.signInOptions?.[1]?.iconUrl} alt="icon" width={16} height={16} />} onClick={() => handleSSOSignIn(FirebaseUIConfig?.signInOptions?.[1]?.provider, dispatch)} variant={"tertiary"}>{FirebaseUIConfig?.signInOptions?.[1]?.fullLabel}</Button>}
                                </div>
                              ) : (<FirebaseLogin
                              FirebaseUIConfig={FirebaseUIConfig}
                              firebaseobj={firebaseobj}
                            />
                            )
                            }
                          </Box>
                        </>
                      )}
                      {
                        <Typography
                          variant="body"
                          component="p"
                          className={`contact ${classes.contact}`}
                          textAlign="center"
                        >
                          Need any help?{" "}
                          <Link
                            href={helpDeskUrl}
                            underline="none"
                          >
                            {"Contact now"}
                          </Link>
                        </Typography>
                      }
                    </div>
                  </div>
                </div>
              )}
            </div>
            <MarketingBanner />
          </main>
        </section>
      </LoadingOverlay>
    </>
  );
};

export default Login;
