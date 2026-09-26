// @ts-nocheck -- presentational view rendered from a dynamic brief view-model
import React, { useEffect, useRef, useState } from "react";
import StorageOutlinedIcon from "@mui/icons-material/StorageOutlined";
import BoltOutlinedIcon from "@mui/icons-material/BoltOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

/** @type {Record<string, any>} */
const STREAM_ICONS = {
  database: StorageOutlinedIcon,
  bolt: BoltOutlinedIcon,
  store: StorefrontOutlinedIcon,
  lock: LockOutlinedIcon,
  settings: SettingsOutlinedIcon,
  schedule: ScheduleOutlinedIcon,
  warning: WarningAmberOutlinedIcon,
  insights: InsightsOutlinedIcon,
  people: PeopleAltOutlinedIcon,
  users: PeopleAltOutlinedIcon,
};

// Streams rendered with a lifted, accented card treatment.
const EMPHASIZE = new Set(["warning", "error"]);

// Temporarily hide the "Ask Iris" CTAs (KPI-group cue + bullet pill). Flip to
// true to bring them back.
const SHOW_ASK_IRIS = false;

/* -------------------------------------------------------------------------- */
/*                              Value formatting                              */
/* -------------------------------------------------------------------------- */

/** Splits "84.6K", "3,412", "94%" into prefix / number / suffix parts. */
const parseValue = (raw) => {
  const str = String(raw);
  const match = str.match(/^([^0-9.-]*)([0-9][0-9,]*\.?[0-9]*)(.*)$/);
  if (!match) return { prefix: "", number: null, decimals: 0, suffix: str, hasComma: false };
  const [, prefix, numStr, suffix] = match;
  const clean = numStr.replace(/,/g, "");
  const decimals = clean.includes(".") ? clean.split(".")[1].length : 0;
  return { prefix, number: parseFloat(clean), decimals, suffix, hasComma: numStr.includes(",") };
};

