import * as Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { getLineChartOptions, type LineChartConfig } from "../../../utils/chartOptions";

interface LineChartProps {
    config: LineChartConfig;
    className?: string;
}

/**
 * Reusable Line Chart Component
 * Uses optimized chart options from chartOptions utility
 */
export const LineChart = ({ config, className = "chart-container" }: LineChartProps) => {
    const options = getLineChartOptions(config);

    return (
        <div className={className}>
            <HighchartsReact highcharts={Highcharts} options={options} />
        </div>
    );
};

