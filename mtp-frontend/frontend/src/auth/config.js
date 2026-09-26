import { ENV, TENANT } from "config/api";
import { TENANT_MAPPING } from "config/constants";

let authConfig = {
  apiKey: "AIzaSyASiHYVE_0K5johawfcOxrQy0LAQKAoX3U",
  authDomain: "ralph-lauren-11122024.firebaseapp.com",
};

// if (ENV === "devs" || ENV === "test" || TENANT.includes("localhost")) {
//   //Dev and TEST environments are included here
//   if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.VS) {
//     authConfig = {
//       apiKey: "AIzaSyAHKSk52_L_cMbAT0p31Cck6ed_7CsD8hw",
//       authDomain: "victorias-secret-393308.firebaseapp.com",
//     };
//   } else if (
//     TENANT.toLocaleLowerCase() === TENANT_MAPPING.MNS ||
//     TENANT.toLocaleLowerCase() === TENANT_MAPPING.MNS_MENA
//   ) {
//     authConfig = {
//       apiKey: "AIzaSyAQg2AOfGDi3737nEytOc2tNKkhOsEsR64",
//       authDomain: "marksandspencer-414909.firebaseapp.com",
//       posthog_api: "https://posthog-mns-prod.impactsmartsuite.com",
//       posthog_key: "phc_kIgBMY60wgka1DzeaYKOST00LhP4nIhIzZHOITnL2u4",
//     };
//   } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.BRISCOES) {
//     authConfig = {
//       apiKey: "AIzaSyBKFZ9FajIJ64M9N3oqtSiEvDZFggUS5fQ",
//       authDomain: "briscoes-01082024.firebaseapp.com",
//     };
//   } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.STEVE_MADDEN) {
//     authConfig = {
//       apiKey: "AIzaSyAEeRfvGHAg4bsxQWp4WxNVzx6urAQuXr0",
//       authDomain: "steve-madden-280624.firebaseapp.com",
//     };
//   } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.RL_APAC) {
//     authConfig = {
//       apiKey: "AIzaSyASiHYVE_0K5johawfcOxrQy0LAQKAoX3U",
//       authDomain: "ralph-lauren-11122024.firebaseapp.com",
//     };
//   } else {
//     authConfig = {
//       apiKey: "AIzaSyDAZfJzJ57rMOyAgmLCgSc3L1NkpnKdFVY",
//       authDomain: "impactsmart.firebaseapp.com",
//     };
//   }
// } else {
//   if (
//     TENANT.toLocaleLowerCase() === TENANT_MAPPING.MNS ||
//     TENANT.toLocaleLowerCase() === TENANT_MAPPING.MNS_MENA
//   ) {
//     authConfig = {
//       apiKey: "AIzaSyAQg2AOfGDi3737nEytOc2tNKkhOsEsR64",
//       authDomain: "marksandspencer-414909.firebaseapp.com",
//     };
//   } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.STEVE_MADDEN) {
//     authConfig = {
//       apiKey: "AIzaSyAEeRfvGHAg4bsxQWp4WxNVzx6urAQuXr0",
//       authDomain: "steve-madden-280624.firebaseapp.com",
//       posthog_api: "https://sm-posthog.impactsmartsuite.com",
//       posthog_key: "phc_e3xtXcbJKZZgczQf887Md3WexbvGlBPa4iaZvFIN8gI",
//     };
//   } else if (
//     TENANT.toLocaleLowerCase() === TENANT_MAPPING.RALPH_LAUREN ||
//     TENANT.toLocaleLowerCase() === TENANT_MAPPING.RALPH_LAUREN_EU
//   ) {
//     authConfig = {
//       apiKey: "AIzaSyCo4HZ-TWBP8U36B8d_klhy3ZPg0Jc5D3k",
//       authDomain: "impactsmart-prod.firebaseapp.com",
//       // Commenting as per MTP-72150
//       // posthog_api: "https://posthog-rl-prod.impactsmartsuite.com",
//       // posthog_key: "phc_OBW3O5JZTqdyFZPMcGNdW39hiPYwAJgHbRH6xKOzhf3"
//     };
//   } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.SIGNET) {
//     authConfig = {
//       apiKey: "AIzaSyCo4HZ-TWBP8U36B8d_klhy3ZPg0Jc5D3k",
//       authDomain: "impactsmart-prod.firebaseapp.com",
//       posthog_api: "https://posthog-signet-prod.impactsmartsuite.com",
//       posthog_key: "phc_OBW3O5JZTqdyFZPMcGNdW39hiPYwAJgHbRH6xKOzhf3",
//       showMarketingBanner: true,
//     };
//   } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.FIT) {
//     authConfig = {
//       apiKey: "AIzaSyBBBiSbxzTTLKkKNce7ZeRgLcvIVpc-TOk",
//       authDomain: "fitcollege-15012025.firebaseapp.com",
//     };
//   } else if (TENANT.toLocaleLowerCase() === TENANT_MAPPING.RL_APAC) {
//     authConfig = {
//       apiKey: "AIzaSyASiHYVE_0K5johawfcOxrQy0LAQKAoX3U",
//       authDomain: "ralph-lauren-11122024.firebaseapp.com",
//     };
//   } else {
//     authConfig = {
//       apiKey: "AIzaSyCo4HZ-TWBP8U36B8d_klhy3ZPg0Jc5D3k",
//       authDomain: "impactsmart-prod.firebaseapp.com",
//     };
//   }
// }

export default authConfig;
