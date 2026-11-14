import { useState } from "react";
import { NAIL_COLORS, type NailColorId, type NailDesign, type NailPattern, type NailShape, type SalonServiceId, type SalonStationKind } from "@nail-online/shared";

const shapeNames: Record<NailShape, string> = { round: "Tròn", almond: "Hạnh nhân", square: "Vuông" };
const patternNames: Record<NailPattern, string> = { plain: "Màu trơn", french: "Đầu móng", star: "Ngôi sao" };
const handNails = [
  { x: 41, y: 184, w: 31, h: 47, angle: -27 },
  { x: 104, y: 78, w: 31, h: 49, angle: 0 },
  { x: 160, y: 45, w: 32, h: 52, angle: 0 },
  { x: 218, y: 68, w: 31, h: 49, angle: 0 },
  { x: 274, y: 119, w: 30, h: 45, angle: 8 },
];
const footNails = [
  { x: 63, y: 83, w: 48, h: 42, angle: -12 },
  { x: 129, y: 63, w: 34, h: 35, angle: -5 },
  { x: 183, y: 74, w: 31, h: 33, angle: 0 },
  { x: 232, y: 97, w: 29, h: 31, angle: 8 },
  { x: 275, y: 129, w: 27, h: 30, angle: 15 },
];

type PreviewProps = { kind: SalonStationKind; colors: readonly (NailColorId | null)[]; shape: NailShape; pattern: NailPattern; onPaint?: (index: number) => void };

export function NailPreview({ kind, colors, shape, pattern, onPaint }: PreviewProps) {
  const nails = kind === "pedicure" ? footNails : handNails;
  return <svg className="nail-preview" viewBox="0 0 360 420" role="img" aria-label={kind === "pedicure" ? "Xem trước năm móng chân" : "Xem trước năm móng tay"}>
    <defs><linearGradient id="skinShade" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f8d9c5"/><stop offset="1" stopColor="#e9ae9d"/></linearGradient></defs>
    {kind === "manicure" ? <g fill="url(#skinShade)" stroke="#d99b8d" strokeWidth="3">
      <rect x="96" y="76" width="49" height="228" rx="24"/><rect x="151" y="42" width="50" height="264" rx="25"/>
      <rect x="209" y="66" width="49" height="236" rx="24"/><rect x="266" y="115" width="47" height="189" rx="23"/>
      <rect x="27" y="172" width="53" height="153" rx="26" transform="rotate(-27 54 248)"/>
      <rect x="64" y="214" width="252" height="189" rx="92"/>
    </g> : <g fill="url(#skinShade)" stroke="#d99b8d" strokeWidth="3">
      <path d="M77 106 C85 49 145 43 188 65 C254 62 316 117 317 187 L289 376 Q270 411 224 400 L104 365 Q54 338 51 287 Z"/>
      <ellipse cx="89" cy="94" rx="32" ry="35"/><ellipse cx="145" cy="76" rx="25" ry="30"/>
      <ellipse cx="195" cy="86" rx="23" ry="28"/><ellipse cx="243" cy="110" rx="22" ry="26"/><ellipse cx="286" cy="140" rx="20" ry="24"/>
    </g>}
    {nails.map((nail, index) => {
      const color = NAIL_COLORS.find((item) => item.id === colors[index]);
      const rx = shape === "square" ? 5 : shape === "almond" ? nail.w / 2 : 12;
      return <g key={index} transform={`rotate(${nail.angle} ${nail.x + nail.w / 2} ${nail.y + nail.h / 2})`}
        className={onPaint ? "paintable-nail" : ""} role={onPaint ? "button" : undefined} tabIndex={onPaint ? 0 : undefined}
        aria-label={`Móng ${index + 1}${color ? `, ${color.name}` : ", chưa làm"}`}
        onClick={onPaint ? () => onPaint(index) : undefined}
        onKeyDown={onPaint ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onPaint(index); } } : undefined}>
        <rect x={nail.x} y={nail.y} width={nail.w} height={nail.h} rx={rx} fill={color?.hex ?? "#fff8f0"} stroke={color ? "#ba7f84" : "#a4807d"} strokeWidth="3"/>
        {color && pattern === "french" && <path d={`M${nail.x + 4} ${nail.y + 10} Q${nail.x + nail.w / 2} ${nail.y + 16} ${nail.x + nail.w - 4} ${nail.y + 10}`} fill="none" stroke="#fffaf2" strokeWidth="6" strokeLinecap="round"/>}
        {color && pattern === "star" && <text x={nail.x + nail.w / 2} y={nail.y + nail.h / 2 + 7} textAnchor="middle" fill="#fff6d3" fontSize="22">✦</text>}
        {!color && <text x={nail.x + nail.w / 2} y={nail.y + nail.h / 2 + 5} textAnchor="middle" fill="#ab8087" fontSize="16">+</text>}
      </g>;
    })}
  </svg>;
}

