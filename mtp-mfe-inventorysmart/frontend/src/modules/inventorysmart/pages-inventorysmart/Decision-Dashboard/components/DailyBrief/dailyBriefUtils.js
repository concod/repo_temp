import moment from "moment";

/**
 * Maps a raw daily-brief bucket id to a presentation config.
 * Icons are resolved to MUI icon components in the component layer.
 * @type {Record<string, { icon: string, subtitle: string }>}
 */
export const BUCKET_META = {
  system_health: { icon: "database", subtitle: "Overnight ingestion and job health — start the day with full trust in the data." },
  action_queue: { icon: "bolt", subtitle: "High-priority items awaiting your release before today's SLA cutoffs." },
  reserve_unlock: { icon: "lock", subtitle: "Reserves and locks that can be freed up to replenish the network." },
  master_data: { icon: "settings", subtitle: "Configuration gaps that are bypassing items in automated runs." },
  lifecycle: { icon: "schedule", subtitle: "Time-sensitive rules and profiles that need review soon." },
  exceptions: { icon: "warning", subtitle: "Top drivers of stock-out and excess risk across the network." },
  performance: { icon: "insights", subtitle: "How yesterday's allocation run performed." },
  collaboration: { icon: "people", subtitle: "Platform activity and things that mention you." },
};

/**
 * bucket-level status -> theme tone
 * @type {Record<string, string>}
 */
export const STATUS_TONE = {
  ok: "success",
  attention: "warning",
  critical: "error",
};

/**
 * item-level severity -> theme tone
 * @type {Record<string, string>}
 */
export const SEVERITY_TONE = {
  ok: "success",
  info: "info",
  warning: "warning",
  critical: "error",
};

/**
 * Derives a friendly greeting name from the logged-in user's email.
 * e.g. "sudipta.pradhan@impactanalytics.co" -> "Sudipta". When the first name
 * is very short (3 chars or fewer), the last name is appended for clarity,
 * e.g. "anu.prakash@..." -> "Anu Prakash".
 * @param {string} [email]
 */
export const getGreetingName = (email = "") => {
  const local = String(email).split("@")[0];
  if (!local) return "";
  const cap = (/** @type {string} */ s) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";
  const parts = local.split(/[._-]/).filter(Boolean);
  const first = cap(parts[0]);
  if (!first) return "";
  if (first.length <= 3 && parts[1]) return `${first} ${cap(parts[1])}`;
  return first;
};

