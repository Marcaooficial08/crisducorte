import { setHours, setMinutes, format, addMinutes } from "date-fns";

export function generateDayTimeList(date: Date): string[] {
  const startTime = setMinutes(setHours(date, 9), 0); // Define a hora inicial para 09:00
  const secondTime = setMinutes(setHours(date, 10), 30); // Define o segundo horário começando às 10:30
  const endTime = setMinutes(setHours(date, 19), 30); // Define a hora final para 19:30
  const interval = 60; // intervalo em minutos
  const timeList: string[] = [];

  let currentTime = startTime;

  // Adiciona o primeiro horário
  timeList.push(format(startTime, "HH:mm"));

  // Adiciona o segundo horário
  timeList.push(format(secondTime, "HH:mm"));

  // Continua adicionando horários em intervalos de uma hora
  currentTime = addMinutes(secondTime, interval);
  while (currentTime <= endTime) {
    timeList.push(format(currentTime, "HH:mm"));
    currentTime = addMinutes(currentTime, interval);
  }

  return timeList;
}


