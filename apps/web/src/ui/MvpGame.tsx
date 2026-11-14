import { useEffect, useRef, useState } from "react";
import { CUSTOMER_AVATARS, SALON_GAME_STATIONS, SALON_SERVICES, normalizeCustomerName, type CustomerAvatarId } from "@nail-online/shared";
import { SalonMvpWorld, type GameSnapshot } from "../game/mvp/SalonMvpWorld.ts";
import { initialCustomerGame } from "../game/mvp/customerFlow.ts";
import { CustomerServiceMenu } from "../features/catalog/CustomerServiceMenu.tsx";
import { NailDesigner, NailPreview } from "../features/nail-designer/NailDesigner.tsx";
import { ENABLE_RECEPTION_PRANK } from "../game/mvp/receptionPrank.ts";

const initial: GameSnapshot = { game: initialCustomerGame(), nearReception: false, ready: false, busy: false, prankRunning: false, message: "Đang tải tiệm và lễ tân…" };

export function MvpGame() {
  const mount = useRef<HTMLDivElement>(null);
  const world = useRef<SalonMvpWorld | null>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot>(initial);
  useEffect(() => {
    if (!mount.current) return;
    try { world.current = new SalonMvpWorld(mount.current, setSnapshot); }
    catch (error) { console.error("WebGL unavailable", error); setSnapshot({ ...initial, message: "Trình duyệt không khởi tạo được WebGL. Hãy bật tăng tốc đồ họa hoặc dùng trình duyệt mới hơn." }); }
    return () => { world.current?.dispose(); world.current = null; };
  }, []);

  const { stage, playerName, serviceId, stationId, lastDesign } = snapshot.game;
  const service = SALON_SERVICES.find((item) => item.id === serviceId);
  const station = SALON_GAME_STATIONS.find((item) => item.id === stationId);
  const [chosenAvatar, setChosenAvatar] = useState<CustomerAvatarId>("customer_female");
  const [typedName, setTypedName] = useState("");
  const [guideOpen, setGuideOpen] = useState(true);
  const validName = normalizeCustomerName(typedName);
  const title = stage === "exploring" ? "Khám phá tiệm" : stage === "at-reception" ? "Chọn dịch vụ" : stage === "walking-to-seat" ? "Đang tới ghế" : stage === "seated" ? "Chờ nhân viên" : stage === "designing" ? "Làm móng" : "Bộ móng hoàn thành";
  return <main className="mvp-page">
    <div ref={mount} className="mvp-canvas" aria-label="Không gian 3D tiệm nail, khách hàng và nhân viên NPC" />
    <div className="mvp-shade" aria-hidden="true" />
    <header className="mvp-header">
      <div className="mvp-brand"><span className="mvp-brand-icon">✦</span><div><strong>NAIL BAR</strong><small>TRẢI NGHIỆM 3D</small></div></div>
      <div className="mvp-links"><a href="/?view=salon-v2">Xem mô hình</a><a href="/?view=avatars">Nhân vật</a><a href="/?view=legacy-online">Phòng online cũ</a></div>
    </header>

    {stage !== "selecting" && (guideOpen ? <aside id="mvp-guide-panel" className={`mvp-panel ${stage === "at-reception" ? "reception-panel" : ""}`} aria-label="Bảng hướng dẫn" aria-live="polite">
      <div className="mvp-panel-top"><span className="mvp-kicker">{playerName?.toLocaleUpperCase("vi-VN")} · KHÁCH HÀNG</span><div className="mvp-panel-tools">
        {stage === "at-reception" && <button className="mvp-panel-close" type="button" aria-label="Đóng menu dịch vụ" title="Đóng menu dịch vụ và khám phá tiệm" onClick={() => world.current?.leaveReception()}>×</button>}
        <button className="mvp-panel-minimize" type="button" aria-label="Thu nhỏ bảng hướng dẫn" title="Thu nhỏ bảng hướng dẫn" onClick={() => setGuideOpen(false)}>−</button>
      </div></div>
      <h1>{title}</h1>
      {service && <p className="mvp-service-line">{service.name}{station ? ` · ${station.name}` : ""}</p>}
      <div className="mvp-status" role="status">{snapshot.message}</div>
      {stage === "exploring" && <div className="mvp-explore-actions">
        <button className="mvp-action" type="button" disabled={snapshot.prankRunning} onClick={() => world.current?.interact()}>Gặp lễ tân <span>→</span></button>
        {ENABLE_RECEPTION_PRANK && <button className="mvp-prank-button" type="button" disabled={snapshot.prankRunning} onClick={() => { if (world.current?.playReceptionPrank()) setGuideOpen(false); }}>Đánh lễ tân 1 cái <span aria-hidden="true">✋</span></button>}
      </div>}
      {stage === "at-reception" && <><CustomerServiceMenu onSelect={(id) => world.current?.chooseService(id)}/><button className="mvp-secondary" type="button" onClick={() => world.current?.leaveReception()}>Để sau, tiếp tục khám phá tiệm</button></>}
      {stage === "result" && <button className="mvp-action" type="button" onClick={() => world.current?.standUp()}>Đứng dậy và khám phá <span>→</span></button>}
    </aside> : <button className={`mvp-guide-bubble ${stage === "at-reception" ? "reception-bubble" : ""}`} type="button" aria-label={snapshot.message === "Hue Trinh đang khóc huhu" ? "Hue Trinh đang khóc huhu. Mở bảng hướng dẫn" : "Mở bảng hướng dẫn"} aria-expanded={false} title="Mở bảng hướng dẫn" onClick={() => setGuideOpen(true)}><span aria-hidden="true">💬</span></button>)}

    {stage === "selecting" && <div className="mvp-modal" role="dialog" aria-modal="true" aria-label="Chọn nhân vật">
      <form className="avatar-select" onSubmit={(event) => { event.preventDefault(); if (validName) void world.current?.enterSalon(chosenAvatar, validName); }}><span className="mvp-kicker">CHÀO MỪNG ĐẾN NAIL BAR</span><h1>Chọn nhân vật của bạn</h1><p>Bước vào tiệm, gặp lễ tân và tự thiết kế bộ móng yêu thích.</p>
        <div className="avatar-select-grid">{CUSTOMER_AVATARS.map((item, index) => <button key={item.id} type="button" className={`avatar-select-card ${chosenAvatar === item.id ? "active" : ""}`} aria-pressed={chosenAvatar === item.id} onClick={() => setChosenAvatar(item.id)}>
          <span className={`avatar-select-portrait portrait-${index}`} aria-hidden="true"/><strong>{item.label}</strong><small>{item.description}</small>
        </button>)}</div>
        <label className="avatar-name-label" htmlFor="customer-name">Tên hiển thị trên nhân vật</label>
        <input id="customer-name" className="avatar-name-input" value={typedName} onChange={(event) => setTypedName(event.target.value)} maxLength={32} autoComplete="nickname" placeholder="Ví dụ: An Nhiên" aria-describedby="customer-name-help" />
        <small id="customer-name-help" className="avatar-name-help">{typedName && !validName ? "Tên cần 2–24 ký tự: chữ, số, khoảng trắng hoặc dấu nối." : "Tên sẽ xuất hiện trên đầu nhân vật và trong kết quả làm móng."}</small>
        <button className="mvp-action" type="submit" disabled={!snapshot.ready || snapshot.busy || !validName}>{snapshot.busy ? "Đang chuẩn bị…" : snapshot.ready ? "Vào tiệm" : "Đang tải tiệm…"}<span>→</span></button>
        <div className="mvp-status" role="status">{snapshot.message}</div>
      </form>
    </div>}

    {stage === "designing" && service && <div className="mvp-modal designer-modal" role="dialog" aria-modal="true" aria-label="Thiết kế bộ móng">
      <NailDesigner key={`${service.id}-${stationId}`} serviceId={service.id} kind={service.stationKind} onComplete={(design) => world.current?.completeDesign(design)}/>
    </div>}

    {stage === "result" && lastDesign && service && <div className="mvp-modal result-modal" role="dialog" aria-modal="true" aria-label="Kết quả làm móng">
      <div className="result-card"><span className="mvp-kicker">HOÀN THÀNH</span><h2>Bộ móng của {playerName}</h2><p>{service.name} · {station?.name}</p>
        <NailPreview kind={service.stationKind} colors={lastDesign.colors} shape={lastDesign.shape} pattern={lastDesign.pattern}/>
        <button className="mvp-action" type="button" onClick={() => world.current?.standUp()}>Đứng dậy và khám phá <span>→</span></button>
      </div>
    </div>}
    {stage === "exploring" && <div className="mvp-controls">WASD / mũi tên: đi · Chạm sàn: đi tới · Camera theo hướng đi, kéo để xoay · E: lễ tân</div>}
  </main>;
}
