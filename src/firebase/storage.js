import { getStorage } from 'firebase/storage';
import { app } from './firebase-config';

export const storage = app ? getStorage(app) : null;