type DesignerProps = { serviceId: SalonServiceId; kind: SalonStationKind; onComplete: (design: NailDesign) => void };

export function NailDesigner({ serviceId, kind, onComplete }: DesignerProps) {
  const [colors, setColors] = useState<(NailColorId | null)[]>([null, null, null, null, null]);
  const [selectedColor, setSelectedColor] = useState<NailColorId>(serviceId === "care" ? "clear" : "rose");
  const [shape, setShape] = useState<NailShape>("round");
  const [pattern, setPattern] = useState<NailPattern>("plain");
  const painted = colors.filter(Boolean).length;
  const palette = serviceId === "care" ? NAIL_COLORS.filter((color) => ["clear", "nude", "cream"].includes(color.id)) : NAIL_COLORS;
  const paint = (index: number) => setColors((previous) => previous.map((color, position) => position === index ? selectedColor : color));
  const finish = () => {
    if (colors.some((color) => color === null)) return;
    onComplete({ serviceId, shape, pattern, colors: colors as NailColorId[] });
  };
  return <section className="nail-designer" aria-label="Thiết kế bộ móng">
    <div className="nail-designer-head"><span className="mvp-kicker">GÓC LÀM MÓNG</span><h2>{kind === "pedicure" ? "Chăm sóc móng chân" : "Thiết kế bộ móng"}</h2><p>Chọn kiểu, rồi chạm vào từng móng để thợ thực hiện.</p></div>
    <div className="nail-designer-body">
      <div className="nail-preview-wrap"><NailPreview kind={kind} colors={colors} shape={shape} pattern={pattern} onPaint={paint}/><span>{painted}/5 móng đã hoàn thành</span></div>
      <div className="nail-options">
        <div><strong>Dáng móng</strong><div className="nail-option-row">{(Object.keys(shapeNames) as NailShape[]).map((item) => <button key={item} type="button" className={shape === item ? "active" : ""} onClick={() => setShape(item)}>{shapeNames[item]}</button>)}</div></div>
        <div><strong>Màu sơn</strong><div className="nail-palette">{palette.map((color) => <button key={color.id} type="button" className={selectedColor === color.id ? "active" : ""} style={{ backgroundColor: color.hex }} title={color.name} aria-label={color.name} aria-pressed={selectedColor === color.id} onClick={() => setSelectedColor(color.id)}/>)}</div><small>{NAIL_COLORS.find((color) => color.id === selectedColor)?.name}</small></div>
        {serviceId !== "care" && <div><strong>Họa tiết</strong><div className="nail-option-row">{(Object.keys(patternNames) as NailPattern[]).map((item) => <button key={item} type="button" className={pattern === item ? "active" : ""} onClick={() => setPattern(item)}>{patternNames[item]}</button>)}</div></div>}
        <button className="nail-finish" type="button" disabled={painted !== 5} onClick={finish}>Xem kết quả <span>→</span></button>
      </div>
    </div>
  </section>;
}
