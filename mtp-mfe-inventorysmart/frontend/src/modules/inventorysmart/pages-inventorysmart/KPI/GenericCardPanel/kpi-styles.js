import { makeStyles } from "@mui/styles";

const rem = (px) => `${px / 16}rem`;

export const useStyles = makeStyles(() => ({
    pannelContainer: {
         padding: '16px', background:'#fff', borderRadius:'8px'
    },
    flex_1: {
        flex: 1
    },
    subMetricLabelStyles: {
        color: "#758490",
        fontFamily: "Manrope",
        fontSize: "12px",
        fontWeight: 400,
        lineHeight: "18px",
        marginBottom: "2px",
        width: "100px",
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
    },
    subMetricsValueStyles: {
        fontFamily: "Manrope",
        fontWeight: "bold",
        fontSize: "16px",
        color: "#394960",
    },
    trendTextStyles: {
        fontFamily: "Manrope",
        fontSize: "0.70rem",
        maxWidth: "14ch",
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        fontWeight: 600,
        opacity: 0.85,
    },
    cardStyles_WithSubMetrics: {
        width: "auto",
        height: '100px',
        borderRadius: "4px",
        border: "1px solid #f5f5f5",
        boxShadow: "0px 0px 1.2px 0px rgba(0, 0, 0, 0.25)",
        padding: "12px",
    },
    cardStyles_WithNoSubMetrics: {
        display: "flex",
        padding: "16px 24px",
        alignItems: "center",
        gap: "24px",
        flex: "1 0 0",
        width: "auto",
        height: "88px",
        borderRadius: "8px",
        border: "1px solid #f5f5f5",
        boxShadow: "0px 0px 1.2px 0px rgba(0, 0, 0, 0.25)",
        marginLeft: "1px",
        marginRight: "1px",
    },

    flexContainerStyles: {
        display: "flex",
        justifyContent: "space-between",
        gap: "24px",
        alignItems: "center",
    },
    flexItemStyles: {
        display: "flex",
        alignItems: "center",
        height: "30px",
        gap: "8px",
    },
    titleSubTitleFlex: {
        display: "flex",
        flexDirection: "column",
        marginTop: "5px"
    },
    marginTop_10: {
        marginTop: "10px"
    },
    marginRight_10: {
        marginRight: "10px"
    },
    flex_center: {
        display: "flex",
        alignItems: "center",
    },
    flex_column: {
        display: "flex",
        flexDirection: "column",
        gap:'8px'
    },
    icon_container: {
        flexBasis: "20%",
        marginRight: "1.50rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: "48px",
        width: "48px",
        height: "48px",
    },
    metricStyles: {
        backgroundColor: "#08BD80",
        color: "white",
        padding: "1px 8px",
        borderRadius: "4px",
        fontFamily: "Manrope",
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        maxHeight: "25px",
    },
    withSubMetricsNoSubTitleTitleStyles: {
        fontFamily: "Manrope",
        fontSize: "14px",
        fontWeight: "bold",
        lineHeight: "24px",
        color: "#1D1D1D",
        opacity: 0.75,
        width: "200px",
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
    },
    withSubMetricWithSubTitleTitleStyles: {
        fontFamily: "Manrope",
        fontSize: "16px",
        fontWeight: "bold",
        lineHeight: "24px",
        color: "#1D1D1D",
        opacity: 0.75,
        width: "200px",
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
    },
    withSubMetircsSubtitleStyles: {
        fontFamily: "Manrope",
        fontSize: "12px",
        lineHeight: "24px",
        color: "#758490",
        width: "200px",
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        marginTop: "-6px",
    },
    noSubMetricsFlexContainer: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        minWidth: "250px",
    },
    noSubMetricsLabelStyles: {
        color: "#1F2B4D",
        fontFamily: "Manrope",
        fontSize: "16px",
        textOverflow: "ellipsis",
        overflow: "hidden",
        whiteSpace: "nowrap",
        fontWeight: 600,
        lineHeight: "24px",
    },
    noSubMertricsValueStyles: {
        color: "#1F2B4D",
        fontFamily: "Manrope",
        fontSize: "16px",
        fontWeight: 800,
        textAlign: "right",
        lineHeight: "24px",
    },
    noSubMetricsUnitsStyle: {
        fontFamily: "Manrope",
        fontSize: "14px",
        color: "#7A8294",
        fontWeight: 600,
        textTransform: 'lowercase',
        lineHeight: '21px',
    },
    flex_row:{
        display:'flex',
        alignItems:'center',
        gap:'4px'
    },
    expandButtonStyles: {
        width: rem(30),
        height: rem(30),
        borderRadius: "4px",
        padding: "0px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        border: "1px solid #4259ee",
        minWidth: "unset",
        color: "#4259ee"
    },
    upTrendStyles: {
        marginLeft: "2px",
        color: "#24A148",
    },
    downTrendStyles: {
        marginLeft: "2px",
        color: "#DA1E28",
    },
    panelHeaderTestStyles: {
        fontSize: "14px",
        fontFamily: "Manrope",
        fontWeight: 700,
        lineHeight: "21px"
    },
    singleSubMetricContainerStyles: {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        marginTop: "10px",
        marginLeft: "40px",
    },
    expandedPanelContainerStyles: {
        display: "flex",
        flexWrap: "wrap",
        gap: "24px",
        padding: "17px 0px 1px 0px",
    },
    nonExpandedContainerStyles: {
        display: "flex",
        alignItems: "stretch",
        gap: "16px",
        padding: "17px 0px 1px 0px",
        width: "100%",
        overflowX: "auto",
        overflowY: "visible",
        scrollBehavior: "smooth",
        scrollbarWidth: "none",
    },
    navigationButtonStyles: {
        fontSize: "2rem",
        padding: 0,
        height: "30px",
        width: "30px",
        borderRadius: "50%",
        border: "0.8px solid #758490",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
    },
    cardComponentContainerStyles: {
        display: "flex",
        overflowX: "auto",
        scrollBehavior: "smooth",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        "&::-webkit-scrollbar": {
            display: "none",
        },
        flexGrow: 1,
        gap: "24px",
        padding: "10px 2px",
    },

    svgNoSubMetricsContainer: {
        width: '48px', 
        height: '48px', 
        padding: '5px', 
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    svgSubMetricsContainer: {
        borderRadius: '8px', 
        width: '48px', 
        height: '48px', 
        padding: '5px', 
        marginRight: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon3DWrapper: {
        width: '48px',
        height: '48px',
        minWidth: '48px',
        minHeight: '48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        '& svg': {
            width: '48px',
            height: '48px',
            maxWidth: '48px',
            maxHeight: '48px',
            objectFit: 'contain',
        },
    },

    rightAlignedContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginTop: '8px',
    },
    rightAlignedActualRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    rightAlignedActualLabel: {
        fontSize: '14px',
        color: '#333',
        fontWeight: 600,
    },
    rightAlignedActualValue: {
        fontSize: '18px',
        fontWeight: 700,
    },
    rightAlignedComparisonRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
    },
    rightAlignedComparisonLabel: {
        fontSize: '12px',
        color: '#666',
        width: '160px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        flexShrink: 0,
    },
    rightAlignedComparisonValues: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        flex: 1,
        justifyContent: 'flex-end',
    },
    rightAlignedForecastValue: {
        fontSize: '14px',
        color: '#333',
        width: '90px',
        textAlign: 'right',
        flexShrink: 0,
    },
    rightAlignedArrowContainer: {
        width: '20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    rightAlignedDifferenceText: {
        fontSize: '12px',
        width: '140px',
        textAlign: 'left',
        flexShrink: 0,
    },
    rightAlignedPositive: {
        color: '#4caf50',
    },
    rightAlignedNegative: {
        color: '#f44336',
    },
    rightAlignedArrowIcon: {
        fontSize: '16px',
    },

    // Info icon styles
    infoIcon: {
        fontSize: '14px',
        color: '#60697D',
        cursor: 'pointer',
        width: '14px',
        height: '14px',
        '&:hover': {
            color: '#3649c6',
        },
    },

    comparisonLabelWithInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
    },

    // Forecast Sales KPI Card Styles — base (no ROS toggle)
    forecastSalesCard: {
        display: 'flex',
        alignItems: 'stretch',
        minWidth: '620px', 
        width: '620px',
        flex: '0 0 620px',
        borderRadius: '12px',
        border: '1px solid #E8EAF0',
        background: '#FFFFFF',
        overflow: 'visible',
        boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.06)',
        minHeight: '160px',
        position: 'relative',
    },
    // High ROS variant — applied only when enableRosToggle && rosType === 'high'
    forecastSalesCardHighRos: {
        border: '1px solid #E0E4EF',
        background: 'linear-gradient(to right, #F0F2FF 0%, #F6F7FF 20%, #FFFFFF 35%)',
    },
    // Low ROS variant — applied only when enableRosToggle && rosType === 'low'
    forecastSalesCardLowRos: {
        border: '1px solid #F0E6C8',
        background: 'linear-gradient(to right, #FFFCF2 0%, #FFFDF7 20%, #FFFFFF 35%)',
    },

    forecastSalesLeftSection: {
        display: 'flex',
        alignItems: 'center',
        padding: '24px 24px',
        width: 'auto',
        flex: '0 0 auto',
        minWidth: '190px',
        gap: '14px',
        position: 'relative',
        '&::after': {
            content: '""',
            position: 'absolute',
            right: 0,
            top: '42.5%',
            height: '15%',
            width: '2px',
            backgroundColor: '#D5D9E0',
        },
    },

    forecastSalesIcon: {
        width: '48px',
        height: '48px',
        borderRadius: '8px',
        backgroundColor: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        minWidth: '48px',
        '& svg': {
            width: '100%',
            height: '100%',
            maxWidth: '48px',
            maxHeight: '48px',
        },
    },

    forecastSalesInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
    },

    forecastSalesTitle: {
        fontSize: '18px',
        fontWeight: 600,
        color: '#1f2a4d',
        fontFamily: 'Manrope, sans-serif',
        lineHeight: '26px',
    },

    forecastSalesValueRow: {
        display: 'flex',
        alignItems: 'baseline',
        gap: '8px',
    },

    forecastSalesValue: {
        fontSize: '18px',
        fontWeight: 700,
        color: '#1D1D1D',
        fontFamily: 'Manrope, sans-serif',
    },

    forecastSalesActual: {
        fontSize: '13px',
        fontWeight: 400,
        color: '#758490',
        fontFamily: 'Manrope, sans-serif',
    },

    forecastSalesRightSection: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '16px 24px',
        gap: '8px',
        flex: '1 1 auto',
        minWidth: 0,
    },

    forecastMetricRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        width: '100%',
        minWidth: 0,
        padding: '8px 6px',
    },
    // Clickable metric row styles now applied via inline styles in index.jsx

    forecastMetricLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        flex: '1 1 auto',
        minWidth: 0,
    },

    forecastMetricLabelText: {
        fontSize: '13px',
        color: '#394960',
        fontFamily: 'Manrope, sans-serif',
        fontWeight: 500,
        lineHeight: '1.5',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        minWidth: 0,
    },

    forecastMetricValue: {
        fontSize: '15px',
        fontWeight: 700,
        color: '#1D1D1D',
        fontFamily: 'Manrope, sans-serif',
        textAlign: 'right',
        minWidth: '55px',
        flexShrink: 0,
        whiteSpace: 'nowrap',
    },


    // ROS Toggle styles
    rosToggleContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginLeft: '0px',
    },
    rosToggleButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 16px',
        borderRadius: '24px',
        border: '1.5px solid #D5D9E0',
        backgroundColor: '#fff',
        cursor: 'pointer',
        fontSize: '13px',
        fontFamily: 'Manrope, sans-serif',
        fontWeight: 500,
        color: '#394960',
        transition: 'all 0.15s ease',
        lineHeight: '20px',
        userSelect: 'none',
        boxSizing: 'border-box',
        '&:hover': {
            borderColor: '#3649c6',
            backgroundColor: '#F8F9FF',
        },
    },
    rosInfoIcon: {
        marginLeft: '4px',
        display: 'flex',
        alignItems: 'center',
    },

    // Clickable metric (hyperlink) styles
    forecastMetricLabelClickable: {
        cursor: 'pointer',
        textDecoration: 'none',
        color: '#3649C6',
        fontWeight: 600,
        '&:hover': {
            color: '#2a3ab0',
        },
    },

    // Drilldown popover styles
    drilldownOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1200,
        backgroundColor: 'rgba(0, 0, 0, 0.08)',
    },
    drilldownPopover: {
        position: 'fixed',
        zIndex: 1300,
        backgroundColor: '#fff',
        borderRadius: '12px',
        boxShadow: '0px 12px 32px rgba(0, 0, 0, 0.14), 0px 4px 8px rgba(0, 0, 0, 0.06)',
        border: '1px solid #E2E5EB',
        minWidth: '480px',
        maxWidth: '560px',
        maxHeight: '70vh',
        overflowY: 'auto',
    },
    drilldownHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px',
        borderBottom: '1px solid #ECEDF0',
        backgroundColor: '#FAFBFC',
        borderRadius: '12px 12px 0 0',
    },
    drilldownTitle: {
        fontSize: '14px',
        fontWeight: 600,
        color: '#1D1D1D',
        fontFamily: 'Manrope, sans-serif',
    },
    drilldownCloseBtn: {
        cursor: 'pointer',
        color: '#60697D',
        padding: '4px',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background-color 0.15s ease',
        '&:hover': {
            backgroundColor: '#F0F1F4',
            color: '#1D1D1D',
        },
    },
    drilldownTableContainer: {
        padding: '8px 16px 16px',
    },
    drilldownAgGrid: {
        width: '100%',
        '& .ag-root-wrapper': {
            border: 'none',
            borderRadius: '8px',
        },
        '& .ag-header': {
            backgroundColor: '#FAFBFC',
            borderBottom: '1px solid #E8EAF0',
            fontFamily: 'Manrope, sans-serif',
            fontSize: '12px',
            fontWeight: 600,
            color: '#1D2B3E',
            minHeight: '36px !important',
        },
        '& .ag-header-cell': {
            padding: '0 16px',
        },
        '& .drilldown-header-left .ag-header-cell-label': {
            justifyContent: 'flex-start',
        },
        '& .drilldown-header-center .ag-header-cell-label': {
            justifyContent: 'center',
        },
        '& .ag-row': {
            backgroundColor: '#F7F8FA',
            borderColor: '#ECEDF0',
            fontFamily: 'Manrope, sans-serif',
            fontSize: '13px',
        },
        '& .ag-row:hover': {
            backgroundColor: '#EEF0FF !important',
        },
        '& .ag-row-even': {
            backgroundColor: '#F7F8FA',
        },
        '& .ag-row-odd': {
            backgroundColor: '#FFFFFF',
        },
        '& .ag-cell': {
            padding: '0 16px',
            lineHeight: '38px',
        },
    },
    drilldownLoader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        minHeight: '100px',
    },

}));
