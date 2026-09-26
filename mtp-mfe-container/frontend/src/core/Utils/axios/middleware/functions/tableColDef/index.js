import { MIDDLEWARE_TYPE } from "../../../justCache/constants";
import {
  getIsURLTableConfAndGetMethod,
  getIsURLTableConfUserPrefAndPostMethod,
  getTableNameFromURL,
} from "./utils";
import { generateCachedResponse } from "../../utils";
import { InMemoryCache } from "../../class/inMemoryCache";

const tcCodeTableNameMap = new InMemoryCache();
const tableColumnDefCache = new InMemoryCache();

const tableConfReqHandler = (url, method, request) => {
  const isURLTableConfAndGetMethod = getIsURLTableConfAndGetMethod(url, method);

  if (!isURLTableConfAndGetMethod) {
    return null; // Not a table config request
  }

  const tableName = getTableNameFromURL(url);

  if (!tableName) {
    return null; // No table_name parameter
  }

  const tableConf = tableColumnDefCache.get(tableName);

  if (tableConf) {
    const cachedResponse = generateCachedResponse(request, tableConf);
    return cachedResponse; // Return cached response
  }

  // No cache hit, but this is a table config request
  // Return null to let the request continue, but we'll handle the response
  return null;
};

const userPrefReqHandler = (url, method, meta) => {
  const isURLTableConfUserPrefAndPostMethod = getIsURLTableConfUserPrefAndPostMethod(
    url,
    method
  );
  // console.log("CACHE-TABLE-COLUMNS/PREFERNCE",{url, method ,tcCodeTableNameMap,tableColumnDefCache,})
  if (!isURLTableConfUserPrefAndPostMethod) {
    return;
  }

  const { data } = meta;
  const { tc_code } = data;
  const tableName = tcCodeTableNameMap.get(tc_code);

  if (tableName) {
    tableColumnDefCache.remove(tableName);
  }
};

const tableConfResHandler = (url, method, data) => {
  const isURLTableConfAndGetMethod = getIsURLTableConfAndGetMethod(url, method);

  if (!isURLTableConfAndGetMethod) {
    return;
  }

  const tableName = getTableNameFromURL(url);

  if (tableName) {
    tableColumnDefCache.set(tableName, data);
  }

  const tableConfig = data?.data || [];
  let tcCode;

  for (const column of tableConfig) {
    if (column?.tc_code) {
      tcCode = column?.tc_code;

      break;
    }
  }

  if (tcCode) {
    tcCodeTableNameMap.set(tcCode, tableName);
  }
};

export const tableColDefMiddleware = (type, meta) => {
  if (type === MIDDLEWARE_TYPE.REQUEST) {
    const request = meta;
    const { url, method } = request;

    // Table config request - Return cache
    const cachedResponse = tableConfReqHandler(url, method, request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // User preference request - Clear cache
    userPrefReqHandler(url, method, meta);
  }

  if (type === MIDDLEWARE_TYPE.RESPONSE) {
    const response = meta;
    const { config, data } = response;
    const { url, method } = config;

    // Table config response - Cache response
    tableConfResHandler(url, method, data);
  }

  if (type === MIDDLEWARE_TYPE.CLEAR_CACHE) {
    tcCodeTableNameMap.clear();
    tableColumnDefCache.clear();
  }
};
