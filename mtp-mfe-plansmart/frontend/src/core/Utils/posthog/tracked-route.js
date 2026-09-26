import React, { useContext, useEffect } from "react";
import { Route } from "react-router-dom-v5-compat";
import AnalyticsContext from "./custom-analytics-context";

const TrackedRoute = ({ userInfo, ...props }) => {
  const analytics = useContext(AnalyticsContext);
  const { path } = props;

  useEffect(() => {
    if (userInfo) {
      analytics.identify(userInfo.userId, userInfo.properties);
    }
    analytics.capture("$pageview", { path });
  }, [path, analytics, userInfo]);

  return <Route {...props} />;
};

export default TrackedRoute;
