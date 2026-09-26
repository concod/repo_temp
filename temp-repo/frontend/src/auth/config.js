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
  if (
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.VS ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.VS_REPLICA
  ) {
    authConfig = {
      apiKey: "AIzaSyAHKSk52_L_cMbAT0p31Cck6ed_7CsD8hw",
      authDomain: "victorias-secret-393308.firebaseapp.com",
    };
  } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.ARHAUS) {
    authConfig = {
      apiKey: "AIzaSyBcVTV1dvlmWyTeP1QlCMCw73Q_EuLnjy8",
      authDomain: "arhaus-401512.firebaseapp.com",
    };
  } else if (
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.DG ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.DG_REPLICA
  ) {
    authConfig = {
      apiKey: "AIzaSyAckeYIby4Dcj0ulf-N1gi6niwau2XtjQ0",
      authDomain: "dollar-general-395209.firebaseapp.com",
    };
  } else if (
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.CARTERS ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.CARTERS_REPLICA ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.CARTERS_LOAD
  ) {
    authConfig = {
      apiKey: "AIzaSyDmcYxs4AWtnxxYWB-cjRmoRK7WdOxkqFU",
      authDomain: "carters-070424.firebaseapp.com",
    };
  } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.MNS) {
    authConfig = {
      apiKey: "AIzaSyAQg2AOfGDi3737nEytOc2tNKkhOsEsR64",
      authDomain: "marksandspencer-414909.firebaseapp.com",
    };
  } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.PLATFORM_INTERNAL) {
    authConfig = {
      apiKey: "AIzaSyCLzIDuxkqWZV2BvqUKSQU2MP9pdHkd06c",
      authDomain: "platform-internal.firebaseapp.com",
    };
  } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.PRICESMART_SAKS) {
    authConfig = {
      apiKey: "AIzaSyBpiGVzBePTPmVoEGQCpLVyWt1ecI8yGFY",
      authDomain: "saksfifthavenue-27032024.firebaseapp.com",
    };
  } else if (
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.VS_INTERNATIONAL ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.VS_INTERNATIONAL_REPLICA
  ) {
    authConfig = {
      apiKey: "AIzaSyDkCvwpYOQA5qG-j0m4EHxKHE1E6YuS6Qc",
      authDomain: "victorias-secret-international.firebaseapp.com",
    };
  } else if (
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.SPANX ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.SPANX_REPLICA
  ) {
    authConfig = {
      apiKey: "AIzaSyCc1kw3yaB_eYX6IW7SYbdZv-jfu-PsIiI",
      authDomain: "spanx-24042024.firebaseapp.com",
    };
  } else if (
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.BRISCOES ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.BRISCOES_REPLICA
  ) {
    authConfig = {
      apiKey: "AIzaSyBKFZ9FajIJ64M9N3oqtSiEvDZFggUS5fQ",
      authDomain: "briscoes-01082024.firebaseapp.com",
    };
  } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.STEVE_MADDEN) {
    authConfig = {
      apiKey: "AIzaSyAEeRfvGHAg4bsxQWp4WxNVzx6urAQuXr0",
      authDomain: "steve-madden-280624.firebaseapp.com",
    };
  } else if (
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.CRACKER_BARREL ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.CRACKER_BARREL_REPLICA
  ) {
    authConfig = {
      apiKey: "AIzaSyD3WLS3L98T5l6UgSCXB0fEGROGPPfmJ3s",
      authDomain: "crackerbarrel-16082024.firebaseapp.com",
    };
  } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.SCARPE) {
    authConfig = {
      apiKey: "AIzaSyAEggASHN0-hXzY7O94lAAqH-VqjGAl4zU",
      authDomain: "scrape-05092024.firebaseapp.com",
    };
  } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.HOMEDEPOT) {
    authConfig = {
      apiKey: "AIzaSyD1MitIwB6ssnA5gcTMISNguNmgxsqtgFY",
      authDomain: "homedepot-10122024.firebaseapp.com",
    };
  } else if (
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.TAPESTRY ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.TAPESTRY_REPLICA
  ) {
    authConfig = {
      apiKey: "AIzaSyDySQk8t636KGip4jpvz05MflZlVSaO5-4",
      authDomain: "tapestry-10052024.firebaseapp.com",
    };
  } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.BEALLS) {
    authConfig = {
      apiKey: "AIzaSyAbbinAIeg5vIMdfj8s0QRMfU5VD967r8I",
      authDomain: "bealls-13012025.firebaseapp.com",
    };
  } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.LEVIS_US) {
    authConfig = {
      apiKey: "AIzaSyBUlYOziBzlvh8GrjkJCWaS3uwNK6vVgS0",
      authDomain: "levis-12112024.firebaseapp.com",
    };
  } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.PRIMARK) {
    authConfig = {
      apiKey: "AIzaSyBvWIf1zFQqdAyul8eBvSnCgA3Vl0bbczo",
      authDomain: "primark-demo-07032025.firebaseapp.com",
    };
  } else if (
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.PACSUN ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.PACSUN_REPLICA
  ) {
    authConfig = {
      apiKey: "AIzaSyDy02hkskLrim222BrFycntevtoXe8TUjQ",
      authDomain: "pacsun-09012025.firebaseapp.com",
    };
  } else {
    authConfig = {
      apiKey: "AIzaSyDAZfJzJ57rMOyAgmLCgSc3L1NkpnKdFVY",
      authDomain: "impactsmart.firebaseapp.com",
    };
  }
} else {
  if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.ARHAUS) {
    authConfig = {
      apiKey: "AIzaSyBcVTV1dvlmWyTeP1QlCMCw73Q_EuLnjy8",
      authDomain: "arhaus-401512.firebaseapp.com",
    };
  } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.BEALLS) {
    authConfig = {
      apiKey: "AIzaSyAbbinAIeg5vIMdfj8s0QRMfU5VD967r8I",
      authDomain: "bealls-13012025.firebaseapp.com",
    };
  } else if (
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.DG ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.DG_REPLICA
  ) {
    authConfig = {
      apiKey: "AIzaSyAckeYIby4Dcj0ulf-N1gi6niwau2XtjQ0",
      authDomain: "dollar-general-395209.firebaseapp.com",
      posthog_api: "https://posthog-dg-uat.impactsmartsuite.com",
      posthog_key: "phc_uz5cauqQ7DvCyK08TbQyp8Qd08w9yPlPMBK1WmWm9m3",
    };
  } else if (
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.VS ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.VS_REPLICA
  ) {
    authConfig = {
      apiKey: "AIzaSyAHKSk52_L_cMbAT0p31Cck6ed_7CsD8hw",
      authDomain: "victorias-secret-393308.firebaseapp.com",
      posthog_api: "https://posthog-vs.impactsmartsuite.com",
      posthog_key: "phc_6yJICAsLHLHBWy9fi2HEk3weLYLDFBoqXoOvLFiupzP",
    };
  } else if (
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.CARTERS ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.CARTERS_REPLICA ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.CARTERS_DR ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.CARTERS_POC
  ) {
    authConfig = {
      apiKey: "AIzaSyDmcYxs4AWtnxxYWB-cjRmoRK7WdOxkqFU",
      authDomain: "carters-070424.firebaseapp.com",
      posthog_api: "https://posthog-carters.impactsmartsuite.com",
      posthog_key: "phc_57nO2rHTLCybCjGSzebk95eK2neehYWSnSRRyrIUdQZ",
    };
  } else if (
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.TAPESTRY ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.TAPESTRY_REPLICA
  ) {
    authConfig = {
      apiKey: "AIzaSyDySQk8t636KGip4jpvz05MflZlVSaO5-4",
      authDomain: "tapestry-10052024.firebaseapp.com",
    };
  } else if (
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.VS_INTERNATIONAL ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.VS_INTERNATIONAL_REPLICA
  ) {
    authConfig = {
      apiKey: "AIzaSyDkCvwpYOQA5qG-j0m4EHxKHE1E6YuS6Qc",
      authDomain: "victorias-secret-international.firebaseapp.com",
    };
  } else if (
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.SPANX ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.SPANX_REPLICA
  ) {
    authConfig = {
      apiKey: "AIzaSyCc1kw3yaB_eYX6IW7SYbdZv-jfu-PsIiI",
      authDomain: "spanx-24042024.firebaseapp.com",
    };
  } else if (
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.BRISCOES ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.BRISCOES_REPLICA
  ) {
    authConfig = {
      apiKey: "AIzaSyBKFZ9FajIJ64M9N3oqtSiEvDZFggUS5fQ",
      authDomain: "briscoes-01082024.firebaseapp.com",
    };
  } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.STEVE_MADDEN) {
    authConfig = {
      apiKey: "AIzaSyAEeRfvGHAg4bsxQWp4WxNVzx6urAQuXr0",
      authDomain: "steve-madden-280624.firebaseapp.com",
    };
  } else if (
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.CRACKER_BARREL ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.CRACKER_BARREL_REPLICA
  ) {
    authConfig = {
      apiKey: "AIzaSyD3WLS3L98T5l6UgSCXB0fEGROGPPfmJ3s",
      authDomain: "crackerbarrel-16082024.firebaseapp.com",
    };
  } else if (
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.PACSUN ||
    TENANT.toLocaleLowerCase() === TENANT_MAPPING.PACSUN_REPLICA
  ) {
    authConfig = {
      apiKey: "AIzaSyDy02hkskLrim222BrFycntevtoXe8TUjQ",
      authDomain: "pacsun-09012025.firebaseapp.com",
    };
  } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.SCARPE) {
    authConfig = {
      apiKey: "AIzaSyAEggASHN0-hXzY7O94lAAqH-VqjGAl4zU",
      authDomain: "scrape-05092024.firebaseapp.com",
    };
  } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.HOMEDEPOT) {
    authConfig = {
      apiKey: "AIzaSyD1MitIwB6ssnA5gcTMISNguNmgxsqtgFY",
      authDomain: "homedepot-10122024.firebaseapp.com",
    };
  } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.LEVIS_US) {
    authConfig = {
      apiKey: "AIzaSyBUlYOziBzlvh8GrjkJCWaS3uwNK6vVgS0",
      authDomain: "levis-12112024.firebaseapp.com",
    };
  } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.PRIMARK) {
    authConfig = {
      apiKey: "AIzaSyBvWIf1zFQqdAyul8eBvSnCgA3Vl0bbczo",
      authDomain: "primark-demo-07032025.firebaseapp.com",
    };
  } else {
    authConfig = {
      apiKey: "AIzaSyCo4HZ-TWBP8U36B8d_klhy3ZPg0Jc5D3k",
      authDomain: "impactsmart-prod.firebaseapp.com",
    };
  }
}

export default authConfig;
