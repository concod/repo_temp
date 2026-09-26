import React, { useMemo, useState } from "react";
import makeStyles from "@mui/styles/makeStyles";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import { Badge, Button, ButtonGroup, Panel } from "impact-ui-v3";
import ExpediteOrdersDeepDiveFilterPanel from "./DeepDiveFilterPanel";

const useStyles = makeStyles((theme) => ({
  container: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: "8px 0",
  },
  topRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  topRowLeft: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    minWidth: 0,
  },
  topRowCenter: {
    display: "flex",
    justifyContent: "center",
    flexShrink: 0,
  },
  topRowRight: {
    flex: 1,
    display: "flex",
    justifyContent: "flex-end",
    flexShrink: 0,
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap",
  },
  title: {
    fontSize: 14,
    lineHeight: "16px",
    fontWeight: 700,
    color: theme.palette.text.primary,
  },
  titleDivider: {
    height: 16,
    alignSelf: "center",
  },
  metaLabel: {
    fontSize: 12,
    lineHeight: "14px",
    color: theme.palette.text.secondary,
    fontWeight: 500,
  },
  metaValue: {
    fontSize: 12,
    lineHeight: "14px",
    color: theme.palette.text.primary,
    fontWeight: 700,
    marginLeft: 4,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    "&.ia-styles.ia-btn": {
      width: 28,
      height: 28,
      minWidth: 28,
      borderRadius: 8,
      padding: 0,
      border: `1px solid ${theme.palette.action.hover}`,
      background: `${theme.palette.common.white} !important`,
    },
  },
  actionIconImage: {
    width: 18,
    height: 18,
    display: "block",
  },
  filtersRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  filtersLabel: {
    fontSize: 10,
    lineHeight: "14px",
    color: theme.palette.text.secondary,
    fontWeight: 600,
  },
  tag: {
    background: `${
      theme.palette.background?.tagBackground || "#F5F6FF"
    } !important`,
    borderRadius: 6,
    "& .tag-text": {
      color: theme.palette.text.secondary,
      fontSize: theme.typography.pxToRem(10),
      lineHeight: theme.typography.pxToRem(18),
      fontWeight: 600,
    },
  },
  tagCompact: {
    background: `${
      theme.palette.background?.tagBackground || "#F5F6FF"
    } !important`,
    borderRadius: 6,
    cursor: "pointer",
    "& .tag-text": {
      color: theme.palette.text.secondary,
      fontSize: theme.typography.pxToRem(10),
      lineHeight: theme.typography.pxToRem(18),
      fontWeight: 600,
    },
  },
}));

const DEEP_DIVE_OPTIONS = [
  { label: "Before", value: "before" },
  { label: "After", value: "after" },
];

function ExpediteOrdersDeepDiveHeader({
  selectedDeepDiveOption,
  onDeepDiveOptionChange,
  showDeepDiveControls,
  selectedStyleColor,
  hideTitle,
  ...props
}) {
  const classes = useStyles();
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [isOverflowPanelOpen, setIsOverflowPanelOpen] = useState(false);

  const { filters = [], maxVisibleFilters = 2 } = props;

  const { visibleFilters, overflowCount } = useMemo(() => {
    const safeFilters = Array.isArray(filters) ? filters : [];
    const visible = safeFilters.slice(0, Math.max(0, maxVisibleFilters));
    const overflow = Math.max(0, safeFilters.length - visible.length);
    return { visibleFilters: visible, overflowCount: overflow };
  }, [filters, maxVisibleFilters]);

  return (
    <div className={classes.container}>
      <div className={classes.topRow}>
        {/* Left: title + meta */}
        <div className={classes.topRowLeft}>
          <div className={classes.titleRow}>
            {!hideTitle && (
              <Typography className={classes.title}>Deep Dive</Typography>
            )}
            {selectedStyleColor ? (
              <>
                <Divider
                  orientation="vertical"
                  flexItem
                  className={classes.titleDivider}
                />
                <Badge
                  className={classes.tag}
                  label={`Selected Style: ${selectedStyleColor}`}
                  color="default"
                  size="default"
                  variant="subtle"
                />
              </>
            ) : null}
          </div>
        </div>

        {/* Center: Before / After toggle — only visible in step 2 */}
        {showDeepDiveControls && (
          <div className={classes.topRowCenter}>
            <ButtonGroup
              options={DEEP_DIVE_OPTIONS}
              selectedOption={selectedDeepDiveOption || "after"}
              onChange={(event, value) => {
                // impact-ui-v3 passes this as MUI ToggleButton onClick; MUI calls
                // onClick(event, value) — the selected option is the *second* arg.
                if (value != null && onDeepDiveOptionChange) {
                  onDeepDiveOptionChange(value);
                }
              }}
            />
          </div>
        )}

        {/* Right: View comparision table placeholder — only visible in step 2 */}
        {showDeepDiveControls ? (
          <div className={classes.topRowRight}>
            <Button
              size="large"
              type="default"
              variant="tertiary"
              onClick={() => console.log("coming soon..deep dive table diff")}
            >
              View comparision table
            </Button>
          </div>
        ) : (
          <div className={classes.topRowRight} />
        )}
      </div>

      {/* Hiding the new Design */}
      {isFiltersVisible ? (
        <div className={classes.filtersRow}>
          <Typography component="span" className={classes.filtersLabel}>
            Filters :
          </Typography>
          {visibleFilters.map((label) => (
            <Badge
              key={label}
              className={classes.tag}
              label={label}
              color="default"
              size="default"
              variant="subtle"
            />
          ))}
          {overflowCount > 0 ? (
            <Badge
              className={classes.tagCompact}
              label={`+${overflowCount}`}
              color="default"
              size="default"
              variant="subtle"
              onClick={() => setIsOverflowPanelOpen(true)}
            />
          ) : null}
        </div>
      ) : null}

      {/* Hiding the new Design */}
      <Panel
        anchor="right"
        className=""
        onClose={() => setIsOverflowPanelOpen(false)}
        onPrimaryButtonClick={() => setIsOverflowPanelOpen(false)}
        onSecondaryButtonClick={() => setIsOverflowPanelOpen(false)}
        primaryButtonLabel="Submit"
        secondaryButtonLabel="Cancel"
        size="large"
        title="Graph Settings"
        open={isOverflowPanelOpen}
      >
        <React.Fragment key=".0">
          <ExpediteOrdersDeepDiveFilterPanel />
        </React.Fragment>
      </Panel>
    </div>
  );
}

export default ExpediteOrdersDeepDiveHeader;
