import React from "react";
import { Modal, useTranslation } from "impact-ui-v3";
import { makeStyles } from "@mui/styles";

export default function DailyForecastConfirmPopup({
  showDailyForecastPrompt,
  setShowDailyForecastPrompt,
  setShowPrompt,
  setForecastLevel,
}) {
  const classes = useStyles();
  const { t } = useTranslation();

  return (
    <div className={classes.confirmDownloadContainer}>
      {/* <Modal
        isOpen={showDailyForecastPrompt}
        heading="Confirm"
        primaryButtonProps={{
          children: "Weekly",
          onClick: () => {
            setForecastLevel("W");
            setShowPrompt(true);
            setShowDailyForecastPrompt(false);
          },
        }}
        tertiaryButtonProps={{
          children: "Daily",
          id: "daily-forecast",
          onClick: () => {
            setForecastLevel("D");
            setShowPrompt(true);
            setShowDailyForecastPrompt(false);
          },
        }}
        size="medium"
        onClose={() => setShowDailyForecastPrompt(false)}
      >
        For any forecast window of 12 weeks or lesser, you may choose between
        weekly and daily level forecast downloads. Please pick one option to
        proceed
      </Modal> */}

      <Modal
        isOpen={showDailyForecastPrompt}
        heading={t("ada.dailyForecastConfirm.heading")}
        primaryButtonLabel={t("ada.dailyForecastConfirm.weekly")}
        secondaryButtonLabel={t("ada.dailyForecastConfirm.daily")}
        onPrimaryButtonClick={() => {
          setForecastLevel("W");
          setShowPrompt(true);
          setShowDailyForecastPrompt(false);
        }}
        onSecondaryButtonClick={() => {
          setForecastLevel("D");
          setShowPrompt(true);
          setShowDailyForecastPrompt(false);
        }}
        size="medium"
        onClose={() => setShowDailyForecastPrompt(false)}
      >
        {t("ada.dailyForecastConfirm.message")}
      </Modal>
    </div>
  );
}

const useStyles = makeStyles((theme) => ({
  confirmDownloadContainer: {
    "& #daily-forecast": {
      background: "rgb(0, 85, 175)",
      padding: "0px 24px",
      color: "rgb(255, 255, 255)",
    },
  },
}));
