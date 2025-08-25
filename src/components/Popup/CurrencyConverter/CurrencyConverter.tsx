import React from 'react';
import { Typography } from '@mui/material';

export const CurrencyConverter: React.FC = () => {
  return (
    <div style={{ marginTop: '16px', padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
      <Typography variant="h6" component="h3" style={{ marginBottom: '8px' }}>
        Currency Converter
      </Typography>
      <Typography variant="body2" color="textSecondary">
        Currency conversion feature coming soon...
      </Typography>
    </div>
  );
};
