import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import {
  createGenerateClassName,
  jssPreset,
  StylesProvider,
} from "@mui/styles";
import { create } from "jss";
import { inventorysmartReducer } from "modules/inventorysmart/services-inventorysmart/inventorysmart-combined-services";
import configuratorReducer from "modules/inventorysmart/services-inventorysmart/ModuleConfigurator/configurator-reducer";
import { inventorysmartScreens } from "modules/inventorysmart/services-inventorysmart/inventorysmart-screens";
import Routes from "modules/inventorysmart/routes-inventorysmart/routes";
import { useContext, useEffect, useMemo, useState } from "react";
import { Provider } from "react-redux";
import { Router } from "react-router-dom";
import theme from "core/Styles/theme";
import { BroadcastChannelProvider } from "core/broadcastChannelContext";
import { firebaseobj } from "auth/firebase";
import { CompatRouter } from "react-router-dom-v5-compat";
import { adaReducer } from "modules/ada/services-ada/ada-combined-services";
import { omsReducer } from "modules/oms/services-oms/oms-combined-services";
import LoadingOverlay from "core/Utils/Loader/loader";
import AnalyticsContext from "posthog/analytics-context";
import { I18nProvider, BASE_LOCALE } from "impact-ui-v3";
import "modules/inventorysmart/common/agGridDefaults";

const App = ({ history, containerStore }) => {
  const [isShown, setIsShown] = useState(false);

  const userId = localStorage.getItem("name");
  const userName = localStorage.getItem('user_name');
  const analytics = useContext(AnalyticsContext);
  const userInfo = {
    userId: userId,
    properties: {
      name: userName,
      email: userId,
    },
  };
  const loadMessages = async (locale) => {
    const [coreMessages, inventorysmartMessages, omsMessages] =
      await Promise.all([
        import(`./core/locales/${locale}.js`).then((m) => m.default),
        import(`./locales/${locale}.js`)
          .then((m) => m.default)
          .catch(() => ({})),
        import(`./modules/oms/locales/${locale}.js`)
          .then((m) => m.default)
          .catch(() => ({})),
      ]);
    return { ...coreMessages, ...inventorysmartMessages, ...omsMessages };
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

  // add prefix to styles for each remote
  const generateClassName = createGenerateClassName({
    productionPrefix: "css",
    seed: "css",
  });

  const cache = useMemo(
    () =>
      createCache({
        key: "css",
        prepend: true,
      }),
    [history]
  );

  const { jss, sheetsManager } = useMemo(() => {
    return {
      jss: create({
        ...jssPreset(),
      }),
      sheetsManager: new Map(),
    };
  }, [history]);

  // only inject reducer and render app after firebase initialized
  firebaseobj.auth().onAuthStateChanged(async function (user) {
    if (user) {
      await containerStore.injectReducer(
        "inventorysmartReducer",
        inventorysmartReducer
      );
      await containerStore.injectReducer("adaReducer", adaReducer);
      await containerStore.injectReducer("omsReducer", omsReducer);
      await containerStore.injectReducer("configuratorReducer", configuratorReducer);
      await inventorysmartScreens(containerStore);

      setIsShown(true);
    }
  });

  return (
    <div>
      {isShown ? (
        <StylesProvider
          generateClassName={generateClassName}
          jss={jss}
          sheetsManager={sheetsManager}
        >
          <CacheProvider value={cache}>
            <ThemeProvider theme={theme}>
              <CssBaseline />
              <BroadcastChannelProvider>
              <I18nProvider defaultLocale={BASE_LOCALE} loadMessages={loadMessages}>
                <Router history={history}>
                  <CompatRouter>
                    <Provider store={containerStore}>
                      <Routes
                        history={history}
                        containerStore={containerStore}
                      />
                    </Provider>
                  </CompatRouter>
                </Router>
                </I18nProvider>
              </BroadcastChannelProvider>
            </ThemeProvider>
          </CacheProvider>
        </StylesProvider>
      ) : 
        <LoadingOverlay loader={true} applyDefaultCenterStyle={true} customZIndex={800} />
      }
    </div>
  );
};

export default App;
