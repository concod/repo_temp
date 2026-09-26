import Boxplot, { computeBoxplotStats } from "react-boxplot";
import { Tooltip } from "impact-ui-v3";
import colours from "core/Styles/colours";

export default function CustomBoxPlot({ params }) {
    const values = params.value?.map((v) => Number(v)) || [];
    if (!values.length) return null;
    const boxStats = computeBoxplotStats(values);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    // When all values are equal (e.g. every value is 0), min === max collapses the
    // box and whiskers to zero width and react-boxplot renders nothing. Drawing a
    // padded box would falsely imply a spread, so render a plain flat line instead
    // to honestly represent "no variation".
    const chart = minValue === maxValue ? (
        <div style={{ width: 160, height: 25, display: "flex", alignItems: "center" }}>
            <div style={{ width: "100%", height: 1, background: colours.silverChalice }} />
        </div>
    ) : (
        <Boxplot
            width={160}
            height={25}
            orientation="horizontal"
            min={minValue}
            max={maxValue}
            stats={{
                ...boxStats,
                whiskerLow: minValue,    // Lower whisker extends to minimum value
                whiskerHigh: maxValue,   // Upper whisker extends to maximum value
                outliers: []             // No outliers - all data points are normal
            }}
            medianStyle={{ stroke: colours.lightRed }}
            boxStyle={{
                fill: colours.perano,
            }}
            whiskerStyle={{ stroke: colours.silverChalice }}
        />
    );

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
                {chart}
            </div>
        </Tooltip>
    );
}
