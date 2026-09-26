export default function ({ row }) {
  return this.varianceList.includes(row.plan_version);
}
