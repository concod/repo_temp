import posthog from "posthog-js";
import axiosinstance from "../Utils/axios";
import firebaseobj from "../../auth/firebase";
import { FETCH_TENANT, VERIFY_TOKEN } from "../../config/api";
import store from "store";
import {
  SET_CURRENT_USER,
  LOGOUT_CURRENT_USER,
  LOADER,
  TENANT_FETCH_FAILED,
  TENANT_FETCH_INIT,
  TENANT_FETCH_SUCCESS,
  CHECK_USER_SESSION_INIT,
  ADD_SNACK,
  UPDATE_TAM_CACHE,
} from "./types";
import { ingestionEnabled } from "./layoutActions";
const fetchUserProviders = (userEmail) => {
  return firebaseobj.auth().fetchSignInMethodsForEmail(userEmail);
};

// Login - Post User Token
export const loginUser = (userData) => async (dispatch) => {
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
    return;
  }
  if (!providers.includes("password")) {
    dispatch({
      type: ADD_SNACK,
      payload: {
        message: `User Record is already associated with ${providers[0]}`,
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
    return;
  }
  firebaseobj
    .auth()
    .signInWithEmailAndPassword(userData.email, userData.password)
    .catch((error) => {
      dispatch({
        type: LOADER,
        payload: {
          status: false,
          text: "Loading...",
        },
      });
      dispatch({
        type: ADD_SNACK,
        payload: {
          message: error.message,
          options: {
            variant: "error",
          },
        },
      });
    });
};

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
          reject();
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
            },
          });

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
  firebaseSignOut()
    .then(() => {
      localStorage.removeItem("token", token);
      localStorage.removeItem("session.expiry");
      localStorage.removeItem("CLIENT_NAME");
      localStorage.removeItem("quickFilterLoad");
      localStorage.removeItem("coreScreenNames");
      localStorage.removeItem("applicationCodesList");
      localStorage.removeItem("tenantDateFormat");
      localStorage.removeItem("tenantTimeZone");
      localStorage.removeItem("currentScreenName");
      localStorage.removeItem("inventorysmartScreenConfig");
      localStorage.removeItem("tenantUamConfig");
      localStorage.removeItem("filter_attribute_exclusion_values");
      localStorage.removeItem("chatData");
      localStorage.removeItem("currentModeData");
      localStorage.removeItem("currentSelectedModuleData");
      localStorage.removeItem("chatDataScreenLinkRef");
      localStorage.removeItem("currentModulesData");
      localStorage.removeItem("smartBotScreenName");
      localStorage.removeItem("smartBotCurrentAppLink");
      localStorage.removeItem("enableAllAccess");
      localStorage.removeItem("web_master_key");

      sessionStorage.removeItem("currentApp");
      localStorage.removeItem("currentApp");
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
    type: LOGOUT_CURRENT_USER,
  });
  dispatch({
    type: LOADER,
    payload: {
      status: false,
    },
  });
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