/** Time-of-day greeting used in the hero banner. */
export const getSalutation = (date = new Date()) => {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

/**
 * Builds the "at a glance" stat cards. Prefers an explicit `response.glance`
 * (domain-specific headline metrics) and falls back to the aggregate stats.
 * @param {any} response
 */
const buildGlance = (response = {}) => {
  if (Array.isArray(response.glance) && response.glance.length) {
    return response.glance.map((/** @type {any} */ stat, /** @type {number} */ i) => ({
      key: stat.key || stat.label || `glance-${i}`,
      label: stat.label,
      count: stat.count,
      tone: stat.tone || "info",
    }));
  }
  const stats = response.stats || {};
  return [
    { key: "total_items", label: "Total Items", count: stats.total_items ?? 0, tone: "info" },
    { key: "attention", label: "Needs Attention", count: stats.attention ?? 0, tone: "warning" },
    { key: "critical", label: "Critical", count: stats.critical ?? 0, tone: "error" },
    { key: "done", label: "Resolved", count: stats.done ?? 0, tone: "success" },
  ];
};

/**
 * Maps a single raw item into a bullet view-model row.
 * @param {any} item
 * @param {number} index
 */
const toBullet = (item, index) => ({
  id: item.item_id ?? item.id ?? `item-${index}`,
  lead: item.lead || item.title,
  line: item.line || item.detail,
  // Backends send a status via `severity`/`triage` rather than an explicit
  // label; surface a "DONE" badge for healthy status rows.
  tag: item.tag || item.status_label || (item.severity === "ok" ? "DONE" : ""),
  count: item.count,
  urgent: item.urgent ?? ["critical", "warning"].includes(item.severity),
  tone: SEVERITY_TONE[item.severity] || item.tone || "info",
  deepLink: item.deep_link || item.deepLink,
});

/**
 * Formats a KPI count for display: compact (e.g. "84.6K") for large values,
 * comma-grouped otherwise. Non-numeric values pass through.
 * @param {any} count
 */
const formatKpiValue = (count) => {
  if (count == null || count === "") return "—";
  const n = Number(count);
  if (Number.isNaN(n)) return String(count);
  if (Math.abs(n) >= 10000) {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
  }
  return n.toLocaleString("en-US");
};

/**
 * Maps a raw item into a KPI card view-model (headline value + label).
 * @param {any} item
 * @param {number} index
 */
const toKpi = (item, index) => ({
  key: item.item_id ?? item.id ?? `kpi-${index}`,
  value: item.detail ?? formatKpiValue(item.count),
  label: item.title || item.label,
  tone: SEVERITY_TONE[item.severity] || item.tone || "info",
});

/**
 * Normalises a bucket's content into groups. Backends that already send
 * `groups` (optionally KPI groups) are passed through; the common flat
 * `items[]` shape is wrapped in a single unlabelled bullet group.
 * @param {any} bucket
 */
const toGroups = (bucket) => {
  if (Array.isArray(bucket.groups) && bucket.groups.length) {
    return bucket.groups.map((/** @type {any} */ group) => {
      if (group.kind === "kpi") {
        return {
          label: group.label || "",
          kind: "kpi",
          items: (group.items || []).map((/** @type {any} */ kpi) => ({
            value: kpi.value,
            label: kpi.label,
            tone: kpi.tone || "info",
          })),
        };
      }
      return {
        label: group.label || "",
        kind: "bullets",
        items: (group.items || []).map(toBullet),
      };
    });
  }
  const bulletItems = (bucket.items || []).map(toBullet);

  // Buckets that carry a nested `yesterdays_allocation_run` (e.g. system_health)
  // render a labelled status group followed by a KPI card group.
  const allocationRun = bucket.yesterdays_allocation_run;
  if (allocationRun) {
    const groups = [
      { label: "System & Data Health", kind: "bullets", items: bulletItems },
    ];
    const kpiItems = (allocationRun.items || []).map(toKpi);
    if (kpiItems.length) {
      groups.push({
        label: allocationRun.label || "Yesterday's Allocation Run",
        kind: "kpi",
        items: kpiItems,
      });
    }
    return groups;
  }

  return [{ label: "", kind: "bullets", items: bulletItems }];
};

/**
 * Transforms the raw daily-brief API response into a view model the UI renders.
 * Keeping this pure means swapping the mock for a live response is a no-op here.
 * @param {any} response
 */
export const transformDailyBrief = (response) => {
  if (!response) return null;

  const buckets = (response.buckets || []).map((/** @type {any} */ bucket) => {
    const meta = BUCKET_META[bucket.id] || {};
    return {
      id: bucket.id,
      title: bucket.label || bucket.title,
      subtitle: bucket.subtitle || meta.subtitle || "",
      icon: bucket.icon || meta.icon || "insights",
      tone: STATUS_TONE[bucket.status] || bucket.tone || "info",
      note: bucket.note || "",
      groups: toGroups(bucket),
    };
  });

  return {
    date: response.date ? moment(response.date).format("dddd, MMM D") : "",
    summary: response.summary || "",
    glance: buildGlance(response),
    buckets,
  };
};

/**
 * Writes `prompt` into the platform "Ask Iris" chatbot composer once it renders.
 *
 * The chatbot (external `impact-chatbot` package) keeps its input in internal
 * React state with no injection API, so we set the value on its controlled
 * `<textarea>` via the native value setter and dispatch a bubbling `input`
 * event — the shape React listens for — so the bot's own `onChange` updates its
 * state. The composer only mounts after the modal opens, so we poll briefly.
 *
 * @param {string} prompt
 * @param {{ selector?: string, retries?: number, interval?: number }} [options]
 */
export const prefillIrisAgentPrompt = (prompt, options = {}) => {
  if (!prompt || typeof document === "undefined") return;
  const {
    selector = ".chatbot-modal-wrapper .chat-textarea",
    retries = 40,
    interval = 100,
  } = options;

  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value"
  )?.set;

  let attempts = 0;
  const tick = () => {
    const textarea = /** @type {HTMLTextAreaElement | null} */ (
      document.querySelector(selector)
    );
    if (textarea) {
      if (nativeSetter) {
        nativeSetter.call(textarea, prompt);
      } else {
        textarea.value = prompt;
      }
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.focus();
      return;
    }
    if (attempts++ < retries) {
      setTimeout(tick, interval);
    }
  };
  // Defer so the redux-driven modal has a tick to begin mounting.
  setTimeout(tick, interval);
};
