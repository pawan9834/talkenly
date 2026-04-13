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
  uid?: string; // Firestore UID
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
        uid TEXT,
        isRegistered INTEGER DEFAULT 0,
        lastSync INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_name ON contacts (name);
      CREATE INDEX IF NOT EXISTS idx_phone ON contacts (phoneNumber);
      CREATE INDEX IF NOT EXISTS idx_norm_phone ON contacts (normalizedPhone);

      CREATE TABLE IF NOT EXISTS emojis (
        unified TEXT PRIMARY KEY NOT NULL,
        emoji TEXT NOT NULL,
        name TEXT,
        category TEXT,
        sort_order INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_emoji_category ON emojis (category);
      CREATE INDEX IF NOT EXISTS idx_emoji_name ON emojis (name);
    `);
    console.log('Database initialized successfully');

    // MIGRATIONS: Add missing columns for existing users
    try {
      db.execSync('ALTER TABLE contacts ADD COLUMN uid TEXT;');
      console.log('Migration: Added uid column to contacts');
    } catch (e) {
      // Column likely already exists, ignore
    }

    try {
      db.execSync('ALTER TABLE contacts ADD COLUMN photoURL TEXT;');
      console.log('Migration: Added photoURL column to contacts');
    } catch (e) {
      // Column likely already exists, ignore
    }

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
    const safeSearch = `%${searchQuery}%`;
    return await db.getAllAsync<LocalContact>(
      'SELECT * FROM contacts WHERE name LIKE ? OR phoneNumber LIKE ? ORDER BY name ASC',
      [safeSearch, safeSearch]
    );
  } catch (error) {
    console.error('Failed to fetch local contacts:', error);
    return [];
  }
};

/**
 * Fetches contacts filtered by registration status and optional search query
 */
export const fetchContactsByRegistration = async (isRegistered: number, searchQuery: string = ''): Promise<LocalContact[]> => {
  try {
    if (searchQuery.trim() === '') {
      return await db.getAllAsync<LocalContact>(
        'SELECT * FROM contacts WHERE isRegistered = ? ORDER BY name ASC',
        [isRegistered]
      );
    }
    const safeSearch = `%${searchQuery}%`;
    return await db.getAllAsync<LocalContact>(
      'SELECT * FROM contacts WHERE isRegistered = ? AND (name LIKE ? OR phoneNumber LIKE ?) ORDER BY name ASC',
      [isRegistered, safeSearch, safeSearch]
    );
  } catch (error) {
    console.error(`Failed to fetch ${isRegistered ? 'registered' : 'invite'} contacts:`, error);
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
export const updateRegistrationStatus = async (phoneNumbers: string[], photoMap: Record<string, string>, uidMap: Record<string, string>) => {
  try {
    await db.withTransactionAsync(async () => {
      for (const phone of phoneNumbers) {
        const photoURL = photoMap[phone] || null;
        const uid = uidMap[phone] || null;
        await db.runAsync(
          'UPDATE contacts SET isRegistered = 1, photoURL = ?, uid = ? WHERE normalizedPhone = ?',
          [photoURL, uid, phone]
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
