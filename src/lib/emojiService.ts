import { getDb } from "./database";
import emojiData from "emoji-datasource";
export interface LocalEmoji {
  unified: string;
  emoji: string;
  name: string;
  category: string;
}
const charFromUtf16 = (utf16: string) => {
  try {
    return String.fromCodePoint(
      ...utf16.split("-").map((u) => parseInt(u, 16)),
    );
  } catch (e) {
    return "";
  }
};
export const populateEmojiDatabase = async () => {
  const db = getDb();
  try {
    const countResult = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM emojis",
    );
    if (countResult && countResult.count > 0) {
      return;
    }
    const startTime = Date.now();
    const filtered = emojiData.filter((e) => !e.obsoleted_by && e.category);
    await db.withTransactionAsync(async () => {
      for (const e of filtered) {
        const emojiChar = charFromUtf16(e.unified);
        if (!emojiChar) continue;
        await db.runAsync(
          "INSERT OR IGNORE INTO emojis (unified, emoji, name, category, sort_order) VALUES (?, ?, ?, ?, ?)",
          [e.unified, emojiChar, e.short_name, e.category, e.sort_order],
        );
      }
    });
  } catch (error) {
    console.error("[EmojiService] Population failed:", error);
  }
};
export const fetchEmojisByCategory = async (
  category: string,
): Promise<LocalEmoji[]> => {
  const db = getDb();
  try {
    return await db.getAllAsync<LocalEmoji>(
      "SELECT * FROM emojis WHERE category = ? ORDER BY sort_order ASC",
      [category],
    );
  } catch (error) {
    console.error(
      `[EmojiService] Failed to fetch category ${category}:`,
      error,
    );
    return [];
  }
};
export const searchEmojis = async (query: string): Promise<LocalEmoji[]> => {
  const db = getDb();
  try {
    const safeQuery = `%${query.toLowerCase()}%`;
    return await db.getAllAsync<LocalEmoji>(
      "SELECT * FROM emojis WHERE name LIKE ? ORDER BY sort_order ASC LIMIT 100",
      [safeQuery],
    );
  } catch (error) {
    console.error("[EmojiService] Search failed:", error);
    return [];
  }
};
export const fetchEmojiCategories = async (): Promise<string[]> => {
  const db = getDb();
  try {
    const results = await db.getAllAsync<{ category: string }>(
      "SELECT DISTINCT category FROM emojis ORDER BY category ASC",
    );
    return results.map((r) => r.category);
  } catch (error) {
    return [];
  }
};