const formatNumber = (n, decimals, hasComma) => {
  if (hasComma) {
    return Number(n).toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
  return n.toFixed(decimals);
};

/**
 * Splits a KPI value like "3 Plans Released" or "84.6K Units Allocated" into
 * the leading numeric token and the trailing caption text. Plain numbers
 * (e.g. "128") return an empty caption so the group's label can be used.
 */
const splitKpiValue = (value) => {
  const str = String(value ?? "").trim();
  const idx = str.indexOf(" ");
  if (idx === -1) return { num: str, text: "" };
  return { num: str.slice(0, idx), text: str.slice(idx + 1).trim() };
};

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

/** Animates a numeric value up from 0 on mount; non-numeric values render as-is. */
const CountUp = ({ value, duration = 1100 }) => {
  const { prefix, number, decimals, suffix, hasComma } = parseValue(value);
  const [display, setDisplay] = useState(number == null ? null : 0);

  useEffect(() => {
    if (number == null) return undefined;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      setDisplay(number * easeOutCubic(progress));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [number, duration]);

  if (number == null) return <>{suffix}</>;
  return (
    <>
      {prefix}
      {formatNumber(display, decimals, hasComma)}
      {suffix}
    </>
  );
};

/**
 * Wraps the first standalone occurrence of `count` in the sentence with a
 * highlighted chip so the key figure reads as the row's affordance.
 */
const highlightCount = (text, count, urgent, drillable) => {
  if (typeof count !== "number" || !text) return text;
  const parts = String(text).split(new RegExp(`(\\b${count}\\b)`));
  let used = false;
  return parts.map((part, idx) => {
    if (used || part !== String(count)) return part;
    used = true;
    const chip = (
      <strong className={`dbrief-hl${urgent ? " is-urgent" : ""}`}>{part}</strong>
    );
    return drillable ? (
      <span key={idx} className="dbrief-num">
        {chip}
      </span>
    ) : (
      <span key={idx}>{chip}</span>
    );
  });
};

/* -------------------------------------------------------------------------- */
/*                                   Pieces                                   */
/* -------------------------------------------------------------------------- */

const AskIrisCue = () => (
  <span className="dbrief-iris-cue" aria-hidden>
    <span className="dbrief-iris-cue-glyph">
      <AutoAwesomeOutlinedIcon sx={{ fontSize: 15 }} />
    </span>
    <span className="dbrief-iris-cue-label">Ask Iris</span>
    <span className="dbrief-iris-cue-chev">
      <ChevronRightIcon sx={{ fontSize: 13 }} />
    </span>
  </span>
);

/** Builds the natural-language prompt sent to Iris for a drillable bullet. */
const buildIrisPrompt = (item) => {
  const lead = item.lead ? `${item.lead}: ` : "";
  return `${lead}${item.line || ""}`.trim();
};

/** @param {{ item: any, onAskIris?: (prompt: string) => void }} props */
const BulletItem = ({ item, onAskIris }) => {
  const drillable = typeof item.count === "number";
  const nodes = highlightCount(item.line, item.count, item.urgent, drillable);

  const handleAsk = (event) => {
    event.stopPropagation();
    onAskIris?.(buildIrisPrompt(item));
  };

  return (
    <li className={`dbrief-bullet${drillable ? " dbrief-bullet--drill" : ""}`}>
      <div className="dbrief-bullet-row">
        <span className="dbrief-bullet-dot" aria-hidden />
        <p className="dbrief-bullet-text">
          {item.lead && <span className="dbrief-bullet-lead">{item.lead}</span>}
          {item.tag && <span className="dbrief-bullet-tag">{item.tag}</span>}
          {item.lead && <span className="dbrief-bullet-sep"> &mdash; </span>}
          <span className="dbrief-bullet-desc">{nodes}</span>
        </p>
        {drillable && SHOW_ASK_IRIS && (
          <span className="dbrief-ask">
            <span className="dbrief-ask-lead" aria-hidden />
            <button
              type="button"
              className="dbrief-ask-pill"
              onClick={handleAsk}
              aria-label={`Ask Iris about ${buildIrisPrompt(item)}`}
            >
              <span className="dbrief-ask-glyph" aria-hidden>
                <AutoAwesomeOutlinedIcon sx={{ fontSize: 15 }} />
              </span>
              <span className="dbrief-ask-label">Ask Iris</span>
              <span className="dbrief-ask-chev" aria-hidden>
                <ChevronRightIcon sx={{ fontSize: 13 }} />
              </span>
            </button>
          </span>
        )}
      </div>
    </li>
  );
};

/** @param {{ group: any, onAskIris?: (prompt: string) => void }} props */
const StreamGroup = ({ group, onAskIris }) => (
  <div className="dbrief-group">
    {group.label && (
      <div className="dbrief-group-label">
        <span>{group.label}</span>
        {group.kind === "kpi" && SHOW_ASK_IRIS && <AskIrisCue />}
      </div>
    )}

    {group.kind === "kpi" ? (
      <div className="dbrief-kpis">
        {group.items.map((kpi, i) => {
          const { num, text } = splitKpiValue(kpi.value);
          const caption = text || kpi.label;
          return (
            <div key={kpi.key ?? kpi.label ?? i} className={`dbrief-kpi dbrief-tone-${kpi.tone}`}>
              <span className="dbrief-kpi-value">
                <CountUp value={num} />
              </span>
              {caption && <span className="dbrief-kpi-label">{caption}</span>}
            </div>
          );
        })}
      </div>
    ) : (
      <ul className="dbrief-bullets">
        {group.items.map((item) => (
          <BulletItem key={item.id} item={item} onAskIris={onAskIris} />
        ))}
      </ul>
    )}
  </div>
);

/** @param {{ bucket: any, order: number, innerRef: any, onAskIris?: (prompt: string) => void }} props */
const StreamSection = ({ bucket, order, innerRef, onAskIris }) => {
  const Icon = STREAM_ICONS[bucket.icon] || InsightsOutlinedIcon;
  const emphasis = EMPHASIZE.has(bucket.tone);
  return (
    <section
      ref={innerRef}
      data-stream={bucket.id}
      className={`dbrief-section${emphasis ? " dbrief-section--emphasis" : ""}`}
    >
      <div className="dbrief-section-head">
        <span className="dbrief-section-glyph" aria-hidden>
          <Icon sx={{ fontSize: 19 }} />
        </span>
        <div className="dbrief-section-headings">
          <span className="dbrief-section-eyebrow">Stream {String(order).padStart(2, "0")}</span>
          <h3 className="dbrief-section-title">{bucket.title}</h3>
          {bucket.subtitle && <p className="dbrief-section-subtitle">{bucket.subtitle}</p>}
        </div>
      </div>

      {bucket.note && <p className="dbrief-note">{bucket.note}</p>}

      <div className="dbrief-groups">
        {bucket.groups.map((group, i) => (
          <StreamGroup key={group.label || i} group={group} onAskIris={onAskIris} />
        ))}
      </div>
    </section>
  );
};

/* -------------------------------------------------------------------------- */
/*                                  Full view                                 */
/* -------------------------------------------------------------------------- */

/** @param {{ brief: any, onAskIris?: (prompt: string) => void }} props */
const BriefFullContent = ({ brief, onAskIris }) => {
  const [activeId, setActiveId] = useState(brief?.buckets?.[0]?.id);
  const sectionRefs = useRef({});
  const rootRef = useRef(null);

  useEffect(() => {
    const order = (brief?.buckets || []).map((bucket) => bucket.id);
    if (!order.length) return undefined;

    // The scroll container isn't fixed (the modal itself may scroll), so find
    // the nearest scrollable ancestor at runtime rather than assuming an element.
    const findScroller = (el) => {
      let node = el?.parentElement;
      while (node) {
        const style = window.getComputedStyle(node);
        if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight) {
          return node;
        }
        node = node.parentElement;
      }
      return document.scrollingElement || document.documentElement;
    };

    const scroller = findScroller(rootRef.current);
    // The header progress bar lives on the Modal root (see dailyBrief.scss);
    // we drive it via a CSS variable so it fills as the body is scrolled.
    const panel = rootRef.current?.closest(".dbrief-modal");

    const updateProgress = () => {
      if (!panel) return;
      const max = scroller.scrollHeight - scroller.clientHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, scroller.scrollTop / max)) : 0;
      panel.style.setProperty("--dbrief-progress", String(progress));
      panel.classList.toggle("is-scrolled", scroller.scrollTop > 4);
    };

    const compute = () => {
      updateProgress();
      // At the very bottom, force the last stream (short trailing sections can
      // never reach the top of the viewport otherwise).
      if (scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight <= 2) {
        setActiveId(order[order.length - 1]);
        return;
      }
      const containerTop = scroller.getBoundingClientRect
        ? scroller.getBoundingClientRect().top
        : 0;
      const offset = 140; // account for the sticky report header
      let current = order[0];
      order.forEach((id) => {
        const el = sectionRefs.current[id];
        if (el && el.getBoundingClientRect().top - containerTop <= offset) {
          current = id;
        }
      });
      setActiveId(current);
    };

    compute();
    scroller.addEventListener("scroll", compute, { passive: true });
    return () => scroller.removeEventListener("scroll", compute);
  }, [brief]);

  const goTo = (id) => {
    const el = sectionRefs.current[id];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!brief) return null;

  return (
    <div className="dbrief-report" ref={rootRef}>
      <div className="dbrief-report-head">
        <div className="dbrief-report-head-glow" aria-hidden />
        <div className="dbrief-report-head-glow dbrief-report-head-glow-2" aria-hidden />
        <div className="dbrief-report-masthead">
          <span className="dbrief-report-mark" aria-hidden>
            <AutoAwesomeOutlinedIcon sx={{ fontSize: 22 }} />
          </span>
          <div className="dbrief-report-heading">
            <h2 className="dbrief-report-title">Daily Brief</h2>
          </div>
          {brief.date && (
            <span className="dbrief-report-date">
              <span className="dbrief-report-live" aria-hidden />
              {brief.date}
            </span>
          )}
        </div>
        {brief.summary && <p className="dbrief-report-lede">{brief.summary}</p>}
        {brief.glance?.length > 0 && (
          <div className="dbrief-report-kpis">
            {brief.glance.map((stat) => (
              <div key={stat.key} className={`dbrief-report-kpi dbrief-tone-${stat.tone}`}>
                <span className="dbrief-report-kpi-num">
                  <CountUp value={stat.count} />
                </span>
                <span className="dbrief-report-kpi-label">{stat.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dbrief-body">
        <nav className="dbrief-rail" aria-label="Jump to stream">
          {brief.buckets.map((bucket, index) => (
            <button
              key={bucket.id}
              type="button"
              className={`dbrief-rail-item${activeId === bucket.id ? " is-active" : ""}`}
              onClick={() => goTo(bucket.id)}
              aria-current={activeId === bucket.id ? "true" : undefined}
            >
              <span className="dbrief-rail-num">{String(index + 1).padStart(2, "0")}</span>
              <span className="dbrief-rail-label">{bucket.title}</span>
            </button>
          ))}
        </nav>

        <div className="dbrief-streams">
          {brief.buckets.map((bucket, index) => (
            <StreamSection
              key={bucket.id}
              bucket={bucket}
              order={index + 1}
              onAskIris={onAskIris}
              innerRef={(el) => {
                sectionRefs.current[bucket.id] = el;
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default BriefFullContent;
