import React, { useEffect, useMemo, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import type {
  StructuredDataResponse,
  ChartData,
  MetricData,
} from "../../types/chat.types";
import { IBStructuredTable } from "../Table/IBStructuredTable";
import { MarkdownRenderer } from "../../utils/markdownRenderer";


const HIGHCHARTS_SERIES_TYPES = ["column", "line", "bar", "area", "scatter"] as const;
const DEFAULT_COLORS = [
  "#4A90E2",
  "#2ECC71",
  "#F5A623",
  "#E74C3C",
  "#8E44AD"
];
type HighchartsSeriesType = (typeof HIGHCHARTS_SERIES_TYPES)[number];

type MetricTrend = "positive" | "negative" | "neutral";

interface ParsedMetricValue {
  prefix: string;
  sign: string;
  numericText: string;
  suffix: string;
  numericValue: number;
  decimals: number;
  hasThousandsSeparator: boolean;
}

function parseCitationMap(citationMap?: Record<string, string>): Record<string, string> {
  if (!citationMap) return {};
  return Object.entries(citationMap).reduce<Record<string, string>>((acc, [key, value]) => {
    if (typeof value !== "string" || !value.trim()) return acc;
    const normalizedKey = key.trim();
    if (!normalizedKey) return acc;
    acc[normalizedKey] = value.trim();
    return acc;
  }, {});
}

function replaceCitationTokensWithMarkdownLinks(
  text: string,
  citationMap: Record<string, string>
): string {
  // Supports both legacy [<1>] and current ||1|| citation token formats.
  const citationRegex = /\[<\s*(\d+)\s*>\]|\|\|\s*(\d+)\s*\|\|/g;
  return text.replace(citationRegex, (fullMatch, legacyCitationId, pipeCitationId) => {
    const citationId = String(legacyCitationId ?? pipeCitationId ?? "").trim();
    if (!citationId) return fullMatch;
    const citationUrl = citationMap[citationId];
    return citationUrl ? `[[${citationId}]](${citationUrl})` : fullMatch;
  });
}

function sortCitationEntries(a: [string, string], b: [string, string]): number {
  const aNum = Number(a[0]);
  const bNum = Number(b[0]);
  const aIsNum = Number.isFinite(aNum);
  const bIsNum = Number.isFinite(bNum);

  if (aIsNum && bIsNum) return aNum - bNum;
  if (aIsNum) return -1;
  if (bIsNum) return 1;
  return a[0].localeCompare(b[0]);
}

function getReferenceLabel(url: string): string {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname || "";
    const segment = pathname.split("/").filter(Boolean).pop();
    if (!segment) return url;
    return decodeURIComponent(segment);
  } catch {
    const withoutQuery = url.split("?")[0].split("#")[0];
    const segment = withoutQuery.split("/").filter(Boolean).pop();
    return segment || url;
  }
}

function normalizeType(type?: string): HighchartsSeriesType | "pie" {
  if (!type) return "column";

  const t = type.toLowerCase();

  if (t === "doughnut" || t === "donut") return "pie";

  // horizontal bars
  if (t === "horizontal-bar") return "bar";

  // vertical bars
  if (t === "bar") return "column";

  return t as HighchartsSeriesType;
}

function parseMetricValue(value: string): ParsedMetricValue | null {
  const match = value.match(/^(.*?)([+-]?)(\d[\d,]*\.?\d*)(.*)$/);
  if (!match) return null;

  const [, prefixRaw, sign, numericRaw, suffixRaw] = match;
  const normalized = numericRaw.replace(/,/g, "");
  const numericValue = Number.parseFloat(normalized);

  if (!Number.isFinite(numericValue)) return null;

  const decimals = (normalized.split(".")[1] ?? "").length;

  return {
    prefix: prefixRaw,
    sign,
    numericText: numericRaw,
    suffix: suffixRaw,
    numericValue,
    decimals,
    hasThousandsSeparator: numericRaw.includes(","),
  };
}

