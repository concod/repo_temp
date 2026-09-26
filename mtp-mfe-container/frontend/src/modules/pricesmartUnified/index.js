import { firebaseobj } from "auth/firebase";
import { mount } from "pricesmartUnified/bootstrap";
import { useEffect, useRef } from "react";
import { useHistory } from "react-router-dom";

export default ({ routes, containerStore }) => {
  const ref = useRef(null);
  const history = useHistory();

  useEffect(() => {
    let unmountFn = null;

    try {
      const { onParentNavigate, unmount } = mount(ref.current, {
        initialPath: history.location.pathname,
        onNavigate: ({ pathname: nextPathname }) => {
          const { pathname } = history.location;

          if (pathname !== nextPathname) {
            history.push(nextPathname);
          }
        },
        containerStore,
        routes,
        firebaseobj
      });

      unmountFn = unmount;
      history.listen(onParentNavigate);
    } catch (e) {
      console.error("PriceSmart Unified mount failed:", e);
    }

    return () => {
      if (unmountFn) {
        unmountFn();
      }
    };
  }, []);

  return <div ref={ref} id="pricesmart-unified-remote" />;
};