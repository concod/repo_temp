import makeStyles from "@mui/styles/makeStyles";

// Skeleton bar treatment taken from the "LOADING SCREEN" Figma design
// (Ordering modules_V3, node 13503:203709): thin rounded bars with a soft
// grey gradient fading to the right, at low opacity, inside table cells.
const BAR_GRADIENT =
  "linear-gradient(260deg, rgba(185,185,185,0.6) 86.9%, rgba(234,234,234,0.39) 104.04%, rgba(144,144,144,0) 128.55%)";

const useStyles = makeStyles(() => ({
  wrapper: {
    position: "relative",
    width: "100%",
  },
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 700,
    background: "#fff",
    borderRadius: 8,
    boxShadow: "0px 0px 4px 0px rgba(171,171,171,0.25)",
    overflow: "hidden",
  },
  toolbarRow: {
    display: "flex",
    alignItems: "center",
    height: 48,
    padding: "0 16px",
  },
  headerRow: {
    display: "flex",
    height: 40,
    background: "#f5f6fa",
    borderTop: "1px solid #c3c8d4",
  },
  headerCell: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    padding: "0 16px",
    borderRight: "1px solid #c3c8d4",
    boxSizing: "border-box",
    minWidth: 0,
  },
  row: {
    display: "flex",
    height: 30,
    background: "#fff",
    borderBottom: "1px solid #d9dde7",
  },
  cell: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    padding: "0 16px",
    borderRight: "1px solid #d9dde7",
    boxSizing: "border-box",
    minWidth: 0,
  },
  checkboxCell: {
    flex: "0 0 48px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRight: "1px solid #d9dde7",
    boxSizing: "border-box",
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    border: "1px solid #c3c8d4",
  },
  bar: {
    height: 8,
    width: "85%",
    borderRadius: 2,
    backgroundImage: BAR_GRADIENT,
    animation: "$skeletonPulse 1.6s ease-in-out infinite",
  },
  headerBar: {
    height: 12,
    width: "85%",
    borderRadius: 2,
    backgroundImage: BAR_GRADIENT,
    animation: "$skeletonPulse 1.6s ease-in-out infinite",
  },
  toolbarBar: {
    height: 10,
    width: "100%",
    borderRadius: 2,
    backgroundImage: BAR_GRADIENT,
    animation: "$skeletonPulse 1.6s ease-in-out infinite",
  },
  "@keyframes skeletonPulse": {
    "0%": { opacity: 0.25 },
    "50%": { opacity: 0.5 },
    "100%": { opacity: 0.25 },
  },
}));

const SkeletonTable = ({ rows, columns }) => {
  const classes = useStyles();

  return (
    <div>
      <div className={classes.toolbarRow}>
        <div className={classes.toolbarBar} />
      </div>
      <div className={classes.headerRow}>
        <div className={classes.checkboxCell}>
          <div className={classes.checkbox} />
        </div>
        {Array.from({ length: columns }).map((_, index) => (
          <div key={`sk-header-${index}`} className={classes.headerCell}>
            <div className={classes.headerBar} />
          </div>
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`sk-row-${rowIndex}`} className={classes.row}>
          <div className={classes.checkboxCell}>
            <div className={classes.checkbox} />
          </div>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={`sk-cell-${rowIndex}-${colIndex}`} className={classes.cell}>
              <div className={classes.bar} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

/**
 * Table-shaped skeleton overlay (per the ordering "LOADING SCREEN" design).
 * Keeps children mounted (important for AgGrid's server-side row model) and
 * covers them with the skeleton while `loading` is true.
 */
const TableSkeletonOverlay = ({
  loading,
  children,
  minHeight = 260,
  rows = 10,
  columns = 7,
}) => {
  const classes = useStyles();

  return (
    <div
      className={classes.wrapper}
      style={loading ? { minHeight } : undefined}
    >
      {children}
      {loading && (
        <div className={classes.overlay}>
          <SkeletonTable rows={rows} columns={columns} />
        </div>
      )}
    </div>
  );
};

export default TableSkeletonOverlay;
