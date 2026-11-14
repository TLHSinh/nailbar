import { SALON_SERVICES, type SalonServiceId } from "@nail-online/shared";

export function CustomerServiceMenu({ onSelect }: { onSelect: (id: SalonServiceId) => void }) {
  return <div className="service-menu" aria-label="Chọn dịch vụ nail">
    {SALON_SERVICES.map((service) => <button className="service-choice" type="button" key={service.id} onClick={() => onSelect(service.id)}>
      <span><strong>{service.name}</strong><small>{service.description}</small></span>
      <em>{service.minutes} phút dự kiến</em>
    </button>)}
  </div>;
}
