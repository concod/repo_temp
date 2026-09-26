import { ENV, TENANT } from "config/api";
import { TENANT_MAPPING } from "config/constants";

let authConfig = {};

if (
  ENV === "devs" ||
  ENV === "test" ||
  ENV === "sandbox" ||
  TENANT.includes("localhost")
) {
  //Dev and TEST environments are included here
} else {
  if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.DG || TENANT.toLocaleLowerCase() === TENANT_MAPPING.DG_REPLICA) {
    authConfig = {
      posthog_api: "https://posthog-dg-uat.impactsmartsuite.com",
      posthog_key: "phc_uz5cauqQ7DvCyK08TbQyp8Qd08w9yPlPMBK1WmWm9m3",
      posthog_enabled: true
    };
  } else if (
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.VS ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.VS_REPLICA ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.VS_DR
  ) {
    authConfig = {
      posthog_api: "https://posthog-vs.impactsmartsuite.com",
      posthog_key: "phc_6yJICAsLHLHBWy9fi2HEk3weLYLDFBoqXoOvLFiupzP"
    };
  } else if (
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.CARTERS ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.CARTERS_REPLICA ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.CARTERS_DR ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.CARTERS_POC ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.CARTERS_TEMP
  ) {
    authConfig = {
      posthog_api: "https://posthog-carters.impactsmartsuite.com",
      posthog_key: "phc_57nO2rHTLCybCjGSzebk95eK2neehYWSnSRRyrIUdQZ",
      posthog_enabled: true
    };
  } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.BRISCOES || TENANT.toLocaleLowerCase() === TENANT_MAPPING.BRISCOES_REPLICA) {
    authConfig = {
      posthog_api: "https://posthog-briscoes.impactsmartsuite.com",
      posthog_key: "phc_HhHJ0NnAGwtNKPjB8Dz0AqVzs5J57IWBj13lfb9rW3k",
      posthog_enabled: true
    };
  } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.CRACKER_BARREL || TENANT.toLocaleLowerCase() === TENANT_MAPPING.CRACKER_BARREL_REPLICA) {
    authConfig = {
      posthog_api: "https://posthog-cb.impactsmartsuite.com",
      posthog_key: "phc_H7hFzIhrl7R383Bak2jnnFOpvdSeYxDN1sm0oBi9uVs",
      posthog_enabled: true
    };
  } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.PACSUN || TENANT.toLocaleLowerCase() === TENANT_MAPPING.PACSUN_REPLICA ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.PACSUN_ERP) {
    authConfig = {
      posthog_api: "https://posthog-pacsun.impactsmartsuite.com",
      posthog_key: "phc_z020cJHaIBQumYbA11rQbciAMpgEOPFiPHV1nce60f5",
      posthog_enabled: true
    };
  } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.LEVIS_US ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.LEVIS_US_REPLICA) {
    authConfig = {
      posthog_api: "https://posthog-levis.impactsmartsuite.com",
      posthog_key: "phc_jiUmZ4exb475F6Hc4PDsuxCqEDjq6dMK8bNpp3WKtfO",
      posthog_enabled: true
    };
  } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.PRIMARK) {
    authConfig = {
      posthog_api: "https://posthog-primark.impactsmartsuite.com",
      posthog_key: "phc_nHekq59Wr74pxilRZ2rL1oTniLbnqYPAzcD2xl1ehSg",
    };
  } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.ARITZIA) {
    authConfig = {
      posthog_api: "https://posthog-aritzia.impactsmartsuite.com",
      posthog_key: "phc_JyXjMOPRK29CmCz4QKSrAUTVQu56fnf5dZcJ8VRQz6x",
    };
  } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.FIGS || TENANT.toLocaleLowerCase() === TENANT_MAPPING.FIGS_REPLICA) {
    authConfig = {
      posthog_api: "https://posthog-figs.impactsmartsuite.com",
      posthog_key: "phc_OkO0TprCwSzmbed4WQ9yWfQh1mGcxZdlTJ6LlOY8KIV",
      posthog_enabled: true
    };
  }
}

export default authConfig;