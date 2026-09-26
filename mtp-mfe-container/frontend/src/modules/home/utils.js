import { cloneDeep, isEmpty } from "lodash";
import { iconMap, allPlatformApps } from "config/apps-config";

/**
 *
 * @param {*} platformApps
 * @param {*} databaseAppsList
 * Temporary function created for MNS
 */
export const updateAppsDisplayProperties = (platformApps, databaseAppsList) => {
  databaseAppsList.forEach((dbApp) => {
    for (const key of Object.keys(platformApps)) {
      let filteredApp = platformApps[key].filter(
        (app) => app?.title?.toLowerCase() === dbApp?.name?.toLowerCase()
      );
      if (filteredApp.length > 0 && dbApp?.extra?.label) {
        filteredApp[0].label = dbApp?.extra?.label;
        filteredApp[0].name = dbApp?.extra?.label?.replace(/\s+/g, "") ?? "";
        filteredApp[0].description = "AI-Native Forecast Visualization Engine";
        filteredApp[0].details = "Forecast Smart is the visual interface of our AI-native forecasting engine that helps users to view and edit forecasts and convert them into intuitive, actionable visuals. It enables users to monitor forecasts, understand drivers of forecasts, compare forecasts for scenarios, and apply business edits seamlessly.";
        filteredApp[0].folderContent = [
          "Real-Time Forecast Monitoring",
          "Understand Key Drivers of Forecasts",
          "Forecast Comparison for Multiple Scenarios",
          "Easy Human Forecast Overrides",
        ],
        filteredApp[0].logo =
          dbApp?.extra?.label in iconMap
            ? iconMap[dbApp?.extra?.label]
            : filteredApp[0].logo;
      }
      if (filteredApp.length > 0 && dbApp?.extra?.description) {
        filteredApp[0].desc = dbApp?.extra?.description;
      }
      if (filteredApp.length > 0 && dbApp?.extra?.landing_page) {
        filteredApp[0].url = dbApp?.extra?.landing_page;
      }
      //add inventory smart card clone if the existing one's label is changed to forecast smart
      if (
        filteredApp.length > 0 &&
        filteredApp[0]?.title === "inventorysmart" &&
        filteredApp[0].label !== "Inventory Smart"
      ) {
        let inventoryConfig = cloneDeep(filteredApp[0]);
        inventoryConfig.title = "inventorysmart_1";
        platformApps["featuredApp"].push(inventoryConfig);
      }
      if (filteredApp.length > 0 && dbApp?.extra?.release_status) {
        filteredApp[0].releaseStatus = dbApp?.extra?.release_status;
      }
    }
  });
};

/**
 * @func
 * @desc get client name from localstorage
 * @param 
 */
export const getClientName = () => {
  const base = localStorage?.getItem("baseUrl")?.split(".")[0]?.replace("-replica","") || "";
  return `${base.charAt(0).toUpperCase()}${base.slice(1)}`;
}

/**
 * @func
 * @desc get user name from localstorage
 * @param 
 */
export const getUserName = () => {
  const userID = localStorage.getItem("name");
  let userName = userID ? userID.split("@")[0] : "Back";
  return `${userName.split(".")[0].charAt(0).toUpperCase() + userName.split(".")[0].slice(1)}`;
}

export const titleToLocaleKey = {
  "application access management": "config.aam",
  "notification": "config.notification",
  "module configurator": "config.configurator",
  "plansmart": "app.plansmart",
  "sizesmart": "app.sizesmart",
  "assortsmart": "app.assortsmart",
  "inventorysmart": "app.inventorysmart",
  "ada": "app.ada",
  "itemsmart": "app.itemsmart",
  "pricesmart promo": "app.pricesmart_promo",
  "pricesmart markdown": "app.pricesmart_markdown",
  "spacesmart": "app.spacesmart",
  "forecastconfigurator": "app.forecastconfigurator",
  "adaconfigurator": "app.adaconfigurator",
  "testsmart": "app.testsmart",
  "mondaysmart": "app.mondaysmart",
  "mcphub": "app.mcphub",
  "attribute": "app.attributesmart",
  "storesmart": "app.storesmart",
  "base pricing": "app.basesmart",
  "pricesmart": "app.pricesmart",
  "sourcesmart": "app.sourcesmart",
  "base pricing restaurant": "app.basesmart_restaurant",
  "demand smart": "app.demandsmart",
  "AgenticAssort": "app.agentic_assort",
  "Agentic Plan": "app.agentic_plan",
};

export const translateApp = (app, t) => {
  const localeKey = titleToLocaleKey[app.title];
  if (!localeKey) return app;
  const translatedLabel = t(`${localeKey}.label`);
  const translatedDesc = t(`${localeKey}.description`);
  const translatedDetails = t(`${localeKey}.details`);
  const translatedFolderContent = app.folderContent?.map((_, i) => {
    const val = t(`${localeKey}.folder.${i}`);
    return val !== `${localeKey}.folder.${i}` ? val : app.folderContent[i];
  });
  return {
    ...app,
    label: translatedLabel !== `${localeKey}.label` ? translatedLabel : app.label,
    description: translatedDesc !== `${localeKey}.description` ? translatedDesc : app.description,
    desc: translatedDesc !== `${localeKey}.description` ? translatedDesc : app.desc,
    details: translatedDetails !== `${localeKey}.details` ? translatedDetails : app.details,
    ...(translatedFolderContent && { folderContent: translatedFolderContent }),
  };
};

export const processChatbotConfig = (chatbotAsApp) => {
  try {
    const platformApplications = cloneDeep(allPlatformApps);
    if (!isEmpty(chatbotAsApp?.data)) {
      let agenticApps = chatbotAsApp?.data[0]?.attribute_value?.value || [];
      
      if (Array.isArray(agenticApps)) {
        platformApplications.featuredApp.forEach((app) => {
          if (agenticApps?.includes(app.name)) {
            app.active = true;
          }
        });
      }
    }
    return platformApplications;
  } catch (error) {
    console.error("Error processing chatbot config:", error);
    return { config: [], featuredApp: [] };
  }
};
