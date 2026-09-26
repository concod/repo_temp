import posthog from "posthog-js";
import axiosinstance from "../Utils/axios";
import firebaseobj from "../../auth/firebase";
import { FETCH_TENANT, VERIFY_TOKEN } from "../../config/api";
import store from "store";
import {
  ADD_SNACK,
  CHECK_USER_SESSION_INIT,
  LOADER,
  LOGOUT_CURRENT_USER,
  SET_CURRENT_USER,
  TENANT_FETCH_FAILED,
  TENANT_FETCH_INIT,
  TENANT_FETCH_SUCCESS,
  UPDATE_TAM_CACHE,
  GET_USER_MANAGEMENT_SCREENS,
  SET_SESSION_DATA,
  CLEAR_SESSION_DATA,
} from "./types";
import { ingestionEnabled } from "./layoutActions";
import  { clearJustCache } from "../Utils/axios";
import { createSession, logoutSession } from "core/services/sessionService";
const fetchUserProviders = (userEmail) => {
  return firebaseobj.auth().fetchSignInMethodsForEmail(userEmail);
};

// Login - Post User Token
export const loginUser = (userData, isSessionAuthEnabled=false) => async (dispatch) => {
  dispatch({
    type: LOADER,
    payload: {
      status: true,
      text: "Authenticating user...",
    },
  });
    const providers = await fetchUserProviders(userData.email);
    if (providers.length == 0) {
      dispatch({
        type: ADD_SNACK,
        payload: {
          message:
            "There is no user record corresponding to this identifier. The user may have been deleted",
          options: { variant: "error" },
        },
      });
      dispatch({ type: LOADER, payload: { status: false, text: "Loading..." } });
    return;
    }
    if (!providers.includes("password")) {
      dispatch({
        type: ADD_SNACK,
        payload: {
          message: `User Record is already associated with ${providers[0]}`,
          options: { variant: "error" },
        },
      });
      dispatch({ type: LOADER, payload: { status: false, text: "Loading..." } });
    return;
    }
    try{
    await firebaseobj.auth().signInWithEmailAndPassword(userData.email, userData.password);
    const user = firebaseobj.auth().currentUser;
    const response = isSessionAuthEnabled ? await dispatch(initSession()) : await refreshToken(user); 
    const tokenResponse = response && Array.isArray(response) ? response[1] : null;
    const landingPage = isSessionAuthEnabled ? response?.landing_page : tokenResponse?.data?.data?.landing_page;
    const mfaRequired = isSessionAuthEnabled ? !!(response?.mfa_required) : !!(tokenResponse?.data?.data?.mfa_required);
    dispatch({
      type: SET_CURRENT_USER,
      payload: {
        isAuthenticated: true,
        isTokenVerified: true,
        user: {
          token: response[0],
          name: user.email,
        },
        landingPage,
        mfaRequired,
      },
    });
    dispatch({ type: LOADER, payload: { status: false, text: "Loading..." } });
    return { mfaRequired, landingPage, email: user.email };
  } catch(error) {
      dispatch({ type: LOADER, payload: { status: false, text: "Loading..." }});
      dispatch({
        type: ADD_SNACK,
        payload: { message: error?.response?.data?.message ?? error.message ?? "", options: { variant: "error" } },
      });
    }
  }
export const setUser = () => (dispatch) => {
  dispatch({
    type: SET_CURRENT_USER,
    payload: {
      isAuthenticated: true,
      isTokenVerified: true,
      user: {
        token: localStorage.getItem("token"),
        name: localStorage.getItem("name"),
      },
    },
  });
};

export const checkUserProvider = (userEmail) => () => {
  return firebaseobj.auth().fetchSignInMethodsForEmail(userEmail);
};

export const refreshToken = async (user) => {
  return new Promise((resolve, reject) => {
    user.getIdToken().then((token) => {
      axiosinstance({
        url: VERIFY_TOKEN,
        method: "POST",
        data: {
          token: token,
        },
      })
        .then((data) => {
          if (data.data.data.message == "Token verified") {
            localStorage.setItem("token", token);
            localStorage.setItem("name", user.email);
            try {
              posthog.people.set({ email: localStorage.getItem("name") });

              posthog.identify(
                { email: localStorage.getItem("name") },
                { host: window.location.hostname }
              );
            } catch (error) {
              console.error(
                "Issue with the posthog setup...Please check the setup"
              );
            }
            localStorage.setItem(
              "session.expiry",
              user.toJSON().stsTokenManager.expirationTime
            );
            resolve([token, data]);
          } else {
            firebaseSignOut();
            reject();
          }
        })
        .catch((error) => {
          firebaseSignOut();
          reject(error);
          if (error?.response?.status === 501) {
            store.dispatch(ingestionEnabled(true));
          }
        });
    });
  });
};
export const verifyTokenStatus = () => async (dispatch) => {
  dispatch({
    type: CHECK_USER_SESSION_INIT,
  });
  firebaseobj.auth().onAuthStateChanged((user) => {
    if (user) {
      if (sessionStorage.getItem("isLoggingIn") === "true") {
        return;
      }
      dispatch({
        type: LOADER,
        payload: {
          status: true,
          text: "Authenticating user...",
        },
      });
      refreshToken(user)
        .then((response) => {
          const token = response[0];
          const data = response[1];

          dispatch({
            type: SET_CURRENT_USER,
            payload: {
              isAuthenticated: true,
              isTokenVerified: true,
              user: {
                token: token,
                name: user.email,
              },
              landingPage: data.data.data.landing_page,
              mfaRequired: data.data.data.mfa_required || false,
            },
          })

          // Restore session expiry from localStorage on page refresh
          // session_id is managed as HttpOnly cookie by the backend
          const storedExpiresAt = localStorage.getItem("session_expires_at");
          if (storedExpiresAt) {
            dispatch({
              type: SET_SESSION_DATA,
              payload: {
                expiresAt: storedExpiresAt,
              },
            });
          }

          dispatch({
            type: LOADER,
            payload: {
              status: false,
              text: "Loading...",
            },
          });
        })
        .catch((error) => {
          dispatch({
            type: SET_CURRENT_USER,
            payload: {
              isAuthenticated: false,
              isTokenVerified: true,
              user: {},
            },
          });
          dispatch({
            type: ADD_SNACK,
            payload: {
              message: `Unable to verify the token`,
              options: {
                variant: "error",
              },
            },
          });
          dispatch({
            type: LOADER,
            payload: {
              status: false,
              text: "Loading...",
            },
          });
        });
    } else {
      dispatch({
        type: SET_CURRENT_USER,
        payload: {
          isAuthenticated: false,
          isTokenVerified: true,
          user: {},
        },
      });
    }
  });
};

