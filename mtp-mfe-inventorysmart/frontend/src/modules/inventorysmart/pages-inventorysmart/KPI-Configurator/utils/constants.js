export const filterOptions = {
    functions: {
        integer: ["SUM", "AVG", "MIN", "MAX", "ABS", "COUNT", "COUNT DISTINCT"],
        decimal: ["SUM", "AVG", "MIN", "MAX", "ABS", "COUNT", "COUNT DISTINCT"],
        string: ["COUNT", "COUNT DISTINCT"],
        date: ["MIN", "MAX", "COUNT DISTINCT"]
    },
    locationFilterOptions: [{label: "Store", value: "Store"}]
};

export const dataAvailabilityText = [
    "Transaction Data → Maintained for last 2 years only",
    "Inventory Data → Only latest available inventory will be present",
    "Forecast Data → Only future forecast for next 12 months available"
]

export const formatOptions = {
    formatTypeOptions: [
        { label: "Number", value: "Number" },
        { label: "Percentage", value: "Percentage" },
        { label: "Currency", value: "Currency" },
        { label:"Float", value: "float"}
    ],

    aggregateFunctionOptions: [
        { label: "SUM", value: "Sum" },
        { label: "AVG", value: "Avg" },
        { label: "COUNT", value: "Count" },
        { label: "MIN", value: "Min" },
        { label: "MAX", value: "Max" }
    ]
}

const rollingPeriodOptions = [
    { label: "Days", value: "Days" },
    { label: "Weeks", value: "Weeks" },
    { label: "Months", value: "Months" },
    { label: "Quarters", value: "Quarters" },
    { label: "Years", value: "Years" }
]

const toDateOptions = [
    { label: "Week-to-Date (WTD)", value: "week" },
    { label: "Month-to-Date (MTD)", value: "month" },
    { label: "Quarter-to-Date (QTD)", value: "quarter" },
    { label: "Year-to-Date (YTD)", value: "year" }
]

const latestAnchorOptions = [
    { label: "On Latest Available Date", value: "on_latest_available_date" },
    { label: "As of Start of Week", value: "as_of_start_of_week" }
]

const relativePeriodOptions = [
    { label: "Last Week", value: "last_week" },
    { label: "Last Year Same Week", value: "last_year_same_week" },
    { label: "Last Month", value: "last_month" },
    { label: "Last Year Same Month", value: "last_year_same_month" }
]

export const timeWindowSelections = [
    { label: "Rolling Periods", value: "rolling", options: rollingPeriodOptions },
    { label: "To-Date Periods", value: "to_date", options: toDateOptions },
    { label: "Latest Available Date Anchors", value: "latest_available", options: latestAnchorOptions },
    { label: "Relative Periods", value: "relative", options: relativePeriodOptions }
]

// Sub-options for each rolling period type
// lastNextOptions: selectedDataSource === "Forecast"
//     ? [{ label: "Last", value: "Last" }, { label: "Next", value: "Next" }]
//     : [{ label: "Last", value: "Last" }],

// Max caps for rolling periods based on data source and unit
export const rollingPeriodMaxCaps = {
    transaction: {
        Days: 731,
        Weeks: 106,
        Months: 24,
        Quarters: 8,
        Years: 2
    },
    inventory: {
        // Static periods disabled, only Latest Available Date anchors enabled
        staticDisabled: true,
        dynamicOnlyLatestAnchors: true
    },
    forecast: {
        last: {
            Days: 56,
            Weeks: 8,
            Months: 3
        },
        next: {
            Days: 280,
            Weeks: 40,
            Months: 9
        }
    }
};

