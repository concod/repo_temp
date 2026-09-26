import { useState, useEffect } from "react";
import { makeStyles } from "@mui/styles";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { RadioButtonGroup } from "impact-ui-v3";

const useStyles = makeStyles(() => ({
  container: {
    display: "flex",
    flexDirection: "row",
    gap: "16px",
    backgroundColor: "#F8F9FB",
    borderRadius: "8px",
    padding: "16px",
    "& .orientation-row": {
      flexWrap: "nowrap",
      transform: "translateX(16px)",
    },
  },
  card: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    border: "2px solid #FFF",
    borderRadius: 8,
    padding: "8px 24px",
    gap: 12,
    flexGrow: 1,
  },
  leftSection: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",

    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: 500,
    color: "#31416E",
  },
  progressBar: {
    height: "8px",
    borderRadius: 8,
    backgroundColor: "#F0F0F0",
    overflow: "hidden",
    flex: ".8",
  },
  progressFill: {
    height: "100%",
    borderRadius: 8,
    transition: "width 0.4s ease",
  },
  value: {
    fontSize: 16,
    fontWeight: 800,
    color: "#1F2B4D",
  },
  progressSeparator: {
    borderLeft: "1px solid #D9DDE7",
    height: "40px",
  },
}));

const OrderProgressCard = ({ orderMetrics }) => {
  const [selectedOrderMetrics, setSelectedOrderMetrics] = useState({});
  const [options, setOptions] = useState([]);
  const classes = useStyles();

  console.log(orderMetrics);
  useEffect(() => {
    if (!Array.isArray(orderMetrics) || orderMetrics.length === 0) {
      setSelectedOrderMetrics({});
      setOptions([]);
      return;
    }

    setSelectedOrderMetrics(orderMetrics[0]);
    setOptions(
      orderMetrics.map((metric) => ({
        label: metric?.label,
        value: metric?.label?.toLowerCase(),
      }))
    );
  }, [orderMetrics]);

  const getPercentage = (value, total) => {
    return Math.min((value / total) * 100, 100);
  };
  const total = selectedOrderMetrics?.values?.reduce(
    (sum, item) => sum + item.value,
    0
  );

  const getBarColor = (label = "") => {
    const lowerLabel = label.toLowerCase();

    if (lowerLabel.includes("approved")) return "#7D9A32";
    if (lowerLabel.includes("pending")) return "#ED7955";
    return "#3B898D";
  };
  const getGradientColor = (label = "") => {
    const lowerLabel = label.toLowerCase();

    if (lowerLabel.includes("approved"))
      return "linear-gradient(87deg, #F5F9EC 1.53%, #FFF 30.33%)";

    if (lowerLabel.includes("pending"))
      return "linear-gradient(89deg,  #FDF0EC 14%, #FFF 35.47%)";

    return "linear-gradient(89deg,  #EDF7F8 0.75%, #FFF 36.25%)";
  };

  const handleRadioChange = (value) => {
    let selectedMetric = orderMetrics.find(
      (metric) => metric?.label?.toLowerCase() === value
    );
    setSelectedOrderMetrics(selectedMetric);
  };

  return (
    <div className={classes.container}>
      {selectedOrderMetrics.label && (
        <RadioButtonGroup
          name="order-progress-radio-group"
          onChange={(e) => handleRadioChange(e.target.value)}
          orientation="row"
          options={options}
          selectedOption={selectedOrderMetrics?.label?.toLowerCase()}
        />
      )}
      <div className={classes.progressSeparator} />
      <div style={{ display: "flex", gap: "16px", width: "100%" }}>
        {selectedOrderMetrics.values &&
          selectedOrderMetrics.values.map((metric, index) => (
            <Box
              className={classes.card}
              key={index}
              style={{ background: getGradientColor(metric.label) }}
            >
              <Box className={classes.leftSection}>
                <Typography className={classes.title}>
                  {metric.label}
                </Typography>

                <Box className={classes.progressBar}>
                  <Box
                    className={classes.progressFill}
                    style={{
                      width: `${getPercentage(metric.value, total)}%`,
                      backgroundColor: getBarColor(metric.label),
                    }}
                  />
                </Box>
              </Box>

              <Typography className={classes.value}>
                {metric.value.toLocaleString("en-US")}
              </Typography>
            </Box>
          ))}
      </div>
    </div>
  );
};

export default OrderProgressCard;
