export const toggleOptions = [
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Quarter", value: "quarter" },
  { label: "Year", value: "year" },
];

// header cell mapping with calendar toggle view
export const headerCellView = {
  week: "day",
  month: "week",
  quarter: "week",
  year: "month",
};

export const eventStatusColors = {
  good: {
    label: "Good",
    color: "#24A148",
    border: "#24A148",
  },
  average: {
    label: "Average",
    color: "#FF832B",
    border: "#FF832B",
  },
  toxic: {
    label: "Toxic",
    color: "#DA1E28",
    border: "#DA1E28",
  },
  upcoming: {
    label: "Upcoming/Ongoing",
    color: "#0055AF",
    border: "#0055AF",
  },
};

export const sampleFiscalCalendarData = [
  {
    fiscal_data: {
      fiscal_year: 2021,
      max_date: "2022-01-29",
      min_date: "2021-01-31",
      quarters: [
        {
          fiscal_quarter: 1,
          max_date: "2021-05-01",
          min_date: "2021-01-31",
          months: [
            {
              fiscal_month: 1,
              max_date: "2021-02-27",
              min_date: "2021-01-31",
              weeks: [
                {
                  fiscal_week: 1,
                  max_date: "2021-02-06",
                  min_date: "2021-01-31",
                },
                {
                  fiscal_week: 2,
                  max_date: "2021-02-13",
                  min_date: "2021-02-07",
                },
                {
                  fiscal_week: 3,
                  max_date: "2021-02-20",
                  min_date: "2021-02-14",
                },
                {
                  fiscal_week: 4,
                  max_date: "2021-02-27",
                  min_date: "2021-02-21",
                },
              ],
            },
            {
              fiscal_month: 2,
              max_date: "2021-03-27",
              min_date: "2021-02-28",
              weeks: [
                {
                  fiscal_week: 5,
                  max_date: "2021-03-06",
                  min_date: "2021-02-28",
                },
                {
                  fiscal_week: 6,
                  max_date: "2021-03-13",
                  min_date: "2021-03-07",
                },
                {
                  fiscal_week: 7,
                  max_date: "2021-03-20",
                  min_date: "2021-03-14",
                },
                {
                  fiscal_week: 8,
                  max_date: "2021-03-27",
                  min_date: "2021-03-21",
                },
              ],
            },
            {
              fiscal_month: 3,
              max_date: "2021-05-01",
              min_date: "2021-03-28",
              weeks: [
                {
                  fiscal_week: 9,
                  max_date: "2021-04-03",
                  min_date: "2021-03-28",
                },
                {
                  fiscal_week: 10,
                  max_date: "2021-04-10",
                  min_date: "2021-04-04",
                },
                {
                  fiscal_week: 11,
                  max_date: "2021-04-17",
                  min_date: "2021-04-11",
                },
                {
                  fiscal_week: 12,
                  max_date: "2021-04-24",
                  min_date: "2021-04-18",
                },
                {
                  fiscal_week: 13,
                  max_date: "2021-05-01",
                  min_date: "2021-04-25",
                },
              ],
            },
          ],
        },
        {
          fiscal_quarter: 2,
          max_date: "2021-07-31",
          min_date: "2021-05-02",
          months: [
            {
              fiscal_month: 4,
              max_date: "2021-05-29",
              min_date: "2021-05-02",
              weeks: [
                {
                  fiscal_week: 14,
                  max_date: "2021-05-08",
                  min_date: "2021-05-02",
                },
                {
                  fiscal_week: 15,
                  max_date: "2021-05-15",
                  min_date: "2021-05-09",
                },
                {
                  fiscal_week: 16,
                  max_date: "2021-05-22",
                  min_date: "2021-05-16",
                },
                {
                  fiscal_week: 17,
                  max_date: "2021-05-29",
                  min_date: "2021-05-23",
                },
              ],
            },
            {
              fiscal_month: 5,
              max_date: "2021-06-26",
              min_date: "2021-05-30",
              weeks: [
                {
                  fiscal_week: 18,
                  max_date: "2021-06-05",
                  min_date: "2021-05-30",
                },
                {
                  fiscal_week: 19,
                  max_date: "2021-06-12",
                  min_date: "2021-06-06",
                },
                {
                  fiscal_week: 20,
                  max_date: "2021-06-19",
                  min_date: "2021-06-13",
                },
                {
                  fiscal_week: 21,
                  max_date: "2021-06-26",
                  min_date: "2021-06-20",
                },
              ],
            },
            {
              fiscal_month: 6,
              max_date: "2021-07-31",
              min_date: "2021-06-27",
              weeks: [
                {
                  fiscal_week: 22,
                  max_date: "2021-07-03",
                  min_date: "2021-06-27",
                },
                {
                  fiscal_week: 23,
                  max_date: "2021-07-10",
                  min_date: "2021-07-04",
                },
                {
                  fiscal_week: 24,
                  max_date: "2021-07-17",
                  min_date: "2021-07-11",
                },
                {
                  fiscal_week: 25,
                  max_date: "2021-07-24",
                  min_date: "2021-07-18",
                },
                {
                  fiscal_week: 26,
                  max_date: "2021-07-31",
                  min_date: "2021-07-25",
                },
              ],
            },
          ],
        },
        {
          fiscal_quarter: 3,
          max_date: "2021-10-30",
          min_date: "2021-08-01",
          months: [
            {
              fiscal_month: 7,
              max_date: "2021-08-28",
              min_date: "2021-08-01",
              weeks: [
                {
                  fiscal_week: 27,
                  max_date: "2021-08-07",
                  min_date: "2021-08-01",
                },
                {
                  fiscal_week: 28,
                  max_date: "2021-08-14",
                  min_date: "2021-08-08",
                },
                {
                  fiscal_week: 29,
                  max_date: "2021-08-21",
                  min_date: "2021-08-15",
                },
                {
                  fiscal_week: 30,
                  max_date: "2021-08-28",
                  min_date: "2021-08-22",
                },
              ],
            },
            {
              fiscal_month: 8,
              max_date: "2021-09-25",
              min_date: "2021-08-29",
              weeks: [
                {
                  fiscal_week: 31,
                  max_date: "2021-09-04",
                  min_date: "2021-08-29",
                },
                {
                  fiscal_week: 32,
                  max_date: "2021-09-11",
                  min_date: "2021-09-05",
                },
                {
                  fiscal_week: 33,
                  max_date: "2021-09-18",
                  min_date: "2021-09-12",
                },
                {
                  fiscal_week: 34,
                  max_date: "2021-09-25",
                  min_date: "2021-09-19",
                },
              ],
            },
            {
              fiscal_month: 9,
              max_date: "2021-10-30",
              min_date: "2021-09-26",
              weeks: [
                {
                  fiscal_week: 35,
                  max_date: "2021-10-02",
                  min_date: "2021-09-26",
                },
                {
                  fiscal_week: 36,
                  max_date: "2021-10-09",
                  min_date: "2021-10-03",
                },
                {
                  fiscal_week: 37,
                  max_date: "2021-10-16",
                  min_date: "2021-10-10",
                },
                {
                  fiscal_week: 38,
                  max_date: "2021-10-23",
                  min_date: "2021-10-17",
                },
                {
                  fiscal_week: 39,
                  max_date: "2021-10-30",
                  min_date: "2021-10-24",
                },
              ],
            },
          ],
        },
        {
          fiscal_quarter: 4,
          max_date: "2022-01-29",
          min_date: "2021-10-31",
          months: [
            {
              fiscal_month: 10,
              max_date: "2021-11-27",
              min_date: "2021-10-31",
              weeks: [
                {
                  fiscal_week: 40,
                  max_date: "2021-11-06",
                  min_date: "2021-10-31",
                },
                {
                  fiscal_week: 41,
                  max_date: "2021-11-13",
                  min_date: "2021-11-07",
                },
                {
                  fiscal_week: 42,
                  max_date: "2021-11-20",
                  min_date: "2021-11-14",
                },
                {
                  fiscal_week: 43,
                  max_date: "2021-11-27",
                  min_date: "2021-11-21",
                },
              ],
            },
            {
              fiscal_month: 11,
              max_date: "2021-12-25",
              min_date: "2021-11-28",
              weeks: [
                {
                  fiscal_week: 44,
                  max_date: "2021-12-04",
                  min_date: "2021-11-28",
                },
                {
                  fiscal_week: 45,
                  max_date: "2021-12-11",
                  min_date: "2021-12-05",
                },
                {
                  fiscal_week: 46,
                  max_date: "2021-12-18",
                  min_date: "2021-12-12",
                },
                {
                  fiscal_week: 47,
                  max_date: "2021-12-25",
                  min_date: "2021-12-19",
                },
              ],
            },
            {
              fiscal_month: 12,
              max_date: "2022-01-29",
              min_date: "2021-12-26",
              weeks: [
                {
                  fiscal_week: 48,
                  max_date: "2022-01-01",
                  min_date: "2021-12-26",
                },
                {
                  fiscal_week: 49,
                  max_date: "2022-01-08",
                  min_date: "2022-01-02",
                },
                {
                  fiscal_week: 50,
                  max_date: "2022-01-15",
                  min_date: "2022-01-09",
                },
                {
                  fiscal_week: 51,
                  max_date: "2022-01-22",
                  min_date: "2022-01-16",
                },
                {
                  fiscal_week: 52,
                  max_date: "2022-01-29",
                  min_date: "2022-01-23",
                },
              ],
            },
          ],
        },
      ],
    },
    year: 2021,
  },
  {
    fiscal_data: {
      fiscal_year: 2022,
      max_date: "2023-01-28",
      min_date: "2022-01-30",
      quarters: [
        {
          fiscal_quarter: 1,
          max_date: "2022-04-30",
          min_date: "2022-01-30",
          months: [
            {
              fiscal_month: 1,
              max_date: "2022-02-26",
              min_date: "2022-01-30",
              weeks: [
                {
                  fiscal_week: 1,
                  max_date: "2022-02-05",
                  min_date: "2022-01-30",
                },
                {
                  fiscal_week: 2,
                  max_date: "2022-02-12",
                  min_date: "2022-02-06",
                },
                {
                  fiscal_week: 3,
                  max_date: "2022-02-19",
                  min_date: "2022-02-13",
                },
                {
                  fiscal_week: 4,
                  max_date: "2022-02-26",
                  min_date: "2022-02-20",
                },
              ],
            },
            {
              fiscal_month: 2,
              max_date: "2022-03-26",
              min_date: "2022-02-27",
              weeks: [
                {
                  fiscal_week: 5,
                  max_date: "2022-03-05",
                  min_date: "2022-02-27",
                },
                {
                  fiscal_week: 6,
                  max_date: "2022-03-12",
                  min_date: "2022-03-06",
                },
                {
                  fiscal_week: 7,
                  max_date: "2022-03-19",
                  min_date: "2022-03-13",
                },
                {
                  fiscal_week: 8,
                  max_date: "2022-03-26",
                  min_date: "2022-03-20",
                },
              ],
            },
            {
              fiscal_month: 3,
              max_date: "2022-04-30",
              min_date: "2022-03-27",
              weeks: [
                {
                  fiscal_week: 9,
                  max_date: "2022-04-02",
                  min_date: "2022-03-27",
                },
                {
                  fiscal_week: 10,
                  max_date: "2022-04-09",
                  min_date: "2022-04-03",
                },
                {
                  fiscal_week: 11,
                  max_date: "2022-04-16",
                  min_date: "2022-04-10",
                },
                {
                  fiscal_week: 12,
                  max_date: "2022-04-23",
                  min_date: "2022-04-17",
                },
                {
                  fiscal_week: 13,
                  max_date: "2022-04-30",
                  min_date: "2022-04-24",
                },
              ],
            },
          ],
        },
        {
          fiscal_quarter: 2,
          max_date: "2022-07-30",
          min_date: "2022-05-01",
          months: [
            {
              fiscal_month: 4,
              max_date: "2022-05-28",
              min_date: "2022-05-01",
              weeks: [
                {
                  fiscal_week: 14,
                  max_date: "2022-05-07",
                  min_date: "2022-05-01",
                },
                {
                  fiscal_week: 15,
                  max_date: "2022-05-14",
                  min_date: "2022-05-08",
                },
                {
                  fiscal_week: 16,
                  max_date: "2022-05-21",
                  min_date: "2022-05-15",
                },
                {
                  fiscal_week: 17,
                  max_date: "2022-05-28",
                  min_date: "2022-05-22",
                },
              ],
            },
            {
              fiscal_month: 5,
              max_date: "2022-06-25",
              min_date: "2022-05-29",
              weeks: [
                {
                  fiscal_week: 18,
                  max_date: "2022-06-04",
                  min_date: "2022-05-29",
                },
                {
                  fiscal_week: 19,
                  max_date: "2022-06-11",
                  min_date: "2022-06-05",
                },
                {
                  fiscal_week: 20,
                  max_date: "2022-06-18",
                  min_date: "2022-06-12",
                },
                {
                  fiscal_week: 21,
                  max_date: "2022-06-25",
                  min_date: "2022-06-19",
                },
              ],
            },
            {
              fiscal_month: 6,
              max_date: "2022-07-30",
              min_date: "2022-06-26",
              weeks: [
                {
                  fiscal_week: 22,
                  max_date: "2022-07-02",
                  min_date: "2022-06-26",
                },
                {
                  fiscal_week: 23,
                  max_date: "2022-07-09",
                  min_date: "2022-07-03",
                },
                {
                  fiscal_week: 24,
                  max_date: "2022-07-16",
                  min_date: "2022-07-10",
                },
                {
                  fiscal_week: 25,
                  max_date: "2022-07-23",
                  min_date: "2022-07-17",
                },
                {
                  fiscal_week: 26,
                  max_date: "2022-07-30",
                  min_date: "2022-07-24",
                },
              ],
            },
          ],
        },
        {
          fiscal_quarter: 3,
          max_date: "2022-10-29",
          min_date: "2022-07-31",
          months: [
            {
              fiscal_month: 7,
              max_date: "2022-08-27",
              min_date: "2022-07-31",
              weeks: [
                {
                  fiscal_week: 27,
                  max_date: "2022-08-06",
                  min_date: "2022-07-31",
                },
                {
                  fiscal_week: 28,
                  max_date: "2022-08-13",
                  min_date: "2022-08-07",
                },
                {
                  fiscal_week: 29,
                  max_date: "2022-08-20",
                  min_date: "2022-08-14",
                },
                {
                  fiscal_week: 30,
                  max_date: "2022-08-27",
                  min_date: "2022-08-21",
                },
              ],
            },
            {
              fiscal_month: 8,
              max_date: "2022-09-24",
              min_date: "2022-08-28",
              weeks: [
                {
                  fiscal_week: 31,
                  max_date: "2022-09-03",
                  min_date: "2022-08-28",
                },
                {
                  fiscal_week: 32,
                  max_date: "2022-09-10",
                  min_date: "2022-09-04",
                },
                {
                  fiscal_week: 33,
                  max_date: "2022-09-17",
                  min_date: "2022-09-11",
                },
                {
                  fiscal_week: 34,
                  max_date: "2022-09-24",
                  min_date: "2022-09-18",
                },
              ],
            },
            {
              fiscal_month: 9,
              max_date: "2022-10-29",
              min_date: "2022-09-25",
              weeks: [
                {
                  fiscal_week: 35,
                  max_date: "2022-10-01",
                  min_date: "2022-09-25",
                },
                {
                  fiscal_week: 36,
                  max_date: "2022-10-08",
                  min_date: "2022-10-02",
                },
                {
                  fiscal_week: 37,
                  max_date: "2022-10-15",
                  min_date: "2022-10-09",
                },
                {
                  fiscal_week: 38,
                  max_date: "2022-10-22",
                  min_date: "2022-10-16",
                },
                {
                  fiscal_week: 39,
                  max_date: "2022-10-29",
                  min_date: "2022-10-23",
                },
              ],
            },
          ],
        },
        {
          fiscal_quarter: 4,
          max_date: "2023-01-28",
          min_date: "2022-10-30",
          months: [
            {
              fiscal_month: 10,
              max_date: "2022-11-26",
              min_date: "2022-10-30",
              weeks: [
                {
                  fiscal_week: 40,
                  max_date: "2022-11-05",
                  min_date: "2022-10-30",
                },
                {
                  fiscal_week: 41,
                  max_date: "2022-11-12",
                  min_date: "2022-11-06",
                },
                {
                  fiscal_week: 42,
                  max_date: "2022-11-19",
                  min_date: "2022-11-13",
                },
                {
                  fiscal_week: 43,
                  max_date: "2022-11-26",
                  min_date: "2022-11-20",
                },
              ],
            },
            {
              fiscal_month: 11,
              max_date: "2022-12-24",
              min_date: "2022-11-27",
              weeks: [
                {
                  fiscal_week: 44,
                  max_date: "2022-12-03",
                  min_date: "2022-11-27",
                },
                {
                  fiscal_week: 45,
                  max_date: "2022-12-10",
                  min_date: "2022-12-04",
                },
                {
                  fiscal_week: 46,
                  max_date: "2022-12-17",
                  min_date: "2022-12-11",
                },
                {
                  fiscal_week: 47,
                  max_date: "2022-12-24",
                  min_date: "2022-12-18",
                },
              ],
            },
            {
              fiscal_month: 12,
              max_date: "2023-01-28",
              min_date: "2022-12-25",
              weeks: [
                {
                  fiscal_week: 48,
                  max_date: "2022-12-31",
                  min_date: "2022-12-25",
                },
                {
                  fiscal_week: 49,
                  max_date: "2023-01-07",
                  min_date: "2023-01-01",
                },
                {
                  fiscal_week: 50,
                  max_date: "2023-01-14",
                  min_date: "2023-01-08",
                },
                {
                  fiscal_week: 51,
                  max_date: "2023-01-21",
                  min_date: "2023-01-15",
                },
                {
                  fiscal_week: 52,
                  max_date: "2023-01-28",
                  min_date: "2023-01-22",
                },
              ],
            },
          ],
        },
      ],
    },
    year: 2022,
  },
  {
    fiscal_data: {
      fiscal_year: 2023,
      max_date: "2024-01-27",
      min_date: "2023-01-29",
      quarters: [
        {
          fiscal_quarter: 1,
          max_date: "2023-04-29",
          min_date: "2023-01-29",
          months: [
            {
              fiscal_month: 1,
              max_date: "2023-02-25",
              min_date: "2023-01-29",
              weeks: [
                {
                  fiscal_week: 1,
                  max_date: "2023-02-04",
                  min_date: "2023-01-29",
                },
                {
                  fiscal_week: 2,
                  max_date: "2023-02-11",
                  min_date: "2023-02-05",
                },
                {
                  fiscal_week: 3,
                  max_date: "2023-02-18",
                  min_date: "2023-02-12",
                },
                {
                  fiscal_week: 4,
                  max_date: "2023-02-25",
                  min_date: "2023-02-19",
                },
              ],
            },
            {
              fiscal_month: 2,
              max_date: "2023-03-25",
              min_date: "2023-02-26",
              weeks: [
                {
                  fiscal_week: 5,
                  max_date: "2023-03-04",
                  min_date: "2023-02-26",
                },
                {
                  fiscal_week: 6,
                  max_date: "2023-03-11",
                  min_date: "2023-03-05",
                },
                {
                  fiscal_week: 7,
                  max_date: "2023-03-18",
                  min_date: "2023-03-12",
                },
                {
                  fiscal_week: 8,
                  max_date: "2023-03-25",
                  min_date: "2023-03-19",
                },
              ],
            },
            {
              fiscal_month: 3,
              max_date: "2023-04-29",
              min_date: "2023-03-26",
              weeks: [
                {
                  fiscal_week: 9,
                  max_date: "2023-04-01",
                  min_date: "2023-03-26",
                },
                {
                  fiscal_week: 10,
                  max_date: "2023-04-08",
                  min_date: "2023-04-02",
                },
                {
                  fiscal_week: 11,
                  max_date: "2023-04-15",
                  min_date: "2023-04-09",
                },
                {
                  fiscal_week: 12,
                  max_date: "2023-04-22",
                  min_date: "2023-04-16",
                },
                {
                  fiscal_week: 13,
                  max_date: "2023-04-29",
                  min_date: "2023-04-23",
                },
              ],
            },
          ],
        },
        {
          fiscal_quarter: 2,
          max_date: "2023-07-29",
          min_date: "2023-04-30",
          months: [
            {
              fiscal_month: 4,
              max_date: "2023-05-27",
              min_date: "2023-04-30",
              weeks: [
                {
                  fiscal_week: 14,
                  max_date: "2023-05-06",
                  min_date: "2023-04-30",
                },
                {
                  fiscal_week: 15,
                  max_date: "2023-05-13",
                  min_date: "2023-05-07",
                },
                {
                  fiscal_week: 16,
                  max_date: "2023-05-20",
                  min_date: "2023-05-14",
                },
                {
                  fiscal_week: 17,
                  max_date: "2023-05-27",
                  min_date: "2023-05-21",
                },
              ],
            },
            {
              fiscal_month: 5,
              max_date: "2023-06-24",
              min_date: "2023-05-28",
              weeks: [
                {
                  fiscal_week: 18,
                  max_date: "2023-06-03",
                  min_date: "2023-05-28",
                },
                {
                  fiscal_week: 19,
                  max_date: "2023-06-10",
                  min_date: "2023-06-04",
                },
                {
                  fiscal_week: 20,
                  max_date: "2023-06-17",
                  min_date: "2023-06-11",
                },
                {
                  fiscal_week: 21,
                  max_date: "2023-06-24",
                  min_date: "2023-06-18",
                },
              ],
            },
            {
              fiscal_month: 6,
              max_date: "2023-07-29",
              min_date: "2023-06-25",
              weeks: [
                {
                  fiscal_week: 22,
                  max_date: "2023-07-01",
                  min_date: "2023-06-25",
                },
                {
                  fiscal_week: 23,
                  max_date: "2023-07-08",
                  min_date: "2023-07-02",
                },
                {
                  fiscal_week: 24,
                  max_date: "2023-07-15",
                  min_date: "2023-07-09",
                },
                {
                  fiscal_week: 25,
                  max_date: "2023-07-22",
                  min_date: "2023-07-16",
                },
                {
                  fiscal_week: 26,
                  max_date: "2023-07-29",
                  min_date: "2023-07-23",
                },
              ],
            },
          ],
        },
        {
          fiscal_quarter: 3,
          max_date: "2023-10-28",
          min_date: "2023-07-30",
          months: [
            {
              fiscal_month: 7,
              max_date: "2023-08-26",
              min_date: "2023-07-30",
              weeks: [
                {
                  fiscal_week: 27,
                  max_date: "2023-08-05",
                  min_date: "2023-07-30",
                },
                {
                  fiscal_week: 28,
                  max_date: "2023-08-12",
                  min_date: "2023-08-06",
                },
                {
                  fiscal_week: 29,
                  max_date: "2023-08-19",
                  min_date: "2023-08-13",
                },
                {
                  fiscal_week: 30,
                  max_date: "2023-08-26",
                  min_date: "2023-08-20",
                },
              ],
            },
            {
              fiscal_month: 8,
              max_date: "2023-09-23",
              min_date: "2023-08-27",
              weeks: [
                {
                  fiscal_week: 31,
                  max_date: "2023-09-02",
                  min_date: "2023-08-27",
                },
                {
                  fiscal_week: 32,
                  max_date: "2023-09-09",
                  min_date: "2023-09-03",
                },
                {
                  fiscal_week: 33,
                  max_date: "2023-09-16",
                  min_date: "2023-09-10",
                },
                {
                  fiscal_week: 34,
                  max_date: "2023-09-23",
                  min_date: "2023-09-17",
                },
              ],
            },
            {
              fiscal_month: 9,
              max_date: "2023-10-28",
              min_date: "2023-09-24",
              weeks: [
                {
                  fiscal_week: 35,
                  max_date: "2023-09-30",
                  min_date: "2023-09-24",
                },
                {
                  fiscal_week: 36,
                  max_date: "2023-10-07",
                  min_date: "2023-10-01",
                },
                {
                  fiscal_week: 37,
                  max_date: "2023-10-14",
                  min_date: "2023-10-08",
                },
                {
                  fiscal_week: 38,
                  max_date: "2023-10-21",
                  min_date: "2023-10-15",
                },
                {
                  fiscal_week: 39,
                  max_date: "2023-10-28",
                  min_date: "2023-10-22",
                },
              ],
            },
          ],
        },
        {
          fiscal_quarter: 4,
          max_date: "2024-01-27",
          min_date: "2023-10-29",
          months: [
            {
              fiscal_month: 10,
              max_date: "2023-11-25",
              min_date: "2023-10-29",
              weeks: [
                {
                  fiscal_week: 40,
                  max_date: "2023-11-04",
                  min_date: "2023-10-29",
                },
                {
                  fiscal_week: 41,
                  max_date: "2023-11-11",
                  min_date: "2023-11-05",
                },
                {
                  fiscal_week: 42,
                  max_date: "2023-11-18",
                  min_date: "2023-11-12",
                },
                {
                  fiscal_week: 43,
                  max_date: "2023-11-25",
                  min_date: "2023-11-19",
                },
              ],
            },
            {
              fiscal_month: 11,
              max_date: "2023-12-23",
              min_date: "2023-11-26",
              weeks: [
                {
                  fiscal_week: 44,
                  max_date: "2023-12-02",
                  min_date: "2023-11-26",
                },
                {
                  fiscal_week: 45,
                  max_date: "2023-12-09",
                  min_date: "2023-12-03",
                },
                {
                  fiscal_week: 46,
                  max_date: "2023-12-16",
                  min_date: "2023-12-10",
                },
                {
                  fiscal_week: 47,
                  max_date: "2023-12-23",
                  min_date: "2023-12-17",
                },
              ],
            },
            {
              fiscal_month: 12,
              max_date: "2024-01-27",
              min_date: "2023-12-24",
              weeks: [
                {
                  fiscal_week: 48,
                  max_date: "2023-12-30",
                  min_date: "2023-12-24",
                },
                {
                  fiscal_week: 49,
                  max_date: "2024-01-06",
                  min_date: "2023-12-31",
                },
                {
                  fiscal_week: 50,
                  max_date: "2024-01-13",
                  min_date: "2024-01-07",
                },
                {
                  fiscal_week: 51,
                  max_date: "2024-01-20",
                  min_date: "2024-01-14",
                },
                {
                  fiscal_week: 52,
                  max_date: "2024-01-27",
                  min_date: "2024-01-21",
                },
              ],
            },
          ],
        },
      ],
    },
    year: 2023,
  },
  {
    fiscal_data: {
      fiscal_year: 2024,
      max_date: "2025-01-25",
      min_date: "2024-01-28",
      quarters: [
        {
          fiscal_quarter: 1,
          max_date: "2024-04-27",
          min_date: "2024-01-28",
          months: [
            {
              fiscal_month: 1,
              max_date: "2024-02-24",
              min_date: "2024-01-28",
              weeks: [
                {
                  fiscal_week: 1,
                  max_date: "2024-02-03",
                  min_date: "2024-01-28",
                },
                {
                  fiscal_week: 2,
                  max_date: "2024-02-10",
                  min_date: "2024-02-04",
                },
                {
                  fiscal_week: 3,
                  max_date: "2024-02-17",
                  min_date: "2024-02-11",
                },
                {
                  fiscal_week: 4,
                  max_date: "2024-02-24",
                  min_date: "2024-02-18",
                },
              ],
            },
            {
              fiscal_month: 2,
              max_date: "2024-03-23",
              min_date: "2024-02-25",
              weeks: [
                {
                  fiscal_week: 5,
                  max_date: "2024-03-02",
                  min_date: "2024-02-25",
                },
                {
                  fiscal_week: 6,
                  max_date: "2024-03-09",
                  min_date: "2024-03-03",
                },
                {
                  fiscal_week: 7,
                  max_date: "2024-03-16",
                  min_date: "2024-03-10",
                },
                {
                  fiscal_week: 8,
                  max_date: "2024-03-23",
                  min_date: "2024-03-17",
                },
              ],
            },
            {
              fiscal_month: 3,
              max_date: "2024-04-27",
              min_date: "2024-03-24",
              weeks: [
                {
                  fiscal_week: 9,
                  max_date: "2024-03-30",
                  min_date: "2024-03-24",
                },
                {
                  fiscal_week: 10,
                  max_date: "2024-04-06",
                  min_date: "2024-03-31",
                },
                {
                  fiscal_week: 11,
                  max_date: "2024-04-13",
                  min_date: "2024-04-07",
                },
                {
                  fiscal_week: 12,
                  max_date: "2024-04-20",
                  min_date: "2024-04-14",
                },
                {
                  fiscal_week: 13,
                  max_date: "2024-04-27",
                  min_date: "2024-04-21",
                },
              ],
            },
          ],
        },
        {
          fiscal_quarter: 2,
          max_date: "2024-07-27",
          min_date: "2024-04-28",
          months: [
            {
              fiscal_month: 4,
              max_date: "2024-05-25",
              min_date: "2024-04-28",
              weeks: [
                {
                  fiscal_week: 14,
                  max_date: "2024-05-04",
                  min_date: "2024-04-28",
                },
                {
                  fiscal_week: 15,
                  max_date: "2024-05-11",
                  min_date: "2024-05-05",
                },
                {
                  fiscal_week: 16,
                  max_date: "2024-05-18",
                  min_date: "2024-05-12",
                },
                {
                  fiscal_week: 17,
                  max_date: "2024-05-25",
                  min_date: "2024-05-19",
                },
              ],
            },
            {
              fiscal_month: 5,
              max_date: "2024-06-22",
              min_date: "2024-05-26",
              weeks: [
                {
                  fiscal_week: 18,
                  max_date: "2024-06-01",
                  min_date: "2024-05-26",
                },
                {
                  fiscal_week: 19,
                  max_date: "2024-06-08",
                  min_date: "2024-06-02",
                },
                {
                  fiscal_week: 20,
                  max_date: "2024-06-15",
                  min_date: "2024-06-09",
                },
                {
                  fiscal_week: 21,
                  max_date: "2024-06-22",
                  min_date: "2024-06-16",
                },
              ],
            },
            {
              fiscal_month: 6,
              max_date: "2024-07-27",
              min_date: "2024-06-23",
              weeks: [
                {
                  fiscal_week: 22,
                  max_date: "2024-06-29",
                  min_date: "2024-06-23",
                },
                {
                  fiscal_week: 23,
                  max_date: "2024-07-06",
                  min_date: "2024-06-30",
                },
                {
                  fiscal_week: 24,
                  max_date: "2024-07-13",
                  min_date: "2024-07-07",
                },
                {
                  fiscal_week: 25,
                  max_date: "2024-07-20",
                  min_date: "2024-07-14",
                },
                {
                  fiscal_week: 26,
                  max_date: "2024-07-27",
                  min_date: "2024-07-21",
                },
              ],
            },
          ],
        },
        {
          fiscal_quarter: 3,
          max_date: "2024-10-26",
          min_date: "2024-07-28",
          months: [
            {
              fiscal_month: 7,
              max_date: "2024-08-24",
              min_date: "2024-07-28",
              weeks: [
                {
                  fiscal_week: 27,
                  max_date: "2024-08-03",
                  min_date: "2024-07-28",
                },
                {
                  fiscal_week: 28,
                  max_date: "2024-08-10",
                  min_date: "2024-08-04",
                },
                {
                  fiscal_week: 29,
                  max_date: "2024-08-17",
                  min_date: "2024-08-11",
                },
                {
                  fiscal_week: 30,
                  max_date: "2024-08-24",
                  min_date: "2024-08-18",
                },
              ],
            },
            {
              fiscal_month: 8,
              max_date: "2024-09-21",
              min_date: "2024-08-25",
              weeks: [
                {
                  fiscal_week: 31,
                  max_date: "2024-08-31",
                  min_date: "2024-08-25",
                },
                {
                  fiscal_week: 32,
                  max_date: "2024-09-07",
                  min_date: "2024-09-01",
                },
                {
                  fiscal_week: 33,
                  max_date: "2024-09-14",
                  min_date: "2024-09-08",
                },
                {
                  fiscal_week: 34,
                  max_date: "2024-09-21",
                  min_date: "2024-09-15",
                },
              ],
            },
            {
              fiscal_month: 9,
              max_date: "2024-10-26",
              min_date: "2024-09-22",
              weeks: [
                {
                  fiscal_week: 35,
                  max_date: "2024-09-28",
                  min_date: "2024-09-22",
                },
                {
                  fiscal_week: 36,
                  max_date: "2024-10-05",
                  min_date: "2024-09-29",
                },
                {
                  fiscal_week: 37,
                  max_date: "2024-10-12",
                  min_date: "2024-10-06",
                },
                {
                  fiscal_week: 38,
                  max_date: "2024-10-19",
                  min_date: "2024-10-13",
                },
                {
                  fiscal_week: 39,
                  max_date: "2024-10-26",
                  min_date: "2024-10-20",
                },
              ],
            },
          ],
        },
        {
          fiscal_quarter: 4,
          max_date: "2025-01-25",
          min_date: "2024-10-27",
          months: [
            {
              fiscal_month: 10,
              max_date: "2024-11-23",
              min_date: "2024-10-27",
              weeks: [
                {
                  fiscal_week: 40,
                  max_date: "2024-11-02",
                  min_date: "2024-10-27",
                },
                {
                  fiscal_week: 41,
                  max_date: "2024-11-09",
                  min_date: "2024-11-03",
                },
                {
                  fiscal_week: 42,
                  max_date: "2024-11-16",
                  min_date: "2024-11-10",
                },
                {
                  fiscal_week: 43,
                  max_date: "2024-11-23",
                  min_date: "2024-11-17",
                },
              ],
            },
            {
              fiscal_month: 11,
              max_date: "2024-12-21",
              min_date: "2024-11-24",
              weeks: [
                {
                  fiscal_week: 44,
                  max_date: "2024-11-30",
                  min_date: "2024-11-24",
                },
                {
                  fiscal_week: 45,
                  max_date: "2024-12-07",
                  min_date: "2024-12-01",
                },
                {
                  fiscal_week: 46,
                  max_date: "2024-12-14",
                  min_date: "2024-12-08",
                },
                {
                  fiscal_week: 47,
                  max_date: "2024-12-21",
                  min_date: "2024-12-15",
                },
              ],
            },
            {
              fiscal_month: 12,
              max_date: "2025-01-25",
              min_date: "2024-12-22",
              weeks: [
                {
                  fiscal_week: 48,
                  max_date: "2024-12-28",
                  min_date: "2024-12-22",
                },
                {
                  fiscal_week: 49,
                  max_date: "2025-01-04",
                  min_date: "2024-12-29",
                },
                {
                  fiscal_week: 50,
                  max_date: "2025-01-11",
                  min_date: "2025-01-05",
                },
                {
                  fiscal_week: 51,
                  max_date: "2025-01-18",
                  min_date: "2025-01-12",
                },
                {
                  fiscal_week: 52,
                  max_date: "2025-01-25",
                  min_date: "2025-01-19",
                },
              ],
            },
          ],
        },
      ],
    },
    year: 2024,
  },
];

