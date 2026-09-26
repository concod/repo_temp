import React from "react";
import { Modal } from "impact-ui";
import { makeStyles } from "@mui/styles";

export default function DailyForecastConfirmPopup({
  showDailyForecastPrompt,
  setShowDailyForecastPrompt,
  setShowPrompt,
  setForecastLevel,
}) {
  const classes = useStyles();

  return (
    <div className={classes.confirmDownloadContainer}>
      <Modal
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
