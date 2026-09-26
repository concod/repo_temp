import React from "react";
import { Divider, Typography } from "@mui/material";
//import { replaceSpecialCharacter } from "../../../../../core/Utils/functions/utils";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import makeStyles from "@mui/styles/makeStyles";
import { connect } from "react-redux";
import { Tag } from "impact-ui-v3";

const useStyles = makeStyles((theme) => ({
  flexRow: {
    display: "flex",
    alignItems: "center",
  },
  gridTitle: {
    fontSize: "14px",
    fontWeight: 700,
    lineHeight: "24px",
    marginRight: "0.5rem",
  },
  aggregatedContainer: {
    display: "flex",
    marginLeft: "0.5rem",
    gap: "0.5rem",
  },
  aggregatedGroup: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  aggregatedText: {
    fontSize: "12px",
    fontWeight: 500,
    lineHeight: "24px",
  },
}));

const CreateScenarioStoreAggregatedChips = (props) => {
  const classes = useStyles();
  return (
    <div className={classes.flexRow}>
      <Typography className={classes.gridTitle}>
        {props?.screenConfig?.create_scenario?.scenario_table_title ||
          "SKU Table"}
      </Typography>

      {props?.createScenarioAggregatedDataStore ? (
        <>
          <Divider
            sx={{ height: "16px" }}
            orientation="vertical"
            variant="middle"
            flexItem
          />
          <div className={classes.aggregatedContainer}>
            {Object.keys(props?.createScenarioAggregatedDataStore).map(
              (key) => (
                <div className={classes.aggregatedGroup} key={key}>
                  <Typography className={classes.aggregatedText}>
                    {key}:{" "}
                  </Typography>

                  <Tag
                    label={replaceSpecialCharacter(
                      props?.createScenarioAggregatedDataStore[key]
                    )}
                    size="medium"
                    variant="solid"
                  />
                </div>
              )
            )}
          </div>
        </>
      ) : null}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    screenConfig: store.omsReducer.orderingCommonService.orderingScreensConfig,
    createScenarioAggregatedDataStore:
      store.omsReducer.orderManagementVendorToStoreService
        .createScenarioAggregatedDataStore,
  };
};

export default connect(mapStateToProps)(CreateScenarioStoreAggregatedChips);
