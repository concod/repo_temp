/**
 * OMS Select metrics: one KPI parent row; each view-config measure is a child.
 */

function normalizeMeasure(measure) {
  const name = measure?.name || measure?.value;
  if (!name) return null;
  return {
    ...measure,
    name,
    value: measure?.value ?? name,
    label: measure?.label || name,
  };
}

function resolveVersionEntry(version) {
  if (version && typeof version === "object") {
    return {
      name: version.name || version.value,
      label: version.label || version.name || version.value,
    };
  }
  return { name: String(version), label: String(version) };
}

export function groupOmsMeasuresForPivotPanel(rawMeasures = []) {
  const measures = (rawMeasures || []).map(normalizeMeasure).filter(Boolean);
  if (!measures.length) return [];

  return [
    {
      name: "kpis",
      label: "KPIs",
      value: "kpis",
      versions: measures.map((m) => ({ name: m.name, label: m.label })),
    },
  ];
}

export function resolveMeasureVersionName(version) {
  return resolveVersionEntry(version).name;
}

export function resolveMeasureVersionLabel(_family, version) {
  const entry = resolveVersionEntry(version);
  return entry.label || entry.name;
}

export function isMeasureVersionSelected(selectedIds, _family, version) {
  const versionName = resolveMeasureVersionName(version);
  return (selectedIds || []).some(
    (item) => item.name === versionName || item.version === versionName
  );
}

/** Keep one entry per BE kpi id (`name`). */
export function dedupeMeasureSelections(selectedIds = []) {
  const byName = new Map();
  for (const item of selectedIds || []) {
    const key = item?.name || item?.version;
    if (!key) continue;
    byName.set(key, item);
  }
  return Array.from(byName.values());
}

/** Normalise legacy saved-view measure entries to `{ name, version, label }`. */
export function normalizeSavedMeasureSelection(item, rawMeasures = []) {
  if (!item) return null;
  const flatMeasures = (rawMeasures || []).map(normalizeMeasure).filter(Boolean);
  const byName = new Map(flatMeasures.map((m) => [m.name, m]));

  let name = item.name || item.value;
  if (!name && item.version) {
    if (byName.has(item.version)) {
      name = item.version;
    } else {
      const legacyMatch = flatMeasures.find(
        (measure) =>
          item.version === `${measure.name}_${measure.name}` ||
          item.version.startsWith(`${measure.name}_`)
      );
      name = legacyMatch?.name ?? item.version;
    }
  }
  if (!name || !byName.has(name)) return null;

  const measure = byName.get(name);
  const label =
    item.label && !String(item.label).includes(" : ")
      ? item.label
      : measure.label || name;

  return {
    label,
    version: name,
    name,
    kpiLabel: "KPIs",
    family: "kpis",
  };
}
