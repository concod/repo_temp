import { getToken } from "core/Utils/functions/helpers/authentication-helpers";
import axios from "axios";
import {
  getCurrentApplicationDetails,
  getTenantTimeZoneDetails,
} from "core/commonComponents/coreComponentScreen/utils";
import {
  screenUrlsIncludedInFilterExclusion,
} from "config/constants";
import {
  HMAC_APIS,
  HMAC_INPUT_APIS,
} from "./axiosConstants";
import { get, has, isArray, set } from "lodash";
import { logoutUser } from "../../actions/authActions";
import { config } from "../../../config";
import store from "../../../store";
import { ingestionEnabled } from "core/actions/layoutActions";
import CryptoJS from "crypto-js";
import { jwtDecode } from "jwt-decode";
import { base64url } from "rfc4648";
import { getJustCacheInstance, MIDDLEWARE_TYPE } from "./justCache";
import { middlewareMap } from "./middleware";
import { buildValidUrl, getCSRFToken } from "./utils";
import { SESSION_CREATE } from 'core/constants/apiConstants'

// Your secret key (should be the same as used on the server)
const SECRET_KEY =
  "b00982087de2a334be5752d6aeeb385f23716864dc9a119ab551bd1f2eb46d3a";
const JWT_SECRET_KEY =
  "7f3c408196a5cd0778da9cfa1606a98ff6aae5684f6bd3bfff100544765dde59";
let expiredTokens = [];
let lastExpiredAt = Date.now();

async function verifyJWT(jwsObject, secretKey) {
  try {
    // Split the JWT into its components
    const [headerB64, payloadB64, signatureB64] = jwsObject.split(".");

    // Prepare the JWS Signing Input
    const jwsSigningInput = `${headerB64}.${payloadB64}`;

    // Base64url decode the signature
    const jwsSignature = base64url.parse(signatureB64, { loose: true });

    // Import the secret key for verifying the signature
    const key = await window.crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secretKey),
      {
        name: "HMAC",
        hash: { name: "SHA-256" },
      },
      false,
      ["verify"]
    );

    // Verify the signature
    const isValid = await window.crypto.subtle.verify(
      { name: "HMAC" },
      key,
      jwsSignature,
      new TextEncoder().encode(jwsSigningInput)
    );
    return isValid;
  } catch (error) {
    console.error("Error verifying token:", error);
    return false;
  }
}

const isTokenExpired = (token) => {
  try {
    const decodedToken = jwtDecode(token);
    const currentTime = Date.now() / 1000; // current time in seconds
    return decodedToken.exp < currentTime;
  } catch (error) {
    console.error("Error decoding token:", error);
    return true; // If there's an error decoding, consider the token as expired
  }
};

const isTokenAlreadyVisited = (token, currentTime) => {
  // Calculate the difference in milliseconds
  const difference = currentTime - lastExpiredAt;
  // Convert milliseconds to minutes
  const differenceInMinutes = difference / (1000 * 60);
  if (differenceInMinutes >= 2) {
    expiredTokens = [];
    lastExpiredAt = currentTime;
  }
  if (expiredTokens.length > 0 && expiredTokens.includes(token)) {
    return true;
  }
  return false;
};

const generateHMAC = (message) => {
  const secretKey = SECRET_KEY;
  const hmac = CryptoJS.HmacSHA256(message, secretKey);
  return hmac.toString(CryptoJS.enc.Hex);
};

// Function to generate HMAC for input validation on the server side
const generateHMACHash = (data) => {
  const payload = JSON.stringify(data);
  const hash = CryptoJS.HmacSHA256(payload, SECRET_KEY).toString(CryptoJS.enc.Hex);
  return hash;
};

// Function to generate HMAC using SHA 256
const isValidResponse = async (response) => {
  if (HMAC_APIS.includes(response?.config?.url)) {
    const token = response.headers["x-hmac"];
    const isValidToken = await verifyJWT(token, JWT_SECRET_KEY);
    if (!isValidToken) {
      return false;
    }
    if (isTokenExpired(token)) {
      return false;
    }

    const currentTime = Date.now();
    if (isTokenAlreadyVisited(token, currentTime)) {
      return false;
    }

    const receivedHMAC = jwtDecode(token)["hmac"];
    const responseBodyString = JSON.stringify(response.data.data);
    const generatedHMAC = generateHMAC(responseBodyString);
    if (generatedHMAC !== receivedHMAC) {
      return false;
    }
    expiredTokens.push(token);
    lastExpiredAt = currentTime;
    return true;
  }
  return true;
};

