/**
 * Format currency values
 */
export const formatCurrency = (value: number | string): string => {
  try {
    return '$' + Number(value).toFixed(2);
  } catch {
    return '$0.00';
  }
};