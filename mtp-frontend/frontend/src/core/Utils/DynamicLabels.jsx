import { isEmpty } from "lodash";
import store from "store";
import { attributeFormatter } from "core/Utils/utils";

export const fetchDynamicConfigFromTenantReducer = (
  application,
  requiredAttribute
) => {
  // This function takes application name and attribute name as parameters to search for
  // the corresponding attribute mappings
  // We are storing the config values of each application in reducer service to access it
  // accross the modules. As we say for client to client, labels for product code keeps changing
  // we have configured in the db those mappings. After fetching from the db, we are storing
  // them in application related reducer.
  // After storing we fetch the values based on the attribute key
  // Example, dynamicLabels is used for the label mappings and dynamicLabelKeys is used for
  // unique key mappings
  let coreScreenNames = JSON.parse(localStorage.getItem("coreScreenNames"));
  let inventorysmartScreenConfig = JSON.parse(
    localStorage.getItem("inventorysmartScreenConfig")
  );
  let dynamicTenantData =
    application === "core"
      ? coreScreenNames?.["attribute_value"]?.[requiredAttribute] //requiredAttribute will be dynamicLabels/dynamicLabelKeys
      : inventorysmartScreenConfig?.[requiredAttribute]; // To be made more expansive for other products
  return dynamicTenantData;
};

export const dynamicLabelsBasedOnTenant = (key, application) => {
  let dynamicLabels = fetchDynamicConfigFromTenantReducer(
    application,
    "dynamicLabels"
  );
  return dynamicLabels?.[key] || attributeFormatter(key); //If in case that config isnt present on the DB layer, then display the key itself
};

export const dynamicLabelKeysBasedOnTenant = (key, application) => {
  let dynamicLabelKeys = fetchDynamicConfigFromTenantReducer(
    application,
    "dynamicLabelKeys"
  );
  return dynamicLabelKeys?.[key] || key; //If in case that config isnt present on the DB layer, then display the key itself
};