const axiosInstance = axios.create({ baseURL: config.baseUrl, withCredentials: true });
const justCacheInstance = getJustCacheInstance(middlewareMap);


export const disableJustCache = () => {
  justCacheInstance.disableCache();
};

export const enableJustCache = () => {
  justCacheInstance.enableCache();
};


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

const requestHandler = async (request) => {
  if (request.url) {
    request.url = request.url.replace(/[?&]+$/, "");
  }
  // for few apis baseURL will be changed to api/v3, pass isV3 key from service file
  const { applicationCode = "" } = getCurrentApplicationDetails();
  const { tenantDateFormat = "", tenantTimeZone = "" } =
    getTenantTimeZoneDetails();
  if (request.isV3) {
    request.baseURL = config.baseUrlV3;
  }
  const screenName = localStorage.getItem("currentScreenName");
  const token = await getToken();

  if (sessionStorage.getItem("session_auth_enabled") === "true" && request?.url !== SESSION_CREATE) {
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      request.headers["X-CSRF-Token"] = csrfToken;
    }
  } else {
    request.headers['Authorization'] = `${token}`;
  }
  request.headers['application-code'] = request.headers['application-code'] || applicationCode;
  request.headers['time_format'] = tenantDateFormat;
  request.headers['time_zone'] = tenantTimeZone;
  request.headers['screen-name'] = screenName;
  request.headers['X-Request-Start'] = Date.now().toString();

  let excludedFilterValues = JSON.parse(
    localStorage.getItem("filter_attribute_exclusion_values")
  );

  //Find the exclusion object of the url in the constants array. Here we are doing substring match
  //to support query params urls as well
  let excludedURLObject = request.includeExclusionFilter
    ? request.excludeURLObject
    : screenUrlsIncludedInFilterExclusion.find((urlObject) => {
      //Added support to regular expression matching
      if (urlObject?.url) {
        const re = new RegExp(urlObject.url);
        return re.test(request.url);
      }
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

  // Generate HMAC hash after exclusion filters have been appended
  if(HMAC_INPUT_APIS.some((url) => request.url.startsWith(url))){
    // Adding header for server side input validation hash check
    const payloadHash = generateHMACHash(request.data)
    request.headers['x-hmac-hash'] = payloadHash;
  } else {
    let requestUrl = request?.url
    let requestParams = request?.params
    if(request?.url?.split("?").length > 1){
      requestUrl = request?.url?.split("?")[0]
      requestParams = {
        ...requestParams,
        ...Object.fromEntries(new URLSearchParams(request?.url?.split("?")[1]))
      }
    }
    const payloadForHash = {
      "url": buildValidUrl(request?.baseURL, requestUrl, requestParams ),
      "application-code": `${applicationCode}`,
      "screen-name": `${screenName}`,
      "payload": request?.data || {},
    }
    const payloadHash = generateHMACHash(payloadForHash);
    request.headers['x-hmac-hash'] = payloadHash;
  }

  // JustCache Middleware
  const cachedResponse = justCacheInstance.runMiddlewares(MIDDLEWARE_TYPE.REQUEST, request);
  if (cachedResponse) {
    return cachedResponse;
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
        store.dispatch(ingestionEnabled(true));
        break;
    }
  }

  return Promise.reject({ ...error });
};

const successHandler = async (response) => {
  if (!(await isValidResponse(response))) {
    // Modify the response status and statusText
    response.status = 403; // Forbidden
    response.statusText = "HMAC validation failed";
    // Optionally, you can modify the response data to include more details
    response.data = { error: "HMAC validation failed" };
    // Reject the response with the modified error
    return Promise.reject(response);
  }
  // JustCache Middleware
  justCacheInstance.runMiddlewares(MIDDLEWARE_TYPE.RESPONSE, response);
  return response;
};
axiosInstance.interceptors.request.use((request) => requestHandler(request));
axiosInstance.interceptors.response.use(
  (response) => successHandler(response),
  (error) => errorHandler(error)
);

// Function to clear all JustCache data
export const clearJustCache = () => {
  // Clear all middleware caches by disabling cache temporarily
  justCacheInstance.clearCache();
};

export default axiosInstance;
