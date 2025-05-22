import * as Notifications from 'expo-notifications';

export const sendNotification = async (pressureValue) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "⚠️ Sleepwalking Alert!",
      body: `Pressure detected! ${pressureValue.toFixed(2)} hPa`,
      sound: true,
      vibrate: [0, 250, 250, 250],
    },
    trigger: null,
  });
};
