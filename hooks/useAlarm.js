import { useRef } from 'react';
import { Audio } from 'expo-av';

const useAlarm = () => {
  const soundRef = useRef(null);

  const loadAlarm = async () => {
    const { sound } = await Audio.Sound.createAsync(
      require('../assets/alarm1.wav')
    );
    soundRef.current = sound;
  };

  const playAlarm = async () => {
    if (soundRef.current) await soundRef.current.replayAsync();
  };

  const stopAlarm = async () => {
    if (soundRef.current) await soundRef.current.stopAsync();
  };

  return { soundRef, loadAlarm, playAlarm, stopAlarm };
};

export default useAlarm;
