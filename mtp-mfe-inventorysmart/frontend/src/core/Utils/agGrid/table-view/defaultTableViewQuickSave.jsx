import { Button, useTranslation } from "impact-ui-v3";
import { useDispatch } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import { saveTableView } from "./table-view-panel-service";
import { getColumnConfigurationData } from "./table-view-functions";
import { isEmpty } from "lodash";

const DefaultTableViewQuickSave = (props) => {
  const { agGrid, tableViewDefaultData, tableName } = props;

  const dispatch = useDispatch();
  const { t } = useTranslation();

  const displaySnackMessages = (message, variance) => {
    dispatch(
      addSnack({
        message: message,
        options: {
          variant: variance,
        },
      })
    );
  };

  const onDefaultViewSaveClick = async () => {
    try {
      const payload = getColumnConfigurationData(agGrid);
      // add custom data sent via props
      const defaultValePayload = {
        ...tableViewDefaultData?.[0],
        table_name: tableName,
        preference: payload.preference,
      };
      await saveTableView(defaultValePayload)();
      displaySnackMessages(
        t("tableSettings.viewSavedSuccess"),
        "success"
      );
    } catch (err) {
      const errMsg = !isEmpty(err.response?.data.message)
        ? err.response.data.message
        : t("tableSettings.somethingWentWrong");
      displaySnackMessages(errMsg, "error");
    }
  };

  return (
    <>
      {/* <Button
        variant="outlined"
        id="defaultTableViewCancelBtn"
        onClick={() => {}}
        disabled={true}
      >
        Cancel
      </Button> */}
      <Button
        variant="primary"
        id="defaultTableViewSaveBtn"
        onClick={() => onDefaultViewSaveClick()}
      >
        {t("tableSettings.saveView")}
      </Button>
    </>
  );
};

export default DefaultTableViewQuickSave;
