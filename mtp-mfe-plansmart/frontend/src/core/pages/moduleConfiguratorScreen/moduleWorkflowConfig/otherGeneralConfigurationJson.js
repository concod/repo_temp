/**
 * OTHER_GENERAL_CONFIGURATION is the json which will be used to
 * render the other general configuration page through module
 * configurator
 */
export const OTHER_GENERAL_CONFIGURATION = {
  components: {
    id: "other-general-configuration-container",
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
        id: "other-general-configuration",
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
          reducerKey: "other-general-configuration-form",
          fields: [
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
              field_name: "is_sku_group_upload_enabled",
              label: "Do you want to enable uploading of SKU Group",
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
              field_name: "is_group_name_case_sensitive",
              label: "Do you want to make the SKU Group name case sensitive",
            },
            {
              default_value: "",
              display_order: null,
              display_type: "TextField",
              initialData: [],
              is_clearable: true,
              is_deleted: false,
              is_disabled: false,
              is_mandatory: true,
              is_multiple_selection: false,
              is_required: false,
              field_name: "character_name",
              label: "Select the naming character length limit",
              options: [],
            },
          ],
        },
        children: null,
        functionProps: [
          {
            functionName: "Save",
            actions: [
              {
                type: "api_function",
                onClick: () => {
                  console.log("save");
                },
              },
            ],
          },
        ],
      },
    ],
  },
};