const firebaseSignOut = () => {
  return firebaseobj.auth().signOut();
};
export const logoutUser = (token) => (dispatch) => {
  // Clear JustCache data first
  clearJustCache();
  axiosinstance({
    url: "user/logout",
    method: "POST",
    data: {}
  })
  .catch((e) => { 
    console.error("Error during logout API call", e);
  }); 
  logoutSession().catch((e) => {
    console.error("Error during session logout API call", e);
  });
  firebaseSignOut()
    .then(() => {
      localStorage.removeItem("token", token);
      localStorage.removeItem("session.expiry");
      localStorage.removeItem("CLIENT_NAME");
      localStorage.removeItem("currentApp");
      localStorage.removeItem("coreScreenNames");
      localStorage.removeItem("applicationCodesList");
      localStorage.removeItem("tenantDateFormat");
      localStorage.removeItem("tenantTimeZone");
      localStorage.removeItem("currentScreenName");
      localStorage.removeItem("inventorysmartScreenConfig");
      localStorage.removeItem("currentScreenName");
      localStorage.removeItem("tenantUamConfig");
      localStorage.removeItem("filter_attribute_exclusion_values");
      localStorage.removeItem("quickFilterLoad");
      localStorage.removeItem("chatData");
      localStorage.removeItem("smartBotScreenName");
      localStorage.removeItem("smartBotCurrentAppLink");
      localStorage.removeItem("currentModeData");
      localStorage.removeItem("currentSelectedModuleData");
      localStorage.removeItem("chatDataScreenLinkRef");
      localStorage.removeItem("currentModulesData");
      localStorage.removeItem("chatDataForReference");
      localStorage.removeItem("isStreaming");
      localStorage.removeItem("enableAllAccess");
      localStorage.removeItem("web_master_key");
      localStorage.removeItem("session_expires_at");

      sessionStorage.removeItem("currentApp");
      sessionStorage.removeItem("currentSideBar");
      sessionStorage.removeItem("redirectUrl");
      sessionStorage.removeItem("redirectionInfo");

      sessionStorage.removeItem("mfaFlow");
      sessionStorage.removeItem("mfaVerified");
      sessionStorage.removeItem("mfaEmail");
      sessionStorage.removeItem("mfaResendRemaining");
      sessionStorage.removeItem("mfaPending");
      sessionStorage.removeItem('crossFilterVersion');
      sessionStorage.removeItem("isLoggingIn");
      sessionStorage.removeItem("notificationVersion");
      posthog.reset(true);
    })
    .catch((error) => {
      return;
      // An error happened.
    });
  dispatch({
    type: UPDATE_TAM_CACHE,
    payload: "reset",
  });
  dispatch({
    type: GET_USER_MANAGEMENT_SCREENS,
    payload: "reset",
  });
  dispatch({
    type: LOGOUT_CURRENT_USER,
  });
  dispatch({
    type: LOADER,
    payload: {
      status: false,
    },
  });
  dispatch({
    type: CLEAR_SESSION_DATA
  })
};

export const getTenantId = (hostname) => (dispatch) => {
  //Logic to fetch tenantID from backend using axios
  dispatch({
    type: TENANT_FETCH_INIT,
  });
  return axiosinstance
    .get(`${FETCH_TENANT}?url=${hostname}`)
    .then((data) => {
      dispatch({
        type: TENANT_FETCH_SUCCESS,
        payload: data.data.data,
      });
    })
    .catch((error) => {
      //Handling the error
      dispatch({
        type: TENANT_FETCH_FAILED,
      });
    });
};

export const forgotPassword = (emailAddress) => (dispatch) => {
  firebaseobj
    .auth()
    .sendPasswordResetEmail(emailAddress)
    .then(function () {
      // Email sent.
      dispatch({
        type: ADD_SNACK,
        payload: {
          message: `Password reset link sent to the registered email successfully!`,
          options: {
            variant: "success",
          },
        },
      });
    })
    .catch(function (error) {
      // An error happened.
      dispatch({
        type: ADD_SNACK,
        payload: {
          message: error.message,
          options: {
            variant: "success",
          },
        },
      });
    });
};

export const initSession = () => async (dispatch) => {
  try {
    const response = await createSession();
    const { expires_at="", email="", landing_page="/home", mfa_required=false, user_id=null } = response?.data?.data;
    // session_id is set as HttpOnly cookie by the backend
    localStorage.setItem("session_expires_at", expires_at);
    dispatch({
      type: SET_SESSION_DATA,
      payload: {
        expiresAt: expires_at,
        landingPage: landing_page,
        mfaRequired: mfa_required,
        name: email
      },
    });
    return { expires_at, email, landing_page, mfa_required, user_id };
  } catch (error) {
    console.error("Failed to create session:", error);
    throw error;
  }
}
