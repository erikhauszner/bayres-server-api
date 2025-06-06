import { Request } from 'express';
import { IUser } from '../models/User';

declare module 'express' {
  interface Request {
    user?: IUser;
  }
} 