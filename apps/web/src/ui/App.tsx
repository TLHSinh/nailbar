import { lazy, Suspense } from "react";

const MvpGame = lazy(() => import("./MvpGame.tsx").then((module) => ({ default: module.MvpGame })));
const LegacyGame = lazy(() => import("./LegacyGame.tsx").then((module) => ({ default: module.LegacyGame })));
const SalonViewer = lazy(() => import("./SalonViewer.tsx").then((module) => ({ default: module.SalonViewer })));
const AvatarViewer = lazy(() => import("./AvatarViewer.tsx").then((module) => ({ default: module.AvatarViewer })));

export function App() {
  const view = new URLSearchParams(window.location.search).get("view");
  const page = view === "salon-v2" ? <SalonViewer />
    : view === "avatars" ? <AvatarViewer />
      : view === "legacy-online" ? <LegacyGame />
        : <MvpGame />;
  return <Suspense fallback={<main className="mvp-loading">Đang mở tiệm nail 3D…</main>}>{page}</Suspense>;
}
