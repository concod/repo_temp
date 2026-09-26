// Create: src/components/SizeSmartContainer.jsx (or .tsx)
import { mount } from "sizeSmart/bootstrap";
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
    });
    
    history.listen(onParentNavigate);
    
    const domNode = document.getElementById("size-smart-remote");
    return () => {
      // refresh the page
      window.location.reload();
      // unmountComponentAtNode(domNode);
    };
  }, []);
  
  return <div ref={ref} id="size-smart-remote" />;
};