import { getIsMethodGet, getIsMethodPost } from "../../../utils";
import { tableColDefURL, tableConfUserPrefURL } from "../constants";

// Table fields

export const getIsURLTableConf = (url) => {
  return url.includes(tableColDefURL);
};

export const getIsURLTableConfAndGetMethod = (url, method) => {
  const isMethodGet = getIsMethodGet(method);

  if (!isMethodGet) {
    return false;
  }

  const isURLTableConf = getIsURLTableConf(url);

  return isURLTableConf;
};

export const getTableNameFromURL = (url) => {
  const queryParamsStr = url.split("?")[1] || "";

  if(!queryParamsStr) {
    return;
  }

  const params = new URLSearchParams(queryParamsStr);
  const tableName = params.get("table_name");

  return tableName;
};

// User preference

export const getIsURLTableConfUserPref = (url) => {
  return url.includes(tableConfUserPrefURL);
};

export const getIsURLTableConfUserPrefAndPostMethod = (url, method) => {
  const isMethodPost = getIsMethodPost(method);

  if (!isMethodPost) {
    return false;
  }

  const isURLTableConfUserPref = getIsURLTableConfUserPref(url);

  return isURLTableConfUserPref;
};
