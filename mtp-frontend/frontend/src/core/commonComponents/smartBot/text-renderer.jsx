import { useStyles } from "./smartBotStyling";

export const TextRenderer = (props) => {
  const { text } = props;
  const classes = useStyles();
  const customSplit = (sentence) => {
    // Use a regular expression to handle words enclosed in double stars as separate matches
    const regex = /\*\*[^*]+\*\*|\S+/g;
  
    // Match the pattern and return the array of words
    return sentence.match(regex) || [];
  }
  let textArray = customSplit(text);

  const sentenceWithoutStars = textArray.map((splittedWord) => {
    if(splittedWord.indexOf('**') > -1){
      let wordWithNoStars = splittedWord.replaceAll("**", "").trim();
      return (
        <span className={classes.boldText}>
          {wordWithNoStars}
        </span>
      );
    }
    return splittedWord+" ";
  })

  return <p>{sentenceWithoutStars}</p>;
};
