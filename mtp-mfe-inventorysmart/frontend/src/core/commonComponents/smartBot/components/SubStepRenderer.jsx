import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { makeStyles } from '@mui/styles';
import { pxToRem } from 'core/Utils/functions/utils';

const useStyles = makeStyles(() => ({
  subStepMarkdown: {
    // Inherit font styles from parent (.progressSubItem)
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'inherit',
    lineHeight: 'inherit',
    color: 'inherit',
    '& p': {
      margin: 0,
      fontFamily: 'inherit',
      fontSize: 'inherit',
      fontWeight: 'inherit',
      lineHeight: 'inherit',
      color: 'inherit',
    },
    '& strong': {
      fontWeight: 700,
      color: 'inherit',
    },
    '& ul': {
      margin: `${pxToRem(4)} 0`,
      paddingLeft: pxToRem(18),
      fontFamily: 'inherit',
      fontSize: 'inherit',
      lineHeight: 'inherit',
      color: 'inherit',
      listStyleType: 'disc',
    },
    '& ol': {
      margin: `${pxToRem(4)} 0`,
      paddingLeft: pxToRem(18),
      fontFamily: 'inherit',
      fontSize: 'inherit',
      lineHeight: 'inherit',
      color: 'inherit',
      listStyleType: 'decimal',
    },
    '& li': {
      marginBottom: pxToRem(2),
      fontFamily: 'inherit',
      fontSize: 'inherit',
      lineHeight: 'inherit',
      color: 'inherit',
    },
    '& h1, & h2, & h3, & h4, & h5, & h6': {
      margin: `${pxToRem(4)} 0 ${pxToRem(2)}`,
      fontFamily: 'inherit',
      fontSize: 'inherit',
      fontWeight: 700,
      lineHeight: 'inherit',
      color: 'inherit',
    },
  },
}));

const preprocessSubStepMarkdown = (content) => {
  if (!content) return '';
  return content
    .replace(/\\n/g, '\n')
    .replace(/<b>\s*(.*?)\s*<\/b>/g, '**$1**')
    .replace(/<strong>\s*(.*?)\s*<\/strong>/g, '**$1**')
    .replace(/<i>\s*(.*?)\s*<\/i>/g, '*$1*')
    .replace(/<em>\s*(.*?)\s*<\/em>/g, '*$1*')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/(^|\n)(\d+\.\s+)/g, '$1\n$2')
    .replace(/(^|\n)([^\n-•]*[a-zA-Z0-9][^\n]*)\n([-•]\s+)/g, '$1$2\n\n$3')
    // Convert inline ' - ' into list items (handles text like "creation:** - **Constraints**")
    .replace(/\s+-\s+/g, '\n\n- ')
    .replace(/(\n\s{2,})([-•]|\d+\.)\s+/g, '\n    $2 ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const SubStepRenderer = ({ text }) => {
  const classes = useStyles();
  if (!text) return null;
  const processed = preprocessSubStepMarkdown(text);
  return (
    <div className={classes.subStepMarkdown}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
        {processed}
      </ReactMarkdown>
    </div>
  );
};

export default SubStepRenderer;
