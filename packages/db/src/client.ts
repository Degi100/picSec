/**
 * MongoDB Client
 *
 * Singleton-Pattern fuer die Datenbankverbindung.
 * Verwendet Connection Pooling fuer Performance.
 */

import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

export interface DbConfig {
  uri: string;
  dbName: string;
}

/**
 * Verbindet zur MongoDB und gibt die Datenbank-Instanz zurueck
 *
 * @param config - Verbindungskonfiguration
 * @returns Die Datenbank-Instanz
 */
export const connectToDatabase = async (config: DbConfig): Promise<Db> => {
  if (db) {
    return db;
  }

  try {
    client = new MongoClient(config.uri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
    });

    await client.connect();
    db = client.db(config.dbName);

    console.log(`[DB] Verbunden mit MongoDB: ${config.dbName}`);

    return db;
  } catch (error) {
    console.error('[DB] Verbindungsfehler:', error);
    throw error;
  }
};

/**
 * Gibt die aktuelle Datenbank-Instanz zurueck
 *
 * @throws Error wenn nicht verbunden
 */
export const getDb = (): Db => {
  if (!db) {
    throw new Error('Datenbank nicht verbunden. Rufe zuerst connectToDatabase() auf.');
  }
  return db;
};

/**
 * Schliesst die Datenbankverbindung
 */
export const closeDatabase = async (): Promise<void> => {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('[DB] Verbindung geschlossen');
  }
};

/**
 * Prueft ob die Datenbank verbunden ist
 */
export const isConnected = (): boolean => {
  return db !== null;
};
