import React, { useEffect, useState } from "react";
import { makeStyles } from "@mui/styles";
import { Card, CardContent, Grid, Tooltip, Typography } from "@mui/material";
import { Select } from "impact-ui";
import globalStyles from "core/Styles/globalStyles";
import { sortOptions } from "./constants";

const useStyles = makeStyles((theme) => ({
  root: {
    boxShadow: `0 0 0.5rem 0 ${theme.palette.colours.boxShadowCard}`,
    borderRadius: "0.25rem",
  },
  headerWraper: {
    padding: `0.75rem 0.75rem ${theme.typography.pxToRem(5)} 0.75rem`,
  },
  status: {
    gap: "1.25rem",
  },
  statusText: {
    color: theme.palette.textColours.slateGrayLight,
    fontSize: "0.75rem",
    lineHeight: "0.875rem",
    fontWeight: 500,
  },
  divider: {
    backgroundColor: theme.palette.colours.disabledBadge,
    width: theme.typography.pxToRem(1),
    height: theme.typography.pxToRem(22),
  },
  sortMenu: {
    "& .select-main-container": {
      gap: theme.typography.pxToRem(9),
      "& .select-container": {
        "& button": {
          height: "1.375rem",
          minWidth: "7rem",
          padding: `${theme.typography.pxToRem(1)} ${theme.typography.pxToRem(
            6
          )}`,
          "&:focus": {
            boxShadow: `0 0 0 3px ${theme.palette.primary.lighter}`,
          },
        },
        "& i": {
          height: "1rem",
          width: "1rem",
          color: theme.palette.text.secondary,
        },
        "& .select-dropdown-container": {
          minWidth: "7rem",
        },
      },
    },
  },
  badge: {
    padding: `${theme.typography.pxToRem(3)} ${theme.typography.pxToRem(17)}`,
    backgroundColor: theme.palette.colours.badgeBackground,
    color: theme.palette.textColours.uploadBadgeText,
    lineHeight: theme.typography.pxToRem(18),
    fontSize: "0.75rem",
    fontWeight: 500,
    borderRadius: "0.25rem",
  },
  gridWrapper: {
    padding: "0.75rem",
  },
  wrapper: {
    rowGap: theme.typography.pxToRem(27),
  },
  card: {
    width: "100%",
    position: "relative",
    boxShadow: "none",
    borderRadius: 0,
    "& .MuiCardContent-root": {
      padding: `${theme.typography.pxToRem(
        5
      )} 0.75rem ${theme.typography.pxToRem(5)} 1.25rem`,
    },
  },
  verticalBar: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "0.5rem",
    height: "100%",
    backgroundColor: theme.palette.success.main,
  },
  failBackground: {
    backgroundColor: theme.palette.error.main,
  },
  errorCount: {
    color: theme.palette.error.main,
    fontSize: "0.75rem",
    padding: `${theme.typography.pxToRem(1)} 0.75rem`,
    backgroundColor: theme.palette.error.light,
    borderRadius: theme.typography.pxToRem(5),
  },
  description: {
    marginTop: "0.25rem",
    fontSize: "0.75rem",
    lineHeight: "1.125rem",
    fontWeight: 400,
    color: theme.palette.text.secondary,
  },
  textLabel: {
    lineHeight: theme.typography.pxToRem(21),
  },
}));

