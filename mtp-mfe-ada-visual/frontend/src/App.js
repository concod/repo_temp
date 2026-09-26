import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import {
  createGenerateClassName,
  jssPreset,
  StylesProvider,
} from "@mui/styles";
import { create } from "jss";
import { adaReducer } from "modules/ada/services-ada/ada-combined-services";
import Routes from "modules/ada/routes-ada/routes";
import { useEffect, useMemo, useState } from "react";
import { Provider } from "react-redux";
import { Router } from "react-router-dom";
import theme from "core/Styles/theme";
import { BroadcastChannelProvider } from "core/broadcastChannelContext";
import { firebaseobj } from "auth/firebase";
import { CompatRouter } from "react-router-dom-v5-compat";
import { I18nProvider, BASE_LOCALE } from "impact-ui-v3";

const App = ({ history, containerStore }) => {
  const [isShown, setIsShown] = useState(false);

  useEffect(() => {
    if (window.location?.search?.includes("inventorysmart")) {
      sessionStorage.setItem("isRedirectedFromInventorySmart", "true");
    }
    return () => {
      sessionStorage.removeItem("isRedirectedFromInventorySmart");
    };
  }, []);

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
      await containerStore.injectReducer("adaReducer", adaReducer);

      setIsShown(true);
    }
  });

  const loadMessages = async (locale) => {
    const [coreMessages, adaMessages] = await Promise.all([
      import(`./core/locales/${locale}.js`)
        .then((m) => m.default)
        .catch(() => ({})),
      import(`./locales/${locale}.js`)
        .then((m) => m.default)
        .catch(() => ({})),
    ]);
    return { ...coreMessages, ...adaMessages };
  };

  return (
    <div>
      {isShown && (
        <StylesProvider
          generateClassName={generateClassName}
          jss={jss}
          sheetsManager={sheetsManager}
        >
          <CacheProvider value={cache}>
            <ThemeProvider theme={theme}>
              <CssBaseline />
              <BroadcastChannelProvider>
                <I18nProvider
                  defaultLocale={BASE_LOCALE}
                  loadMessages={loadMessages}
                >
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
      )}
    </div>
  );
};

export default App;
