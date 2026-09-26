import { Suspense, lazy, useContext, useEffect, useState, useMemo } from "react";
import "react-dates/initialize";
import { Provider, useSelector } from "react-redux";
import {
  Redirect,
  Route,
  BrowserRouter as Router,
  Switch,
} from "react-router-dom";
import Login from "./auth";
import store from "./store";
//Authentication Testing - Firebase Connectivity
import "firebaseui/dist/firebaseui.css";
import SnackbarProvider from "core/Utils/snackbar";
import Snackbar from "core/Utils/snackbar/components/snackbar";
import ProtectedRoute from "core/commonComponents/layout/ProtectedRoute";
import MetaDataComponent from "./hoc/metadata";
import { BroadcastChannelProvider } from "core/broadcastChannelContext";
import { createBrowserHistory } from "history";
import AnalyticsContext from "core/posthog/analytics-context";
import { ENV } from "config/api";
import { CompatRouter } from "react-router-dom-v5-compat";
import LoadingOverlay from "core/Utils/Loader/loader";
import { Prompt } from "impact-ui-v3";
import { I18nProvider, BASE_LOCALE } from "impact-ui-v3";
const SessionTimeoutWrapper = lazy(() => import("core/commonComponents/sessionTimeout/SessionTimeoutWrapper"));

const SessionTimeoutGate = () => {
  const isSessionAuthEnabled = useSelector(
    (state) => state?.authReducer?.tenantId?.session_auth_enabled ?? false
  );
  if (!isSessionAuthEnabled) {
    sessionStorage.setItem("session_auth_enabled", false);
    return null;
  }
  sessionStorage.setItem("session_auth_enabled", true)
  return (
    <Suspense fallback={null}>
      <SessionTimeoutWrapper />
    </Suspense>
  );
};

const Home = lazy(() => import("./modules/home"));
const CoreLayout = lazy(() => import("./core/commonComponents/core-layout"));
const MFA = lazy(() => import("auth/components/multiFactorAuthentication"));
const ChangePassword = lazy(() => import("auth/change-password/ChangePassword"));
const InvalidateCache = lazy(() => import("modules/invalidate-cache/InvalidateCacheScreen"));
const ApiDetails = lazy(() => import("modules/api-details/ApiDetailsScreen"));
const NotFound = lazy(() => import("./core/commonComponents/notFound/NotFound"));
const TicketingRoutes = lazy(() =>
  import("modules/ticketing-system/routes-ticketing-system")
);
const ReleaseNotesRoutes = lazy(() =>
  import("modules/release-notes/routes-release-notes")
);
const KeyboardShortcutsRoutes = lazy(() => import("modules/keyboardShortcuts/index.jsx"));

const AgenticAssortRoutes = lazy(() => import("./modules/agenticassort"));

