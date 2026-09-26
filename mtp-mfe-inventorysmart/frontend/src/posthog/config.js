import { ENV } from "config/api";

const POSTHOG_KEY = 'phc_vuEsWsNi2CrGfdbjcpmNbeBa5ENqYXvtsSFFVxymMgTv';
const POSTHOG_HOST = 'https://us.i.posthog.com';

const posthogConfig = () => {
  // Environment is derived from the tenant baseUrl (see config/api):
  //   prod -> 3-part domain, so ENV is null
  //   uat  -> ENV === "uat"
  //   dev/test/sandbox -> ENV === "devs" | "test" | "sandbox"
  const hostname =
    typeof window !== 'undefined' && window?.location
      ? window.location.hostname
      : '';
  const isLocalhost = hostname === 'localhost';
  const environment = (ENV || '').toLowerCase();
  // Enable only on uat (ENV === "uat") and prod (ENV is null -> 3-part domain).
  const isUatOrProd = !environment || environment === 'uat';
  // Disable PostHog for internal Impact users (email stored under "name").
  const userEmail =
    typeof window !== 'undefined' && window?.localStorage
      ? (localStorage.getItem('name') || '').toLowerCase()
      : '';
  const isImpactUser = userEmail.endsWith('@impactanalytics.co');
  const isPosthogEnabled = !isLocalhost && isUatOrProd && !isImpactUser;
  return {
    apiKey: POSTHOG_KEY,
    apiHost: POSTHOG_HOST,
    isProduction: isPosthogEnabled,
  };
};

export default posthogConfig;