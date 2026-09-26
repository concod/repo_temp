import { Link } from '@mui/material';

export const LinkRenderer = ({ text }) => {
  // Updated regex to capture both link and optional display text in brackets
  const linkRegex = /<link>(.*?)<\/link>(?:\[(.*?)\])?/g;
  const parts = text.split(/((?:<link>.*?<\/link>(?:\[.*?\])?))(?!])/g);
  
  return parts.map((part, index) => {
    if (part?.startsWith('<link>')) {
      // Extract the link URL
      const urlMatch = part.match(/<link>(.*?)<\/link>/);
      const url = urlMatch ? urlMatch[1] : '';
      
      // Extract the display text if present in brackets
      const displayTextMatch = part.match(/<\/link>\[(.*?)\]/);
      const displayText = displayTextMatch ? displayTextMatch[1] : url;

      return (
        <Link
          key={index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          underline="hover"
        >
          {displayText}
        </Link>
      );
    }
    return part;
  });
};

export default LinkRenderer; 