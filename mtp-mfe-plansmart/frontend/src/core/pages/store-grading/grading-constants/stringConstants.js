import ReviewClusters from "../components/reviewClusters";
import GradingDetails from "../components/gradingDetails";
import ReviewGrading from "../components/reviewGrading";
import PerformanceMetrices from "../components/performanceMetrices";
import GradingPercentile from "../components/gradingPercentile";

const GRADING_STEPS = {
  clusterSteps: [
    {
      screenCode: "grade-details",
      screen: <GradingDetails />,
      label: "Grade Details",
      isEditable: true,
      isCompleted: false,
    },
    {
      screenCode: "performance-matrices",
      screen: <PerformanceMetrices />,
      label: "Performance Matrices",
      isEditable: true,
      isCompleted: false,
    },
    {
      screenCode: "review-clusters",
      screen: <ReviewClusters />,
      label: "Review Clusters",
      isEditable: true,
      isCompleted: false,
    },
    {
      screenCode: "review-grading",
      screen: <ReviewGrading />,
      label: "Review Grading",
      isEditable: true,
      isCompleted: false,
    },
  ],
  percentile: [
    {
      screenCode: "grade-details",
      screen: <GradingDetails />,
      label: "Grade Details",
      isEditable: false,
      isCompleted: false,
    },
    {
      screenCode: "grade-percentile",
      screen: <GradingPercentile />,
      label: "Grade Percentile",
      isEditable: false,
      isCompleted: false,
    },
    {
      screenCode: "performance-matrices",
      screen: <PerformanceMetrices />,
      label: "Performance Matrices",
      isEditable: false,
      isCompleted: false,
    },
    {
      screenCode: "review-grading",
      screen: <ReviewGrading />,
      label: "Review Grading",
      isEditable: false,
      isCompleted: false,
    },
  ],
};

export const GRADE_SETTINGS_INPUT = [
  {
    accessor: "settings",
    label: "",
    attribute_type: "create_plan",
    column_name: "settings",
    field_type: "checkBoxGroup",
    filter_type: "non-cascaded",
    options: [
      {
        label: "Automatically grade new stores",
        value: "auto",
        isDisabled: false,
      },
      {
        label: "Automatically grade all stores for new product hierarchies",
        value: "product_auto",
        isDisabled: false,
      },
      {
        label: "Auto refresh grades with updated data",
        value: "refresh_updated",
        isDisabled: false,
      },
    ],
    dimension: "create_plan",
  },
];

export default GRADING_STEPS;
