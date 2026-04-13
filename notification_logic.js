const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

/**
 * Triggers a push notification when a new message is added to any chat.
 */
exports.sendChatNotification = functions.firestore
    .document('chats/{chatId}/messages/{messageId}')
    .onCreate(async (snapshot, context) => {
        const message = snapshot.data();
        const chatId = context.params.chatId;

        try {
            // 1. Get the chat document to find participants
            const chatDoc = await admin.firestore().collection('chats').doc(chatId).get();
            if (!chatDoc.exists) return null;

            const participants = chatDoc.data().participants || [];
            const senderPhone = message.senderPhone;

            // 2. Identify the recipient
            const recipientPhone = participants.find(p => p !== senderPhone);
            if (!recipientPhone) return null;

            // 3. Find the recipient's FCM token
            const userSnapshot = await admin.firestore()
                .collection('users')
                .where('phoneNumber', '==', recipientPhone)
                .limit(1)
                .get();

            if (userSnapshot.empty) return null;

            const recipientData = userSnapshot.docs[0].data();
            const fcmToken = recipientData.fcmToken;

            if (!fcmToken) return null;

            // 4. Construct the notification
            const payload = {
                notification: {
                    title: `New Message from ${senderPhone}`,
                    body: message.text,
                    clickAction: 'FLUTTER_NOTIFICATION_CLICK', // Standard for mobile apps
                    sound: 'default'
                },
                data: {
                    chatId: chatId,
                    senderPhone: senderPhone,
                    type: 'CHAT_MESSAGE'
                }
            };

            // 5. Send the notification
            return admin.messaging().sendToDevice(fcmToken, payload);
        } catch (error) {
            console.error('Error sending notification:', error);
            return null;
        }
    });
