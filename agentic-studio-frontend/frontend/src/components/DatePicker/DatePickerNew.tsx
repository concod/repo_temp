import { useMemo, useState, useEffect, useRef } from "react";

// --- Utilities ---
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function normalize(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }

function getISOWeek(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

function buildMonthGrid(base: Date) {
  const year = base.getFullYear();
  const month = base.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDay = (firstDay.getDay() + 6) % 7; 
  
  const currentDate = new Date(firstDay);
  currentDate.setDate(currentDate.getDate() - startDay);

  const grid = [];
  for (let i = 0; i < 42; i++) {
    grid.push({
      date: new Date(currentDate),
      ts: currentDate.getTime(),
      inCurrent: currentDate.getMonth() === month,
      week: getISOWeek(currentDate)
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return grid;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

type Props = { 
  open: boolean; 
  onClose: () => void; 
  onDone: (start: Date | null, end: Date | null) => void;
  triggerRef?: React.RefObject<HTMLElement>; // Optional: to ignore clicks on the trigger button
};

// --- Header Control Component ---
function HeaderControl({ date, onChange }: { date: Date; onChange: (m: number, y: number) => void; side?: string }) {
  const [mode, setMode] = useState<null | "month" | "year">(null);
  const ref = useRef<HTMLDivElement>(null);

  // Handle click outside for dropdowns
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setMode(null);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleNav = (type: "month" | "year", dir: number) => {
    const d = new Date(date);
    if (type === "month") d.setMonth(d.getMonth() + dir);
    else d.setFullYear(d.getFullYear() + dir);
    onChange(d.getMonth(), d.getFullYear());
  };

  const years = Array.from({ length: 12 }, (_, i) => new Date().getFullYear() - 5 + i);

  return (
    <div className="header-control" ref={ref} style={{display:'flex', alignItems:'center', gap: 8}}>
      <div className="arrow" onClick={() => handleNav("month", -1)}>‹</div>
      
      <div style={{ position: "relative" }}>
        <div className="selector" onClick={() => setMode(mode === "month" ? null : "month")}>
          {MONTHS[date.getMonth()]} <span className="caret">▼</span>
        </div>
        {mode === "month" && (
          <div className="month-dropdown">
            {MONTHS.map((m, i) => (
              <div key={m} className="month-option" onClick={() => { onChange(i, date.getFullYear()); setMode(null); }}>
                {m}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="arrow" onClick={() => handleNav("month", 1)}>›</div>

      <div className="arrow" onClick={() => handleNav("year", -1)}>‹</div>
      <div style={{ position: "relative" }}>
        <div className="selector" onClick={() => setMode(mode === "year" ? null : "year")}>
          {date.getFullYear()} <span className="caret">▼</span>
        </div>
        {mode === "year" && (
          <div className="year-dropdown">
            {years.map(y => (
              <div key={y} className="year-option" onClick={() => { onChange(date.getMonth(), y); setMode(null); }}>
                {y}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="arrow" onClick={() => handleNav("year", 1)}>›</div>
    </div>
  );
}

export function DateRangePicker({ open, onClose, onDone, triggerRef }: Props) {
  const todayTs = normalize(new Date());
  const pickerRef = useRef<HTMLDivElement>(null);
  
  const [leftMonth, setLeftMonth] = useState(() => startOfMonth(new Date()));
  const [rightMonth, setRightMonth] = useState(() => addMonths(startOfMonth(new Date()), 1));

  const [startDate, setStartDate] = useState<number | null>(null);
  const [endDate, setEndDate] = useState<number | null>(null);
  const [hoverDate, setHoverDate] = useState<number | null>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      // If clicking inside picker or on the trigger button, ignore
      if (pickerRef.current?.contains(event.target as Node)) return;
      if (triggerRef?.current?.contains(event.target as Node)) return;
      onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onClose, triggerRef]);

  const handleLeftChange = (m: number, y: number) => {
    const newLeft = new Date(y, m, 1);
    setLeftMonth(newLeft);
    setRightMonth(addMonths(newLeft, 1));
  };

  const handleRightChange = (m: number, y: number) => {
    const newRight = new Date(y, m, 1);
    setRightMonth(newRight);
    setLeftMonth(addMonths(newRight, -1));
  };

  const handleDayClick = (ts: number) => {
    if (ts > todayTs) return;

    if (!startDate || (startDate && endDate)) {
      setStartDate(ts);
      setEndDate(null);
    } else {
      if (ts < startDate) {
        setEndDate(startDate);
        setStartDate(ts);
      } else {
        setEndDate(ts);
      }
    }
  };

  const getDayClass = (ts: number, inCurrent: boolean) => {
    const classes = ["day-cell"];
    
    // Your CSS handles .muted { color: transparent; pointer-events: none }
    // This perfectly hides the ghost dates
    if (!inCurrent) {
      classes.push("muted");
      return classes.join(" ");
    }

    if (ts > todayTs) classes.push("disabled");

    const isStart = startDate === ts;
    const isEnd = endDate === ts;
    
    if (isStart) classes.push("day-start");
    if (isEnd) classes.push("day-end");

    const effectiveEnd = endDate || hoverDate;
    if (startDate && effectiveEnd) {
      const [s, e] = startDate < effectiveEnd ? [startDate, effectiveEnd] : [effectiveEnd, startDate];
      if (ts >= s && ts <= e) classes.push("in-range");
    }

    return classes.join(" ");
  };

  const leftGrid = useMemo(() => buildMonthGrid(leftMonth), [leftMonth]);
  const rightGrid = useMemo(() => buildMonthGrid(rightMonth), [rightMonth]);

  const selectedCount = startDate && endDate 
    ? Math.round((endDate - startDate) / 86400000) + 1 
    : 0;

  if (!open) return null;

  return (
    <div className="drp-shell">
      <div className="drp-picker-wrapper">
        <div className="drp-picker" ref={pickerRef}>
          
          {/* Header */}
          <div className="header-bar">
            <HeaderControl date={leftMonth} onChange={handleLeftChange} side="left" />
            <HeaderControl date={rightMonth} onChange={handleRightChange} side="right" />
          </div>

          {/* Grids */}
          <div className="months">
            {[leftGrid, rightGrid].map((grid, idx) => (
              <div key={idx} className="month-panel">
                <div className="weekday-row">
                  {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => <div key={d} className="weekday">{d}</div>)}
                </div>
                
                {Array.from({ length: 6 }).map((_, rowIdx) => {
                  const row = grid.slice(rowIdx * 7, rowIdx * 7 + 7);
                  // Hide week 6 if empty
                  if(rowIdx === 5 && !row.some(c => c.inCurrent)) return null;

                  return (
                    <div key={rowIdx} className="week-row">
                      <div className="week-num">W{row[0].week}</div>
                      {row.map(cell => (
                        <div
                          key={cell.ts}
                          className={getDayClass(cell.ts, cell.inCurrent)}
                          onClick={() => cell.inCurrent && handleDayClick(cell.ts)}
                          onMouseEnter={() => cell.inCurrent && setHoverDate(cell.ts)}
                          onMouseLeave={() => setHoverDate(null)}
                        >
                          {cell.date.getDate()}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="drp-footer">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
               <span style={{ fontSize: 13, color: '#374151' }}>Selected: <strong>{selectedCount} days</strong></span>
               <button className="reset-link" onClick={() => { setStartDate(null); setEndDate(null); }}>Reset</button>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn-outline" onClick={onClose}>Cancel</button>
              <button 
                className="btn-primary" 
                disabled={!startDate || !endDate}
                onClick={() => onDone(startDate ? new Date(startDate) : null, endDate ? new Date(endDate) : null)}
              >
                Apply
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}