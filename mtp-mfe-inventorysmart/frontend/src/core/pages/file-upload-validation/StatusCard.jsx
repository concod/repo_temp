import { useEffect, useState } from "react";
import { makeStyles } from "@mui/styles";
import { Card, CardContent, Grid, Typography } from "@mui/material";
import { Select, Button, Tooltip, useTranslation } from "impact-ui-v3";
import globalStyles from "core/Styles/globalStyles";
import DownloadIcon from "core/coreAssets/IA_DOWNLOAD.svg";

const useStyles = makeStyles((theme) => ({
  root: {
    boxShadow: "none",
    borderRadius: theme.typography.pxToRem(4),
  },
  status: {
    flexWrap: "nowrap",
  },
  statusText: {
    color: theme.palette.textColours.slateGrayLight,
    fontSize: theme.typography.pxToRem(12),
    lineHeight: theme.typography.pxToRem(14),
    fontWeight: 500,
  },
  divider: {
    backgroundColor: theme.palette.colours.disabledBadge,
    width: theme.typography.pxToRem(1),
    height: theme.typography.pxToRem(16),
  },
  card: {
    position: "relative",
    borderRadius: theme.typography.pxToRem(8),
    border: `${theme.typography.pxToRem(1)} solid ${
      theme.palette.colours.backgroundChat
    }`,
  },
  successColor: {
    color: theme.palette.success.main,
  },
  failColor: {
    color: theme.palette.error.main,
  },
  errorCount: {
    color: theme.palette.error.main,
    fontSize: theme.typography.pxToRem(12),
    backgroundColor: theme.palette.error.light,
    borderRadius: "50%",
    minWidth: theme.typography.pxToRem(20.8),
    minHeight: theme.typography.pxToRem(20.8),
    width: theme.typography.pxToRem(20.8),
    height: theme.typography.pxToRem(20.8),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  description: {
    fontSize: theme.typography.pxToRem(14),
    lineHeight: theme.typography.pxToRem(18),
    fontWeight: 700,
    color: theme.palette.text.secondary,
  },
  textLabel: {
    lineHeight: theme.typography.pxToRem(21),
    fontWeight: 700,
  },
  headerText: {
    fontWeight: 700,
    fontSize: theme.typography.pxToRem(14),
    lineHeight: theme.typography.pxToRem(27),
  },
  cardContent: {
    backgroundColor: theme.palette.colours.athensGray1,
    borderRadius: theme.typography.pxToRem(8),
  },
  gridCardContent: {
    "&:last-child": {
      paddingBottom: theme.typography.pxToRem(8),
    },
  },
  circle: {
    width: theme.typography.pxToRem(4),
    height: theme.typography.pxToRem(4),
    borderRadius: "50%",
    backgroundColor: theme.palette.textColours.neutralText,
  },
}));

const StatusCard = ({ initialData }) => {
  const { t } = useTranslation();
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [validationData, setValidationData] = useState(initialData);

  // Determine the status for the card's header
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortOptions = [
    {
      label: t("fileUpload.failure"),
      value: "failure",
    },
    {
      label: t("fileUpload.success"),
      value: "success",
    },
  ];
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

  //download validated file
  const handleDownload = async () => {
    const downloadUrl = validationData?.data?.url;
    if (downloadUrl) {
      let a = document.createElement("a");
      a.href = downloadUrl;
      a.download = validationData?.data?.file_name;
      a.click();
    }
  };

  return (
    <Card
      className={`${classes.root} ${globalClasses.evenPaddingAround} ${globalClasses.flexRow} ${globalClasses.flexColumn} ${globalClasses.gap_16}`}
    >
      <CardContent
        className={`${globalClasses.layoutAlignSpaceBetween} ${globalClasses.padding_0}`}
      >
        <div
          className={`${globalClasses.flexAlignBetweenCenter} ${globalClasses.gap_12} ${globalClasses.fullWidth}`}
        >
          <Typography className={classes.headerText}>
            {validationData.data.file_name}
          </Typography>
          <div
            className={`${globalClasses.flexAlignBetweenCenter} ${globalClasses.gap_12}`}
          >
            <Select
              label={t("fileUpload.sortBy")}
              placeholder={t("fileUpload.sortBy")}
              initialOptions={currentSortByOptions}
              isOpen={isSortOpen}
              setIsOpen={setIsSortOpen}
              currentOptions={currentSortByOptions}
              setCurrentOptions={setCurrentSortByOptions}
              selectedOptions={selectedSortByOptions}
              setSelectedOptions={setSelectedSortByOptions}
              labelOrientation="left"
              minWidth={"161px"}
            />
            <div className={classes.divider} />
            <Tooltip title={t("fileUpload.download")} orientation="top" variant="tertiary">
              <Button
                onClick={handleDownload}
                icon={<DownloadIcon />}
                iconPlacement="center"
                size="large"
                type="default"
                variant="text"
                id="download-btn"
              />
            </Tooltip>
          </div>
        </div>
      </CardContent>

      {/* Grid for displaying data card */}
      <CardContent
        className={`${globalClasses.evenPaddingAround} ${globalClasses.flexRow} ${globalClasses.flexColumn} ${globalClasses.gap_16} ${classes.cardContent}`}
      >
        <Typography
          className={`${
            selectedSortByOptions?.value === "success"
              ? classes.successColor
              : classes.failColor
          } ${classes.headerText}`}
        >
          {selectedSortByOptions?.label}
        </Typography>
        <Grid container className={globalClasses.gap_16}>
          {Object.keys(validationData?.data?.value_counts).map((key) => (
            <Grid item xs={12} sm={6} md={4} lg={3} xl={2} key={key}>
              <Card
                className={`${classes.card} ${globalClasses.boxShadowNone} ${globalClasses.fullWidth}`}
              >
                <CardContent
                  className={`${globalClasses.padding_8_12_8_12} ${classes.gridCardContent}`}
                >
                  <div
                    className={`${globalClasses.flexAlignBetweenCenter} ${globalClasses.gap_12}`}
                  >
                    <Tooltip
                      placement="bottom"
                      variant="tertiary"
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
                    placement="bottom"
                    variant="tertiary"
                    title={validationData?.data?.value_counts[key]?.description}
                  >
                    <Typography
                      className={`${globalClasses.marginTop_4} ${globalClasses.textEllipsis} ${classes.description}`}
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

      <div
        className={`${globalClasses.layoutAlignEnd} ${globalClasses.verticalAlignCenter} ${globalClasses.gapHalf} ${classes.status}`}
      >
        <Typography component="span" className={classes.statusText}>
          {t("fileUpload.totalRows")}: {validationData?.data?.row_count}
        </Typography>
        <div className={classes.circle}></div>
        <Typography component="span" className={classes.statusText}>
          {t("fileUpload.totalColumns")}: {validationData?.data?.col_count}
        </Typography>
        <div className={classes.circle}></div>
        <Typography component="span" className={classes.statusText}>
          {t("fileUpload.errorCells")}: {validationData?.data?.error_row_count}
        </Typography>
      </div>
    </Card>
  );
};

export default StatusCard;
