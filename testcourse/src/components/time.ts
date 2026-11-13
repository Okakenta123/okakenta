import { useEffect, useState } from 'react';
import { t } from '../i18n';

/** 一定間隔で再描画するための現在時刻 */
export function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/** 「たった今」「12 分前」など */
export function relTime(at: number, now: number) {
  const m = Math.floor((now - at) / 60_000);
  if (m < 1) return t('app.justNow');
  if (m < 60) return t('app.minutesAgo', { n: m });
  return t('app.hoursAgo', { n: Math.floor(m / 60) });
}
