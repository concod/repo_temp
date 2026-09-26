import { ENV, TENANT } from "config/api";
import { TENANT_MAPPING } from "config/constants";

let authConfig = {};

if (ENV === "devs" || ENV === "test" || TENANT.includes("localhost")) {
  //Dev and TEST environments are included here
  if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.VS) {
    authConfig = {
      apiKey: "AIzaSyAHKSk52_L_cMbAT0p31Cck6ed_7CsD8hw",
      authDomain: "victorias-secret-393308.firebaseapp.com",
      whatFixUrl:
        "https://whatfix.com/7aed52c2-cea5-451e-8310-ab7609db8800/embed/embed.nocache.js"
    };
  } else if (
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.ARHAUS ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.ARHAUS_REPLICA ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.ARHAUS_PIVOT
  ) {
    authConfig = {
      apiKey: "AIzaSyBcVTV1dvlmWyTeP1QlCMCw73Q_EuLnjy8",
      authDomain: "arhaus-401512.firebaseapp.com",
      whatFixUrl:
        "https://whatfix.com/7aed52c2-cea5-451e-8310-ab7609db8800/embed/embed.nocache.js"
    };
  } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.PLATFORM_INTERNAL) {
    authConfig = {
      apiKey: "AIzaSyCLzIDuxkqWZV2BvqUKSQU2MP9pdHkd06c",
      authDomain: "platform-internal.firebaseapp.com"
    };
  } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.TOMMY_BAHAMA) {
    authConfig = {
      apiKey: "AIzaSyB3zl-pOFkK_9iQoDlwcxi0oXo4XUrJWUQ",
      authDomain: "tommy-bahama-393308.firebaseapp.com"
    };
  } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.OOTB_PLANSMART) {
    authConfig = {
      apiKey: "AIzaSyAViMc7klDNu4s0nEfI2fAROmQSo_U6_DI",
      authDomain: "impactsmart.firebaseapp.com",
      whatFixUrl:
        "https://whatfix.com/7aed52c2-cea5-451e-8310-ab7609db8800/embed/embed.nocache.js"
    };
  } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.PETER_MILLAR) {
    authConfig = {
      apiKey: "AIzaSyCSha8vDV15n9A389KvJabXNzCx-mmHrEA",
      authDomain: "peter-millar-260624.firebaseapp.com",
      whatFixUrl:
        "https://whatfix.com/7aed52c2-cea5-451e-8310-ab7609db8800/embed/embed.nocache.js"
    };
  } else {
    authConfig = {
      apiKey: "AIzaSyDAZfJzJ57rMOyAgmLCgSc3L1NkpnKdFVY",
      authDomain: "impactsmart.firebaseapp.com",
      whatFixUrl:
        "https://whatfix.com/7aed52c2-cea5-451e-8310-ab7609db8800/embed/embed.nocache.js"
    };
  }
} else {
  if (
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.ARHAUS ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.ARHAUS_REPLICA ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.ARHAUS_PIVOT
  ) {
    authConfig = {
      apiKey: "AIzaSyBcVTV1dvlmWyTeP1QlCMCw73Q_EuLnjy8",
      authDomain: "arhaus-401512.firebaseapp.com",
      whatFixUrl:
        "https://whatfix.com/7aed52c2-cea5-451e-8310-ab7609db8800/embed/embed.nocache.js"
    };
  } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.PETER_MILLAR) {
    authConfig = {
      apiKey: "AIzaSyCSha8vDV15n9A389KvJabXNzCx-mmHrEA",
      authDomain: "peter-millar-260624.firebaseapp.com",
      whatFixUrl:
        "https://whatfix.com/7aed52c2-cea5-451e-8310-ab7609db8800/embed/embed.nocache.js"
    };
  } else {
    authConfig = {
      apiKey: "AIzaSyCo4HZ-TWBP8U36B8d_klhy3ZPg0Jc5D3k",
      authDomain: "impactsmart-prod.firebaseapp.com",
      whatFixUrl:
        "https://whatfix.com/7aed52c2-cea5-451e-8310-ab7609db8800/embed/embed.nocache.js"
    };
  }
}

export default authConfig;