export const sampleEventList = [
  {
    event_id: 433,
    name: "9.18-9.22 WILDCARD: Baby Launch & Consumables Relaunch",
    start_date: "09/18/2023",
    end_date: "09/22/2023",
    id: 433,
    status: "ongoing",
  },
  {
    event_id: 389,
    name: "SEPT WK 4 PRIMARY Fall Home & Halloween",
    start_date: "09/16/2023",
    end_date: "09/22/2023",
    id: 389,
    type: "event",
    status: "ongoing",
  },
  {
    event_id: 430,
    name: "9.11-9.17 PRIMARY: SKUs for Whole-house $10 off $50 Offer",
    start_date: "09/11/2023",
    end_date: "09/17/2023",
    id: 430,
    type: "event",
    status: "ongoing",
  },
  {
    event_id: 432,
    name: "9.11-9.17 WILDCARD: Baby Launch & Consumables Relaunch",
    start_date: "09/11/2023",
    end_date: "09/17/2023",
    id: 432,
    type: "event",
    status: "ongoing",
  },
  {
    event_id: 434,
    name: "9.5-9.10 TENTPOLE: Post Labor Day SHORT BURST",
    start_date: "09/05/2023",
    end_date: "09/10/2023",
    id: 434,
    type: "event",
    status: "ongoing",
  },
  {
    event_id: 397,
    name: "SEPT WK 2 WILDCARD ",
    start_date: "09/02/2023",
    end_date: "09/08/2023",
    id: 397,
    type: "event",
    status: "ongoing",
  },
  {
    event_id: 387,
    name: "SEPT WK 2 PRIMARY Fall Home & Halloween",
    start_date: "09/02/2023",
    end_date: "09/08/2023",
    id: 387,
    type: "event",
    status: "ongoing",
  },
  {
    event_id: 391,
    name: "SEPT WK 2 TENTPOLE Labor Day Sale",
    start_date: "09/02/2023",
    end_date: "09/08/2023",
    id: 391,
    type: "event",
    status: "ongoing",
  },
  {
    event_id: 393,
    name: "SEPT WK 2 SECONDARY Tailgate Party",
    start_date: "09/02/2023",
    end_date: "09/08/2023",
    id: 393,
    type: "event",
    status: "ongoing",
  },
  {
    event_id: 426,
    name: "8.31-9.4 TENTPOLE: Labor Day SHORT BURST",
    start_date: "08/31/2023",
    end_date: "09/04/2023",
    id: 426,
    type: "event",
    status: "ongoing",
  },
  {
    event_id: 451,
    name: "Resimulate Event Sid",
    start_date: "08/27/2023",
    end_date: "08/31/2023",
    id: 451,
    type: "event",
    status: "ongoing",
  },
  {
    event_id: 390,
    name: "SEPT WK 1 TENTPOLE Labor Day Sale",
    start_date: "08/26/2023",
    end_date: "09/01/2023",
    id: 390,
    type: "event",
    status: "ongoing",
  },
  {
    event_id: 413,
    name: "20% off all Broyhill Furniture, Bedding & Bath",
    start_date: "08/12/2023",
    end_date: "08/25/2023",
    id: 413,
    type: "event",
    status: "ongoing",
  },
  {
    event_id: 342,
    name: "AUG WK 3 WILDCARD ",
    start_date: "08/12/2023",
    end_date: "08/18/2023",
    id: 342,
    type: "event",
    status: "ongoing",
  },
  {
    event_id: 339,
    name: "AUG WK 2 WILDCARD",
    start_date: "08/05/2023",
    end_date: "08/11/2023",
    id: 339,
    type: "event",
    status: "ongoing",
  },
];
