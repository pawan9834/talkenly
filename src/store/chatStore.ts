import { create } from "zustand";
import { Chat, Message } from "../types";
interface ChatState {
  chats: Chat[];
  activeMessages: Message[];
  activeChatId: string | null;
  isMessagesLoading: boolean;
  isChatsLoading: boolean;
  setChats: (chats: Chat[]) => void;
  setActiveMessages: (messages: Message[]) => void;
  setActiveChatId: (id: string | null) => void;
  setMessagesLoading: (loading: boolean) => void;
  setChatsLoading: (loading: boolean) => void;
  addMessage: (message: Message) => void;
  clearActiveChat: () => void;
}
export const useChatStore = create<ChatState>()((set) => ({
  chats: [],
  activeMessages: [],
  activeChatId: null,
  isMessagesLoading: false,
  isChatsLoading: true,
  setChats: (chats) => set({ chats, isChatsLoading: false }),
  setActiveMessages: (activeMessages) =>
    set({ activeMessages, isMessagesLoading: false }),
  setActiveChatId: (activeChatId) => set({ activeChatId }),
  setMessagesLoading: (isMessagesLoading) => set({ isMessagesLoading }),
  setChatsLoading: (isChatsLoading) => set({ isChatsLoading }),
  addMessage: (message) =>
    set((state) => ({ activeMessages: [...state.activeMessages, message] })),
  clearActiveChat: () =>
    set({ activeMessages: [], activeChatId: null, isMessagesLoading: false }),
}));
