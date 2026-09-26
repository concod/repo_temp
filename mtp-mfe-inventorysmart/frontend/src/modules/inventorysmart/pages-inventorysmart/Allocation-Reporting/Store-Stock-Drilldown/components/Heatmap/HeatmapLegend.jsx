import React from "react";
import { makeStyles } from "@mui/styles";

const useStyles = makeStyles(() => ({
  legendContainer: {
    width: "60%",
    margin: "24px auto",
    maxWidth: "100%"
  },
  legendBar: {
    width: "100%",
    height: 15,
    marginBottom: 8,
    position: "relative"
  },
  markingsContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    position: "relative",
    top: -8,
    width: "100%",
    gap: 4
  },
  marking:{
    textAlign: "center",
    flex: 1,
    minWidth: 24,
    fontSize: 10,
    color: "#444",
    position: "relative",
  },
  markingTick: {
    height: 6,
    width: 2,
    background: "#bbb",
    margin: "0 auto 2px auto"
  }
}))

export default function HeatmapLegend({min, max, steps, color}){
  const classes = useStyles();
  const ticks = Array.from({ length: steps + 1 }, (_, i) =>
    min + ((max - min) / steps) * i
  );

  return (
    <div className={classes.legendContainer}>
      <div
        className={classes.legendBar}
        style={{background: `linear-gradient(to right, ${color}1A, ${color}FF)`}}
      />
      <div className={classes.markingsContainer}>
        {ticks.map((tick, i) => (
          <div
            key={i}
            className={classes.marking}
            style={{
              transform:
                i === 0
                  ? "translateX(-50%)"
                  : i === ticks.length - 1
                  ? "translateX(50%)"
                  : "translateX(0%)",
            }}
          >
            <div className={classes.markingTick}/>
            {tick.toLocaleString()}
          </div>
        ))}
      </div>
    </div>
  );
};
