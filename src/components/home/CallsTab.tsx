import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { getCallLogs, CallLog } from "../../lib/callLogService";
export default function CallsTab() {
  const [calls, setCalls] = React.useState<CallLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const theme = useColorScheme() ?? "light";
  const isDark = theme === "dark";
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
  const colors = {
    background: isDark ? "#111B21" : "#FFFFFF",
    textPrimary: isDark ? "#E9EDEF" : "#111111",
    textSecondary: isDark ? "#8696A0" : "#667781",
    border: isDark ? "#222D34" : "#F2F2F2",
    missed: "#EF5350",
    incoming: "#25D366",
    outgoing: "#25D366",
    icon: isDark ? "#8696A0" : "#008080",
  };
  const renderCallItem = ({ item }: { item: CallLog }) => {
    const getStatusIcon = () => {
      switch (item.status) {
        case "incoming":
          return (
            <MaterialIcons
              name="call-received"
              size={16}
              color={colors.incoming}
            />
          );
        case "outgoing":
          return (
            <MaterialIcons name="call-made" size={16} color={colors.outgoing} />
          );
        case "missed":
          return (
            <MaterialIcons name="call-missed" size={16} color={colors.missed} />
          );
      }
    };
    return (
      <TouchableOpacity style={styles.callItem} activeOpacity={0.7}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        <View style={[styles.callInfo, { borderBottomColor: colors.border }]}>
          <View style={styles.textContainer}>
            <Text
              style={[
                styles.name,
                {
                  color:
                    item.status === "missed"
                      ? colors.missed
                      : colors.textPrimary,
                },
              ]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <View style={styles.statusRow}>
              {getStatusIcon()}
              <Text style={[styles.time, { color: colors.textSecondary }]}>
                {item.time}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.callBtn}>
            {item.type === "video" ? (
              <MaterialIcons name="videocam" size={24} color={colors.icon} />
            ) : (
              <MaterialIcons name="call" size={22} color={colors.icon} />
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#008080" />
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
              <MaterialIcons name="call-end" size={64} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No call history yet.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    paddingBottom: 100,
  },
  callItem: {
    flexDirection: "row",
    paddingLeft: 16,
    height: 72,
    alignItems: "center",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#ccc",
  },
  callInfo: {
    flex: 1,
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 16,
    marginLeft: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
  },
  name: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  time: {
    fontSize: 14,
    marginLeft: 4,
  },
  callBtn: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
  },
});
