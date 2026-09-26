import React, { useEffect, useMemo, useState } from "react";
import { cloneDeep, isEmpty, isNil } from "lodash";

import { Button } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";

import Form from "core/Utils/form";

import globalStyles from "core/Styles/globalStyles";

import { saveTableView } from "./table-view-panel-service";
import { getTableViewConfigData } from "./table-view-panel-service";

import { SAVE_TABLE_VIEW } from "./constants";

const TableViewActionFooter = ({
  additionalTabConfig,
  displaySnackMessages,
  onApplyTableView,
  planSmartPlanCode,
  setShowPanelLoader,
  setTableViewConfigData,
  tableName,
  tableViewConfigData,
  tableViewData,
  viewSelected
}) => {
  const classes = useStyles();
  const globalClasses = globalStyles();

  const [enableUpdateView, setEnableUpdateView] = useState(false);
  const [enableSaveNewView, setEnableSaveNewView] = useState(false);
  const [saveSectionFormData, setSaveSectionFormData] = useState([]);

  useEffect(() => {
    setEnableUpdateView(false);
    setEnableSaveNewView(false);
    if (isNil(viewSelected)) {
      setSaveSectionFormData([]);
    }
  }, [viewSelected]);

  const getCurrentColumnPreference = () => {
    const selectedViewTypeData = tableViewData?.filter((item) => {
      return item.id === viewSelected;
    })[0];

    return { selectedViewTypeData };
  };

  const getDefaultFieldValues = useMemo(() => {
    const test = tableViewData?.filter((item) => {
      return item.id === viewSelected;
    });

    const defualtValues = {
      view_name: enableSaveNewView
        ? `${"View"}${" "}${new Date().getTime()}`
        : test?.[0]?.view_name,
      view_type: test?.[0]?.view_type,
      view_setting: {
        is_default: test?.[0]?.is_default
      }
    };
    setSaveSectionFormData(cloneDeep(defualtValues));
    return defualtValues;
  }, [enableSaveNewView, enableUpdateView]);

  const handleApplyTableView = () => {
    const {
      selectedViewTypeData,
      updatedColumnSettings = {}
    } = getCurrentColumnPreference();

    let customTabApplyCb = {};

    if (additionalTabConfig?.length > 0) {
      additionalTabConfig?.forEach((tab) => {
        if (tab?.applyToTable) {
          customTabApplyCb = {
            ...customTabApplyCb,
            [tab.applyToTable.tab_key]: tab.applyToTable?.applySettings
          };
        }
      });
    }
    onApplyTableView(
      selectedViewTypeData?.view_name,
      updatedColumnSettings,
      customTabApplyCb
    );
  };

  const handleSaveSectionForm = (
    obj,
    id,
    field,
    fieldEvent,
    initialValue,
    checkConfiguration = []
  ) => {
    setSaveSectionFormData(cloneDeep(obj));
  };

  const onSaveButtonClick = async () => {
    try {
      setShowPanelLoader(true);
      const {
        selectedViewTypeData,
        updatedColumnSettings
      } = getCurrentColumnPreference();

      if (isRequiredFieldsEmpty(saveSectionFormData, SAVE_TABLE_VIEW)) {
        displaySnackMessages("Required fields are empty", "error");
        return;
      }

      let payload = {};

      payload = {
        table_name: tableName,
        view_name: saveSectionFormData?.view_name,
        view_type: saveSectionFormData?.view_type,
        is_default: saveSectionFormData?.view_setting?.is_default,
        preference: {},
        app_attribute_ids: {
          plan_code: planSmartPlanCode
        }
      };
      //add custom tabs data
      if (additionalTabConfig?.length) {
        let customTabData = {};
        additionalTabConfig?.forEach((tab) => {
          if (typeof tab?.getPayload === "function") {
            const data = tab.getPayload();
            customTabData = { ...customTabData, ...data };
          }
        });
        payload.custom_tab_preferences = customTabData;
      }

      if (enableUpdateView) {
        payload["id"] = viewSelected;
        payload["created_by"] = selectedViewTypeData?.created_by;
      }
      await saveTableView(payload)();
      const tableViewConfiguration = await getTableViewConfigData(
        "",
        tableName
      );
      setTableViewConfigData(tableViewConfiguration);
      displaySnackMessages(
        `${"Table View configuration successfully"} ${
          enableUpdateView ? "updated" : "saved"
        }`,
        "success"
      );
      setShowPanelLoader(false);
    } catch (err) {
      setShowPanelLoader(false);
      const errMsg = !isEmpty(err.response?.data.message)
        ? err.response.data.message
        : "Something went wrong";
      displaySnackMessages(errMsg, "error");
    }
  };

  const isRequiredFieldsEmpty = (saveSectionFormData, SAVE_TABLE_VIEW) => {
    //check if all the required fields of SAVE_TABLE_VIEW are present along with value
    return SAVE_TABLE_VIEW.some(({ accessor, required }) => {
      if (
        required &&
        (!saveSectionFormData.hasOwnProperty(accessor) ||
          !saveSectionFormData[accessor].trim())
      ) {
        return true;
      }
      return false;
    });
  };

  const onCancelClick = () => {
    setEnableSaveNewView(false);
    setEnableUpdateView(false);
  };

  const saveAsNewViewHandler = () => {
    const max_views_limit = 50;
    if (tableViewConfigData?.length < max_views_limit) {
      setEnableSaveNewView(true);
    } else {
      displaySnackMessages(
        `Max ${max_views_limit} views reached. Delete views to create new`,
        "error"
      );
    }
  };

  return (
    <div className={`${classes.BottomDiv}`}>
      <div
        className={`${classes.divider} ${globalClasses.marginBottom} ${globalClasses.marginTop}`}
      />
      <div
        className={`${globalClasses.flexRow} ${globalClasses.gap} ${classes.leftPadding}`}
      >
        {!enableSaveNewView && !enableUpdateView && (
          <>
            <Button
              variant="contained"
              color="primary"
              id="updateView"
              onClick={() => setEnableUpdateView(true)}
              disabled={viewSelected === 0}
            >
              Update view
            </Button>
            <Button
              variant="contained"
              color="primary"
              id="saveView"
              onClick={() => saveAsNewViewHandler()}
            >
              Save as new view
            </Button>
            <Button
              variant="contained"
              color="primary"
              id="applyView"
              onClick={handleApplyTableView}
            >
              Apply table view
            </Button>
          </>
        )}
        {(enableSaveNewView || enableUpdateView) && (
          <div>
            <Form
              handleChange={handleSaveSectionForm}
              fields={SAVE_TABLE_VIEW}
              updateDefaultValue={false}
              defaultValues={getDefaultFieldValues}
              spacing={1.5}
            />
            <>
              <div
                className={`${globalClasses.layoutAlignEnd} ${globalClasses.gap} `}
              >
                <Button
                  variant="contained"
                  color="primary"
                  id="downloadCSV"
                  onClick={() => onCancelClick()}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  id="downloadCSV"
                  onClick={() => onSaveButtonClick()}
                >
                  Save
                </Button>
              </div>
            </>
          </div>
        )}
      </div>
    </div>
  );
};

const useStyles = makeStyles((theme) => ({
  BottomDiv: {
    marginTop: "auto"
  },
  divider: {
    borderBottom: `1px solid ${theme.palette.text.disabled}`
  },
  leftPadding: {
    paddingLeft: theme.typography.pxToRem(10)
  }
}));

export default TableViewActionFooter;
