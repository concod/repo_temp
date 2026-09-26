import React, { useState } from "react";
import { Button, Card } from "impact-ui-v3";
import { Typography, IconButton } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import CloseIcon from "@mui/icons-material/Close";
import makeStyles from "@mui/styles/makeStyles";
import globalStyles from "core/Styles/globalStyles";
import { OMS_VENDOR_PROJECTIONS_INFO_BANNER_MESSAGE } from "modules/oms/constants-oms/stringConstants";

const InfoBanner = () => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [showDetailedNote, setShowDetailedNote] = useState(false);

  const openDetailedNote = () => {
    setShowDetailedNote(true);
  };

  const closeDetailedNote = () => {
    setShowDetailedNote(false);
  };

  return (
    <div className={classes.infoBanner}>
      <InfoIcon className={classes.infoBannerIcon} fontSize="small" />
      <Typography className={classes.infoBannerText}>
        Note: User order adjustments may cause temporary mismatches.{" "}
        <Button
          label="Button"
          size="small"
          type="default"
          variant="url"
          style={{
            display: "inline",
            padding: 0,
            minWidth: "auto",
            textTransform: "none",
            fontSize: "inherit",
          }}
          onClick={openDetailedNote}
        >
          Learn More
        </Button>
      </Typography>

      {showDetailedNote && (
        <Card size="large" className={classes.detailedNoteCard}>
          <div
            className={globalClasses.flexAlignBetweenCenter}
            style={{ marginBottom: "1rem" }}
          >
            <Typography h6 style={{ fontWeight: 800, fontSize: "16px" }}>
              Order Adjustment Information
            </Typography>
            <div>
              <IconButton onClick={closeDetailedNote} size="small">
                <CloseIcon fontSize="small" />
              </IconButton>
            </div>
          </div>
          <Typography style={{ lineHeight: 1.6 }}>
            {OMS_VENDOR_PROJECTIONS_INFO_BANNER_MESSAGE}
          </Typography>
        </Card>
      )}
    </div>
  );
};

const useStyles = makeStyles((theme) => ({
  infoBanner: {
    position: "relative",
    display: "flex",
    alignItems: "flex-start",
    gap: "0.5rem",
    padding: "0.75rem 1rem",
    backgroundColor: "#e3f2fd",
    border: "1px solid #bbdefb",
    borderRadius: "4px",
    marginBottom: "1rem",
  },
  infoBannerIcon: {
    color: "#1976d2",
    marginTop: "2px",
  },
  infoBannerText: {
    fontSize: "14px",
    color: "#1565c0",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    "& .MuiButton-root": {
      color: "#1976d2",
      textDecoration: "underline",
      "&:hover": {
        textDecoration: "underline",
        backgroundColor: "transparent",
      },
    },
  },
  detailedNoteCard: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    zIndex: 9,
    marginTop: "0.5rem",
    minHeight: "120px !important",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
  },
}));

export default InfoBanner;
