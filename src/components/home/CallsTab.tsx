import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getCallLogs, CallLog } from "../../lib/callLogService";

const COLORS = {
  primary: "#FF6B00",     // Vibrant Orange
  onyx: "#0F172A",        // Deep Navy
  slate: "#1E293B",
  background: "#0F172A",  // Deep Navy background
  white: "#FFFFFF",
  textPrimary: "#FFFFFF", // White text
  textSecondary: "#94A3B8", // Slate secondary text
  border: "rgba(255,255,255,0.05)", // Glassmorphism border
  missed: "#EF4444",
  incoming: "#10B981",
  outgoing: "#10B981",
};

export default function CallsTab() {
  const [calls, setCalls] = React.useState<CallLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    React.useCallback(() => {
      loadCalls();
    }, []),
  );

  const loadCalls = async () => {
    setLoading(true);
    const logs = await getCallLogs();
    setCalls(logs);
    setLoading(false);
  };

  const renderCallItem = ({ item }: { item: CallLog }) => {
    const getStatusIcon = () => {
      switch (item.status) {
        case "incoming":
          return <MaterialIcons name="call-received" size={16} color={COLORS.incoming} />;
        case "outgoing":
          return <MaterialIcons name="call-made" size={16} color={COLORS.outgoing} />;
        case "missed":
          return <MaterialIcons name="call-missed" size={16} color={COLORS.missed} />;
        default:
          return null;
      }
    };

    return (
      <TouchableOpacity style={styles.callItem} activeOpacity={0.7}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        <View style={styles.callInfo}>
          <View style={styles.textContainer}>
            <Text style={[styles.name, item.status === "missed" && { color: COLORS.missed }]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.statusRow}>
              {getStatusIcon()}
              <Text style={styles.time}>{item.time}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.callBtn}>
            {item.type === "video" ? (
              <MaterialIcons name="videocam" size={24} color={COLORS.primary} />
            ) : (
              <MaterialIcons name="call" size={22} color={COLORS.primary} />
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={calls}
          keyExtractor={(item) => item.id}
          renderItem={renderCallItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="call-end" size={64} color="rgba(255,255,255,0.05)" />
              <Text style={[styles.emptyText, { color: COLORS.textSecondary }]}>No call history yet.</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { bottom: 11 + insets.bottom }]}
        activeOpacity={0.8}
        onPress={() => navigation.navigate("Contacts")}
      >
        <MaterialIcons name="add-call" size={24} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { paddingBottom: 100, paddingTop: 10 },
  callItem: { flexDirection: "row", paddingLeft: 16, height: 76, alignItems: "center" },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: "rgba(255,255,255,0.03)" },
  callInfo: {
    flex: 1, height: "100%", flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingRight: 16, marginLeft: 16,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.03)"
  },
  textContainer: { flex: 1, justifyContent: "center" },
  name: { fontSize: 17, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 2 },
  statusRow: { flexDirection: "row", alignItems: "center" },
  time: { fontSize: 14, color: COLORS.textSecondary, marginLeft: 6 },
  callBtn: { padding: 8 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 100 },
  emptyText: { marginTop: 16, fontSize: 16, color: COLORS.textSecondary, fontWeight: "600" },
  fab: {
    position: "absolute", right: 24, width: 62, height: 62, borderRadius: 31,
    backgroundColor: COLORS.primary, justifyContent: "center", alignItems: "center",
    elevation: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 10, zIndex: 10
  },
});
