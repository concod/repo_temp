import * as Icons from "@mui/icons-material/";
import { getCurrentApplicationName } from "core/Utils/functions/utils";
import Layout from "core/commonComponents/layout";
import React, { lazy } from "react";

export const ticketingSidebarOptions = [
  {
    link: "/ticketing-system/individual-view",
    title: "Individual View",
    icon: React.createElement(Icons.GpsFixedOutlined),
    order: 2,
    disabled: false,
  },
  {
    link: "/ticketing-system",
    title: "Organization View",
    icon: React.createElement(Icons.DashboardOutlined),
    order: 1,
    disabled: false,
  },
];

const TicketingRoutes = () => {
  const TicketingSystemScreen = lazy(() =>
    import("core/pages/ticketing-system")
  );

  const TicketingDetailedViewScreen = lazy(() =>
    import("core/pages/ticketing-system/components/detailed-view")
  );

  const TicketingIndividualViewScreen = lazy(() =>
    import("core/pages/ticketing-system/components/individual-view")
  );

  const routes = [
    {
      path: `/ticketing-system`,
      component: TicketingSystemScreen,
      title: "TicketingSystemScreen",
      screenName: "Organization View",
      module: "organization_view",
    },
    {
      path: `/ticketing-system/detailed-view/data-id/:id/data-category/:category`,
      component: TicketingDetailedViewScreen,
      title: "TicketingDetailedViewScreen",
      screenName: "Organization View",
      module: "detailed_view",
    },
    {
      path: `/ticketing-system/individual-view`,
      component: TicketingIndividualViewScreen,
      title: "TicketingIndividualViewScreen",
      screenName: "Individual View",
      module: "individual_view",
    },
  ];

  return (
    <Layout
      routes={routes}
      sideBarOptions={ticketingSidebarOptions}
      app={getCurrentApplicationName()}
    />
  );
};

export default TicketingRoutes;
