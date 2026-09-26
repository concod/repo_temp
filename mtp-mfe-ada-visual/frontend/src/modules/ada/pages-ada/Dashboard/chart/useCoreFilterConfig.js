import { useEffect, useMemo, useState } from "react";

import {
  fetchCoreFilterConfiguration,
  formattedCoreFilterConfig,
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";

let coreFilterConfigCache = null;
let coreFilterConfigPromise = null;

const loadCoreFilterConfig = () => {
  if (coreFilterConfigCache) {
    return Promise.resolve(coreFilterConfigCache);
  }

  if (!coreFilterConfigPromise) {
    coreFilterConfigPromise = fetchCoreFilterConfiguration()
      .then((filters) => {
        coreFilterConfigCache = filters || [];
        return coreFilterConfigCache;
      })
      .catch((error) => {
        coreFilterConfigPromise = null;
        throw error;
      });
  }

  return coreFilterConfigPromise;
};

export const useCoreFilterConfig = () => {
  const [coreFilterConfig, setCoreFilterConfig] = useState(
    coreFilterConfigCache || []
  );

  useEffect(() => {
    if (coreFilterConfig?.length) {
      return;
    }

    let isMounted = true;

    loadCoreFilterConfig()
      .then((filters) => {
        if (isMounted) {
          setCoreFilterConfig(filters);
        }
      })
      .catch((error) => {
        console.log("Error fetching core filter configuration", error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const formattedCoreFilters = useMemo(
    () => formattedCoreFilterConfig(coreFilterConfig),
    [coreFilterConfig]
  );

  const labelMap = useMemo(
    () => new Map(formattedCoreFilters.map((f) => [f.column_name, f.label])),
    [formattedCoreFilters]
  );

  return { coreFilterConfig, formattedCoreFilters, labelMap };
};
