import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import {
  StylesProvider,
  createGenerateClassName,
  jssPreset
} from "@mui/styles";
import theme from "Styles/theme";
import { firebaseobj } from "auth/firebase";
import { create } from "jss";
import Routes from "pages/Routes/Routes";
import { useMemo, useState } from "react";
import { Provider } from "react-redux";
import { Router } from "react-router-dom";
import { CompatRouter } from "react-router-dom-v5-compat";
import { plansmartReducer } from "./reducer/combineReducers";
import { BroadcastChannelProvider } from "core/broadcastChannelContext";

/**
 * Initializes and shows the app with styles and routing after Firebase authentication.
 * Rendered application component
 *
 * history - History object for navigation.
 * containerStore - Store for managing application state.
 */
const App = ({ history, containerStore }) => {
  const [isShown, setIsShown] = useState(false);

  // add prefix to styles for each remote
  const generateClassName = createGenerateClassName({
    productionPrefix: "plan",
    seed: "plan"
  });

  const cache = useMemo(
    () =>
      createCache({
        key: "plan-css",
        prepend: true
      }),
    [history]
  );

  const { jss, sheetsManager } = useMemo(() => {
    return {
      jss: create({
        ...jssPreset()
      }),
      sheetsManager: new Map()
    };
  }, [history]);

  // only inject reducer and render app after firebase initialized
  firebaseobj.auth().onAuthStateChanged(async function (user) {
    if (user) {
      await containerStore.injectReducer("plansmartReducer", plansmartReducer);
      setIsShown(true);
    }
  });

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
                <Router history={history}>
                  <CompatRouter>
                    <Provider store={containerStore}>
                      <Routes history={history} />
                    </Provider>
                  </CompatRouter>
                </Router>
              </BroadcastChannelProvider>
            </ThemeProvider>
          </CacheProvider>
        </StylesProvider>
      )}
    </div>
  );
};

export default App;
