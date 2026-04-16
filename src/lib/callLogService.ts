import AsyncStorage from "@react-native-async-storage/async-storage";
export interface CallLog {
  id: string;
  name: string;
  phoneNumber: string;
  time: string;
  type: "voice" | "video";
  status: "incoming" | "outgoing" | "missed";
  avatar?: string;
}
const CALL_LOG_KEY = "talkenly_call_logs";
const MAX_LOGS = 50;
export const saveCallLog = async (log: Omit<CallLog, "id" | "time">) => {
  try {
    const existingLogsJson = await AsyncStorage.getItem(CALL_LOG_KEY);
    const existingLogs: CallLog[] = existingLogsJson
      ? JSON.parse(existingLogsJson)
      : [];
    const newLog: CallLog = {
      ...log,
      id: Date.now().toString(),
      time: new Date().toLocaleString("en-US", {
        weekday: "short",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      }),
    };
    const updatedLogs = [newLog, ...existingLogs].slice(0, MAX_LOGS);
    await AsyncStorage.setItem(CALL_LOG_KEY, JSON.stringify(updatedLogs));
    return updatedLogs;
  } catch (error) {
    console.error("[CallLogService] Error saving call log:", error);
    return [];
  }
};
export const getCallLogs = async (): Promise<CallLog[]> => {
  try {
    const logsJson = await AsyncStorage.getItem(CALL_LOG_KEY);
    return logsJson ? JSON.parse(logsJson) : [];
  } catch (error) {
    console.error("[CallLogService] Error fetching call logs:", error);
    return [];
  }
};
export const clearCallLogs = async () => {
  try {
    await AsyncStorage.removeItem(CALL_LOG_KEY);
  } catch (error) {
    console.error("[CallLogService] Error clearing call logs:", error);
  }
};
