// @ts-nocheck
import { useState } from "react";
import { createPortal } from "react-dom";
import { makeStyles } from "@mui/styles";
import { Button } from "impact-ui-v3";
import TagPanel from "modules/inventorysmart/components/common/TagPanel";
import colours from "core/Styles/colours";

const useTagStyles = makeStyles(() => ({
  tagCell: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    height: "100%",
  },
  tagItem: {
    color: "#5F6673",
    textAlign: "center",
    fontFamily: "Manrope",
    fontSize: "14px",
    fontWeight: 500,
    lineHeight: "20px",
    padding: "2px 8px",
    borderRadius: "1000px",
    border: "1px solid #5F6673",
    background: colours.white,
    height: "24px",
  },
  tagNumberItem: {
    color: colours.lightNeutrals,
    fontFamily: "Manrope",
    fontSize: "12px",
    fontStyle: "normal",
    fontWeight: 500,
    lineHeight: "16px",
    display: "flex",
    padding: "6px 12px",
    borderRadius: "8px",
    background: colours.lighterGrey,
    height: "28px",
    cursor: "pointer",
  },
  tagDropdownOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  tagDropdown: {
    position: "fixed",
    zIndex: 1000,
    backgroundColor: colours.white,
    borderRadius: "12px",
    boxShadow: "0 0 4px rgba(0, 0, 0, 0.12)",
    minWidth: "200px",
    width: "240px",
    padding: "8px 8px 8px 6px",
    display: "flex",
    flexDirection: "column",
  },
  tagDropdownList: {
    display: "flex",
    flexDirection: "column",
    maxHeight: "220px",
    overflowY: "auto",
    gap: 2,
  },
  tagDropdownItem: {
    padding: "7.5px 12px",
    fontFamily: "Manrope",
    fontSize: "14px",
    fontWeight: 500,
    lineHeight: "20px",
    color: colours.darkBlack,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    borderRadius: "8px",
    cursor: "default",
    "&:hover": {
      backgroundColor: colours.lighterGrey,
    },
  },
  tagDropdownDivider: {
    height: "1px",
    backgroundColor: colours.lighterGrey,
    marginBottom: "7px",
    marginTop: "2px",
  },
  tagDropdownFooter: {
    "& button": {
      width: "100%",
    },
  },
}));

const TagCellRenderer = ({
  tags = [],
  visibleCount = 2,
  initialDropdownCount = 5,
}) => {
  const classes = useTagStyles();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  if (!tags || !tags.length) return null;

  const visibleTags = tags.slice(0, visibleCount);
  const remainingCount = tags.length - visibleCount;
  const displayTags = tags.slice(0, initialDropdownCount);

  const handleCountClick = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setOpen(e.currentTarget);

    const gap = 4;
    const dropdownWidth = 240;
    const margin = 8;

    // Estimate dropdown height based on content
    const visibleInDropdown = Math.min(tags.length, initialDropdownCount);
    const itemHeight = 39; // padding(7.5 * 2) + lineHeight(24)
    const listHeight =
      visibleInDropdown * itemHeight + Math.max(visibleInDropdown - 1, 0) * 2;
    const containerPadding = 16; // 8px top + 8px bottom
    const footerHeight = tags.length > initialDropdownCount ? 50 : 0;
    const estimatedHeight = listHeight + containerPadding + footerHeight;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const spaceRight = window.innerWidth - rect.right;
    const spaceLeft = rect.left;

    let position;

    // Priority: bottom → top → right → left
    if (spaceBelow >= estimatedHeight) {
      position = {
        top: rect.bottom + gap,
        left: Math.max(
          margin,
          Math.min(rect.left, window.innerWidth - dropdownWidth - margin)
        ),
      };
    } else if (spaceAbove >= estimatedHeight) {
      position = {
        top: rect.top - estimatedHeight - gap,
        left: Math.max(
          margin,
          Math.min(rect.left, window.innerWidth - dropdownWidth - margin)
        ),
      };
    } else if (spaceRight >= dropdownWidth) {
      position = {
        top: Math.max(
          margin,
          Math.min(rect.top, window.innerHeight - estimatedHeight - margin)
        ),
        left: rect.right + gap,
      };
    } else {
      position = {
        top: Math.max(
          margin,
          Math.min(rect.top, window.innerHeight - estimatedHeight - margin)
        ),
        left: rect.left - dropdownWidth - gap,
      };
    }

    setDropdownPos(position);
  };

  const handleClose = () => {
    setOpen(null);
    setExpanded(false);
  };

  return (
    <div className={classes.tagCell}>
      {visibleTags.map((item, idx) => (
        <div className={classes.tagItem} key={idx}>
          {item}
        </div>
      ))}
      {remainingCount > 0 && (
        <div onClick={handleCountClick} className={classes.tagNumberItem}>
          {`+${remainingCount}`}
        </div>
      )}
      {open &&
        createPortal(
          <>
            <div className={classes.tagDropdownOverlay} onClick={handleClose} />
            <div
              className={classes.tagDropdown}
              style={{ top: dropdownPos.top, left: dropdownPos.left }}
            >
              <div className={classes.tagDropdownList}>
                {displayTags.map((item, idx) => (
                  <div key={idx} className={classes.tagDropdownItem}>
                    {item}
                  </div>
                ))}
              </div>

              {!expanded && tags.length > initialDropdownCount && (
                <>
                  <div className={classes.tagDropdownDivider} />
                  <div className={classes.tagDropdownFooter}>
                    <Button
                      onClick={() => {
                        setExpanded(true);
                        setOpen(false);
                      }}
                      variant="text"
                      size="medium"
                    >
                      View All({tags.length})
                    </Button>
                  </div>
                </>
              )}
            </div>
          </>,
          document.body
        )}
      <TagPanel
        open={expanded}
        data={tags}
        onClose={() => setExpanded(false)}
      />
    </div>
  );
};

export const tagCellRenderer = (
  column,
  { columnName = "tag", dataKey = "tag", visibleCount = 2, width = 300 } = {}
) => {
  if (column.column_name !== columnName) return null;
  return {
    ...column,
    width,
    minWidth: width,
    cellRenderer: (params) => {
      const tags = params.data?.[dataKey] || [];
      return <TagCellRenderer tags={tags} visibleCount={visibleCount} />;
    },
  };
};

export default TagCellRenderer;
