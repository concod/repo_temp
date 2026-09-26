import * as Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import HC_more from 'highcharts/highcharts-more';

// Normalize for ESM/CJS builds
const HighchartsMore = (HC_more as any).default || HC_more;
HighchartsMore(Highcharts);

interface BubbleChartProps {
    data: [number, number, number | string][] | { x: number; y: number; z?: number; name?: string }[]; // Support string in z position
    className?: string;
    options?: Partial<Highcharts.Options>;
}

/**
 * 3D Bubble Chart Component
 * Uses Highcharts with radial gradient fill matching the design system
 */
export const BubbleChart = ({ 
    data, 
    className = "chart-container",
    options: additionalOptions 
}: BubbleChartProps) => {
    const defaultOptions: Highcharts.Options = {
        chart: {
            type: 'bubble',
            plotBorderWidth: 1,
            backgroundColor: 'transparent',
            spacingTop: 10,
            spacingRight: 10,
            spacingBottom: 10,
            spacingLeft: 10,
            zoomType: 'xy',
        } as Highcharts.ChartOptions & { zoomType?: 'xy' },
        title: {
            text: undefined
        },
        credits: {
            enabled: false
        },
        legend: {
            enabled: false
        },
        xAxis: {
            gridLineWidth: 1,
            accessibility: {
                rangeDescription: 'Range: 0 to 100.'
            }
        },
        yAxis: {
            startOnTick: false,
            endOnTick: false,
            accessibility: {
                rangeDescription: 'Range: 0 to 100.'
            }
        },
        plotOptions: {
            bubble: {
                minSize: 10,
                maxSize: 10
            }
        },
        series: [{
            type: 'bubble',
            data: data,
            marker: {
                fillColor: {
                    radialGradient: { cx: 0.4, cy: 0.3, r: 0.7 },
                    stops: [
                        [0, '#C1EDAB'], // Light green (start)
                        [1, '#1C9448']  // Dark green (end)
                    ]
                },
                fillOpacity: 0.6,
                lineColor: 'rgba(102, 102, 102, 0.07)',
                lineWidth: 0.3
            }
        }],
        tooltip: {
            enabled: true,
            formatter: function(this: any) {
                const point = this.point as any;
                const netSales = point.x?.toLocaleString('en-US', { 
                    style: 'currency', 
                    currency: 'USD',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2 
                }) ?? point.x;
                const salesComp = point.y;
                const storeName = point.name || point.z;
                
                return `<b>Store Name:</b> ${storeName}<br/><b>Net Sales:</b> ${netSales}<br/><b>Sales Comp:</b> ${salesComp}%`;
            }
        }
    };

    const mergedOptions = additionalOptions 
        ? { ...defaultOptions, ...additionalOptions } 
        : defaultOptions;

    return (
        <div className={className} style={{ width: '100%', height: '100%', minHeight: 0 }}>
            <HighchartsReact 
                highcharts={Highcharts} 
                options={mergedOptions}
                containerProps={{ style: { width: '100%', height: '100%' } }}
            />
        </div>
    );
};

