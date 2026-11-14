import { SERVICES, type ServiceId, type Station } from "@nail-online/shared";

export function ServiceMenu({ stations, onSelect, onClose }: { stations: Station[]; onSelect: (id: ServiceId) => void; onClose: () => void }) {
  const available = stations.filter((station) => !station.occupantId).length;
  return <section className="service-menu" aria-labelledby="service-title">
    <div className="service-menu-header"><div><span className="eyebrow">QUẦY TIẾP TÂN</span><h2 id="service-title">Hôm nay bạn muốn làm gì?</h2></div><button className="close" onClick={onClose} aria-label="Đóng bảng dịch vụ">×</button></div>
    <p>{available ? `Còn ${available} ghế trống` : "Cả 3 ghế đang có khách. Vui lòng đợi một chút."}</p>
    <div className="services">{SERVICES.map((service) => <button className="service-card" key={service.id} disabled={!available} onClick={() => onSelect(service.id)}>
      <strong>{service.name}</strong><span>{service.description}</span><small>Khoảng {service.minutes} phút · Chọn dịch vụ →</small>
    </button>)}</div>
  </section>;
}