const PlanSmartRoute = lazy(() => import("./modules/plansmart"));
const AssortSmartLayout = lazy(() => import("./modules/assortsmart"));
const AdaVisualLayout = lazy(() => import("./modules/ada"));
const DemandSmartLayout = lazy(() => import("./modules/demandsmart"));
const InventorySmartRoute = lazy(() => import("./modules/inventorysmart"));
// const ClusterSmartLayout = lazy(() =>
//   import("./modules/clusterSmart/routes-clustersmart/routes")
// );
const ForecastConfiguratorLayout = lazy(() =>
  import("./modules/forecastconfigurator")
);
const ADAConfiguratorLayout = lazy(() => import("./modules/adaconfigurator"));
const MondaySmartRoute = lazy(() => import("./modules/mondaysmart"));
const McpHubRoute = lazy(() => import("./modules/mcphub"));
const ItemSmartLayout = lazy(() => import("./modules/itemSmart"));
const ItemSmartNewLayout = lazy(() => import("./modules/itemSmartNew"));
const PriceSmartMarkdownLayout = lazy(() =>
  import("./modules/pricesmartMarkdown")
);
const PriceSmartPromoLayout = lazy(() => import("./modules/pricesmartPromo"));
const BasePricingLayout = lazy(() => import("./modules/basePricing"));
const BasePricingRestLayout = lazy(() => import("./modules/basePricingRest"));
const SizeSmartRoute = lazy(() => import("./modules/sizesmart"));
const PriceSmartUnifiedLayout = lazy(() =>
  import("./modules/pricesmartUnified")
);
const SourceSmartRoute = lazy(() => import("./modules/sourcesmart"));


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
  const loadMessages = (locale) => import(`./core/locales/${locale}.js`).then((m)=>m.default);

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

  useEffect(() => {
    const unlisten = history.listen((location) => {
      analytics.trackPageView(location.pathname, userInfo);
    });
    analytics.trackPageView(history.location.pathname, userInfo);

    return () => {
      unlisten();
    };
  }, [analytics, history]);

  useEffect(() => {
    if (window?.location?.href?.includes("redirect")) {
      sessionStorage.setItem("redirectUrl", window?.location?.href);
    }
  }, [history]);

  return (
    <>
      <Provider store={store}>
        <SnackbarProvider>
          <BroadcastChannelProvider>
          <I18nProvider defaultLocale={BASE_LOCALE} loadMessages={loadMessages}>
            <Router getUserConfirmation={getConfirmation}>
              <CompatRouter>
                <Suspense fallback={<></>}>
                  <Prompt
                    isOpen={state.confirm}
                    title="Confirm Navigation"
                    primaryButtonLabel="Ok"
                    onPrimaryButtonClick={() => onConfirmation()}
                    secondaryButtonLabel="Cancel"
                    onSecondaryButtonClick={() => setConfirm()}
                    variant="warning"
                    handleClose={() => setConfirm()}
                  >
                    Are you sure you want to leave this page without saving
                    changes?
                  </Prompt>
                </Suspense>
                <Snackbar />
                <SessionTimeoutGate />
                <MetaDataComponent>
                  <div className="App">
                    <Suspense
                      fallback={
                        <div>
                          <LoadingOverlay loader={true} applyDefaultCenterStyle={true} customZIndex={800} />
                        </div>
                      }
                    >
                      <Switch>
                        <Route exact path="/login" component={Login} />
                        <Route exact path="/change-password" component={ChangePassword} />
                        <Route exact path="/mfa" component={MFA} />
                        {/* <Route
                          exact
                          path="/emaillogin"
                          component={EmailLogin}
                        /> */}
                        <ProtectedRoute exact path={`/home`} component={Home} />
                        <ProtectedRoute
                          path={`/ticketing-system`}
                          component={TicketingRoutes}
                        />
                        <ProtectedRoute
                          path={`/release-notes`}
                          component={ReleaseNotesRoutes}
                        />
                        <ProtectedRoute
                          path={`/keyboard-shortcuts`}
                          component={KeyboardShortcutsRoutes}
                        />
                        <ProtectedRoute
                          path={`/agentic-assort`}
                          component={AgenticAssortRoutes}
                        />
                        <ProtectedRoute
                          path={`/plan-smart/`}
                          component={PlanSmartRoute}
                          containerStore={store}
                        />
                        <ProtectedRoute
                          path="/assort-smart"
                          component={AssortSmartLayout}
                          containerStore={store}
                        />
                        {/* <ProtectedRoute
                          path="/mark-smart"
                          component={MarkSmartLayout}
                        /> */}
                        <ProtectedRoute
                          path="/ada"
                          component={AdaVisualLayout}
                          containerStore={store}
                        />
                        <ProtectedRoute
                          path="/demand-smart"
                          component={DemandSmartLayout}
                          containerStore={store}
                        />
                        <ProtectedRoute
                          path="/inventory-smart"
                          component={InventorySmartRoute}
                          containerStore={store}
                        />
                        {/* <ProtectedRoute
                          path="/cluster-smart"
                          component={ClusterSmartLayout}
                        /> */}
                        <ProtectedRoute
                          path="/forecastconfigurator"
                          component={ForecastConfiguratorLayout}
                          containerStore={store}
                        />
                        <ProtectedRoute
                          path="/monday-smart"
                          component={MondaySmartRoute}
                          store={store}
                        />
                        <ProtectedRoute
                          path="/mcp-hub"
                          component={McpHubRoute}
                          store={store}
                        />
                        <ProtectedRoute
                          path="/item-smart"
                          component={ItemSmartLayout}
                          containerStore={store}
                        />
                        <ProtectedRoute
                          path="/item-smart-new"
                          component={ItemSmartNewLayout}
                          containerStore={store}
                        />
                        <ProtectedRoute
                          path="/pricesmart-markdown"
                          component={PriceSmartMarkdownLayout}
                          containerStore={store}
                        />
                        <ProtectedRoute
                          path="/pricesmart-promo"
                          component={PriceSmartPromoLayout}
                          containerStore={store}
                        />
                        <ProtectedRoute
                          path="/pricesmart"
                          component={PriceSmartUnifiedLayout}
                          containerStore={store}
                        />
                        <ProtectedRoute
                          path="/adaconfigurator"
                          component={ADAConfiguratorLayout}
                          containerStore={store}
                        />
                        <ProtectedRoute
                          path="/base-pricing"
                          component={BasePricingLayout}
                          containerStore={store}
                        />
                        <ProtectedRoute
                          path="/base-pricing-rest"
                          component={BasePricingRestLayout}
                          containerStore={store}
                        />
                        <ProtectedRoute
                          path="/size-smart"
                          component={SizeSmartRoute}
                          containerStore={store}
                        />
                        <ProtectedRoute
                          path="/source-smart"
                          component={SourceSmartRoute}
                          containerStore={store}
                        />
                        <ProtectedRoute
                          path="/invalidate-cache"
                          component={InvalidateCache}
                        />
                        {(ENV === "dev" || ENV === "devs" || ENV === "test") && (
                          <Route
                            path="/api-details"
                            component={ApiDetails}
                          />
                        )}
                        <Redirect exact from="/" to="/login" />
                        <ProtectedRoute component={CoreLayout} />
                        <ProtectedRoute exact path="/*" component={NotFound} />
                      </Switch>
                    </Suspense>
                  </div>
                </MetaDataComponent>
              </CompatRouter>
            </Router>
          </I18nProvider>
          </BroadcastChannelProvider>
        </SnackbarProvider>
      </Provider>
    </>
  );
};

export default App;
