import React from "react";
import { createMemoryHistory } from "history";
import ReactDOM from "react-dom";
import App from "./App";

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
    <App history={history} containerStore={containerStore} {...rest} />,
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
