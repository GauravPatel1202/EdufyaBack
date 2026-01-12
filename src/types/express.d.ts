// src/types/express.d.ts

import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      /**
       * Authenticated user information added by authMiddleware.
       * Adjust the fields as needed for your application.
       */
      user?: {
        id: string;
        // add other user properties if required, e.g., role, email
        // role?: string;
        // email?: string;
      };
    }
  }
}

export {};
