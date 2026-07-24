import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionCtor = new () => SpeechRecognition;

function getRecognition(): SpeechRecognition | null {
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;
  return new Ctor();
}

export function useSpeechRecognition(onFinal: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    setSupported(Boolean(getRecognition()));
  }, []);

  const start = useCallback(() => {
    setError(null);
    const rec = getRecognition();
    if (!rec) {
      setError("このブラウザでは音声入力が使えません。テキストで入力してください。");
      return;
    }
    rec.lang = "ja-JP";
    rec.continuous = true;
    rec.interimResults = true;
    let buffer = "";
    rec.onresult = (ev: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) buffer += t;
        else interim += t;
      }
      if (interim) onFinal(buffer + interim);
      else if (buffer) onFinal(buffer);
    };
    rec.onerror = () => {
      setError("音声認識エラー。マイク権限を確認してください。");
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }, [onFinal]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  return { supported, listening, error, start, stop };
}
