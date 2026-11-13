import { lazy, Suspense } from 'react';
import { AppBar, SidePanel, Stepper } from './components/Shell';
import { useStore } from './store';
import { Step11 } from './steps/Step11';

// 3D を使うステップは遅延読み込み（最初の表示を軽くする）
const Step12 = lazy(() => import('./steps/Step12').then((m) => ({ default: m.Step12 })));
const Step2 = lazy(() => import('./steps/Step2').then((m) => ({ default: m.Step2 })));
const Step3 = lazy(() => import('./steps/Step3').then((m) => ({ default: m.Step3 })));

export default function App() {
  const step = useStore((s) => s.step);
  const toast = useStore((s) => s.toast);
  return (
    <div className="app">
      <AppBar />
      <Stepper />
      {step === 's2' ? (
        // ステップ 2 は Figma のような全面の作業画面
        <Suspense fallback={<div className="card loading">…</div>}>
          <Step2 />
        </Suspense>
      ) : (
        <div className="layout">
          <main className="main">
            <Suspense fallback={<div className="card loading">…</div>}>
              {step === 's11' && <Step11 />}
              {step === 's12' && <Step12 />}
              {step === 's3' && <Step3 />}
            </Suspense>
          </main>
          <SidePanel />
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
