import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

/**
 * Custom renderer for InventorySmart product
 * Supports rendering image responses from the SmartBot API
 * 
 * @param {Object} botData - The bot response data
 * @param {Object} props - Additional props passed from the parent component
 * @returns {React.ReactElement} - The rendered component
 */
export const customRender = (botData, props) => {
  if (!botData || !botData.bodyText) {
    return (
      <Typography variant="body1" color="error">
        Error: Invalid response data
      </Typography>
    );
  }

  const { bodyText } = botData;
  
  // Handle image type
  if (bodyText.type === 'image') {
    return <ImageContent data={bodyText} />;
  }
  
  // Default fallback if we don't recognize the specific type
  return (
    <Typography variant="body1">
      {typeof bodyText === 'string' ? bodyText : 'Custom content could not be rendered'}
    </Typography>
  );
};

/**
 * Component to render image content with caption and description
 * 
 * @param {Object} props - Component props
 * @param {Object} props.data - Image data containing URL, caption, etc.
 * @returns {React.ReactElement} - The rendered image component
 */
const ImageContent = ({ data }) => {
  // Extract properties from data
  const { 
    imageUrl, 
    caption = '', 
    description = '', 
    altText = 'Bot image response'
  } = data;

  if (!imageUrl) {
    return (
      <Typography variant="body1" color="error">
        Error: Missing image URL
      </Typography>
    );
  }


  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 2, 
        mb: 2, 
        backgroundColor: 'rgba(0, 0, 0, 0.03)',
        borderRadius: '8px'
      }}
    >
      <Box sx={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
        <img 
          src={imageUrl} 
          alt={altText} 
          style={{ 
            width: '100%', 
            height: 'auto', 
            objectFit: 'contain',
            borderRadius: '4px'
          }} 
        />
        
        {caption && (
          <Typography 
            variant="subtitle1" 
            sx={{ 
              fontWeight: 'bold', 
              mt: 1.5, 
              textAlign: 'center' 
            }}
          >
            {caption}
          </Typography>
        )}
        
        {description && (
          <Typography 
            variant="body2" 
            sx={{ 
              mt: 1, 
              color: 'text.secondary',
              textAlign: 'center'
            }}
          >
            {description}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

export default customRender; 