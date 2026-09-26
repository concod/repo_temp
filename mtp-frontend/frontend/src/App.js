import { Suspense, lazy, useContext, useEffect, useState } from "react";
import "react-dates/initialize";
import { Provider } from "react-redux";
import {
  Redirect,
  Route,
  BrowserRouter as Router,
  Switch,
} from "react-router-dom";
import {
  CompatRouter,
  CompatRoute,
  // Route,
  Routes,
  Navigate,
} from "react-router-dom-v5-compat";
import Login from "./auth";
import store from "./store";
//Authentication Testing - Firebase Connectivity
import Skeleton from "@mui/material/Skeleton";
import "firebaseui/dist/firebaseui.css";
import SnackbarProvider from "./core/Utils/snackbar";
import Snackbar from "./core/Utils/snackbar/components/snackbar";
import EmailLogin from "./auth/emaillogin";
import Home from "./core/commonComponents/home";
import ProtectedRoute from "./core/commonComponents/layout/ProtectedRoute";
import NotFound from "./core/commonComponents/notFound/NotFound";
import MetaDataComponent from "./hoc/metadata";
import { BroadcastChannelProvider } from "core/broadcastChannelContext";
// import { init as initApm } from "@elastic/apm-rum";
// import { apmRumConfig } from "./config/index";
import authConfig from "auth/config";
import "firebaseui/dist/firebaseui.css";
import { Prompt } from "impact-ui";
import { createBrowserHistory } from "history";
import AnalyticsContext from "core/posthog/analytics-context";

const CoreLayout = lazy(() => import("./core/commonComponents/core-layout"));

const TicketingRoutes = lazy(() =>
  import("core/pages/ticketing-system/routes-ticketing-system")
);

const PlanSmartRoute = lazy(() =>
  import("./modules/plansmart/routes-plansmart")
);
const AssortSmartLayout = lazy(() =>
  import("./modules/assortsmart/routes-assortsmart/routes")
);
const MarkSmartLayout = lazy(() =>
  import("./modules/marksmart/routes-marksmart")
);
const AdaVisualLayout = lazy(() => import("./modules/ada/routes-ada/routes"));

const InventorySmartRoute = lazy(() =>
  import("./modules/inventorysmart/routes-inventorysmart/routes")
);

const ClusterSmartLayout = lazy(() =>
  import("./modules/clusterSmart/routes-clustersmart/routes")
);

const whatFixUrl = "https://whatfix.com/7aed52c2-cea5-451e-8310-ab7609db8800/embed/embed.nocache.js";

// const apm = initApm({
//   // Set required service name (allowed characters: a-z, A-Z, 0-9, -, _, and space)
//   serviceName: apmRumConfig.configName,

//   // Set custom APM Server URL (default: http://localhost:8200)
//   serverUrl: apmRumConfig.configHost,
//   serviceVersion: "",
// });

export const App = () => {
  const [state, setState] = useState({
    app: "",
    confirm: false,
    confirmCallback: null,
  });

  const userId = localStorage.getItem("name");
  const user_name = localStorage.getItem("name");
  const history = createBrowserHistory();
  const analytics = useContext(AnalyticsContext);
  const userInfo = {
    userId: userId,
    properties: {
      name: user_name,
      email: userId,
    },
  };

  // selectApp = (app) => {
  //   this.setState({ app });
  // };

  // setConfirm, getConfirmation and ConfirmPrompt are used to show confirm prompt
  const setConfirm = () => {
    setState({ ...state, confirm: false });
  };
  const getConfirmation = (_, confirmCallback) => {
    setState({ ...state, confirm: true, confirmCallback });
  };

  /**
   * when clicked on confirm button, this onConfirmation will be called
   * for moving to next route and closing the modal
   */
  const onConfirmation = () => {
    state.confirmCallback(true);
    setConfirm();
  };

  // useEffect(() => {
  //   //creating a script object for whatfix
  //   const script = document.createElement("script");
  //   script.src = whatFixUrl;
  //   script.async = true;
  //   script.type = "text/javascript";
  //   script.language = "javascript";
  //   //appending this script tag will give us the Self Help button
  //   document.head.appendChild(script);
  // }, []);

  useEffect(() => {
    const unlisten = history.listen((location) => {
      analytics.trackPageView(location.pathname, userInfo);
    });
    analytics.trackPageView(history.location.pathname, userInfo);

    return () => {
      unlisten();
    };
  }, [analytics, history]);

  return (
    <>
      <Provider store={store}>
        <SnackbarProvider>
          <BroadcastChannelProvider>
            <Router getUserConfirmation={getConfirmation}>
              <CompatRouter>
                <Prompt
                  isOpen={state.confirm}
                  title="Confirm Navigation"
                  subHeading="Are you sure you want to leave this page without saving changes?"
                  primaryButtonProps={{
                    children: "Ok",
                    onClick: () => onConfirmation(),
                  }}
                  tertiaryButtonProps={{
                    children: "Cancel",
                    onClick: () => setConfirm(),
                  }}
                  variant="warning"
                />
                <Snackbar />
                <MetaDataComponent>
                  <div className="App">
                    <Suspense
                      fallback={
                        <div>
                          {" "}
                          <Skeleton> </Skeleton>
                        </div>
                      }
                    >
                      <Switch>
                        <Route exact path="/login" component={Login} />
                        <Route
                          exact
                          path="/emaillogin"
                          component={EmailLogin}
                        />
                        <ProtectedRoute exact path={`/home`} component={Home} />
                        <ProtectedRoute
                          path={`/ticketing-system`}
                          component={TicketingRoutes}
                        />
                        <ProtectedRoute
                          path={`/plan-smart/`}
                          component={PlanSmartRoute}
                        />
                        <ProtectedRoute
                          path="/assort-smart"
                          component={AssortSmartLayout}
                        />
                        <ProtectedRoute
                          path="/mark-smart"
                          component={MarkSmartLayout}
                        />
                        <ProtectedRoute path="/ada" component={AdaVisualLayout} />
                        <ProtectedRoute
                          path="/inventory-smart"
                          component={InventorySmartRoute}
                        />
                        <ProtectedRoute
                          path="/cluster-smart"
                          component={ClusterSmartLayout}
                        />
                        <Redirect exact from="/" to="/login" />
                        <ProtectedRoute component={CoreLayout} />
                        <ProtectedRoute exact path="/*" component={NotFound} />
                      </Switch>
                    </Suspense>
                  </div>
                </MetaDataComponent>
              </CompatRouter>
            </Router>
          </BroadcastChannelProvider>
        </SnackbarProvider>
      </Provider>
    </>
  );
};

export default App;
