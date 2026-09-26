/**
 * HighlightedRenderer will take sentence
 * as a param to it and replace the word
 * which is inside this braces like this
 * {word} with a highlighted word and
 * return back this new sentence with
 * these words highlighted
 * @param {string} sentence
 * @returns
 */
const HighlightedRenderer = ({ sentence }) => {
  const regexWithBraces = /({[^{}]+})/g;

  // Split the sentence into parts based on the braces
  const parts = sentence.split(regexWithBraces);

  // Map each part and wrap text inside braces with a span for highlighting
  const highlightedSentence = parts.map((part, index) => {
    if (regexWithBraces.test(part)) {
      // replace braces with empty string
      let textWithNoBraces = part.replace(/{|}/g, "");
      // Text inside braces, wrap it in a span with a highlight class
      return (
        <span key={index} className="highlight">
          {textWithNoBraces}
        </span>
      );
    } else {
      // Normal text, return as is
      return part;
    }
  });
  return <>{highlightedSentence}</>;
};

export default HighlightedRenderer;
