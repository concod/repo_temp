import React from "react";
import { useTranslation } from "impact-ui-v3";
import { useStyles } from "../../ada-styles";
import NoDataFound from "assets/noDataFound.svg";

const NoDataFoundWrapper = () => {
  const classes = useStyles();
  const { t } = useTranslation();

  return (
    <div className={classes.forecastNoDataContainer}>
      <div className={classes.forecastNoDataIcon}>
        <NoDataFound />
      </div>
      <h3 className={classes.forecastNoDataTitle}>
        {t("ada.noDataFound.title")}
      </h3>
      <p>{t("ada.noDataFound.description")}</p>
    </div>
  );
};

export default NoDataFoundWrapper;
