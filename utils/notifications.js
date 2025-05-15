import * as Notifications from 'expo-notifications';

export const sendNotification = async (pressure) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "⚠️ Sleepwalking Alert!",
      body: `Pressure detected! Your child may be sleepwalking (${pressure.toFixed(2)} hPa)`,
      sound: true,
      vibrate: [0, 250, 250, 250],
    },
    trigger: null,
  });
};
