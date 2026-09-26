export type HistorySection = {
  title: string;
  items: string[];
};

export const historySections: HistorySection[] = [
  {
    title: "Today",
    items: ["Portfolio review", "Risk summary", "Latest filings"],
  },
  {
    title: "Previous 7 days",
    items: ["Quarterly trends", "Customer themes", "Store walkthrough"],
  },
  {
    title: "Before 7 days",
    items: ["Archived briefing", "Legacy notes", "Compliance checklist"],
  },
];

