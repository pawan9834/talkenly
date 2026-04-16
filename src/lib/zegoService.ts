import * as ZIM from "zego-zim-react-native";
import * as ZPNs from "zego-zpns-react-native";
import ZegoUIKitSignalingPlugin from "@zegocloud/zego-uikit-signaling-plugin-rn";
import ZegoUIKitPrebuiltCallService from "@zegocloud/zego-uikit-prebuilt-call-rn";
import { Platform } from "react-native";
const appID = 1562238181;
const appSign =
  "911d5e7ccb9aa6ff15d0249b958844282ecc30b825a24ded115fb4716c4dc5dd";
export const onUserLogin = async (userID: string, userName: string) => {
  try {
    await ZegoUIKitPrebuiltCallService.init(
      appID,
      appSign,
      userID,
      userName,
      [ZIM, ZPNs, ZegoUIKitSignalingPlugin],
      {
        ringtoneConfig: {
          incomingCallFileName: "zego_incoming.mp3",
          outgoingCallFileName: "zego_outgoing.mp3",
        },
        onIncomingCallReceived: (
          callID: string,
          inviter: any,
          type: number,
          invitees: any[],
        ) => {
          const { saveCallLog } = require("./callLogService");
          saveCallLog({
            name: inviter.name,
            phoneNumber: inviter.id,
            type: type === 1 ? "video" : "voice",
            status: "incoming",
          });
        },
        notifyWhenAppRunningInBackgroundOrQuit: true,
        isAndroidDebug: __DEV__,
      },
    );
  } catch (error) {
    console.error("[ZegoService] Initialization failed:", error);
  }
};
export const onUserLogout = () => {
  ZegoUIKitPrebuiltCallService.uninit();
};
export { ZegoUIKitPrebuiltCallService };
