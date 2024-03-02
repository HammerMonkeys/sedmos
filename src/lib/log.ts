// beast custom logging
const log = (...args: any[]) => {
  const enableLog = true;
  if (!enableLog) return;
  return console.log(...args);
};

export default log;
