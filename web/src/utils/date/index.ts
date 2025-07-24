import dayjs from "dayjs";
import { useEffect, useState } from "react";

export function formatMillisecondsToTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export const useTimeCount = (startTime: string | Date) => {
  const [timeCount, setTimeCount] = useState('');
  let timer: ReturnType<typeof setTimeout> | null = null;

  useEffect(() => {
    timer = setTimeout(() => {
      const milliseconds = dayjs().valueOf() - dayjs(startTime).valueOf()
      const parsedTime = formatMillisecondsToTime(milliseconds)
      setTimeCount(parsedTime)
    }, 1000)
    return () => {
      clearTimeout(timer as ReturnType<typeof setTimeout>)
    }
  })

  return [timeCount]
}