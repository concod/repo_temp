// import { allPlatformApps } from "config/apps-config";
import Inventory_en from "assets/home/inventory.svg";

import {
  convertAppsConstantFormat,
  convertProductAppsConstantFormat,
} from "./helper-functions";

const featuredApp = [
    {
      label: "Inventory Smart",
      desc:
        "Optimize inventories through retail allocation that leverages predictive analytics for the greatest accuracy in even the most complex allocation and replenishment businesses. Our solution is highly automatable and accurate using leading edge machine learning models that allow for rapid “what-if” simulations to ensure the business is making the right decisions.",
      url: "/inventory-smart/decision-dashboard",
      web: "https://www.impactanalytics.co/solutions/inventory-allocation/",
      logo: <Inventory_en viewBox="0 0 35 35" />,
      type: "platformApps",
      title: "inventorysmart",
      category: "core",
      active: false,
      mapped: false,
      // layout: inventorysmartSideBarOptions,
    },
    // {
    //   label: "ADA Visual",
    //   desc:
    //     "Leverage the best-in-class retail and CPG forecasting engine for identifying recent trends, seasonality, and other unique demand drivers, all in one place. Push forecasts into any existing planning and pricing systems. For years, the traditional forecasting algorithms have leaned very heavily on historical data. But with rapid changes in product preferences and consumption patterns, businesses need a more robust framework that includes factors other than just historical data.",
    //   url: adaSideBarOptions[0].link,
    //   web: "https://www.impactanalytics.co/",
    //   logo: <Ada_en viewBox="0 0 32 32" />,
    //   type: "platformApps",
    //   title: "ada",
    //   category: "core",
    //   active: false,
    //   mapped: false,
    //   layout: adaSideBarOptions,
    // },  
  ]



const tbClientProductMapping = convertAppsConstantFormat(
  featuredApp
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
  featuredApp
);
export const moduleConfiguratorJSON = {
  tb_client_product_mapping: tbClientProductMapping,
  tb_configurator_description: tbConfiguratorDescription,
  tb_menu: tbMenu,
  tb_product_description: tbProductDescription,
};
