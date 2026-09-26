import React from "react";
import makeStyles from "@mui/styles/makeStyles";
import globalStyles from "core/Styles/globalStyles";
import { pxToRem } from "core/Utils/functions/utils";
import { Typography } from "@mui/material";
import CmdKeyIcon from "assets/cmdKeyIcon.svg";
import OptKeyIcon from "assets/optKeyIcon.svg";
import Tooltip from "@mui/material/Tooltip";

const useStyles = makeStyles((theme) => ({
  container: {
    display: "flex",
    flexWrap: "wrap",
    margin: `${pxToRem(17)} 0`,
    rowGap: pxToRem(16),
    columnGap: pxToRem(12),
  },
  item: {
    padding: `${pxToRem(16)} ${pxToRem(47)} ${pxToRem(16)} ${pxToRem(25)}`,
    border: `${pxToRem(1)} solid #DCE1E6`,
    borderRadius: pxToRem(4),
    width: pxToRem(350),
    height: pxToRem(144),
  },
  itemContainerComponent: {
    paddingInline: pxToRem(8),
    color: theme.palette.text.disabled,
    fontSize: `${pxToRem(12)}`,
  },
  itemContainerActions: {
    padding: `${pxToRem(12)} ${pxToRem(8)} ${pxToRem(12)} ${pxToRem(8)}`,
    color: theme.palette.text.primary,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: `${pxToRem(12)}`,
    width: "100%",
    overflow: "hidden",
  },
  itemContainerKeys: {
    paddingInline: pxToRem(8),
    gap: pxToRem(4),
  },
  key: {
    minHeight: pxToRem(50),
    minWidth: pxToRem(63),
    border: `${pxToRem(1)} solid #CDCDCD`,
    borderRadius: pxToRem(4),
    padding: `${pxToRem(8)} ${pxToRem(8)}`,
    background:
      "linear-gradient(180deg, rgba(212, 212, 212, 0) 0%, rgba(212, 212, 212, 0.6) 100%)",
    fontSize: pxToRem(12),
  },
  keySeparator: {
    margin: `0 ${pxToRem(4)}`,
    fontSize: pxToRem(12),
  },
  keyWithSignleLetter: {
    minWidth: pxToRem(44),
  },
  macKey: {
    alignItems: "flex-end",
  },
  iconKey: {
    position: "absolute",
    height: pxToRem(8.26),
    width: pxToRem(8.96),
    marginRight: pxToRem(-4),
    marginBottom: pxToRem(27),
  },
  customTooltip: {
    backgroundColor: theme.palette.colours.tooltipColor,
  },
}));

const KeyboardShortcutGrid = ({ rowItem, isWindow, searchQuery }) => {
  const classes = useStyles();
  const globalClasses = globalStyles();

  const filteredItems = rowItem.filter((item) => {
    const keys = isWindow ? item.windows_keys : item.mac_keys;
    return (
      item.components.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.actions.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(keys)
        .split(",")
        .join("+")
        .replace(/\s+/g, "")
        ?.toLowerCase()
        .includes(searchQuery.replace(/\s+/g, "").toLowerCase())
    );
  });

  return (
    <div className={classes.container}>
      {filteredItems.map((item, index) => (
        <div
          className={`${globalClasses.flexRow} ${globalClasses.flexColumn} ${classes.item}`}
          key={index}
        >
          <Typography
            component="div"
            variant="h6"
            className={classes.itemContainerComponent}
          >
            {item.components}
          </Typography>
          {item.actions.length > 38 ? (
            <Tooltip
              placement="right"
              title={item.actions}
              componentsProps={{
                tooltip: {
                  className: classes.customTooltip,
                },
              }}
            >
              <Typography
                component="div"
                variant="h6"
                className={classes.itemContainerActions}
              >
                {item.actions}
              </Typography>
            </Tooltip>
          ) : (
            <Typography
              component="div"
              variant="h6"
              className={classes.itemContainerActions}
            >
              {item.actions}
            </Typography>
          )}
          <div
            className={`${globalClasses.flexRow} ${globalClasses.verticalAlignCenter} ${classes.itemContainerKeys}`}
          >
            {(isWindow ? item.windows_keys : item.mac_keys).map(
              (key, keyIndex, array) => {
                const originalArray = isWindow
                  ? item.windows_keys
                  : item.mac_keys;
                return (
                  <React.Fragment key={keyIndex}>
                    <div
                      className={`${
                        originalArray.length === 1
                          ? globalClasses.centerAlign
                          : ""
                      } 
                    ${classes.key} 
                    ${
                      key.trim().length === 1
                        ? `${classes.keyWithSignleLetter} ${globalClasses.centerAlign}`
                        : ""
                    }
                    ${
                      !isWindow &&
                      key.trim().length > 1 &&
                      originalArray.length > 1
                        ? `${globalClasses.layoutAlignEnd} ${classes.macKey}`
                        : ""
                    }`}
                    >
                      {!isWindow &&
                        key.trim().length > 1 &&
                        originalArray.length > 1 && (
                          <>
                            {key.trim() === "Option" ? (
                              <OptKeyIcon className={classes.iconKey} />
                            ) : (
                              key.trim() === "Command" && (
                                <CmdKeyIcon className={classes.iconKey} />
                              )
                            )}
                          </>
                        )}
                      {key.trim()}
                    </div>
                    {keyIndex < array.length - 1 && (
                      <span className={classes.keySeparator}>+</span>
                    )}
                  </React.Fragment>
                );
              }
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default KeyboardShortcutGrid;
