export const SIDE_PANEL_DATA = {
    // Defines the Structure of the Configurator for the module
    "data": {
    "sections": [
      {
        "id": 1,
        "title": "Configuration",
        "sub_sections": [
          {
            "id": 2,
            "title": "General configuration",
            "config_id": "80",
            "config_type": "moduleConfig",
            "json_structure": {
              "components": {
                "id": "general-configuration-form",
                "type": "div",
                "pathSrc": "core",
                "children": [
                  {
                    "id": "general-configuration-module-settings",
                    "type": "form",
                    "pathSrc": "core",
                    "children": null,
                    "staticProps": {
                      "fields": [
                        {
                          "label": "Daily Allocation Summary KPIs",
                          "layout": "vertical",
                          "sub_label": "",
                          "field_name": "dailyAllocationSummaryLabels",
                          "is_deleted": false,
                          "max_length": null,
                          "initialData": [
                            {
                              "key": "allocation_count",
                              "label": "# of Allocation",
                              "visible": true
                            },
                            {
                              "key": "style_color_count",
                              "label": "# of style Allocation",
                              "visible": true
                            },
                            {
                              "key": "unit_allocated",
                              "label": "# of units Allocation",
                              "visible": true
                            },
                            {
                              "key": "dc_available",
                              "label": "DC Net Available inv",
                              "visible": true
                            }
                          ],
                          "is_disabled": false,
                          "is_required": false,
                          "placeholder": "",
                          "display_type": "custom_chip_set",
                          "is_clearable": true,
                          "is_mandatory": false,
                          "display_order": null,
                          "show_select_all": true,
                          "originalArrayStructure": [
                            {
                              "key": "allocation_count",
                              "label": "# of Allocation",
                              "visible": true
                            },
                            {
                              "key": "style_color_count",
                              "label": "# of style Allocation",
                              "visible": true
                            },
                            {
                              "key": "unit_allocated",
                              "label": "# of units Allocation",
                              "visible": true
                            },
                            {
                              "key": "dc_available",
                              "label": "DC Net Available inv",
                              "visible": true
                            }
                          ],
                          "container_background_color": "#F5F6FA"
                        }
                      ],
                      "layout": "custom",
                      "formType": "configurator-specific",
                      "reducerKey": "general-configuration-form",
                      "customLayout": [
                        2,
                        1
                      ],
                      "resetOptions": false,
                      "defaultValues": {
                        "enableDownload": true,
                        "show_product_store_split": "true",
                        "dailyAllocationSummaryLabels": [
                          {
                            "key": "allocation_count",
                            "label": "# of Allocation",
                            "visible": true,
                            "table-wrapper-id": 0
                          },
                          {
                            "key": "style_color_count",
                            "label": "# of style Allocation",
                            "visible": true,
                            "table-wrapper-id": 1
                          },
                          {
                            "key": "unit_allocated",
                            "label": "# of units Allocation",
                            "visible": true,
                            "table-wrapper-id": 2
                          },
                          {
                            "key": "dc_available",
                            "label": "DC Net Available inv",
                            "visible": true,
                            "table-wrapper-id": 3
                          }
                        ]
                      },
                      "disabledFields": false,
                      "maxFieldsInRow": 1,
                      "dependencyChange": false,
                      "selectDependency": [],
                      "updateDefaultValue": false,
                      "originalNestedStructure": {
                        "enableDownload": true,
                        "show_product_store_split": "true",
                        "dailyAllocationSummaryLabels": [
                          {
                            "key": "allocation_count",
                            "label": "# of Allocation",
                            "visible": true
                          },
                          {
                            "key": "style_color_count",
                            "label": "# of style Allocation",
                            "visible": true
                          },
                          {
                            "key": "unit_allocated",
                            "label": "# of units Allocation",
                            "visible": true
                          },
                          {
                            "key": "dc_available",
                            "label": "DC Net Available inv",
                            "visible": true
                          }
                        ]
                      }
                    },
                    "componentPath": "commonComponents/ui/form-wrapper/form-wrapper.jsx"
                  },
                  {
                    "id": "button-container",
                    "type": "div",
                    "pathSrc": "core",
                    "children": [
                      {
                        "id": "general-configuration-container-submit-button",
                        "type": "button",
                        "pathSrc": "core",
                        "children": null,
                        "staticProps": {
                          "id": "general-configuration-container-submit-button",
                          "type": "button",
                          "color": "primary",
                          "style": {
                            "buttonStyle": {
                              "buttonBgColor": "#0055AF"
                            },
                            "buttonWrapperStyle": {
                              "width": "100%"
                            }
                          },
                          "content": "Submit",
                          "variant": "contained",
                          "className": "button",
                          "saveThroughNav": true
                        },
                        "componentPath": "commonComponents/ui/button-wrapper/button-wrapper.jsx",
                        "functionProps": [
                          {
                            "actions": [
                              {
                                "type": "api_function",
                                "apiUrl": "/core/tenant-config/module-config-update",
                                "params": [
                                  {
                                    "source": "reducer",
                                    "dataType": "object",
                                    "exception": true,
                                    "paramName": "attribute_value",
                                    "reducerKey": "general-configuration-form",
                                    "reducerName": "configuratorReducer",
                                    "exceptionType": "screenModification",
                                    "convertToNested": true
                                  },
                                  {
                                    "value": "8105",
                                    "source": "self",
                                    "dataType": "value",
                                    "paramName": "attribute_code"
                                  },
                                  {
                                    "source": "reducer",
                                    "dataType": "object",
                                    "paramName": "screen_code",
                                    "reducerKey": "screenCode",
                                    "reducerName": "configuratorReducer"
                                  },
                                  {
                                    "source": "reducer",
                                    "dataType": "object",
                                    "paramName": "module_code",
                                    "reducerKey": "moduleCode",
                                    "reducerName": "configuratorReducer"
                                  }
                                ],
                                "headers": {
                                  "application-code": "1"
                                },
                                "apiMethod": "POST",
                                "apiResponseAlerts": {
                                  "error": "Error in api call"
                                },
                                "responseFormatter": []
                              },
                              {
                                "type": "api_function",
                                "apiUrl": "/core/configuration/template",
                                "params": [
                                  {
                                    "source": "reducer",
                                    "dataType": "object",
                                    "paramName": "screen_code",
                                    "reducerKey": "screenCode",
                                    "reducerName": "configuratorReducer"
                                  },
                                  {
                                    "source": "reducer",
                                    "dataType": "object",
                                    "paramName": "module_code",
                                    "reducerKey": "moduleCode",
                                    "reducerName": "configuratorReducer"
                                  },
                                  {
                                    "value": "general configuration",
                                    "source": "reducer",
                                    "dataType": "value",
                                    "paramName": "configuration_name",
                                    "reducerKey": "general-configuration-form",
                                    "reducerName": "configuratorReducer"
                                  },
                                  {
                                    "source": "reducer",
                                    "dataType": "object",
                                    "exception": true,
                                    "paramName": "template",
                                    "reducerKey": "generalConfigurationJson",
                                    "reducerName": "configuratorReducer",
                                    "exceptionType": "jsonModification",
                                    "jsonReducerKey": "general-configuration-form",
                                    "jsonReducerName": "configuratorReducer",
                                    "defaultValuesPath": [
                                      "components",
                                      "children",
                                      0,
                                      "staticProps",
                                      "defaultValues"
                                    ]
                                  }
                                ],
                                "headers": {
                                  "application-code": "1"
                                },
                                "apiMethod": "PUT",
                                "apiResponseAlerts": {
                                  "error": "Error in api call",
                                  "success": "Api successfully called"
                                },
                                "responseFormatter": []
                              }
                            ],
                            "functionName": "onClick"
                          }
                        ]
                      }
                    ],
                    "staticProps": {
                      "style": {
                        "gap": "10px",
                        "width": "100%",
                        "margin": "20px 0px 0px 0px",
                        "display": "flex"
                      }
                    },
                    "componentPath": "commonComponents/ui/wrapper-div/wrapper-div.jsx"
                  }
                ],
                "staticProps": {
                  "style": {}
                },
                "componentPath": "commonComponents/ui/wrapper-div/wrapper-div.jsx"
              }
            }
          }
        ]
      },
      {
        "id": 5,
        "title": "Landing Page configuration",
        "sub_sections": [
          {
            "id": 6,
            "title": "Filter Configuration",
            "config_id": "80",
            "config_type": "filterConfig"
          },
          {
            "id": 7,
            "title": "Table Configuration",
            "config_id": "80",
            "config_type": "tableConfig"
          }
        ]
      }
    ]
  }
}
