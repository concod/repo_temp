import {
  createReducerState,
  invokeApi,
  updateReducerState,
} from "core/actions/jsonParserActions";
import _, { cloneDeep, isEmpty } from "lodash";

/**
 * getFormattedParameters will be the function
 * which the parameter before passing to the api/next function
 * @param {array} funcParams
 * @param {object} allReducerStates
 * @returns
 */
export const getFormattedParameters = (funcParams, allReducerStates) => {
  try {
    let params = {};
    let isParamsExceptionalForScreenModification = false;
    let isParamsExceptionalForJsonStructure = false;
    funcParams.forEach(async (functionParam) => {
      switch (functionParam.source) {
        case "reducer":
          const storedData =
            allReducerStates[functionParam?.reducerName][
              functionParam?.reducerKey
            ];
          if (functionParam.dataType === "string") {
            params = { ...params, [functionParam.paramName]: storedData };
          }
          if (functionParam.dataType === "object") {
            if (functionParam?.exception) {
              if (functionParam?.exceptionType === "screenModification") {
                isParamsExceptionalForScreenModification = true;
              }
              if (functionParam?.exceptionType === "jsonModification") {
                isParamsExceptionalForJsonStructure = true;
                storedData.components.children[0].staticProps.defaultValues =
                  allReducerStates[functionParam.jsonReducerName][
                    functionParam.jsonReducerKey
                  ];
              }
            }
            params = { ...params, [functionParam.paramName]: storedData };
          } else if (functionParam.dataType === "value") {
            params = {
              ...params,
              [functionParam.paramName]: functionParam.value,
            };
          }
          break;
        case "self":
          if (functionParam.dataType === "value") {
            params = {
              ...params,
              [functionParam.paramName]: functionParam.value,
            };
          }
      }
    });
    if (isParamsExceptionalForScreenModification) {
      params = {
        config: params,
      };
    }
    return params;
  } catch (error) {
    console.error("getFormattedParameters error", error);
  }
};

/**
 * executeReducerAction will be called
 * if the type of the action given in the json
 * is api_function
 * @param {object} param
 *
 */
export const executeAction = async ({
  func,
  allReducerStates,
  dispatch,
  params,
  onComplete,
  responseFormatter,
  apiEndpoint,
  screen,
  confirmation,
  type,
  data,
  apiUrl,
  apiMethod,
  headers,
  apiResponseAlerts,
  allCurrentReducerStates,
}) => {
  try {
    let reducerStates = allReducerStates
      ? allReducerStates
      : allCurrentReducerStates;
    const formattedParams = getFormattedParameters(params, reducerStates);
    let resp = await dispatch(
      func({
        apiUrl,
        apiMethod,
        payload: formattedParams,
        headers: headers,
        apiResponseAlerts,
      })
    );
    if (resp !== false && !_.isEmpty(responseFormatter)) {
      loadResponseIntoStore(responseFormatter, reducerStates, resp, dispatch);
    }

    if (resp !== false && !_.isEmpty(onComplete)) {
      // Execute the oncomplete api/reducer actions and return the redirect action
      return executeOnCompleteActions(
        onComplete,
        data,
        reducerStates,
        dispatch,
        resp
      );
    }
  } catch (error) {
    console.error("executeAction error", error);
  }
};

/**
 * executeReducerAction will be called
 * if the type of the action given in the json
 * is reducer_function
 * @param {object} param
 *
 */
export const executeReducerAction = async ({
  dispatch,
  params,
  onComplete,
  data,
  responseFormatter,
  screen,
  confirmation,
  allReducerStates,
  allCurrentReducerStates,
}) => {
  try {
    let reducerStates = allReducerStates
      ? allReducerStates
      : allCurrentReducerStates;

    /**
     * if we want to store data directly using responseFormatter then we
     * can or else whatever params is passed data will be passed acc to that
     */
    const formattedParams = getFormattedParameters(params, reducerStates);

    if (!_.isEmpty(responseFormatter)) {
      loadResponseIntoStore(
        responseFormatter,
        reducerStates,
        formattedParams,
        dispatch
      );
    }

    if (!_.isEmpty(onComplete)) {
      return executeOnCompleteActions(
        onComplete,
        data,
        reducerStates,
        dispatch
      );
    }
  } catch (error) {
    console.error("executeReducerAction error", error);
  }
};

/**
 *
 * executeOnCompleteActions func
 * will be called if you have given any
 * onComplete object in your actions in json
 *
 */
export const executeOnCompleteActions = async (
  onComplete,
  data,
  reducerStates,
  dispatch,
  response
) => {
  const redirectAction = onComplete?.actions?.filter(
    (action) => action.type === "redirect"
  );
  const apiActions = onComplete?.actions?.filter(
    (action) =>
      action.type === "api_function" || action.type === "reducer_function"
  );

  if (!_.isEmpty(apiActions)) {
    apiActions?.forEach(async (action) => {
      const formattedParams = getFormattedParameters(
        action.params,
        reducerStates
      );

      if (action.type === "api_function") {
        // Call the API or Action
        const resp = await dispatch(
          invokeApi({
            apiUrl: action.apiUrl,
            apiMethod: action.apiMethod,
            payload: formattedParams,
            headers: action.headers,
            apiResponseAlerts: action.apiResponseAlerts,
          })
        );

        // If there is response to be reloaded into data, call the response formatter
        if (resp !== false && !_.isEmpty(action.responseFormatter)) {
          loadResponseIntoStore(
            action.responseFormatter,
            reducerStates,
            resp,
            dispatch
          );
        }
      } else if (action.type === "reducer_function") {
        if (!_.isEmpty(action.responseFormatter)) {
          loadResponseIntoStore(
            action.responseFormatter,
            reducerStates,
            formattedParams,
            dispatch
          );
        }
      }
      return true;
    });
  }

  if (!_.isEmpty(redirectAction)) return redirectAction;
};

/**
 *
 * loadResponseIntoStore func will load the
 * data which we are getting in params
 * to the store
 */
export const loadResponseIntoStore = async (
  responseFormatter,
  allReducerStates,
  data,
  dispatch
) => {
  try {
    responseFormatter.forEach(async (resp, index) => {
      let reducerName = resp?.reducerName;
      let reducerKey = resp?.reducerKey;
      let dataToBeStored = data[resp?.apiKey]
        ? data[resp.apiKey]
        : resp?.value
        ? resp.value
        : data;
      if (resp?.shouldFormat) {
        dataToBeStored = await importDynamicFunction(
          resp?.functionPath,
          resp?.functionName,
          cloneDeep(dataToBeStored)
        );
      }
      if (allReducerStates?.[reducerName]?.[reducerKey]) {
        dispatch(updateReducerState(reducerKey, dataToBeStored));
      } else {
        dispatch(createReducerState(reducerKey, dataToBeStored));
      }
    });
  } catch (error) {
    console.error("loadResponseIntoStore error", error);
  }
};

/**
 * importDynamicFunction will import
 * function dynamically and call it for the
 * purpose of formatting data
 * @param {string} functionPath
 * @param {string} functionName
 * @param {any} dataToBeFormatted
 * @returns
 */
export const importDynamicFunction = async (
  functionPath,
  functionName,
  dataToBeFormatted
) => {
  try {
    let importedFile = await import(`../${functionPath}`);
    if (
      importedFile[functionName] &&
      typeof importedFile[functionName] === "function"
    ) {
      const formattedData = importedFile[functionName](dataToBeFormatted);
      return formattedData;
    }
  } catch (error) {
    console.error("importDynamicFunction error", error);
  }
};
