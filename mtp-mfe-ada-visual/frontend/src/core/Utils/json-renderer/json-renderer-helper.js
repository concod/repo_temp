import {
  createReducerState,
  invokeApi,
  updateReducerState,
} from "core/actions/jsonParserActions";
import _, { cloneDeep, isEmpty } from "lodash";
import { flattenToNested, restoreArrayStructures } from "core/Utils/objectToFieldsConverter";

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
            allReducerStates?.[functionParam?.reducerName]?.[
            functionParam?.reducerKey
            ];
          if (functionParam.dataType === "string") {
            params = { ...params, [functionParam.paramName]: storedData };
          }
          if (functionParam.dataType === "array") {
            // Handle array data type - used for table rows, lists, etc.
            const arrayData = Array.isArray(storedData) ? storedData : (storedData ? [storedData] : []);
            params = { ...params, [functionParam.paramName]: arrayData };
          }
          if (functionParam.dataType === "object") {
            let dataToUse = storedData;

            // Rule payload mode: build {key: label} options array + default per rule_group field
            if (functionParam?.convertMode === "rule_payload") {
              let fields = [];
              try {
                const templateReducer = allReducerStates?.configuratorReducer?.generalConfigurationJson;
                if (templateReducer?.components?.children) {
                  const formComponent = templateReducer.components.children.find(
                    (child) => child.type === "form" && child.staticProps?.fields
                  );
                  if (formComponent?.staticProps?.fields) {
                    fields = formComponent.staticProps.fields;
                  }
                }
              } catch (e) {
                console.warn("Could not extract fields from template for rule_payload", e);
              }

              const rulePayload = {};
              const processedKeys = new Set();

              fields.forEach((field) => {
                if (field.display_type !== "rule_group") return;
                const fieldName = field.field_name;
                const optionsKey = `${fieldName}__options`;
                const defaultKey = `${fieldName}__default`;
                const inputsKey = `${fieldName}__inputs`;
                const selectedValues = Array.isArray(dataToUse[optionsKey]) ? dataToUse[optionsKey] : [];
                const defaultValue = Array.isArray(dataToUse[defaultKey]) ? dataToUse[defaultKey] : [];
                const inputValues = dataToUse[inputsKey] || {};
                const initialData = Array.isArray(field.initialData) ? field.initialData : [];

                // Build value array: only selected items in {key: label} format
                const optionsArray = selectedValues.map((val) => {
                  const opt = initialData.find((o) => o.value === val);
                  return { [val]: opt ? opt.label : val };
                });

                rulePayload[fieldName] = {
                  options: optionsArray,
                  default: defaultValue,
                };

                // Include inputs if the field has show_input enabled
                if (field.show_input && Object.keys(inputValues).length > 0) {
                  rulePayload[fieldName].inputs = inputValues;
                }

                processedKeys.add(optionsKey);
                processedKeys.add(defaultKey);
                processedKeys.add(inputsKey);
              });

              // Pass through any non-rule_group keys as-is
              if (dataToUse && typeof dataToUse === "object") {
                Object.keys(dataToUse).forEach((key) => {
                  if (!processedKeys.has(key)) {
                    rulePayload[key] = dataToUse[key];
                  }
                });
              }

              dataToUse = rulePayload;
            } else {
              // Filter out internal keys that shouldn't be in the payload
              // Dropdowns with isMulti: true create a _options key (e.g., extra_table_data_columns_options)
              // These are only for internal use and should not be sent to the API
              if (dataToUse && typeof dataToUse === "object" && !Array.isArray(dataToUse)) {
                dataToUse = Object.keys(dataToUse).reduce((filtered, key) => {
                  // Exclude keys ending with _options (internal dropdown state)
                  if (!key.endsWith("_options")) {
                    filtered[key] = dataToUse[key];
                  }
                  return filtered;
                }, {});
              }

              // Convert flat data to nested structure if configured
              if (functionParam?.convertToNested === true) {
                const originalData = cloneDeep(dataToUse);

                // First, restore array structures and get original nested structure from template
                // Try to get fields and originalNestedStructure from the template stored in Redux
                let fields = [];
                let originalNestedStructure = null;
                try {
                  // Try to get template from generalConfigurationJson or similar reducer
                  const templateReducer = allReducerStates?.configuratorReducer?.generalConfigurationJson;
                  if (templateReducer?.components?.children) {
                    // Find the form component
                    const formComponent = templateReducer.components.children.find(
                      (child) => child.type === "form" && child.staticProps?.fields
                    );
                    if (formComponent?.staticProps) {
                      if (formComponent.staticProps.fields) {
                        fields = formComponent.staticProps.fields;
                      }
                      // Extract original nested structure for convertToNested conversion
                      if (formComponent.staticProps.originalNestedStructure) {
                        originalNestedStructure = formComponent.staticProps.originalNestedStructure;
                      }
                    }
                  }
                } catch (e) {
                  console.warn("Could not extract fields/originalStructure from template", e);
                }

                // Restore array structures before converting to nested
                if (fields.length > 0) {
                  dataToUse = restoreArrayStructures(dataToUse, fields);
                }

                // Then convert flat to nested, using original structure as guide
                dataToUse = flattenToNested(dataToUse, originalNestedStructure);

                // Warn if conversion changed the structure (helps catch unintended conversions)
                if (JSON.stringify(originalData) !== JSON.stringify(dataToUse)) {
                  console.log(
                    `[convertToNested] Converted flat to nested for param "${functionParam.paramName}":`,
                    { original: originalData, converted: dataToUse }
                  );
                }
              }
            }

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
            params = { ...params, [functionParam.paramName]: dataToUse };
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
          } else if (functionParam.dataType === "object") {
            // ✅ Support hardcoded objects with source: "self"
            // Allows passing objects directly in template
            let objectValue = functionParam.value || {};

            // If nestedKey is provided, inject dynamic value from Redux into the hardcoded object
            if (functionParam.nestedKey && functionParam.injectFromReducer) {
              const injectedValue = allReducerStates?.[functionParam.injectFromReducer.reducerName]?.[
                functionParam.injectFromReducer.reducerKey
              ];
              if (injectedValue !== null && injectedValue !== undefined) {
                objectValue = {
                  ...objectValue,
                  [functionParam.nestedKey]: injectedValue,
                };
              }
            }

            params = {
              ...params,
              [functionParam.paramName]: objectValue,
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
