import { mount } from "mcphub/mcphubIndex";
import React, { useEffect, useRef } from "react";
import { unmountComponentAtNode } from "react-dom";
import { useHistory } from "react-router-dom";

const BASE_PATH = "/mcp-hub";

export default ({ store, routes }) => {
  const ref = useRef(null);
  const history = useHistory();
  useEffect(() => {
    // Re-entrancy guard: prevents the container -> remote -> container
    // navigation echo from recursing and overflowing the call stack.
    let isSyncing = false;

    const { onParentNavigate } = mount(ref.current, {
      initialPath: history.location.pathname,
      onNavigate: ({ pathname: nextPathname }) => {
        if (isSyncing) return;
        const { pathname } = history.location;
        // Only sync paths that belong to this micro-frontend.
        if (pathname !== nextPathname && nextPathname?.startsWith(BASE_PATH)) {
          history.push(nextPathname);
        }
      },
      store,
      routes,
      defaultHistory: history,
    });

    const unlisten = history.listen((location) => {
      if (typeof onParentNavigate !== "function") return;
      isSyncing = true;
      try {
        onParentNavigate(location);
      } finally {
        isSyncing = false;
      }
    });

    const domNode = document.getElementById("mcphub-remote");
    return () => {
      unlisten();
      unmountComponentAtNode(domNode);
    };
  }, []);
  return <div ref={ref} id="mcphub-remote" />;
};
