import { useCallback, useMemo, useState } from "react";
import {
  areChartInfoEqual,
  extractChartInfo,
} from "./eventGridUtils";

export const useEventGridChartInfo = (isEnabled) => {
  const [chartInfo, setChartInfo] = useState(null);

  const updateChartInfo = useCallback(
    (chart) => {
      if (!isEnabled || !chart) return;

      const nextInfo = extractChartInfo(chart);
      setChartInfo((prev) =>
        areChartInfoEqual(prev, nextInfo) ? prev : nextInfo
      );
    },
    [isEnabled]
  );

  const chartOptions = useMemo(() => {
    if (!isEnabled) return {};

    return {
      events: {
        load: function handleChartLoad() {
          updateChartInfo(this);
        },
        redraw: function handleChartRedraw() {
          updateChartInfo(this);
        },
      },
    };
  }, [isEnabled, updateChartInfo]);

  return { chartInfo, chartOptions };
};
