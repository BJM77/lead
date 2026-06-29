// src/lib/logger.ts
import {
  getFirestore,
  collection,
  addDoc,
  query,
  onSnapshot,
  limit,
  orderBy,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';
import { app } from './firebase';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export type LogEntry = {
  id?: string;
  timestamp: number;
  level: LogLevel;
  message: string;
};

const db = getFirestore(app);
const logsCollection = collection(db, 'logs');
const MAX_LOGS = 200;

// In-memory store for server-side logs
const serverLogs: LogEntry[] = [];

export function getServerLogs(): LogEntry[] {
  return [...serverLogs].sort((a, b) => b.timestamp - a.timestamp);
}

export function clearServerLogs(): void {
  serverLogs.length = 0;
}

class Logger {
  async addLog(level: LogLevel, message: string) {
    // Log to the server console for immediate visibility during development
    console[level](message);
    
    // Only attempt Firestore logging on the client side to avoid PERMISSION_DENIED on the server
    if (typeof window === 'undefined') {
      serverLogs.push({
        id: `server-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        level,
        message,
      });
      if (serverLogs.length > MAX_LOGS) {
        serverLogs.shift();
      }
      return;
    }
    
    try {
      await addDoc(logsCollection, {
        timestamp: Date.now(),
        level,
        message,
      });
    } catch (error) {
      // Fallback to console if Firestore logging fails
      console.error('Failed to write log to Firestore:', error);
    }
  }

  info(message: string) {
    this.addLog('info', message);
  }

  warn(message: string) {
    this.addLog('warn', message);
  }

  error(message: string) {
    this.addLog('error', message);
  }

  debug(message: string) {
    this.addLog('debug', message);
  }

  listenToLogs(callback: (logs: LogEntry[]) => void): () => void {
    const q = query(
      logsCollection,
      orderBy('timestamp', 'desc'),
      limit(MAX_LOGS)
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const logs = querySnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as LogEntry)
        );
        callback(logs);
      },
      (error) => {
        console.error('Error listening to logs:', error);
        callback([]); // Send empty array on error
      }
    );

    return unsubscribe;
  }

  async getLogs(): Promise<LogEntry[]> {
    const q = query(
      logsCollection,
      orderBy('timestamp', 'desc'),
      limit(MAX_LOGS)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as LogEntry)
    );
  }

  async clearLogs(): Promise<void> {
    try {
      const snapshot = await getDocs(logsCollection);
      const deletePromises = snapshot.docs.map((document) =>
        deleteDoc(document.ref)
      );
      await Promise.all(deletePromises);
      this.info('Log collection cleared.');
    } catch (error: any) {
      this.error(`Failed to clear logs: ${error.message}`);
    }
  }
}

// Export a singleton instance
export const logger = new Logger();
