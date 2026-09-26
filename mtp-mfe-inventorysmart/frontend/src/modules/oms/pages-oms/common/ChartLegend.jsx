import React from "react";
import { makeStyles } from "@mui/styles";

const LINE_TYPES = ["line", "spline", "areaspline"];

const useStyles = makeStyles((theme) => ({
  legend: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing(1.5),
    padding: theme.spacing(1, 1.5),
    marginTop: theme.spacing(0.5),
  },
  legendItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    fontWeight: 400,
    color: theme.palette.text.secondary,
    whiteSpace: "nowrap",
  },
  markerSquare: {
    width: 12,
    height: 12,
    borderRadius: 3,
    flexShrink: 0,
  },
  markerLine: {
    width: 14,
    height: 3,
    borderRadius: 2,
    flexShrink: 0,
  },
}));

const ChartLegend = ({ seriesData = [] }) => {
  const classes = useStyles();

  const items = (Array.isArray(seriesData) ? seriesData : []).filter(
    (series) => series?.showInLegend !== false && series?.name
  );

  if (!items.length) {
    return null;
  }

  return (
    <div className={classes.legend}>
      {items.map((series, index) => {
        const color = series?.color || "#9AA8D0";
        const isLine = LINE_TYPES.includes(series?.type);

        return (
          <span
            key={`${series?.name}-${index}`}
            className={classes.legendItem}
          >
            <span
              className={isLine ? classes.markerLine : classes.markerSquare}
              style={{ backgroundColor: color }}
            />
            {series.name}
          </span>
        );
      })}
    </div>
  );
};

export default ChartLegend;
