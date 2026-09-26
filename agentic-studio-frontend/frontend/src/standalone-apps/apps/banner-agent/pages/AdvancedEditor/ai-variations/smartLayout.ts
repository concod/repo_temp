import type { SmartLayoutFrame } from "./types";

interface LayoutInput {
    id: string;
    type: "image" | "text";
    width: number;
    height: number;
    visualWeight: number;
}

interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function splitGrid(area: Rect, count: number, columns: number, gap: number): Rect[] {
    const rows = Math.ceil(count / columns);
    const totalGapX = gap * Math.max(columns - 1, 0);
    const totalGapY = gap * Math.max(rows - 1, 0);
    const cellWidth = (area.width - totalGapX) / columns;
    const cellHeight = (area.height - totalGapY) / rows;

    const boxes: Rect[] = [];
    for (let index = 0; index < count; index += 1) {
        const row = Math.floor(index / columns);
        const col = index % columns;
        boxes.push({
            x: area.x + col * (cellWidth + gap),
            y: area.y + row * (cellHeight + gap),
            width: cellWidth,
            height: cellHeight,
        });
    }

    return boxes;
}

function createPartition(area: Rect, count: number, canvasRatio: number, gap: number): Rect[] {
    if (count <= 1) {
        return [area];
    }

    if (canvasRatio >= 2.6) {
        return splitGrid(area, count, count, gap);
    }

    if (canvasRatio <= 0.52) {
        return splitGrid(area, count, 1, gap);
    }

    if (count === 2) {
        if (canvasRatio >= 1) {
            const width = (area.width - gap) / 2;
            return [
                { x: area.x, y: area.y, width, height: area.height },
                { x: area.x + width + gap, y: area.y, width, height: area.height },
            ];
        }

        const height = (area.height - gap) / 2;
        return [
            { x: area.x, y: area.y, width: area.width, height },
            { x: area.x, y: area.y + height + gap, width: area.width, height },
        ];
    }

    if (count === 3) {
        if (canvasRatio >= 1) {
            const leadWidth = area.width * 0.56;
            const trailWidth = area.width - leadWidth - gap;
            const trailHeight = (area.height - gap) / 2;

            return [
                { x: area.x, y: area.y, width: leadWidth, height: area.height },
                { x: area.x + leadWidth + gap, y: area.y, width: trailWidth, height: trailHeight },
                { x: area.x + leadWidth + gap, y: area.y + trailHeight + gap, width: trailWidth, height: trailHeight },
            ];
        }

        const leadHeight = area.height * 0.56;
        const trailHeight = area.height - leadHeight - gap;
        const trailWidth = (area.width - gap) / 2;

        return [
            { x: area.x, y: area.y, width: area.width, height: leadHeight },
            { x: area.x, y: area.y + leadHeight + gap, width: trailWidth, height: trailHeight },
            { x: area.x + trailWidth + gap, y: area.y + leadHeight + gap, width: trailWidth, height: trailHeight },
        ];
    }

    const suggestedColumns = clamp(Math.round(Math.sqrt(count * canvasRatio)), 1, count);
    return splitGrid(area, count, suggestedColumns, gap);
}

export function calculateSmartLayout(
    items: LayoutInput[],
    canvasWidth: number,
    canvasHeight: number
): SmartLayoutFrame[] {
    if (!items.length || canvasWidth <= 0 || canvasHeight <= 0) {
        return [];
    }

    const padding = Math.max(10, Math.round(Math.min(canvasWidth, canvasHeight) * 0.04));
    const gap = Math.max(8, Math.round(Math.min(canvasWidth, canvasHeight) * 0.02));
    const inner: Rect = {
        x: padding,
        y: padding,
        width: Math.max(20, canvasWidth - padding * 2),
        height: Math.max(20, canvasHeight - padding * 2),
    };

    const sorted = [...items].sort((left, right) => right.visualWeight - left.visualWeight);
    const cells = createPartition(inner, sorted.length, canvasWidth / canvasHeight, gap);

    return sorted.map((item, index) => {
        const cell = cells[index] ?? inner;
        const fitScale = Math.min(cell.width / item.width, cell.height / item.height) * 0.94;
        const scale = item.type === "text"
            ? clamp(fitScale, 0.7, 2)
            : clamp(fitScale, 0.15, 4);

        const width = item.width * scale;
        const height = item.height * scale;

        return {
            id: item.id,
            type: item.type,
            x: cell.x + (cell.width - width) / 2,
            y: cell.y + (cell.height - height) / 2,
            width,
            height,
            scale,
        };
    });
}
