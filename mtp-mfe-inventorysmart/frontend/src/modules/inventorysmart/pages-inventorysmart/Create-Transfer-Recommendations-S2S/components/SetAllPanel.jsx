import { useState } from "react";
import {
  ButtonGroup,
  Input,
  Alert,
  Switch,
  useTranslation,
} from "impact-ui-v3";
import { makeStyles } from "@mui/styles";
import CommonPanel from "../../Common/components/CommonPanel/CommonPanel";

const useStyles = makeStyles(() => ({
  setAllBody: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
  },
  setAllContent: {
    backgroundColor: "#F5F6FA",
    borderRadius: 8,
    padding: "8px 8px 8px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    width: "100%",
    "& .impact_inputbox_container .MuiInputBase-root": {
      width: "284px",
    },
  },
}));

const SetAllPanel = ({ onClose, onApply }) => {
  const classes = useStyles();
  const { t } = useTranslation();
  const [setAllTab, setSetAllTab] = useState("enter_units");
  const [enterUnits, setEnterUnits] = useState(null);
  const [matchSourceInv, setMatchSourceInv] = useState(false);
  const [showEnterUnitsAlert, setShowEnterUnitsAlert] = useState(true);
  const [showMatchSourceAlert, setShowMatchSourceAlert] = useState(true);

  const handleTabChange = (event) => {
    setSetAllTab(event.target.value);
    setEnterUnits(null);
    setMatchSourceInv(false);
    setShowEnterUnitsAlert(true);
    setShowMatchSourceAlert(true);
  };

  const handleApply = () => {
    if (setAllTab === "enter_units" && onApply) {
      onApply({
        type: "enter_units",
        enterUnits: Number(enterUnits) || 0,
      });
    } else if (onApply) {
      onApply({
        type: "match_source",
        matchSourceInv,
      });
    }
  };

  return (
    <CommonPanel
      headerText={t("inventorysmart.s2sSetAll")}
      width="608px"
      height="auto"
      onClose={onClose}
      primaryButtonLabel={
        setAllTab === "match_source"
          ? t("inventorysmart.applyMatchSourceInv")
          : t("inventorysmart.applyUnits")
      }
      secondaryButtonLabel={t("inventorysmart.cancel")}
      onPrimaryButtonClick={handleApply}
      onSecondaryButtonClick={onClose}
    >
      <div className={classes.setAllBody}>
        <ButtonGroup
          options={[
            { label: t("inventorysmart.enterUnits"), value: "enter_units" },
            {
              label: t("inventorysmart.matchSourceInv"),
              value: "match_source",
            },
          ]}
          selectedOption={setAllTab}
          onChange={handleTabChange}
        />
        {setAllTab === "enter_units" && (
          <div className={classes.setAllContent}>
            <Input
              label={t("inventorysmart.enterUnits")}
              type="number"
              value={enterUnits}
              placeholder="0"
              onKeyDown={(event) => {
                if (event.key === "-") {
                  event.preventDefault();
                }
              }}
              inputProps={{
                min: 0,
              }}
              onChange={(e) => setEnterUnits(Number(e.target.value))}
            />
            {showEnterUnitsAlert && (
              <Alert
                severity="info"
                actionName="x"
                title={t("inventorysmart.enterUnitsTooltip")}
                onClose={() => setShowEnterUnitsAlert(false)}
              />
            )}
          </div>
        )}
        {setAllTab === "match_source" && (
          <div className={classes.setAllContent}>
            <Switch
              leftLabel={t("inventorysmart.matchSourceInv")}
              value={matchSourceInv}
              onChange={(e) => setMatchSourceInv(e.target.checked || false)}
            />
            {showMatchSourceAlert && (
              <Alert
                severity="info"
                title={t("inventorysmart.matchSourceInvTooltip")}
                onClose={() => setShowMatchSourceAlert(false)}
              />
            )}
          </div>
        )}
      </div>
    </CommonPanel>
  );
};

export default SetAllPanel;
