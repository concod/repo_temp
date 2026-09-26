import * as Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { getColumnChartOptions, type ColumnChartConfig } from "../../../utils/chartOptions";

interface ColumnChartProps {
    config: ColumnChartConfig;
    className?: string;
}

/**
 * Reusable Column Chart Component
 * Uses optimized chart options from chartOptions utility
 */
export const ColumnChart = ({ config, className = "chart-container" }: ColumnChartProps) => {
    const options = getColumnChartOptions(config);

    return (
        <div className={className}>
            <HighchartsReact highcharts={Highcharts} options={options} />
        </div>
    );
};

