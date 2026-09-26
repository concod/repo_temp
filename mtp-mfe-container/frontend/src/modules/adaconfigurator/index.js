import { mount } from "adaconfigurator/bootstrap";
import { useEffect, useRef } from "react";
import { unmountComponentAtNode } from "react-dom";
import { useHistory } from "react-router-dom";
export default ({ routes, containerStore }) => {
  const ref = useRef(null);
  const history = useHistory();
  useEffect(() => {
    const { onParentNavigate } = mount(ref.current, {
      initialPath: history.location.pathname,
      onNavigate: ({ pathname: nextPathname }) => {
        const { pathname } = history.location;
        if (pathname !== nextPathname) {
          history.push(nextPathname);
        }
      },
      containerStore,
      routes,
      defaultHistory: history,
    });
    history.listen(onParentNavigate);
    const domNode = document.getElementById("adaconfigurator-remote");
    return () => {
      unmountComponentAtNode(domNode);
    };
  }, []);
  return <div ref={ref} id="adaconfigurator-remote" />;
};
