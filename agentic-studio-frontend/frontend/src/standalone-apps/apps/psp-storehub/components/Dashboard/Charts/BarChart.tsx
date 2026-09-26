import * as Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { getBarChartOptions, type BarChartConfig } from "../../../utils/chartOptions";

interface BarChartProps {
    config: BarChartConfig;
    className?: string;
    options?: Partial<Highcharts.Options>;
}

/**
 * Reusable Bar Chart Component
 * Uses optimized chart options from chartOptions utility
 */
export const BarChart = ({ config, className = "chart-container", options: additionalOptions }: BarChartProps) => {
    const options = getBarChartOptions(config);
    const mergedOptions = additionalOptions ? { ...options, ...additionalOptions } : options;

    return (
        <div className={className}>
            <HighchartsReact highcharts={Highcharts} options={mergedOptions} />
        </div>
    );
};

