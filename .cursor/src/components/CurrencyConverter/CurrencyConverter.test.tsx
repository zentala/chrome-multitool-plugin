// FILE: src/components/CurrencyConverter/CurrencyConverter.test.tsx
// This file contains tests for the CurrencyConverter component.

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CurrencyConverter from './CurrencyConverter';
import { fetchExchangeRates } from '../../utils/api'; // Ensure the path is correct
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { TextField, Button } from '@mui/material';

// Mock the fetchExchangeRates function
jest.mock('../../utils/api');
// ... existing code ...