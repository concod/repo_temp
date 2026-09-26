import { useMemo, useState, useEffect } from "react";
import "./textContent.css";
import { Select, Button, Tooltip } from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";
import { Box } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import FilterListIcon from "@mui/icons-material/FilterList";
import { pxToRem } from "core/Utils/functions/utils";
import colours from "core/Styles/colours";

const TextContent = ({ data, setShowCopyAlert, onFilterTable, onClose }) => {
  const useStyles = makeStyles(() => ({
    actionIcon: {
      width: pxToRem(16),
      height: pxToRem(16),
      cursor: "pointer",
    },
    actionIconColor: {
      color: colours.neutrals,
    },
    filterHeaderStyle: {
      font: `normal normal 500 ${pxToRem(14)}/${pxToRem(21)} Poppins`,
    },
    separater: {
      width: "1px",
      height: "12px",
      background: colours.separaterColor,
      display: "block",
    },
    gap12: {
      gap: "12px",
    },
  }));
  const [selectedColumn, setSelectedColumn] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const classes = useStyles();

  useEffect(() => {
    if (data?.columns?.length) {
      setSelectedColumn(data.columns[0]);
    }
  }, [data]);

  const columnOptions = useMemo(() => {
    if (!data?.columns) return [];

    return data.columns.map((col) => ({
      label: col.display,
      value: col.name,
      original: col,
    }));
  }, [data]);

  useEffect(() => {
    if (columnOptions.length) {
      setSelectedColumn(columnOptions[0]);
    }
  }, [columnOptions]);

  // Filter handler — copies values, applies them to the plan_code floating filter, then closes the modal
  const handleFilter = async () => {
    if (!selectedColumn || !data?.result_rows || !onFilterTable) return;

    const values = data.result_rows
      .map((row) => row[selectedColumn.value])
      .filter((val) => val !== undefined && val !== null);

    // Copy to clipboard silently (no toast for this)
    try {
      await navigator.clipboard.writeText(values.join(", "));
    } catch (err) {
      console.error("Copy failed:", err);
    }

    // Apply filter to the Auto Allocation table's plan_code column
    onFilterTable(selectedColumn.value, values);

    // Show "Data filtered successfully", then close the modal after 1 s
    setShowCopyAlert("Data filtered successfully");
    setTimeout(() => {
      setShowCopyAlert("");
      onClose?.();
    }, 1000);
  };

  // Copy handler
  const handleCopy = async () => {
    if (!selectedColumn || !data?.result_rows) return;

    const text = data.result_rows
      .map((row) => row[selectedColumn.value])
      .filter((val) => val !== undefined && val !== null)
      .join(", ");

    try {
      await navigator.clipboard.writeText(text);
      setShowCopyAlert("Copied successfully");
      setTimeout(() => setShowCopyAlert(""), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };
  const formattedText = useMemo(() => {
    if (!selectedColumn?.value || !data?.result_rows) return "";

    return data.result_rows
      .map((row) => row[selectedColumn.value])
      .filter((val) => val !== undefined && val !== null) // ✅ prevent undefined
      .map((val) => `"${val}"`)
      .join(", ");
  }, [data, selectedColumn]);

  const handleDownload = () => {
    if (!selectedColumn || !data?.result_rows) return;

    // Extract values (NO quotes)
    const values = data.result_rows
      .map((row) => row[selectedColumn.value])
      .filter((val) => val !== undefined && val !== null);

    const csvContent = [selectedColumn.label, ...values].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    //  Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.setAttribute("download", `${selectedColumn.value}_data.csv`);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="tc-container">
      {/* HEADER */}
      <div className="tc-header">
        <div className="tc-title">Allocations Table</div>

        <div className="tc-actions">
          <Select
            label="Extract IDs :"
            isOpen={isOpen}
            labelOrientation="left"
            setIsOpen={setIsOpen}
            isSearchable={true}
            isClearable={true}
            isCloseWhenClickOutside={true}
            isMulti={false}
            width="135px"
            minWidth="135px"
            initialOptions={columnOptions}
            currentOptions={columnOptions}
            selectedOptions={selectedColumn}
            setSelectedOptions={setSelectedColumn}
          />

          <span className={classes.separater} />

          {/* COPY */}
          <div className="tc-iconBtn" onClick={handleCopy} title="Copy values">
            <ContentCopyIcon
              fontSize="small"
              className={`${classes.actionIcon} ${classes.actionIconColor}`}
            />
          </div>

          {onFilterTable && (
            <>
              <span className={classes.separater} />
              <div className="tc-iconBtn" onClick={handleFilter}>
                <Tooltip
                  title="Apply extracted values as a filter on the Auto Allocation table. This panel will close automatically."
                  variant="tertiary"
                >
                  <FilterListIcon
                    fontSize="small"
                    className={`${classes.actionIcon} ${classes.actionIconColor}`}
                  />
                </Tooltip>
              </div>
            </>
          )}

          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              icon={<FileDownloadOutlinedIcon />}
              title="Download"
              onClick={handleDownload}
              type="default"
              variant="tertiary"
              sx={{
                background: "#f5f6fa !important",
                border: "none !important",
              }}
            />
          </Box>
        </div>
      </div>

      {/* CONTENT BOX */}
      <div>
        {selectedColumn ? (
          <div className="tc-contentBox">
            {formattedText || "No data available"}
          </div>
        ) : (
          <div className="tc-contentBox">Select a column to extract values</div>
        )}
      </div>
    </div>
  );
};

export default TextContent;
