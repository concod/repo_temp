import axios from "axios";
import { config } from "../../../config";
import { logoutUser } from "../../actions/authActions";
import store from "../../../store";
import {
  screenUrlsIncludedInFilterExclusion,
  HMAC_INPUT_APIS,
  SECRET_KEY,
  NEW_STORE_EXCLUDE_FILTER,
} from "config/constants";
import { getToken } from "core/Utils/functions/helpers/authentication-helpers";
import {
  getCurrentApplicationDetails,
  getTenantTimeZoneDetails,
} from "core/commonComponents/coreComponentScreen/utils";
import { get, has, isArray, set } from "lodash";
import {
  ingestionEnabled,
  ingestionEnabledByScreen,
  ingestionRemoveByScreen,
} from "core/actions/layoutActions";
import CryptoJS from "crypto-js";
import Hex from "crypto-js/enc-hex";

const axiosInstance = axios.create({ baseURL: config.baseUrl });

/**
 *
 * @param {*} object
 * @param {*} nestedKeyArr
 * @returns value
 * This function returns nested key value in the object
 */
const getNestedKeyValue = (object, nestedKeyArr) => {
  return get(object, nestedKeyArr);
};
/**
 *
 * @param {*} object
 * @param {string or array} nestedKeyArr
 * @param {*} newValue
 * This function will set a new value to the nestedKey passed in the object
 */
const setNestedKeyValue = (object, nestedKeyArr, newValue) => {
  set(object, nestedKeyArr, newValue);
};

/**
 *
 * @param {*} data
 * @param {*} filterAttributes
 * @returns boolean
 * Filters are sent in the api payload using different keys for different screens.
 * Majorly `fitlers` key is used but in some cases we use `product_attributes`, `store_attributes` etc.
 * To accomodate exclusion filters for these apis, it is checked if these keys from dimensions are present in the request body.
 * If all keys are present it will return true else false.
 */
const checkForFilterAttributesInPayload = (data, filterAttributes) => {
  for (const attribute of filterAttributes) {
    if (!has(data, attribute)) {
      return 0;
    }
  }

  return 1;
};
// Function to generate HMAC for input validation on the server side
const generateHMACHash = (data) => {
  const payload = JSON.stringify(data);
  const hash = CryptoJS.HmacSHA256(payload, SECRET_KEY);
  return Hex.stringify(hash);
};

const requestHandler = async (request) => {
  // for few apis baseURL will be changed to api/v3, pass isV3 key from service file
  const { applicationCode = "" } = getCurrentApplicationDetails();
  const {
    tenantDateFormat = "",
    tenantTimeZone = "",
  } = getTenantTimeZoneDetails();
  if (request.isV3) {
    request.baseURL = config.baseUrlV3;
  }
  const screenName = localStorage.getItem("currentScreenName");
  const token = await getToken();
  request.headers.common = {
    Authorization: `${token}`,
    "application-code": applicationCode,
    time_format: tenantDateFormat,
    time_zone: tenantTimeZone,
    "screen-name": screenName,
    "object-id": request.object_id,
  };
  // Adding header for server side input validation hash check
  if (HMAC_INPUT_APIS.some((url) => request.url.startsWith(url))) {
    const payloadHash = generateHMACHash(request.data);
    request.headers.common = {
      ...request.headers.common,
      "x-hmac-hash": payloadHash,
    };
  }
  let excludedFilterValues = JSON.parse(
    localStorage.getItem("filter_attribute_exclusion_values")
  );

  //Find the exclusion object of the url in the constants array. Here we are doing substring match
  //to support query params urls as well
  let excludedURLObject = request.includeExclusionFilter
    ? request.excludeURLObject
    : screenUrlsIncludedInFilterExclusion.find((urlObject) => {
        //Added support to regular expression matching
        const re = new RegExp(urlObject.url);
        return re.test(request.url);
      });
  let excludedURLObjectAttributes = excludedURLObject?.dimensions?.map(
    (item) => item?.key
  ) || ["filters"];

  if (
    request?.data &&
    checkForFilterAttributesInPayload(
      request?.data,
      excludedURLObjectAttributes
    ) &&
    excludedFilterValues?.length > 0 &&
    excludedURLObject
  ) {
    if (request?.data?.excludedFilterFlag) {
      delete request.data.excludedFilterFlag;
    } else {
      //If there is no dimensions key added to the url object,
      //It is assumed that the api supports all dimensions and excluded values
      //stored in the db are passed directly without filtering by dimension
      if (!excludedURLObject?.dimensions) {
        request.data.filters = [
          ...request.data.filters,
          ...excludedFilterValues,
        ];
      } else {
        //If dimensions array is present for an url object,
        //we loop over all the dimensions present in the array
        //Each dimension is an object with below key - value pairs
        // 1. dimension - dimension string ["product", "store", "vendor"..]
        // 2. key - value in the payload - ex: "filters", "product_attributes" etc..
        for (const dimensionObject of excludedURLObject.dimensions) {
          const dimensionKeyArr = dimensionObject?.key || ["filters"]; //Get the dimension key
          const dimension = dimensionObject?.dimension; //Get the dimension
          setNestedKeyValue(
            request,
            [
              "data",
              ...(isArray(dimensionKeyArr)
                ? dimensionKeyArr
                : [dimensionKeyArr]),
            ],
            [
              ...getNestedKeyValue(request, [
                "data",
                ...(isArray(dimensionKeyArr)
                  ? dimensionKeyArr
                  : [dimensionKeyArr]),
              ]),
              ...excludedFilterValues.filter(
                (filter) => filter.dimension === dimension
              ), //filter the values based on the dimenison and append the payload based on the above key
            ]
          );
        }
      }
    }
  }
  // This is to exclude the new store from the filters using the configured screen names.
  const reduxState = store.getState();
  const { inventorysmartScreenConfig } = reduxState.inventorysmartReducer.inventorySmartCommonService;
  if (inventorysmartScreenConfig?.newStoreFilterExcludeEnabled && request?.data?.filters?.length && inventorysmartScreenConfig?.newStoreExcludeList?.includes(screenName)) {
    request.data.filters.push(NEW_STORE_EXCLUDE_FILTER);
  }

  // as per MTP-88049 Temporary fix for EU client to exclude dc_flag from filters
  if (inventorysmartScreenConfig?.client=="_EU" && request?.url?.includes("inventory-smart/plan/get-allocation-strategy")) {
    request.data.filters.forEach(filter => {
      if (filter.attribute_name === "dc_flag") {
        filter.values = [];
      }
    });
  }
  return request;
};

const errorHandler = async (error) => {
  if (error.response) {
    switch (error.response.status) {
      case 401:
        store.dispatch(logoutUser());
        break;
      case 501:
        const screenName = localStorage.getItem("currentScreenName");
        store.dispatch(ingestionEnabledByScreen(screenName));
        break;
    }
  }

  return Promise.reject({ ...error });
};
const successHandler = (response) => {
  const screenName = localStorage.getItem("currentScreenName");
  const reduxState = store.getState();
  if (reduxState.layoutReducer.ingestionEnabledScreens.includes(screenName)) {
    setTimeout(() => {
      store.dispatch(ingestionRemoveByScreen(screenName));
    }, 0);
  }
  return response;
};
axiosInstance.interceptors.request.use((request) => requestHandler(request));
axiosInstance.interceptors.response.use(
  (response) => successHandler(response),
  (error) => errorHandler(error)
);

export default axiosInstance;
