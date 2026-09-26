import Charts from "./index";
import {
  barChartFlatJson,
  bubbleChartFlatJson,
  pieChartFlatJson,
  donutChartFlatJson,
  barLineChartFlatJson,
  doubleLineChartFlatJson,
  simpleLineChartFlatJson,
  waterfallChartFlatJson,
} from "./constants";

const RenderHighchart = (props) => {
  return (
    <>
      <h2>Render High Charts</h2>
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          marginBottom: "20px",
        }}
      >
        {/* Render bar chart */}
        <Charts options={barChartFlatJson} />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          marginBottom: "20px",
        }}
      >
        {/* Render pie chart */}
        <Charts options={pieChartFlatJson} />
        {/* Render bubble chart */}
        <Charts options={bubbleChartFlatJson} />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          marginBottom: "20px",
        }}
      >
        {/* Render line (double line) chart */}
        <Charts options={doubleLineChartFlatJson} />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          marginBottom: "20px",
        }}
      >
        {/* Render line chart */}
        <Charts options={simpleLineChartFlatJson} />
        {/* Render line waterfall chart */}
        <Charts options={waterfallChartFlatJson} />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          marginBottom: "20px",
        }}
      >
        {/* Render donut chart */}
        <Charts options={donutChartFlatJson} />
        {/* Render barLine chart */}
        <Charts options={barLineChartFlatJson} />
      </div>
    </>
  );
};
export default RenderHighchart;
