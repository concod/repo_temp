import { allPlatformApps } from "config/apps-config";
import {
  convertAppsConstantFormat,
  convertProductAppsConstantFormat,
} from "./helper-functions";

const tbClientProductMapping = convertAppsConstantFormat(
  allPlatformApps["featuredApp"]
);
const tbConfiguratorDescription = [
  {
    id: "1",
    configurator_description:
      "IA Smart Platform leverages ADA powered \nAI/ML based long range forecasts to \ngenerate merchandising financial \nplans at multiple levels of product hierarchy. \nAlso, generates optimised plans based on \nkey constraints and strategic objectives. \nAlso, generates optimised levels of \nproduct hierarchy. Also, generates \noptimised plans based on key \nconstraints and strategic objectives.",
  },
];
const tbMenu = [
  {
    sl: "1",
    product: "plansmart",
    modules: "module-configurator",
    default: "TRUE",
  },
  {
    sl: "1",
    product: "inventorysmart",
    modules: "module-configurator",
    default: "TRUE",
  },
];

const tbProductDescription = convertProductAppsConstantFormat(
  allPlatformApps["featuredApp"]
);
export const moduleConfiguratorJSON = {
  tb_client_product_mapping: tbClientProductMapping,
  tb_configurator_description: tbConfiguratorDescription,
  tb_menu: tbMenu,
  tb_product_description: tbProductDescription,
};
