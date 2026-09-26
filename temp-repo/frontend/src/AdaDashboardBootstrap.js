import React from "react";
import { createMemoryHistory } from "history";
import ReactDOM from "react-dom";
import App, { AppWrapper } from "./App";
import AdaDashboard from "modules/ada/pages-ada/Dashboard";

// Mount function to start up the app
const mount = (
  el,
  { onNavigate, defaultHistory, initialPath, containerStore, ...rest }
) => {
  const history =
    defaultHistory ||
    createMemoryHistory({
      initialEntries: [initialPath],
    });

  if (onNavigate) {
    history.listen(onNavigate);
  }

  ReactDOM.render(
    <AppWrapper history={history} containerStore={containerStore} {...rest}>
      <AdaDashboard history={history} {...rest} />
    </AppWrapper>,
    el
  );

  return {
    onParentNavigate({ pathname: nextPathname }) {
      const { pathname } = history.location;

      if (pathname !== nextPathname) {
        history.push(nextPathname);
      }
    },
  };
};

// We are running through container
// and we should export the mount function
export { mount };
