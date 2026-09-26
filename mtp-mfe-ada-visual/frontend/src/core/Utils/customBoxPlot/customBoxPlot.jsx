import Boxplot, { computeBoxplotStats } from "react-boxplot";
import { Tooltip } from "impact-ui-v3";

export default function CustomBoxPlot({ params }) {
    const values = params.value?.map((v) => Number(v)) || [];
    if (!values.length) return null;
    const boxStats = computeBoxplotStats(values);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    
    // Create custom box plot stats with whiskers extending to min/max
    // and no outliers (all data points are part of normal distribution)
    const customBoxStats = {
        ...boxStats,
        whiskerLow: minValue,    // Lower whisker extends to minimum value
        whiskerHigh: maxValue,   // Upper whisker extends to maximum value
        outliers: []             // No outliers - all data points are normal
    };
        
    return (
        <Tooltip
            variant="tertiary"
            title={
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        fontSize: "10px",
                        lineHeight: "14px"
                    }}
                >
                    <div>
                        <strong>Min - </strong> {minValue}
                    </div>
                    <div style={{ display: "flex", gap: "5px" }}>
                        <span><strong>25%ile - </strong> {boxStats.quartile1}</span>
                        <span><strong>Median - </strong> {boxStats.quartile2}</span>
                    </div>
                    <div style={{ display: "flex", gap: "5px" }}>
                        <span><strong>75%ile - </strong> {boxStats.quartile3}</span>
                        <span><strong>Max - </strong> {maxValue}</span>
                    </div>
                </div>
            }
        >
            <div style={{ paddingTop: "5px" }}>
                <Boxplot
                    width={160}
                    height={25}
                    orientation="horizontal"
                    min={customBoxStats.whiskerLow}                    
                    max={customBoxStats.whiskerHigh}                    
                    stats={customBoxStats}           
                    medianStyle={{ stroke: "red" }}  
                    boxStyle={{
                        fill: "#B3BDF8",             
                    }}
                    whiskerStyle={{ stroke: "#a3a3a3" }}
                />
            </div>
        </Tooltip>
    );
}
