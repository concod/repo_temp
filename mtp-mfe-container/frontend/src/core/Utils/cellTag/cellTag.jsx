import { Badge, Tooltip } from "impact-ui-v3"

export default function CellTag({ params }) {
    if (!params || typeof params.value !== "string") return null;

    const [data, badgeValue] = params.value.split(",");
    const label = params.colDef?.extra?.badgeLabel || "Value";

    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "15px" }}>
            <Tooltip title={`${label}: ${badgeValue}`} variant="tertiary">
                <span>
                    <Badge
                        color="default"
                        label={badgeValue}
                        onClick={() => { }}
                        size="default"
                        variant="subtle"
                    />
                </span>
            </Tooltip>
            <p style={{ fontWeight: 500, margin: 0 }}>{data}</p>
        </div>
    );
}