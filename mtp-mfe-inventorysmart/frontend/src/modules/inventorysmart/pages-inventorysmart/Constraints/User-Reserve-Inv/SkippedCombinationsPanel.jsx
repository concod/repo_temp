import React, { useMemo, useState } from "react";
import { Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { Input, Panel } from "impact-ui-v3";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SearchIcon from "@mui/icons-material/Search";
import appliedIcon from "assets/applied.png";
import failedIcon from "assets/failed.png";

const SKIPPED_REASON = "Requested value exceeds DC Pack OH";

const useStyles = makeStyles(() => ({
  panelRoot: {
    background: "#FFFFFF",
    borderRadius: "8px",
    boxShadow: "0px 0px 12px 8px rgba(0, 0, 0, 0.06)",
    "& .impact_drawer_header": {
      alignItems: "center",
      background: "#ECEEFD",
      borderRadius: "8px 8px 0px 0px",
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      padding: "12px 16px",
    },
    "& .impact_drawer_heading": {
      color: "#0D152C",
      fontFamily: "'Manrope', sans-serif",
      fontSize: "16px",
      fontWeight: 800,
      lineHeight: "24px",
    },
  },
  summaryRow: {
    display: "flex",
    gap: "12px",
    marginBottom: "1.25rem",
  },
  summaryCard: {
    alignItems: "flex-start",
    borderRadius: "12px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "row",
    flexGrow: 1,
    height: "61px",
    overflow: "hidden",
    padding: "4px 20px",
    position: "relative",
  },
  appliedCard: {
    background: "linear-gradient(92.8deg, #C4E8D5 0.62%, #FFFFFF 54.85%)",
    border: "1px solid #C4E8D5",
  },
  skippedCard: {
    background: "linear-gradient(92.8deg, #F5C7C7 0.62%, #FFFFFF 54.85%)",
    border: "1px solid #F5C7C7",
  },
  cardText: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  cardLabel: {
    color: "#60697D",
    fontFamily: "'Manrope', sans-serif",
    fontSize: "14px",
    fontWeight: 600,
    lineHeight: "21px",
  },
  cardCount: {
    color: "#31416E",
    fontFamily: "'Manrope', sans-serif",
    fontSize: "20px",
    fontWeight: 800,
    lineHeight: "30px",
  },
  cardIconWrap: {
    bottom: 0,
    height: "36px",
    position: "absolute",
    right: "20px",
    width: "41px",
  },
  iconDome: {
    borderRadius: "100px 100px 0px 0px",
    bottom: 0,
    height: "29px",
    left: 0,
    position: "absolute",
    width: "29px",
  },
  appliedDome: {
    background: "#EBF7F1",
  },
  skippedDome: {
    background: "#FDEEEE",
  },
  statusIcon: {
    height: "32px",
    left: "9px",
    objectFit: "contain",
    position: "absolute",
    top: 0,
    width: "32px",
  },
  toolbarRow: {
    alignItems: "center",
    display: "flex",
    gap: "16px",
    height: "32px",
    justifyContent: "space-between",
    marginBottom: "0.75rem",
  },
  reasonLabel: {
    alignItems: "center",
    color: "#000000",
    display: "flex",
    fontFamily: "'Manrope', sans-serif",
    fontSize: "14px",
    fontWeight: 500,
    gap: "4px",
    lineHeight: "21px",
    textTransform: "capitalize",
  },
  infoIcon: {
    boxSizing: "content-box",
    color: "#60697D",
    height: "12px",
    padding: "4px",
    width: "12px",
  },
  searchBox: {
    flexShrink: 0,
    width: "189px",
    "& .impact_inputbox_container_with_icons": {
      width: "189px",
    },
    "& .impact-input-wrapper": {
      gap: "12px",
      minWidth: "unset",
      padding: "0px 0px 0px 12px",
      width: "189px",
    },
    "& .right-input-icon": {
      alignItems: "center",
      alignSelf: "stretch",
      borderLeft: "1px solid #C3C8D4",
      borderRadius: "0px 8px 8px 0px",
      display: "flex",
      justifyContent: "center",
      width: "32px",
    },
  },
  itemList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "1px",
  },
  listCard: {
    background: "#FFFFFF",
    borderRadius: "8px",
    boxShadow: "0px 0px 4px rgba(0, 0, 0, 0.12)",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "12px",
  },
  cardTopRow: {
    alignItems: "center",
    display: "flex",
    gap: "10px",
  },
  itemTitle: {
    color: "#1F2B4D",
    flexGrow: 1,
    fontFamily: "'Manrope', sans-serif",
    fontSize: "14px",
    fontWeight: 800,
    lineHeight: "21px",
    textTransform: "capitalize",
  },
  itemSubtitle: {
    color: "#7A8294",
    fontFamily: "'Manrope', sans-serif",
    fontSize: "14px",
    fontWeight: 400,
    lineHeight: "16px",
    textTransform: "capitalize",
  },
  metrics: {
    alignItems: "flex-start",
    display: "flex",
    flexShrink: 0,
    gap: "20px",
  },
  metricLabel: {
    color: "#7A8294",
    fontFamily: "'Manrope', sans-serif",
    fontSize: "12px",
    fontWeight: 500,
    lineHeight: "16px",
    textTransform: "capitalize",
  },
  metricValue: {
    fontWeight: 700,
  },
  emptyText: {
    color: "#8C8C8C",
    fontSize: "0.8125rem",
    padding: "1rem 0",
    textAlign: "center",
  },
}));

