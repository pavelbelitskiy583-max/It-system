import { useEffect, useRef, useState } from "react";

export function useTypewriter(text, speed = 38, startDelay = 600) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const idxRef = useRef(0);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    idxRef.current = 0;
    let interval;
    const delayId = setTimeout(() => {
      interval = setInterval(() => {
        idxRef.current += 1;
        setDisplayed(text.slice(0, idxRef.current));
        if (idxRef.current >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
    }, startDelay);
    return () => { clearTimeout(delayId); clearInterval(interval); };
  }, [text, speed, startDelay]);

  return { displayed, done };
}
