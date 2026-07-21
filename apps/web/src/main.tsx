/**
 * Copyright (c) 2026 Ahmed Aldhahi. All Rights Reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * This software is the intellectual property of Ahmed Aldhahi.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './app/app';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
