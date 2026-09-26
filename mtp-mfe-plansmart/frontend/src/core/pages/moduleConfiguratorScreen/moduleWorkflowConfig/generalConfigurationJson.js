/**
 * GENERAL_CONFIGURATION is the json which will be used to
 * render the general configuration page through module
 * configurator
 */
export const GENERAL_CONFIGURATION = {
  components: {
    id: "general-configuration-container",
    type: "div",
    pathSrc: "core",
    componentPath: "commonComponents/ui/wrapper-div/wrapper-div.jsx",
    staticProps: {
      style: {
        padding: "24px 23px",
        width: "100%",
      },
    },
    children: [
      {
        id: "general-configuration",
        type: "form",
        pathSrc: "core",
        componentPath: "commonComponents/ui/form-wrapper/form-wrapper.jsx",
        staticProps: {
          layout: "vertical",
          maxFieldsInRow: 1,
          updateDefaultValue: false,
          disabledFields: false,
          resetOptions: false,
          dependencyChange: false,
          selectDependency: [],
          reducerKey: "general-configuration-form",
          defaultValues: {},
          fields: [
            {
              default_value: "",
              display_order: null,
              display_type: "dropdown",
              // form_id: "general-configuration-form",
              // values: [
              //  {
              //     label: "First Option",
              //     id: "First Option",
              //     value: "First Option",
              //   }
              // ],
              initialData: [
                {
                  id: "First Option",
                  label: "First Option",
                  value: "First Option",
                },
                {
                  id: "Second Option",
                  label: "Second Option",
                  value: "Second Option",
                },
                {
                  id: "Third Option",
                  label: "Third Option",
                  value: "Third Option",
                },
                {
                  id: "Fourth Option",
                  label: "Fourth Option",
                  value: "Fourth Option",
                },
              ],
              is_clearable: true,
              is_deleted: false,
              is_disabled: false,
              is_mandatory: true,
              is_multiple_selection: false,
              is_required: false,
              field_name: "module_name",
              label: "Select display name of the module",
              options: [],
            },
            {
              default_value: null,
              display_order: null,
              display_type: "dropdown",
              initialData: [
                {
                  id: "First Option",
                  label: "First Option",
                  value: "First Option",
                },
                {
                  id: "Second Option",
                  label: "Second Option",
                  value: "Second Option",
                },
                {
                  id: "Third Option",
                  label: "Third Option",
                  value: "Third Option",
                },
                {
                  id: "Fourth Option",
                  label: "Fourth Option",
                  value: "Fourth Option",
                },
              ],
              is_clearable: true,
              is_deleted: false,
              is_disabled: false,
              is_mandatory: true,
              is_multiple_selection: false,
              is_required: true,
              field_name: "grouping_level",
              label: "Select level of grouping you want",
            },
            {
              default_value: null,
              display_order: null,
              display_type: "dropdown",
              initialData: [
                {
                  id: "First Option",
                  label: "First Option",
                  value: "First Option",
                },
                {
                  id: "Second Option",
                  label: "Second Option",
                  value: "Second Option",
                },
                {
                  id: "Third Option",
                  label: "Third Option",
                  value: "Third Option",
                },
                {
                  id: "Fourth Option",
                  label: "Fourth Option",
                  value: "Fourth Option",
                },
              ],
              is_clearable: true,
              is_deleted: false,
              is_disabled: false,
              is_mandatory: true,
              is_multiple_selection: true,
              is_required: true,
              field_name: "grouping_type",
              label: "Select types of grouping you want",
            },
            {
              default_value: null,
              display_order: null,
              display_type: "dropdown",
              initialData: [
                {
                  id: "First Option",
                  label: "First Option",
                  value: "First Option",
                },
                {
                  id: "Second Option",
                  label: "Second Option",
                  value: "Second Option",
                },
                {
                  id: "Third Option",
                  label: "Third Option",
                  value: "Third Option",
                },
                {
                  id: "Fourth Option",
                  label: "Fourth Option",
                  value: "Fourth Option",
                },
              ],
              is_clearable: true,
              is_deleted: false,
              is_disabled: false,
              is_mandatory: true,
              is_multiple_selection: false,
              is_required: true,
              field_name: "product_group_edit_type",
              label: "Select the Product Group edit type",
            },
            {
              default_value: null,
              display_order: null,
              display_type: "dropdown",
              initialData: [
                {
                  id: "First Option",
                  label: "First Option",
                  value: "First Option",
                },
                {
                  id: "Second Option",
                  label: "Second Option",
                  value: "Second Option",
                },
                {
                  id: "Third Option",
                  label: "Third Option",
                  value: "Third Option",
                },
                {
                  id: "Fourth Option",
                  label: "Fourth Option",
                  value: "Fourth Option",
                },
              ],
              is_clearable: true,
              is_deleted: false,
              is_disabled: false,
              is_mandatory: true,
              is_multiple_selection: true,
              is_required: false,
              field_name: "product_group_type",
              label: "Select the Product Group type",
            },
            {
              default_value: null,
              display_order: null,
              display_type: "dropdown",
              initialData: [
                {
                  id: "First Option",
                  label: "First Option",
                  value: "First Option",
                },
                {
                  id: "Second Option",
                  label: "Second Option",
                  value: "Second Option",
                },
                {
                  id: "Third Option",
                  label: "Third Option",
                  value: "Third Option",
                },
                {
                  id: "Fourth Option",
                  label: "Fourth Option",
                  value: "Fourth Option",
                },
              ],
              is_clearable: true,
              is_deleted: false,
              is_disabled: false,
              is_mandatory: true,
              is_multiple_selection: true,
              is_required: false,
              field_name: "preselected_sku",
              label: "Select the SKU’s to be preselected",
            },
            {
              default_value: null,
              display_order: null,
              display_type: "toggle",
              initialData: [
                {
                  id: "First Option",
                  label: "First Option",
                  value: "First Option",
                },
                {
                  id: "Second Option",
                  label: "Second Option",
                  value: "Second Option",
                },
              ],
              is_clearable: true,
              is_deleted: false,
              is_disabled: false,
              is_mandatory: true,
              is_multiple_selection: false,
              is_required: false,
              field_name: "is_sku_group_included",
              label:
                "Do you want to enable “Include SKU Group” for SKU Hierarchy Grouping",
            },
            {
              default_value: null,
              display_order: null,
              display_type: "TextField",
              is_clearable: true,
              is_deleted: false,
              is_disabled: false,
              is_mandatory: true,
              is_multiple_selection: true,
              is_required: false,
              field_name: "label",
              label: "Name of the Module",
            },
            {
              default_value: null,
              display_order: null,
              display_type: "BooleanField",
              initialData: [],
              is_clearable: true,
              is_deleted: false,
              is_disabled: false,
              is_mandatory: true,
              is_multiple_selection: false,
              is_required: false,
              field_name: "is_group_definition_enabled",
              label:
                "Do you want to enable “Group Definitions” for Group Definition Grouping",
            },
          ],
        },
        children: null,
      },
      {
        id: "button-container",
        type: "div",
        pathSrc: "core",
        componentPath: "commonComponents/ui/wrapper-div/wrapper-div.jsx",
        staticProps: {
          style: {
            display: "flex",
            width: "100%",
            gap: "10px",
            margin: "20px 0px 0px 0px",
          },
        },
        children: [
          {
            id: "general-configuration-container-submit-button",
            type: "button",
            pathSrc: "core",
            componentPath:
              "commonComponents/ui/button-wrapper/button-wrapper.jsx",
            staticProps: {
              id: "general-configuration-container-submit-button",
              variant: "contained",
              className: "button",
              content: "Submit Button Data",
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
            },
            functionProps: [
              {
                functionName: "onClick",
                actions: [
                  {
                    type: "api_function",
                    apiUrl: "/core/ticket-filters/browse",
                    apiMethod: "POST",
                    apiResponseAlerts: {
                      success: "Api successfully called",
                      error: "Error in api call",
                    },
                    params: [
                      {
                        dataType: "object",
                        source: "reducer",
                        reducerName: "configuratorReducer",
                        reducerKey: "general-configuration-form",
                        paramName: "filters",
                      },
                    ],
                    responseFormatter: [
                      {
                        dataType: "array",
                        destination: "reducer",
                        reducerName: "jsonParserReducer",
                        reducerKey: "sideLayoutData",
                      },
                    ],
                  },
                  // {
                  //   type: "reducer_function",
                  //   responseFormatter: [
                  //     {
                  //       dataType: "array",
                  //       destination: "reducer",
                  //       reducerName: "jsonParserReducer",
                  //       reducerKey: "sideLayoutData",
                  //     },
                  //   ],
                  // },
                ],
              },
            ],
            children: null,
          },
          {
            id: "general-configuration-container-submit-button",
            type: "button",
            pathSrc: "core",
            componentPath:
              "commonComponents/ui/button-wrapper/button-wrapper.jsx",
            staticProps: {
              id: "general-configuration-container-submit-button",
              variant: "contained",
              className: "button",
              content: "Api Call",
              type: "button",
              color: "primary",
              style: {
                buttonWrapperStyle: {
                  width: "100%",
                },
              },
            },
            functionProps: [
              {
                functionName: "onClick",
                actions: [
                  {
                    type: "api_function",
                    apiUrl: "/core/configuration/sidelayout",
                    apiMethod: "GET",
                    headers: {
                      "application-code": "3",
                    },
                    apiResponseAlerts: {
                      success: "Api successfully called",
                      error: "Error in api call",
                    },
                    params: [
                      {
                        dataType: "string",
                        source: "reducer",
                        reducerName: "configuratorReducer",
                        reducerKey: "currentScreenName",
                        paramName: "screen_name",
                      },
                      {
                        dataType: "string",
                        source: "reducer",
                        reducerName: "configuratorReducer",
                        reducerKey: "currentModuleName",
                        paramName: "module_name",
                      },
                    ],
                    // responseFormatter: [
                    //   {
                    //     dataType: "array",
                    //     destination: "reducer",
                    //     reducerName: "jsonParserReducer",
                    //     reducerKey: "sideLayoutData",
                    //   },
                    // ],
                    onComplete: {
                      actions: [
                        {
                          type: "reducer_function",
                          params: [
                            {
                              dataType: "object",
                              source: "reducer",
                              reducerName: "configuratorReducer",
                              reducerKey: "general-configuration-form",
                              paramName: "filters",
                            },
                          ],
                          responseFormatter: [
                            {
                              dataType: "array",
                              destination: "reducer",
                              reducerName: "jsonParserReducer",
                              reducerKey: "sideLayoutData",
                            },
                          ],
                        },
                      ],
                    },
                  },
                ],
              },
            ],
            children: null,
          },
          {
            id: "general-configuration-container-submit-button",
            type: "button",
            pathSrc: "core",
            componentPath:
              "commonComponents/ui/button-wrapper/button-wrapper.jsx",
            staticProps: {
              id: "general-configuration-container-redirect-button",
              variant: "contained",
              className: "button",
              content: "Redirect",
              type: "button",
              color: "primary",
              style: {
                buttonWrapperStyle: {
                  width: "100%",
                },
              },
            },
            functionProps: [
              {
                functionName: "onClick",
                actions: [
                  {
                    type: "redirect",
                    link: "/inventory-smart/decision-dashboard",
                  },
                ],
              },
            ],
            children: null,
          },
          {
            id: "general-configuration-container-submit-button",
            type: "button",
            pathSrc: "core",
            componentPath:
              "commonComponents/ui/button-wrapper/button-wrapper.jsx",
            staticProps: {
              id: "general-configuration-container-submit-button",
              variant: "contained",
              className: "button",
              content: "Call Api and Store Data",
              type: "button",
              color: "primary",
              style: {
                buttonWrapperStyle: {
                  width: "100%",
                },
              },
            },
            functionProps: [
              {
                functionName: "onClick",
                actions: [
                  {
                    type: "api_function",
                    apiUrl: "/core/configuration/sidelayout",
                    apiMethod: "GET",
                    headers: {
                      "application-code": "3",
                    },
                    apiResponseAlerts: {
                      success: "Api successfully called",
                      error: "Error in api call",
                    },
                    params: [
                      {
                        dataType: "string",
                        source: "reducer",
                        reducerName: "configuratorReducer",
                        reducerKey: "currentScreenName",
                        value: "Product Mapping",
                        paramName: "screen",
                      },
                    ],
                  },
                ],
              },
            ],
            children: null,
          },
          {
            id: "general-configuration-container-submit-button",
            type: "button",
            pathSrc: "core",
            componentPath:
              "commonComponents/ui/button-wrapper/button-wrapper.jsx",
            staticProps: {
              id: "general-configuration-container-submit-button",
              variant: "contained",
              className: "button",
              content: "Reducer Action",
              type: "button",
              color: "primary",
              style: {
                buttonWrapperStyle: {
                  width: "100%",
                },
              },
            },
            functionProps: [
              {
                functionName: "onClick",
                actions: [
                  {
                    type: "api_function",
                    apiUrl: "/core/configuration/sidelayout",
                    apiMethod: "GET",
                    headers: {
                      "application-code": "3",
                    },
                    apiResponseAlerts: {
                      success: "Api successfully called",
                      error: "Error in api call",
                    },
                    params: [
                      {
                        dataType: "string",
                        source: "reducer",
                        reducerName: "configuratorReducer",
                        reducerKey: "currentScreenName",
                        value: "Product Mapping",
                        paramName: "screen",
                      },
                    ],
                  },
                ],
              },
            ],
            children: null,
          },
          {
            id: "general-configuration-container-submit-button",
            type: "button",
            pathSrc: "core",
            componentPath:
              "commonComponents/ui/button-wrapper/button-wrapper.jsx",
            staticProps: {
              id: "general-configuration-container-submit-button",
              variant: "contained",
              className: "button",
              content: "Submit",
              type: "button",
              color: "primary",
              style: {
                buttonWrapperStyle: {
                  width: "100%",
                },
              },
            },
            functionProps: [
              {
                functionName: "onClick",
                actions: [
                  {
                    type: "api_function",
                    apiUrl: "/core/tenant-config/update-module-config",
                    apiMethod: "POST",
                    apiResponseAlerts: {
                      // success: "Api successfully called",
                      error: "Error in api call",
                    },
                    params: [
                      {
                        dataType: "object",
                        source: "reducer",
                        reducerName: "configuratorReducer",
                        reducerKey: "general-configuration-form",
                        paramName: "productGrouping",
                        exception: true,
                        exceptionType: "screenModification",
                      },
                    ],
                    responseFormatter: [
                      {
                        dataType: "array",
                        destination: "reducer",
                        reducerName: "jsonParserReducer",
                        reducerKey: "sideLayoutData",
                      },
                    ],
                  },
                  {
                    type: "api_function",
                    apiUrl: "/core/configuration/template",
                    apiMethod: "PUT",
                    apiResponseAlerts: {
                      success: "Api successfully called",
                      error: "Error in api call",
                    },
                    headers: {
                      "application-code": "3",
                    },
                    params: [
                      {
                        dataType: "object",
                        source: "reducer",
                        reducerName: "configuratorReducer",
                        reducerKey: "currentScreenName",
                        paramName: "screen",
                      },
                      {
                        dataType: "object",
                        source: "reducer",
                        reducerName: "configuratorReducer",
                        reducerKey: "currentmoduleCode",
                        paramName: "module_code",
                      },
                      {
                        dataType: "value",
                        source: "reducer",
                        reducerName: "configuratorReducer",
                        reducerKey: "general-configuration-form",
                        paramName: "configuration_name",
                        value: "General Configuration",
                      },
                      {
                        dataType: "object",
                        source: "reducer",
                        reducerName: "configuratorReducer",
                        reducerKey: "generalConfigurationJson",
                        paramName: "template",
                        exception: true,
                        exceptionType: "jsonModification",
                        jsonReducerName: "configuratorReducer",
                        jsonReducerKey: "general-configuration-form",
                      },
                    ],
                    responseFormatter: [],
                  },
                ],
              },
              {
                functionName: "onLoad",
                actions: [
                  {
                    type: "reducer_function",
                    params: [
                      {
                        dataType: "value",
                        source: "self",
                        paramName: "tableData",
                        value: {
                          rowData: [{}],
                          columnData: [],
                          rowSpan: true,
                        },
                      },
                    ],
                    responseFormatter: [
                      {
                        dataType: "array",
                        destination: "reducer",
                        reducerName: "jsonParserReducer",
                        reducerKey: "table-config",
                      },
                    ],
                  },
                  {
                    type: "api_function",
                    apiUrl: "/core/configuration/sidelayout",
                    apiMethod: "GET",
                    headers: {
                      "application-code": "3",
                    },
                    apiResponseAlerts: {
                      success: "Api successfully called",
                      error: "Error in api call",
                    },
                    params: [
                      {
                        dataType: "string",
                        source: "reducer",
                        reducerName: "configuratorReducer",
                        reducerKey: "currentScreenName",
                        paramName: "screen_name",
                      },
                      {
                        dataType: "string",
                        source: "reducer",
                        reducerName: "configuratorReducer",
                        reducerKey: "currentModuleName",
                        paramName: "module_name",
                      },
                    ],
                  },
                ],
              },
            ],
            children: null,
          },
        ],
      },
    ],
  },
};

// {
//   id: "general-configuration-container-onload-button",
//   type: "button",
//   pathSrc: "core",
//   componentPath:
//     "commonComponents/ui/button-wrapper/button-wrapper.jsx",
//   staticProps: {
//     id: "general-configuration-container-onload-button",
//     variant: "contained",
//     className: "button",
//     content: "On Load",
//     type: "button",
//     color: "primary",
//     style: {
//       buttonWrapperStyle: {
//         width: "100%",
//       },
//     },
//   },
//   functionProps: [
//     {
//       functionName: "onLoad",
//       actions: [
//         {
//           type: "api_function",
//           apiUrl: "/core/configuration/sidelayout",
//           apiMethod: "GET",
//           headers: {
//             "application-code": "3",
//           },
//           params: [
//             {
//               dataType: "string",
//               source: "reducer",
//               reducerName: "configuratorReducer",
//               reducerKey: "currentScreenName",
//               paramName: "screen_name",
//             },
//             {
//               dataType: "string",
//               source: "reducer",
//               reducerName: "configuratorReducer",
//               reducerKey: "currentModuleName",
//               paramName: "module_name",
//             },
//           ],
//         },
//       ],
//     },
//   ],
//   children: null,
// },
