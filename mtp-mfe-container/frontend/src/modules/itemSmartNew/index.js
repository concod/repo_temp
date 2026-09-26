import { mount } from "itemsmartnew/bootstrap";
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

    const domNode = document.getElementById("itemsmart-remote");

    const removeAgGridStyles = () => {
      // Find all style tags (check both with and without type attribute)
      const styleTags = document.querySelectorAll("style");

      styleTags.forEach((styleTag) => {
        const content = styleTag.textContent || styleTag.innerHTML || "";

        // Check if this is the AG Grid legacy styles (contains --ag-legacy-styles-loaded)
        const isLegacyStyles =
          content.includes("--ag-legacy-styles-loaded") &&
          content.includes(".ag-icon");

        // Check if this contains the generic AG Grid selectors that need to be removed
        // Look for the exact pattern: ag-grid, ag-grid-angular, ag-grid-ng2, ag-grid-polymer, ag-grid-aurelia
        const hasAgGridSelectors =
          content.includes("ag-grid,ag-grid-angular") ||
          content.includes("ag-grid, ag-grid-angular") ||
          content.includes("ag-grid-ng2") ||
          content.includes("ag-grid-polymer") ||
          content.includes("ag-grid-aurelia");

        const hasIaBasicTableLayout = content.includes(
          ".ia-basic-table-layout.table-v32"
        );

        if (isLegacyStyles || hasAgGridSelectors || hasIaBasicTableLayout) {
          styleTag.remove();
        }
      });
    };

    // Remove immediately
    removeAgGridStyles();

    return () => {
      unmountComponentAtNode(domNode);
    };
  }, []);

  return <div ref={ref} id="itemsmart-remote" />;
};
