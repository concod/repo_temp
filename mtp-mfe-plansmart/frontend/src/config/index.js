import { BASE_API, BASE_API_V3 } from "./api";

export const config = {
  baseUrl: BASE_API,
  baseUrlV3: BASE_API_V3
};

export const calendarConfig = {
  fstDayOfWk: 0, // Monday
  fstMoOfYr: 0 // Jan
};

export const apmRumConfig = {
  configHost: "https://assort-apm.impactsmartsuite.com/apm/",
  configName: "DEV-CORE-FE"
};