function getMetricTrend(metric: MetricData, parsed: ParsedMetricValue | null): MetricTrend {
  if (typeof metric.raw_value === "number") {
    if (metric.raw_value > 0) return "positive";
    if (metric.raw_value < 0) return "negative";
    return "neutral";
  }

  if (parsed?.sign === "+") return "positive";
  if (parsed?.sign === "-") return "negative";
  return "neutral";
}

function formatAnimatedMetricValue(parsed: ParsedMetricValue, animatedNumeric: number): string {
  const formatted = parsed.hasThousandsSeparator
    ? animatedNumeric.toLocaleString("en-US", {
      minimumFractionDigits: parsed.decimals,
      maximumFractionDigits: parsed.decimals,
    })
    : animatedNumeric.toFixed(parsed.decimals);

  return `${parsed.prefix}${parsed.sign}${formatted}${parsed.suffix}`;
}

function ChartBlock({ chart }: { chart: ChartData }) {
  const type = normalizeType(chart.type);

  const isPie = type === "pie";
  const isBar = type === "bar";        // horizontal bars
  const isColumn = type === "column";  // vertical bars

  const isStacked =
    chart.stacking === "normal" || chart.stacking === "percent";

  const options: Highcharts.Options = {
    chart: {
      type: type as HighchartsSeriesType,   // IMPORTANT
      backgroundColor: "transparent",
      animation: {
        duration: 760,
      },
      style: {
        fontFamily: "Open Sans, Manrope, sans-serif",
      },
    },

    title: {
      text: chart.title,
      style: {
        fontSize: "16px",
        fontWeight: "600",
        color: "#0D152C",
      },
    },

    xAxis: isPie
      ? undefined
      : {
        categories: chart.labels ?? undefined,
        title: chart.xAxisTitle ? { text: chart.xAxisTitle } : undefined,
        gridLineWidth: 0,
        lineColor: "#E9EBF2",
      },

    yAxis: isPie
      ? undefined
      : {
        title: chart.yAxisTitle ? { text: chart.yAxisTitle } : { text: undefined },
        gridLineColor: "#F1F3F8",
        labels: {
          style: { color: "#31416E", fontSize: "12px" },
          formatter: function (this: Highcharts.AxisLabelsFormatterContextObject): string {
            const v = typeof this.value === "number" ? this.value : Number(this.value);
            if (isNaN(v)) return String(this.value);
            const abs = Math.abs(v);
            if (abs >= 1e12) return (v / 1e12).toFixed(1).replace(/\.0$/, "") + "T";
            if (abs >= 1e9) return (v / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
            if (abs >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
            if (abs >= 1e3) return (v / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
            return String(v);
          }
        },
      },

    tooltip: {
      shared: false,
      borderRadius: 8,
      backgroundColor: "#fff",
      style: {
        fontSize: "12px"
      },
      ...(type === "scatter"
        ? {
          pointFormat: "<b>{series.name}</b><br/>X: {point.x}<br/>Y: {point.y}"
        }
        : chart.datasets.some(ds => ds.formatted_data?.length)
          ? {
            formatter: function (this: Highcharts.Point): string {
              const dsIndex = chart.datasets.findIndex(ds => ds.label === this.series?.name);
              const ds = dsIndex >= 0 ? chart.datasets[dsIndex] : undefined;
              const formatted = ds?.formatted_data?.[this.index];
              const displayVal = formatted ?? String(this.y);
              return `<b>${this.series.name}</b><br/>${this.category ?? this.name}: ${displayVal}`;
            }
          }
          : {}
      )
    },

    legend: {
      align: "center",
      verticalAlign: "top",
    },

    plotOptions: {
      ...(type === "scatter" && {
        scatter: {
          marker: {
            radius: 6,
            symbol: "circle",
            fillColor: DEFAULT_COLORS[0],
            lineWidth: 1,
            lineColor: "#ffffff"
          },
          dataLabels: {
            enabled: false
          }
        }
      }),
      ...(type === "line" && {
        column: {
          borderRadius: 4,
          groupPadding: 0.1,
          pointPadding: 0.05,
          dataLabels: { enabled: false },
        },
        line: {
          lineWidth: 3,

          marker: {
            enabled: true,
            symbol: "circle",
            radius: 7,
            fillColor: "#ffffff",
            lineWidth: 3,
            lineColor: undefined, // inherits series color
          },

          dataLabels: {
            enabled: true,
            align: "center",
            verticalAlign: "bottom",

            style: {
              fontWeight: "700",
              fontSize: "12px",
              color: "#0D152C"
            },
            ...(chart.datasets.some(ds => ds.formatted_data?.length) && {
              formatter: function (this: Highcharts.Point): string {
                const dsIndex = chart.datasets.findIndex(ds => ds.label === this.series?.name);
                const ds = dsIndex >= 0 ? chart.datasets[dsIndex] : undefined;
                return ds?.formatted_data?.[this.index] ?? String(this.y);
              }
            })
          }
        }
      }),
      ...(isBar && {
        bar: {
          borderRadius: 6,

          dataLabels: {
            enabled: true,
            align: "right",
            inside: false,
            style: {
              fontWeight: "700",
              fontSize: "12px",
              color: "#0D152C"
            },
            ...(chart.datasets.some(ds => ds.formatted_data?.length) && {
              formatter: function (this: Highcharts.Point): string {
                const dsIndex = chart.datasets.findIndex(ds => ds.label === this.series?.name);
                const ds = dsIndex >= 0 ? chart.datasets[dsIndex] : undefined;
                return ds?.formatted_data?.[this.index] ?? String(this.y);
              }
            })
          }
        }
      }),
      ...(isColumn && {
        column: {
          borderRadius: 6,

          dataLabels: {
            enabled: true,
            inside: false,
            style: {
              fontWeight: "700",
              fontSize: "12px",
              color: "#0D152C"
            },
            ...(chart.datasets.some(ds => ds.formatted_data?.length) && {
              formatter: function (this: Highcharts.Point): string {
                const dsIndex = chart.datasets.findIndex(ds => ds.label === this.series?.name);
                const ds = dsIndex >= 0 ? chart.datasets[dsIndex] : undefined;
                return ds?.formatted_data?.[this.index] ?? String(this.y);
              }
            })
          }
        }
      }),
      series: {
        stacking: isStacked ? chart.stacking : undefined,
        animation: {
          duration: 800,
        },
      },

      pie: {
        innerSize:
          chart.type?.toLowerCase() === "doughnut" ||
            chart.type?.toLowerCase() === "donut"
            ? "60%"
            : "0%",
        dataLabels: {
          enabled: true,
          format: "<b>{point.name}</b>: {point.percentage:.1f} %",
        },
      },
    },

    series: (
      isPie
        ? [
          {
            type: "pie",
            name: chart.datasets[0]?.label || "",
            data: (chart.labels ?? []).map((label, i) => {
              const dsColors = chart.datasets[0]?.backgroundColor;
              const baseColor = Array.isArray(dsColors)
                ? dsColors[i % dsColors.length]
                : (typeof dsColors === "string" ? dsColors : DEFAULT_COLORS[i % DEFAULT_COLORS.length]);

              return {
                name: label,
                y: chart.datasets[0]?.data[i],

                color: {
                  radialGradient: {
                    cx: 0.5,
                    cy: 0.5,
                    r: 0.8
                  },
                  stops: [
                    [0, Highcharts.color(baseColor).brighten(0.25).get()],
                    [1, baseColor]
                  ]
                }
              };
            })
          },
        ]
        : chart.datasets.flatMap((ds, i) => {
          const baseColor =
            (typeof ds.backgroundColor === "string" ? ds.backgroundColor : undefined)
            ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
          const isVertical = type === "column";

          if (type === "scatter") {
            return {
              name: ds.label,
              type: "scatter",
              data: ds.data,
              color: baseColor
            };
          }

          if (type === "line") {
            const isSingleLine = chart.datasets.length === 1;
            // Prefer borderColor (solid) over backgroundColor (may have low opacity)
            const lineColor = ds.borderColor
              ?? (typeof ds.backgroundColor === "string" && !ds.backgroundColor.startsWith("rgba") ? ds.backgroundColor : undefined)
              ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
            const lineSeries = {
              name: ds.label,
              data: ds.data as number[],
              type: "line" as const,
              color: lineColor,
              fillColor: {
                linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                stops: [
                  [0, Highcharts.color(lineColor).setOpacity(0.25).get()],
                  [1, Highcharts.color(lineColor).setOpacity(0).get()],
                ],
              },
            };

            if (isSingleLine) {
              // Add column (bar) series behind the line only for single-line charts
              return [
                {
                  name: ds.label,
                  data: ds.data as number[],
                  type: "column" as const,
                  color: {
                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                    stops: [
                      [0, Highcharts.color(lineColor).setOpacity(0.4).get()],
                      [1, Highcharts.color(lineColor).setOpacity(0.08).get()],
                    ],
                  },
                  showInLegend: false,
                  enableMouseTracking: false,
                },
                lineSeries,
              ];
            }

            return lineSeries;
          }

          return {
            name: ds.label,
            data: ds.data as number[],
            type: type as HighchartsSeriesType,

            color: {
              linearGradient: isVertical
                ? { x1: 0, y1: 0, x2: 0, y2: 1 } // vertical gradient
                : { x1: 0, y1: 0, x2: 1, y2: 0 }, // horizontal gradient

              stops: [
                [0, Highcharts.color(baseColor).brighten(0.2).get()],
                [1, baseColor],
              ],
            },
          };
        })
    ) as unknown as Highcharts.Options["series"],

    credits: {
      enabled: false,
    },
  };

  return (
    <div className="ib-chart-section">
      {chart.description && (
        <p className="ib-chart-description">{chart.description}</p>
      )}
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
}

const MetricCard = ({ metric }: { metric: MetricData }) => {
  const parsedValue = useMemo(() => parseMetricValue(metric.value), [metric.value]);
  const [animatedNumeric, setAnimatedNumeric] = useState<number | null>(
    parsedValue ? 0 : null
  );

  useEffect(() => {
    if (!parsedValue) {
      setAnimatedNumeric(null);
      return;
    }

    let frameId = 0;
    const durationMs = 900;
    const start = performance.now();
    const target = parsedValue.numericValue;

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedNumeric(target * eased);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    frameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameId);
  }, [parsedValue]);

  const trend = getMetricTrend(metric, parsedValue);
  const trendArrow = trend === "positive" ? "↑" : trend === "negative" ? "↓" : "";

  const renderedValue =
    parsedValue && animatedNumeric !== null
      ? formatAnimatedMetricValue(parsedValue, animatedNumeric)
      : metric.value;

  return (
    <div className={`ib-metric-carousel-card ib-metric-carousel-card--${trend}`}>
      <div className="ib-metric-icon-wrapper">
        <span className="ib-metric-icon">{metric.icon}</span>
      </div>

      <div className="ib-metric-body">
        <div className="ib-metric-title">{metric.label}</div>
        <div className={`ib-metric-value ib-metric-value--${trend}`}>
          {trendArrow && <span className="ib-metric-trend-arrow">{trendArrow}</span>}
          <span>{renderedValue}</span>
        </div>
      </div>
    </div>
  );
};

export interface StructuredDataViewProps {
  data: StructuredDataResponse;
}

export const StructuredDataView: React.FC<StructuredDataViewProps> = ({
  data,
}) => {
  const tables = (data.tables ?? []).filter((t) => t.relevant !== false);
  const charts = (data.charts ?? []).filter((c) => c.relevant !== false);
  const metrics = (data.metrics ?? []).filter((m) => m.relevant !== false);
  const summary = data.summary;
  const citationMap = parseCitationMap(data.citation_map);
  const citationEntries = Object.entries(citationMap).sort(sortCitationEntries);
  const sourceLinks = (data.source_links ?? []).filter(
    (source) => source && !citationEntries.some(([, url]) => url === source)
  );
  const hasReferences = citationEntries.length > 0 || sourceLinks.length > 0;
  const hasSummaryContent = Boolean(summary?.title || summary?.answer || summary?.key_insights?.length);
  const hasRenderableContent = hasSummaryContent || metrics.length > 0 || tables.length > 0 || charts.length > 0;
  const hasNoDataFromBackend = Boolean(
    summary?.data_availability &&
    summary.data_availability.requested_items.length > 0 &&
    summary.data_availability.found_items.length === 0
  );

  if (!hasRenderableContent || hasNoDataFromBackend) {
    return (
      <div className="ib-structured-data">
        <div className="ib-agent-empty-state" role="status" aria-live="polite">
          <h3 className="ib-agent-empty-state__title">No results found for this query</h3>
          <p className="ib-agent-empty-state__body">
            Try narrowing the date range, using a specific company name, or requesting a single metric first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="ib-structured-data">
      <div className="ib-agent-report">
        {summary && (
          <>
            <h2 className="ib-agent-answer-headline">
              {summary.title}
            </h2>

            {summary.answer && (
              <div className="ib-agent-summary-answer">
                <MarkdownRenderer
                  className="ib-agent-structured-markdown"
                  content={replaceCitationTokensWithMarkdownLinks(summary.answer, citationMap)}
                />
              </div>
            )}

            {summary.key_insights?.length > 0 && (
              <>
                <h3 className="ib-agent-section-title">Insights</h3>
                <ul className="ib-agent-insights-list">
                  {summary.key_insights.map((insight, i) => (
                    <li className="ib-agent-insight-item" key={i}>
                      <MarkdownRenderer
                        className="ib-agent-structured-markdown"
                        content={replaceCitationTokensWithMarkdownLinks(insight, citationMap)}
                      />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}

        {metrics.length > 0 && (
          <section className="ib-metrics-section">
            <div className="ib-metrics-carousel">
              {metrics.map((m, i) => (
                <MetricCard key={i} metric={m} />
              ))}
            </div>
          </section>
        )}

        {tables.length > 0 && (
          <IBStructuredTable
            tables={tables}
          />
        )}

        {charts.map((c, i) => (
          <ChartBlock key={i} chart={c} />
        ))}

        {hasReferences && (
          <>
            <h3 className="ib-agent-section-title">References</h3>
            <ol className="ib-agent-references-list">
              {citationEntries.map(([citationId, citationUrl]) => (
                <li className="ib-agent-reference-item" key={`ref-${citationId}`}>
                  <a
                    href={citationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ib-agent-reference-link"
                    title={`Open reference ${citationId}`}
                  >
                      <span className="ib-agent-reference-badge" aria-hidden>
                        {citationId}
                      </span>
                      <span>{getReferenceLabel(citationUrl)}</span>
                  </a>
                </li>
              ))}
              {sourceLinks.map((sourceUrl, i) => (
                <li
                  className="ib-agent-reference-item"
                  key={`source-${i}-${sourceUrl}`}
                >
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ib-agent-reference-link"
                    title={`Open source link ${i + 1}`}
                  >
                      <span className="ib-agent-reference-badge" aria-hidden>
                        {citationEntries.length + i + 1}
                      </span>
                      <span>{getReferenceLabel(sourceUrl)}</span>
                  </a>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </div>
  );
};
