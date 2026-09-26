import { LinearProgress } from "@mui/material";
import { Badge } from "impact-ui-v3";

export default function ProgressBar({ roundOffTo, params, color }) {
  const item = params?.colDef;
  const multiplier = item?.multiplier || item?.extra?.multiplier ? 1 : 100;
  const barValue = (Number(params?.value) * multiplier).toFixed(roundOffTo);
  const { rootElementColor, barColor, badgeColor } = color;
  return (
    isFinite(barValue) && (
      <div
        style={{ display: "flex", alignItems: "center", gap: 10, width: 175 }}
      >
        <LinearProgress
          variant="determinate"
          value={barValue}
          style={{ width: "50%", flexShrink: 0 }}
          sx={{
            "&.MuiLinearProgress-root": {
              flexGrow: 1,
              borderRadius: 4,
              height: 8,
              background: rootElementColor,
            },
            "& .MuiLinearProgress-bar": {
              borderRadius: 4,
              backgroundColor: barColor,
            },
          }}
        />
        <div style={{ minWidth: 40 }}>
          <Badge
            color={badgeColor}
            label={barValue + "%"}
            onClick={() => {}}
            size="small"
            variant="subtle"
          ></Badge>
        </div>
      </div>
    )
  );
}
