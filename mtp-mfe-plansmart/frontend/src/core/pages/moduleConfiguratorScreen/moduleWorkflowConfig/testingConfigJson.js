export const TESTING_CONFIGURATION = {
  components: {
    id: "general-configuration-container",
    type: "div",
    pathSrc: "core",
    children: [
      {
        id: "general-configuration",
        type: "form",
        pathSrc: "core",
        children: null,
        staticProps: {
          layout: "vertical",
          reducerKey: "general-configuration-form",
          resetOptions: false,
          defaultValues: {
            product_grouping_grouping_download_csv: true,
            product_grouping_hiddenModules_groupingDefinitions: true,
          },
          disabledFields: false,
          maxFieldsInRow: 1,
          dependencyChange: false,
          selectDependency: [],
          updateDefaultValue: false,
          fields: [
            {
              title: "Definition based Grouping",
              display_type: "Heading",
            },
            {
              label: "Do you want to enable Group Definitions for Grouping",
              field_name: "product_grouping_hiddenModules_groupingDefinitions",
              is_deleted: false,
              initialData: [],
              is_disabled: false,
              is_required: false,
              display_type: "BooleanField",
              is_clearable: true,
              is_mandatory: true,
              default_value: null,
              display_order: null,
              is_multiple_selection: false,
            },
            {
              label: "Do you want to enable Group Download Csv",
              field_name: "product_grouping_grouping_download_csv",
              is_deleted: false,
              initialData: [],
              is_disabled: false,
              is_required: false,
              display_type: "BooleanField",
              is_clearable: true,
              is_mandatory: true,
              default_value: null,
              display_order: null,
              is_multiple_selection: false,
            },
          ],
        },
        componentPath: "commonComponents/ui/form-wrapper/form-wrapper.jsx",
      },
      {
        id: "button-container",
        type: "div",
        pathSrc: "core",
        children: [
          {
            id: "general-configuration-container-submit-button",
            type: "button",
            pathSrc: "core",
            children: null,
            staticProps: {
              id: "general-configuration-container-submit-button",
              type: "button",
              color: "primary",
              style: {
                buttonWrapperStyle: {
                  width: "100%",
                },
                buttonStyle: {
                  buttonBgColor: "#0055AF",
                },
              },
              content: "Submit",
              variant: "contained",
              className: "button",
            },
            componentPath:
              "commonComponents/ui/button-wrapper/button-wrapper.jsx",
            functionProps: [
              {
                actions: [
                  {
                    type: "api_function",
                    apiUrl: "/core/tenant-config/module-config-update",
                    params: [
                      {
                        source: "reducer",
                        dataType: "object",
                        exception: true,
                        paramName: "product_grouping",
                        reducerKey: "general-configuration-form",
                        reducerName: "configuratorReducer",
                        exceptionType: "screenModification",
                      },
                    ],
                    apiMethod: "POST",
                    apiResponseAlerts: {
                      error: "Error in api call",
                    },
                    responseFormatter: [
                      {
                        dataType: "array",
                        reducerKey: "sideLayoutData",
                        destination: "reducer",
                        reducerName: "jsonParserReducer",
                      },
                    ],
                  },
                  {
                    type: "api_function",
                    apiUrl: "/core/configuration/template",
                    params: [
                      {
                        source: "reducer",
                        dataType: "object",
                        paramName: "screen",
                        reducerKey: "currentScreenName",
                        reducerName: "configuratorReducer",
                      },
                      {
                        source: "reducer",
                        dataType: "object",
                        paramName: "module_code",
                        reducerKey: "currentmoduleCode",
                        reducerName: "configuratorReducer",
                      },
                      {
                        value: "General Configuration",
                        source: "reducer",
                        dataType: "value",
                        paramName: "configuration_name",
                        reducerKey: "general-configuration-form",
                        reducerName: "configuratorReducer",
                      },
                      {
                        source: "reducer",
                        dataType: "object",
                        exception: true,
                        paramName: "template",
                        reducerKey: "generalConfigurationJson",
                        reducerName: "configuratorReducer",
                        exceptionType: "jsonModification",
                        jsonReducerKey: "general-configuration-form",
                        jsonReducerName: "configuratorReducer",
                        defaultValuesPath: [
                          "components",
                          "children",
                          0,
                          "staticProps",
                          "defaultValues",
                        ],
                      },
                    ],
                    headers: {
                      "application-code": "3",
                    },
                    apiMethod: "PUT",
                    apiResponseAlerts: {
                      error: "Error in api call",
                      success: "Api successfully called",
                    },
                    responseFormatter: [],
                  },
                ],
                functionName: "onClick",
              },
            ],
          },
        ],
        staticProps: {
          style: {
            gap: "10px",
            width: "100%",
            margin: "20px 0px 0px 0px",
            display: "flex",
          },
        },
        componentPath: "commonComponents/ui/wrapper-div/wrapper-div.jsx",
      },
    ],
    staticProps: {
      style: {
        width: "max(45%,35rem)",
        padding: "24px 23px",
      },
    },
    componentPath: "commonComponents/ui/wrapper-div/wrapper-div.jsx",
  },
};
