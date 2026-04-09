import * as SQLite from 'expo-sqlite';

// Open database - this creates it if it doesn't exist
const db = SQLite.openDatabaseSync('talkenly.db');

export interface LocalContact {
  id: string;
  name: string;
  phoneNumber: string;
  normalizedPhone: string;
  imageUri?: string;
  isRegistered: number; // 0 or 1
  photoURL?: string; // Firestore photo
}

export const initDB = () => {
  try {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        phoneNumber TEXT,
        normalizedPhone TEXT,
        imageUri TEXT,
        photoURL TEXT,
        isRegistered INTEGER DEFAULT 0,
        lastSync INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_name ON contacts (name);
      CREATE INDEX IF NOT EXISTS idx_phone ON contacts (phoneNumber);
      CREATE INDEX IF NOT EXISTS idx_norm_phone ON contacts (normalizedPhone);
    `);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
};

export const getDb = () => db;

/**
 * Executes a raw query to fetch contacts
 */
export const fetchLocalContacts = async (searchQuery: string = ''): Promise<LocalContact[]> => {
  try {
    if (searchQuery.trim() === '') {
      return await db.getAllAsync<LocalContact>('SELECT * FROM contacts ORDER BY name ASC');
    }
    return await db.getAllAsync<LocalContact>(
      'SELECT * FROM contacts WHERE name LIKE ? OR phoneNumber LIKE ? ORDER BY name ASC',
      [`%${searchQuery}%`, `%${searchQuery}%`]
    );
  } catch (error) {
    console.error('Failed to fetch local contacts:', error);
    return [];
  }
};

/**
 * Batch inserts/updates contacts
 */
export const saveContactsBatch = async (contacts: any[]) => {
  try {
    await db.withTransactionAsync(async () => {
      for (const contact of contacts) {
        await db.runAsync(
          `INSERT INTO contacts (id, name, phoneNumber, normalizedPhone, imageUri, lastSync) 
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET 
             name = excluded.name,
             phoneNumber = excluded.phoneNumber,
             normalizedPhone = excluded.normalizedPhone,
             imageUri = excluded.imageUri,
             lastSync = excluded.lastSync`,
          [
            contact.id,
            contact.name,
            contact.phoneNumber,
            contact.normalizedPhone || null,
            contact.imageUri || null,
            Date.now()
          ]
        );
      }
    });
  } catch (error) {
    console.error('Batch save failed:', error);
  }
};

/**
 * Updates the registration status of contacts
 */
export const updateRegistrationStatus = async (phoneNumbers: string[], photoMap: Record<string, string>) => {
  try {
    await db.withTransactionAsync(async () => {
      for (const phone of phoneNumbers) {
        const photoURL = photoMap[phone] || null;
        await db.runAsync(
          'UPDATE contacts SET isRegistered = 1, photoURL = ? WHERE normalizedPhone = ?',
          [photoURL, phone]
        );
      }
    });
  } catch (error) {
    console.error('Update registration status failed:', error);
  }
};

/**
 * Counts total contacts in DB
 */
export const getContactCount = async (): Promise<number> => {
  try {
    const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM contacts');
    return result?.count || 0;
  } catch (error) {
    return 0;
  }
};
