import { useState } from "react";
import { Alert, Switch, useTranslation } from "impact-ui-v3";
import { makeStyles } from "@mui/styles";
import CommonPanel from "../../Common/components/CommonPanel/CommonPanel";

const useStyles = makeStyles(() => ({
  content: {
    backgroundColor: "#F5F6FA",
    borderRadius: 8,
    padding: "8px 8px 8px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
}));

const SetSelectedSizesPanel = ({ onClose, onApply }) => {
  const classes = useStyles();
  const { t } = useTranslation();
  const [setToZero, setSetToZero] = useState(false);
  const [showAlert, setShowAlert] = useState(true);

  const handleApply = () => {
    onApply({
      type: "set_selected_sizes_to_zero",
      setToZero,
    });
  };

  return (
    <CommonPanel
      headerText={t("inventorysmart.setAll")}
      width="650px"
      height="auto"
      onClose={onClose}
      primaryButtonLabel={t("inventorysmart.apply")}
      secondaryButtonLabel={t("inventorysmart.cancel")}
      onPrimaryButtonClick={handleApply}
      onSecondaryButtonClick={onClose}
    >
      <div className={classes.content}>
        <Switch
          leftLabel={t("inventorysmart.resetZero")}
          value={setToZero}
          onChange={(e) => setSetToZero(e.target.checked || false)}
        />
        {showAlert && (
          <Alert
            severity="info"
            title={t("inventorysmart.resetZeroAlert")}
            onClose={() => setShowAlert(false)}
          />
        )}
      </div>
    </CommonPanel>
  );
};

export default SetSelectedSizesPanel;
