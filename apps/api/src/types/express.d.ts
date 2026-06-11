declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        phone: string;
        role: string;
      };
    }
  }
}

export {};