const StatusCard = ({ initialData }) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [validationData, setValidationData] = useState(initialData);

  // Determine the status for the card's header
  const badge =
    validationData?.data?.error_row_count === 0 ? "Success" : "Errors Found";
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [currentSortByOptions, setCurrentSortByOptions] = useState(sortOptions);
  const [selectedSortByOptions, setSelectedSortByOptions] = useState(
    currentSortByOptions[0]
  );

  const sortValidationData = (data, sortByOption) => {
    const sortedValueCounts = Object.fromEntries(
      Object.entries(data.value_counts).sort(([, a], [, b]) => {
        if (sortByOption.value === "failure") {
          return b.fail - a.fail;
        } else {
          return a.fail - b.fail;
        }
      })
    );
    return {
      ...data,
      value_counts: sortedValueCounts,
    };
  };

  useEffect(() => {
    const sortedData = sortValidationData(
      initialData?.data,
      selectedSortByOptions
    );
    setValidationData({ ...initialData, data: sortedData });
  }, [initialData, selectedSortByOptions]);

  return (
    <Card className={`${globalClasses.marginTop} ${classes.root}`}>
      <CardContent
        className={`${globalClasses.layoutAlignSpaceBetween} ${classes.headerWraper}`}
      >
        <div
          className={`${globalClasses.flexAlignBetweenCenter} ${globalClasses.gapHalf}`}
        >
          <Typography variant="h6" component="h6">
            {validationData.data.file_name}
          </Typography>
          <div className={classes.divider} />
          <div className={classes.sortMenu}>
            <Select
              label={"Sort by"}
              placeholder={"Sort by"}
              initialOptions={currentSortByOptions}
              isOpen={isSortOpen}
              setIsOpen={setIsSortOpen}
              currentOptions={currentSortByOptions}
              setCurrentOptions={setCurrentSortByOptions}
              selectedOptions={selectedSortByOptions}
              setSelectedOptions={setSelectedSortByOptions}
              labelOrientation="left"
            />
          </div>
        </div>
        <div
          className={`${globalClasses.flexAlignBetweenCenter} ${classes.status}`}
        >
          <Typography component="span" className={classes.badge}>
            {badge}
          </Typography>
          <Typography component="span" className={classes.statusText}>
            Total Rows: {validationData?.data?.row_count}
          </Typography>
          <Typography component="span" className={classes.statusText}>
            Total Columns: {validationData?.data?.col_count}
          </Typography>
          <Typography component="span" className={classes.statusText}>
            Error Cells: {validationData?.data?.error_row_count}
          </Typography>
        </div>
      </CardContent>

      {/* Grid for displaying data card */}
      <CardContent className={classes.gridWrapper}>
        <Grid container spacing={1.875} className={classes.wrapper}>
          {Object.keys(validationData?.data?.value_counts).map((key) => (
            <Grid item xs={12} sm={6} md={4} lg={3} xl={2} key={key}>
              <Card className={classes.card}>
                <div
                  className={`${classes.verticalBar} ${
                    validationData?.data?.value_counts[key]?.fail !== 0 &&
                    classes.failBackground
                  }`}
                ></div>

                <CardContent>
                  <div
                    className={`${globalClasses.flexAlignBetweenCenter} ${globalClasses.gapHalf}`}
                  >
                    <Tooltip
                      classes={{ tooltip: globalClasses.customTooltip }}
                      placement="bottom-start"
                      arrow
                      title={validationData?.data?.value_counts[key]?.label}
                    >
                      <Typography
                        variant="h6"
                        component="h2"
                        className={`${globalClasses.textEllipsis} ${classes.textLabel}`}
                      >
                        {validationData?.data?.value_counts[key]?.label}
                      </Typography>
                    </Tooltip>
                    {validationData?.data?.value_counts[key]?.fail > 0 && (
                      <Typography
                        variant="body2"
                        component="p"
                        className={classes.errorCount}
                      >
                        {validationData?.data?.value_counts[key]?.fail}
                      </Typography>
                    )}
                  </div>
                  <Tooltip
                    classes={{ tooltip: globalClasses.customTooltip }}
                    placement="bottom-start"
                    arrow
                    title={validationData?.data?.value_counts[key]?.description}
                  >
                    <Typography
                      className={`${globalClasses.textEllipsis} ${classes.description}`}
                      variant="body2"
                      component="p"
                    >
                      {validationData?.data?.value_counts[key]?.description}
                    </Typography>
                  </Tooltip>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default StatusCard;
