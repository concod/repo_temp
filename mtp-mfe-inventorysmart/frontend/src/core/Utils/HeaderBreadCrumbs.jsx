import { useState, useEffect } from "react";
import { Breadcrumbs } from "impact-ui-v3";
import Container from "@mui/material/Container";
import globalStyles from "core/Styles/globalStyles";
import { useLocation } from "react-router-dom-v5-compat";

export default function HeaderBreadCrumbs({ options, breadCrumbRef, renderInContainer = true }) {
  const location = useLocation();
  const [routeOptions, setRouteOptions] = useState([]);

  useEffect(() => {
    if (options.length > 0) {
      let tempOptions = [...options];
      if (location.pathname.includes("inventory-smart")) {
        let homeOption = tempOptions.find((option) => option.label === "Home");
        if (homeOption) {
          homeOption.to = "/inventory-smart/decision-dashboard";
        }
      }
      tempOptions = tempOptions.map((option) => {
        return {
          ...option,
          onClick: option.action,
        };
      });
      setRouteOptions(tempOptions);
    }
  }, [options, location]);

  const globalClasses = globalStyles();

  return (
    <>
      {renderInContainer ? (
        <Container
          maxWidth={false}
          className={`${globalClasses.padding_0}`}
          ref={breadCrumbRef}
        >
          <Breadcrumbs aria-label="breadcrumb" list={routeOptions} />
        </Container>
      ) : (
        <Breadcrumbs aria-label="breadcrumb" list={routeOptions} />
      )}
    </>
  );
}
