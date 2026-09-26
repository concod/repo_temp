import * as Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

interface ChartProps {
    options: Highcharts.Options;
    className?: string;
}

export const Chart = ({ options, className = "chart-container" }: ChartProps) => {
    return (
        <div className={className}>
            <HighchartsReact highcharts={Highcharts} options={options} />
        </div>
    );
};

