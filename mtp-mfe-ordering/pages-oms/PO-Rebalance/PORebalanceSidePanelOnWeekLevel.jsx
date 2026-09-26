import React, { useEffect, useState } from "react";
import { Panel, Button } from "impact-ui-v3";
import { Typography } from "@mui/material";
import { useDispatch } from "react-redux";
import LoadingOverlay from "core/Utils/Loader/loader";
import { fetchWeekLevelSaveTypeData } from "modules/oms/services-oms/PO-Rebalance/po-rebalance-service";
import { makeStyles } from "@mui/styles";

const customStyles = makeStyles((theme) => ({
  weekRowItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    margin: "8px 0",
    cursor: "pointer",
    borderRadius: "8px",
    transition: "all 0.2s ease",
  },
  infoMessageContainer: {
    padding: "16px",
    margin: "16px 0",
    backgroundColor: "#e3f2fd",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
  },
  infoMessageIcon: {
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    backgroundColor: "#2196f3",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "bold",
    marginRight: "8px",
  },
  footerContainer: {
    padding: "16px 0",
    borderTop: "1px solid #e0e0e0",
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: "12px",
  },
}));
const PORebalanceSidePanelOnWeekLevel = ({
  open,
  onClose,
  saveTypeData,
  rowData,
  aggrColumn,
  choiceTableColumns,
  openReviewRecommendationTableView,
  selectedRecords,
}) => {
  const dispatch = useDispatch();
  const customClasses = customStyles();

  const [weekLevelData, setWeekLevelData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(null);

  useEffect(() => {
    if (open && aggrColumn) {
      fetchWeekLevelData();
    }
  }, [open, aggrColumn]);

  const fetchWeekLevelData = async () => {
    try {
      setLoading(true);
      const payload = {
        l6_id: aggrColumn,
      };

      const response = await dispatch(fetchWeekLevelSaveTypeData(payload));
      if (response?.data?.status) {
        setWeekLevelData(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching week level data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleWeekSelection = (weekData) => {
    setSelectedWeek(weekData);
  };

  const handleReviewRecommendation = () => {
    if (selectedWeek && openReviewRecommendationTableView) {
      const payloadData = {
        week_month_list: selectedWeek.fiscal_year_week,
        choice: aggrColumn,
        selectedRecords: selectedRecords,
      };

      const selectedRecord =
        selectedRecords && selectedRecords.length > 0
          ? selectedRecords[0]
          : null;
      const response = openReviewRecommendationTableView(
        payloadData,
        selectedRecord
      );

      if (response) {
        onClose();
      }
    }
  };

  const getWeekRowItemStyle = (item) => {
    const isSelected = selectedWeek?.fiscal_year_week === item.fiscal_year_week;
    return {
      border: isSelected ? "2px solid #2196f3" : "1px solid #e0e0e0",
      backgroundColor: isSelected ? "#e3f2fd" : "transparent",
    };
  };

  const getWeekSaveTypeStyle = (item) => {
    const isApproved = item.savetype === "approve";
    return {
      padding: "4px 12px",
      borderRadius: "16px",
      fontSize: "12px",
      fontWeight: "500",
      border: `1px solid ${isApproved ? "#4caf50" : "#757575"}`,
      color: isApproved ? "#4caf50" : "#757575",
    };
  };

  return (
    <Panel
      title={aggrColumn || "Choice"}
      size="large"
      anchor="right"
      open={open}
      onClose={onClose}
    >
      <LoadingOverlay loader={loading}>
        <div
          style={{ height: "100%", display: "flex", flexDirection: "column" }}
        >
          <div style={{ padding: "16px 0", borderBottom: "1px solid #e0e0e0" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="body2" style={{ fontWeight: "bold" }}>
                Weeks
              </Typography>
              <Typography variant="body2" style={{ fontWeight: "bold" }}>
                Save type
              </Typography>
            </div>
          </div>

          <div style={{ flex: 1, overflow: "visible" }}>
            {weekLevelData && weekLevelData.length > 0 ? (
              <div>
                {weekLevelData.map((item, index) => (
                  <div
                    key={index}
                    onClick={() => handleWeekSelection(item)}
                    className={customClasses.weekRowItem}
                    style={getWeekRowItemStyle(item)}
                  >
                    <Typography variant="body2">{item.label}</Typography>
                    <div style={getWeekSaveTypeStyle(item)}>
                      {item.savetype === "approve" ? "Approved" : "Draft"}
                    </div>
                  </div>
                ))}

                {/* Info message */}
                <div className={customClasses.infoMessageContainer}>
                  <div className={customClasses.infoMessageIcon}>i</div>
                  <Typography variant="body2" style={{ color: "#1976d2" }}>
                    Select a target week to review recommendation
                  </Typography>
                </div>
              </div>
            ) : (
              <div style={{ padding: "20px 0", textAlign: "center" }}>
                <Typography variant="body1">
                  No week level data available.
                </Typography>
              </div>
            )}
          </div>

          <div className={customClasses.footerContainer}>
            <Button variant="outlined" color="primary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              disabled={!selectedWeek}
              onClick={handleReviewRecommendation}
            >
              👍 Review recommendation
            </Button>
          </div>
        </div>
      </LoadingOverlay>
    </Panel>
  );
};

export default PORebalanceSidePanelOnWeekLevel;
