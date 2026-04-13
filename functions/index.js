const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Triggers a push notification when a new message is added to any chat.
 */
exports.sendchatnotification = onDocumentCreated(
    "chats/{chatId}/messages/{messageId}",
    async (event) => {
        const message = event.data.data();
        const chatId = event.params.chatId;

        console.log(`[TRIGGER] New message in chat: ${chatId}`);

        try {
            // 1. Get the parent chat document
            const chatRef = admin.firestore().collection("chats").doc(chatId);
            const chatDoc = await chatRef.get();
            if (!chatDoc.exists) {
                console.log("[ERROR] Parent chat doc missing");
                return null;
            }

            // 2. Identify recipient
            const participants = chatDoc.data().participants || [];
            const senderPhone = message.senderPhone;
            const recipientPhone = participants.find((p) => p !== senderPhone);

            if (!recipientPhone) {
                console.log("[ERROR] Recipient not found");
                return null;
            }

            // 3. Find recipient's FCM token
            const userSnapshot = await admin.firestore()
                .collection("users")
                .where("phoneNumber", "==", recipientPhone)
                .limit(1)
                .get();

            if (userSnapshot.empty) {
                console.log(`[ERROR] No user registry for: ${recipientPhone}`);
                return null;
            }

            const recipientData = userSnapshot.docs[0].data();
            const fcmToken = recipientData.fcmToken;

            if (!fcmToken) {
                console.log(`[ERROR] No token for: ${recipientPhone}`);
                return null;
            }

            // 4. Send the notification using the modern API
            const payload = {
                token: fcmToken,
                notification: {
                    title: `Message from ${senderPhone}`,
                    body: message.text,
                },
                android: {
                    priority: "high",
                    notification: {
                        sound: "default",
                        clickAction: "FLUTTER_NOTIFICATION_CLICK",
                    },
                },
            };

            const response = await admin.messaging().send(payload);
            console.log(`[SUCCESS] Notification sent: ${response}`);
            return response;
        } catch (error) {
            console.error("[CRITICAL] Notification Error:", error);
            return null;
        }
    },
);
