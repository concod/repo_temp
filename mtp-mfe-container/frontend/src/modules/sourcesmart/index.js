// Align with Size Smart pattern for consistency
import { mount } from "sourceSmart/bootstrap";
import { useEffect, useRef } from "react";
import { useHistory } from "react-router-dom";

const SourceSmartModule = ({ routes, containerStore }) => {
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
    
    return () => {
      window.location.reload();
    };
  }, []);

  return <div ref={ref} id="source-smart-remote" />;
};

export default SourceSmartModule;