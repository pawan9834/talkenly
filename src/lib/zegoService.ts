import * as ZIM from 'zego-zim-react-native';
import * as ZPNs from 'zego-zpns-react-native';
import ZegoUIKitSignalingPlugin from '@zegocloud/zego-uikit-signaling-plugin-rn';
import ZegoUIKitPrebuiltCallService from '@zegocloud/zego-uikit-prebuilt-call-rn';
import { Platform } from 'react-native';

const appID = 1562238181;
const appSign = '911d5e7ccb9aa6ff15d0249b958844282ecc30b825a24ded115fb4716c4dc5dd';

/**
 * Initializes the ZegoCloud Call Service for the current user.
 * This should be called after the user successfully logs into the app.
 * 
 * @param userID The unique ID of the user (e.g., Firebase UID or Phone Number)
 * @param userName The display name of the user
 */
export const onUserLogin = async (userID: string, userName: string) => {
    console.log(`[ZegoService] Initializing for user: ${userID} (${userName})`);
    try {
        await ZegoUIKitPrebuiltCallService.init(
            appID,
            appSign,
            userID,
            userName,
            [ZIM, ZPNs, ZegoUIKitSignalingPlugin],
            {
                ringtoneConfig: {
                    incomingCallFileName: 'zego_incoming.mp3',
                    outgoingCallFileName: 'zego_outgoing.mp3',
                },
                notifyWhenAppRunningInBackgroundOrQuit: true,
                isAndroidDebug: __DEV__,
            }
        );
        console.log('[ZegoService] Initialization successful');
    } catch (error) {
        console.error('[ZegoService] Initialization failed:', error);
    }
};

/**
 * Uninitializes the ZegoCloud Call Service.
 * This should be called when the user logs out of the app.
 */
export const onUserLogout = () => {
    console.log('[ZegoService] Uninitializing ZegoService');
    ZegoUIKitPrebuiltCallService.uninit();
};

export { ZegoUIKitPrebuiltCallService };
