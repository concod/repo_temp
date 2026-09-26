import React, { useMemo } from "react";
import { HeatMapGrid } from "react-grid-heatmap";
import HeatmapLegend from "./HeatmapLegend.jsx";
import { groupBy, chunk, sortBy } from "lodash";
import { Tooltip, Badge } from "impact-ui-v3";
import { makeStyles } from "@mui/styles";

const useStyles = makeStyles((theme) => ({
  heatmapContainer: {
    position: "relative",
    overflowX: "auto",
    marginTop: "20px",
  },
  gridContainer: {
    marginBottom: "20px"
  },
  badgeContainer: {
    marginBottom: "5px" 
  },
  tooltipText: {
    display: "flex",
    flexDirection: "column",
    fontSize: "12px",
  },
  gridCell: {
    width: "100%",
    height: "20px",
    display: "block",
    cursor: "pointer",
  }
}))

export default function Heatmap(props) {
  const {
    numCols,
    tooltipDetails,
    data: heatmapData,
    viewBy,
    selectedStoreGrade,
    selectedRegion,
    cellColor = "#0c60a0",
    legendColor
  } = props;
  const classes = useStyles();

  //applying Store Grade and Region filters
  const filteredHeatmapData = useMemo(() => {
    let rows = Array.isArray(heatmapData) ? heatmapData : [];

    //getting values for selected store grades
    const storeGradeList = Array.isArray(selectedStoreGrade)
      ? selectedStoreGrade.map((storeGrade) => storeGrade?.value)
      : [];

     //getting values for selected regions
    const regionList = Array.isArray(selectedRegion)
      ? selectedRegion.map((region) => region?.value)
      : [];

    //filtering the data as per selected store grade and regions
    if (storeGradeList.length) {
      rows = rows.filter((d) => storeGradeList.includes(d?.store_grade));
    }
    if (regionList.length) {
      rows = rows.filter((d) => regionList.includes(d?.region));
    }
    return rows;
  }, [heatmapData, selectedStoreGrade, selectedRegion, viewBy]);

  // transforming heatmap data format into 2D array
  const transformedData2D = useMemo(() => {
    const grouped = groupBy(filteredHeatmapData, viewBy);
    const entries = Object.entries(grouped);
    const sortedEntries = sortBy(entries, ([groupKey]) =>
      (groupKey || "").toString().trim().toLowerCase()
    );
    return sortedEntries.map(([groupKey, group]) => {
      const remainder = group.length % numCols;
      const padLength = remainder === 0 ? 0 : numCols - remainder;
      const padded = [...group, ...Array(padLength).fill(null)];
      const metadata = chunk(padded, numCols);
      const chunks = metadata.map((row) =>
        row.map((cell) => (cell ? cell.total_store_oh : null))
      );
      return { groupKey, chunks, metadata };
    });
  }, [filteredHeatmapData, numCols, viewBy]);

  // used to show markings in heatmap legend
  const [minUnits, maxUnits] = useMemo(() => {
    const units = filteredHeatmapData.map((item) => item.total_store_oh)
    if (units.length === 0) return [0, 1];
    const min = Math.min(...units);
    const max = Math.max(...units);
    return [min, max];
  }, [filteredHeatmapData]);

  return (
    <>
    <div className={classes.heatmapContainer}>
      {transformedData2D?.map((item) => {
        return (
          <div key={item.groupKey} className={classes.gridContainer}>
            <div className={classes.badgeContainer}>
              <Badge
                label={item.groupKey}
                size="small"
                variant="subtle"
                color="default"
              />
            </div>
            <HeatMapGrid
              data={item.chunks}
              cellRender={(x, y, _value) => {
                const meta = item?.metadata[x][y];
                if (!meta) return;
                return (
                  <Tooltip
                    title={
                      <div className={classes.tooltipText}>
                        {Object.entries(tooltipDetails).map(([key, value]) => (
                          <div key={key}>{`${key}: ${meta[value]}`}</div>
                        ))}
                      </div>
                    }
                    variant="tertiary"
                  >
                    <div
                      title=""
                      className={classes.gridCell}
                    />
                  </Tooltip>
                );
              }}
              cellStyle={(x, y) => {
                const data = item.chunks;
                const value = data[x][y];
                const customRatio =
                  maxUnits === minUnits
                    ? 1
                    : (value - minUnits) / (maxUnits - minUnits);
                return {
                  fontSize: ".5rem",
                  width: "20px",
                  height: "20px",
                  background: cellColor,
                  opacity: customRatio,
                };
              }}
            />
          </div>
        );
      })}
    </div>

      {props.showLegend && (
        <HeatmapLegend
          min={minUnits}
          max={maxUnits}
          steps={1}
          color={legendColor || cellColor}
        />
      )}
      </>
  );
}
