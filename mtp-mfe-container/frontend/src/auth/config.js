import { ENV, TENANT } from "config/api";
import { TENANT_MAPPING } from "config/constants";

let authConfig = {};

if (
  ENV === "devs" ||
  ENV === "test" ||
  ENV === "sandbox" ||
  ENV === "demo" ||
  TENANT.includes("localhost")
) {
  //Dev and TEST environments are included here
  if (
    [
      TENANT_MAPPING.TOMMY_BAHAMA,
      TENANT_MAPPING.TOMMY_BAHAMA_REPLICA,
      TENANT_MAPPING.TOMMY_BAHAMA_PERF,
      TENANT_MAPPING.TOMMY_BAHAMA_PAGINATION,
      TENANT_MAPPING.TOMMY_BAHAMA_EXPERIMENTAL,
    ].includes(TENANT.toLocaleLowerCase())
  ) {
    authConfig = {
      posthog_api: "https://posthog-tb.impactsmartsuite.com",
      posthog_key: "phc_2BeN4CMSdJCexOSz7TCd60kMKzMfDIFmXRuEKKP91WN",
    };
  } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.GAP) {
    authConfig = {
      posthog_api: "https://posthog-gap.impactsmartsuite.com",
      posthog_key: "phc_oV7OpW9eilUFB8nWIeJBbQch43vZzPELqmnxezlwcaa",
    };
  }
} else {
  if (
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.ARHAUS ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.ARHAUS_REPLICA ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.ARHAUS_PIVOT ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.ARHAUS_PIVOT_REPLICA ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.ARHAUS_V2
  ) {
    authConfig = {
      posthog_api: "https://posthog-arhaus.impactsmartsuite.com",
      posthog_key: "phc_Q8WCtrBkqAvg69b4nntrDlr3Nonc0a0LskQLbrpY4eA",
    };
  } else if (
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.BRISCOES ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.BRISCOES_REPLICA
  ) {
    authConfig = {
      posthog_api: "https://posthog-briscoes.impactsmartsuite.com",
      posthog_key: "phc_HhHJ0NnAGwtNKPjB8Dz0AqVzs5J57IWBj13lfb9rW3k",
    };
  } else if (
    [
      TENANT_MAPPING.TOMMY_BAHAMA,
      TENANT_MAPPING.TOMMY_BAHAMA_PERF,
      TENANT_MAPPING.TOMMY_BAHAMA_PAGINATION,
      TENANT_MAPPING.TOMMY_BAHAMA_REPLICA,
    ].includes(TENANT.toLocaleLowerCase())
  ) {
    authConfig = {
      posthog_api: "https://posthog-tb.impactsmartsuite.com",
      posthog_key: "phc_2BeN4CMSdJCexOSz7TCd60kMKzMfDIFmXRuEKKP91WN",
    };
  } else if (
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.DG ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.DG_REPLICA
  ) {
    authConfig = {
      posthog_api: "https://posthog-dg-uat.impactsmartsuite.com",
      posthog_key: "phc_uz5cauqQ7DvCyK08TbQyp8Qd08w9yPlPMBK1WmWm9m3",
    };
  } else if (
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.VS ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.VS_REPLICA ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.VS_DR
  ) {
    authConfig = {
      posthog_api: "https://posthog-vs.impactsmartsuite.com",
      posthog_key: "phc_6yJICAsLHLHBWy9fi2HEk3weLYLDFBoqXoOvLFiupzP",
    };
  } else if (
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.CARTERS ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.CARTERS_REPLICA ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.CARTERS_DR
  ) {
    authConfig = {
      posthog_api: "https://posthog-carters.impactsmartsuite.com",
      posthog_key: "phc_57nO2rHTLCybCjGSzebk95eK2neehYWSnSRRyrIUdQZ",
    };
  } else if (
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.CRACKER_BARREL ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.CRACKER_BARREL_REPLICA
  ) {
    authConfig = {
      posthog_api: "https://posthog-cb.impactsmartsuite.com",
      posthog_key: "phc_aTQVbKrgEI2suTquMyOFhYbcKyHM4dtC1RFMVYXmC16",
    };
  } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.LEVIS_US ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.LEVIS_US_REPLICA) {
    authConfig = {
      posthog_api: "https://posthog-levis.impactsmartsuite.com",
      posthog_key: "phc_jiUmZ4exb475F6Hc4PDsuxCqEDjq6dMK8bNpp3WKtfO"
    };
  } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.PRIMARK) {
    authConfig = {
      posthog_api: "https://posthog-primark.impactsmartsuite.com",
      posthog_key: "phc_nHekq59Wr74pxilRZ2rL1oTniLbnqYPAzcD2xl1ehSg",
    };
  } else if (
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.PACSUN ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.PACSUN_REPLICA ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.PACSUN_ERP
  ) {
    authConfig = {
      posthog_api: "https://posthog-pacsun.impactsmartsuite.com",
      posthog_key: "phc_z020cJHaIBQumYbA11rQbciAMpgEOPFiPHV1nce60f5",
    };
  }
  else if (
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.BALSAM_HILL ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.BALSAM_HILL_REPLICA) {
    authConfig = {
      posthog_api: "https://posthog-balsamhill.impactsmartsuite.com",
      posthog_key: "phc_iTKBRqHbm31nnBpVOSuKwVMxrK48zMXWb0rP91dAMVj",
    };
  } else if (
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.FIGS ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.FIGS_REPLICA) {
    authConfig = {
      posthog_api: "https://posthog-figs.impactsmartsuite.com",
      posthog_key: "phc_OkO0TprCwSzmbed4WQ9yWfQh1mGcxZdlTJ6LlOY8KIV",
    };
  } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.GAP) {
    authConfig = {
      posthog_api: "https://posthog-gap.impactsmartsuite.com",
      posthog_key: "phc_oV7OpW9eilUFB8nWIeJBbQch43vZzPELqmnxezlwcaa",
    };
  } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.PSP || TENANT.toLocaleLowerCase() === TENANT_MAPPING.PSP_REPLICA) {
    authConfig = {
      posthog_api: "https://posthog-psp.impactsmartsuite.com",
      posthog_key: "phc_ouivHpdtHlXoVo7LjwUV60LEPw6VDTrccY00Jt638d1",
    };
  }
  else if (
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.PRICESMART_LESLIESPOOL
  ) {
    authConfig = {
      posthog_api: "https://posthog-leslies.impactsmartsuite.com",
      posthog_key: "phc_GWg5ZBwvRV2EQivfGEQyprq1xAbbbCGnLDAofZww5TI"
    }
  } else if (
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.PACSUN ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.PACSUN_REPLICA ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.PACSUN_ERP
  ) {
    authConfig = {
      posthog_api: "https://posthog-pacsun.impactsmartsuite.com",
      posthog_key: "phc_z020cJHaIBQumYbA11rQbciAMpgEOPFiPHV1nce60f5",
    };
  } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.FIGS || TENANT.toLocaleLowerCase() === TENANT_MAPPING.FIGS_REPLICA) {
    authConfig = {
      posthog_api: "https://posthog-figs.impactsmartsuite.com",
      posthog_key: "phc_OkO0TprCwSzmbed4WQ9yWfQh1mGcxZdlTJ6LlOY8KIV",
    };
  }
}

export default authConfig;