const SkippedCombinationsPanel = ({
  open,
  onClose,
  appliedCount,
  failedUpdates,
}) => {
  const classes = useStyles();
  const [searchText, setSearchText] = useState("");

  const getLabel = (item) =>
    [item.article, item.size, item.dc_code && `DC ${item.dc_code}`]
      .filter(Boolean)
      .join(" - ");

  const getDescription = (item) =>
    [item.article, item.product_description].filter(Boolean).join(" - ");

  const filteredItems = useMemo(() => {
    const searchTerm = searchText.trim().toLowerCase();
    if (!searchTerm) {
      return failedUpdates;
    }
    return failedUpdates.filter((item) =>
      `${getLabel(item)} ${getDescription(item)}`
        .toLowerCase()
        .includes(searchTerm)
    );
  }, [failedUpdates, searchText]);

  return (
    <Panel
      anchor="right"
      open={open}
      onClose={onClose}
      title="Skipped combinations"
      width={593}
      className={classes.panelRoot}
    >
      <div className={classes.summaryRow}>
        <div className={`${classes.summaryCard} ${classes.appliedCard}`}>
          <div className={classes.cardText}>
            <Typography className={classes.cardLabel}>Applied</Typography>
            <Typography className={classes.cardCount}>
              {appliedCount}
            </Typography>
          </div>
          <div className={classes.cardIconWrap}>
            <span className={`${classes.iconDome} ${classes.appliedDome}`} />
            <img
              src={appliedIcon}
              alt="Applied"
              className={classes.statusIcon}
            />
          </div>
        </div>
        <div className={`${classes.summaryCard} ${classes.skippedCard}`}>
          <div className={classes.cardText}>
            <Typography className={classes.cardLabel}>Skipped</Typography>
            <Typography className={classes.cardCount}>
              {failedUpdates.length}
            </Typography>
          </div>
          <div className={classes.cardIconWrap}>
            <span className={`${classes.iconDome} ${classes.skippedDome}`} />
            <img
              src={failedIcon}
              alt="Skipped"
              className={classes.statusIcon}
            />
          </div>
        </div>
      </div>

      <div className={classes.toolbarRow}>
        <Typography className={classes.reasonLabel}>
          {SKIPPED_REASON}
          <InfoOutlinedIcon className={classes.infoIcon} />
        </Typography>
        <div className={classes.searchBox}>
          <Input
            placeholder="Search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            rightIcon={<SearchIcon />}
          />
        </div>
      </div>

      {filteredItems.length === 0 && (
        <Typography className={classes.emptyText}>
          No skipped combinations found.
        </Typography>
      )}

      <div className={classes.itemList}>
        {filteredItems.map((item, index) => (
          <div
            className={classes.listCard}
            key={`${getLabel(item)}-${item.pack_type_id}-${index}`}
          >
            <div className={classes.cardTopRow}>
              <Typography className={classes.itemTitle}>
                {getLabel(item)}
              </Typography>
              <div className={classes.metrics}>
                <Typography className={classes.metricLabel}>
                  Requested :{" "}
                  <span className={classes.metricValue}>
                    {item.requested_quantity}
                  </span>
                </Typography>
                <Typography className={classes.metricLabel}>
                  Available :{" "}
                  <span className={classes.metricValue}>
                    {item.dc_available}
                  </span>
                </Typography>
              </div>
            </div>
            <Typography className={classes.itemSubtitle}>
              {getDescription(item)}
            </Typography>
          </div>
        ))}
      </div>
    </Panel>
  );
};

export default SkippedCombinationsPanel;
