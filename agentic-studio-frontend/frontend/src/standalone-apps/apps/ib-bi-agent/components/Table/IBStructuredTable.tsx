import type { StructuredDataResponse } from "../../types/chat.types";
import { getColumnName, getRowValues } from "../../types/chat.types";
import "./IBStructuredTable.scss";

interface IBStructuredTableProps {
  tables: NonNullable<StructuredDataResponse["tables"]>;
}

const getValueTrend = (value: string): "positive" | "negative" | "neutral" => {
  const trimmed = value.trim();
  if (!trimmed) return "neutral";
  if (trimmed.startsWith("+")) return "positive";
  if (trimmed.startsWith("-")) return "negative";
  return "neutral";
};

export const IBStructuredTable: React.FC<IBStructuredTableProps> = ({
  tables,
}) => {
  if (!tables || tables.length === 0) return null;

  return (
    <>
      {tables.map((table, index) => (
        <div key={index} className="ib-agent-table">
          {(table.title || table.description) && (
            <div className="ib-agent-table__header">
              {table.title && (
                <h3 className="ib-agent-table__title">{table.title}</h3>
              )}
              {table.description && (
                <p className="ib-agent-table__description">
                  {table.description}
                </p>
              )}
            </div>
          )}

          <div className="ib-agent-table__scroll-wrapper">
            <table className="ib-agent-table__table">
              <thead>
                <tr>
                  {table.columns.map((col, i) => (
                    <th key={i}>{getColumnName(col)}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {table.rows.map((row, rIndex) => {
                  const displayValues = getRowValues(row);
                  return (
                    <tr key={rIndex}>
                      {displayValues.map((cell, cIndex) => {
                        const displayValue =
                          cell !== null && cell !== undefined ? String(cell) : "-";
                        const trend = cIndex === 0 ? "neutral" : getValueTrend(displayValue);
                        const trendArrow = trend === "positive" ? "↑" : trend === "negative" ? "↓" : "";

                        return (
                          <td key={cIndex}>
                            <span className={`ib-agent-table__cell-content ib-agent-table__cell-content--${trend}`}>
                              {trendArrow && (
                                <span className="ib-agent-table__trend-arrow" aria-hidden>
                                  {trendArrow}
                                </span>
                              )}
                              <span>{displayValue}</span>
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </>
  );
};