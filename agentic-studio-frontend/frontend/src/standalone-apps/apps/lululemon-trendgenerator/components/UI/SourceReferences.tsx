import React from 'react';
import { motion } from 'framer-motion';
import { extractSourceName } from '../../utils/messageParser';

interface SourceReferencesProps {
  sources: string[];
}

export const SourceReferences: React.FC<SourceReferencesProps> = ({ sources }) => {
  if (!sources.length) return null;

  return (
    <motion.div
      className="message-sources"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      {sources.map((source, index) => (
        <motion.div
          key={index}
          className="source-number-button"
          title={source}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ 
            duration: 0.3, 
            delay: 0.1 + (index * 0.05) 
          }}
        >
          <span className="source-number">{index + 1}</span>
          <span className="source-name">{extractSourceName(source)}</span>
        </motion.div>
      ))}
    </motion.div>
  );
};


