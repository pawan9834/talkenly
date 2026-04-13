import { getDb } from './database';
import emojiData from 'emoji-datasource';

export interface LocalEmoji {
  unified: string;
  emoji: string;
  name: string;
  category: string;
}

/**
 * Transforms a unified code (e.g., "1F600") into a actual emoji character.
 */
const charFromUtf16 = (utf16: string) => {
  try {
    return String.fromCodePoint(...utf16.split("-").map(u => parseInt(u, 16)));
  } catch (e) {
    return '';
  }
};

/**
 * Populates the SQLite emoji table if it's currently empty.
 * Runs in a transaction for maximum speed.
 */
export const populateEmojiDatabase = async () => {
  const db = getDb();
  try {
    // Check if already populated
    const countResult = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM emojis');
    if (countResult && countResult.count > 0) {
      console.log('[EmojiService] Database already populated.');
      return;
    }

    console.log('[EmojiService] Populating emoji database...');
    const startTime = Date.now();

    // Filter out obsolete emojis and those without categories
    const filtered = emojiData.filter(e => !e.obsoleted_by && e.category);

    await db.withTransactionAsync(async () => {
      for (const e of filtered) {
        const emojiChar = charFromUtf16(e.unified);
        if (!emojiChar) continue;

        await db.runAsync(
          'INSERT OR IGNORE INTO emojis (unified, emoji, name, category, sort_order) VALUES (?, ?, ?, ?, ?)',
          [e.unified, emojiChar, e.short_name, e.category, e.sort_order]
        );
      }
    });

    console.log(`[EmojiService] Successfully indexed ${filtered.length} emojis in ${Date.now() - startTime}ms`);
  } catch (error) {
    console.error('[EmojiService] Population failed:', error);
  }
};

/**
 * Fetch emojis for a specific category
 */
export const fetchEmojisByCategory = async (category: string): Promise<LocalEmoji[]> => {
  const db = getDb();
  try {
    return await db.getAllAsync<LocalEmoji>(
      'SELECT * FROM emojis WHERE category = ? ORDER BY sort_order ASC',
      [category]
    );
  } catch (error) {
    console.error(`[EmojiService] Failed to fetch category ${category}:`, error);
    return [];
  }
};

/**
 * Search emojis by name
 */
export const searchEmojis = async (query: string): Promise<LocalEmoji[]> => {
  const db = getDb();
  try {
    const safeQuery = `%${query.toLowerCase()}%`;
    return await db.getAllAsync<LocalEmoji>(
      'SELECT * FROM emojis WHERE name LIKE ? ORDER BY sort_order ASC LIMIT 100',
      [safeQuery]
    );
  } catch (error) {
    console.error('[EmojiService] Search failed:', error);
    return [];
  }
};

/**
 * Get all available categories
 */
export const fetchEmojiCategories = async (): Promise<string[]> => {
  const db = getDb();
  try {
    const results = await db.getAllAsync<{ category: string }>(
      'SELECT DISTINCT category FROM emojis ORDER BY category ASC'
    );
    return results.map(r => r.category);
  } catch (error) {
    return [];
  }
};
