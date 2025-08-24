import React, { useState } from 'react';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';

const TestToggleButton: React.FC = () => {
  const [alignment, setAlignment] = useState('left');

  const handleAlignmentChange = (
    event: React.MouseEvent<HTMLElement>,
    newAlignment: string | null
  ) => {
    if (newAlignment) {
      console.log('Zmiana wyrównania na:', newAlignment);
      setAlignment(newAlignment);
    }
  };

  return (
    <ToggleButtonGroup
      value={alignment}
      exclusive
      onChange={handleAlignmentChange}
      aria-label="text alignment"
    >
      <ToggleButton value="left" aria-label="left aligned">
        <FormatAlignLeftIcon />
      </ToggleButton>
      <ToggleButton value="center" aria-label="centered">
        <FormatAlignCenterIcon />
      </ToggleButton>
      <ToggleButton value="right" aria-label="right aligned">
        <FormatAlignRightIcon />
      </ToggleButton>
    </ToggleButtonGroup>
  );
};

export default TestToggleButton; 