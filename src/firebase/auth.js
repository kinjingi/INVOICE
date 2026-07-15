import { getAuth } from 'firebase/auth';
import { app } from './firebase-config';

export const auth = app ? getAuth(app) : null;
