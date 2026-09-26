import { mount } from "agenticassort/agenticassortIndex";
import React, { useEffect, useRef } from "react";
import { unmountComponentAtNode } from "react-dom";
import { useHistory } from "react-router-dom";
export default ({ store }) => {
  const ref = useRef(null);
  const history = useHistory();
  useEffect(async () => {
    const { onParentNavigate } = mount(ref.current, {
      initialPath: history.location.pathname,
      onNavigate: ({ pathname: nextPathname }) => {
        const { pathname } = history.location;
        if (pathname !== nextPathname) {
          history.push(nextPathname);
        }
      },
      store,
    });
    history.listen(onParentNavigate);
    const domNode = document.getElementById("agenticassort-remote");
    return () => {
      unmountComponentAtNode(domNode);
    };
  }, []);
  return <div ref={ref} id="agenticassort-remote" />;
};
