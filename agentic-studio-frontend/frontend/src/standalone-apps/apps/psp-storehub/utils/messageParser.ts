/**
 * Format text with basic HTML for fallback text rendering
 * Converts newlines to <br> tags and handles basic markdown bold syntax
 */
export function formatText(text: string): string {
  let processedText = text.replace(/\\n/g, '\n');
  processedText = processedText.replace(/\n/g, '<br>');
  processedText = processedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  return processedText;
}
