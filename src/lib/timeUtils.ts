export const formatStatusTime = (timestamp: any): string => {
  if (!timestamp) return "Just now";
  const date =
    typeof timestamp.toDate === "function"
      ? timestamp.toDate()
      : new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hr ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};
