import * as THREE from "three";

/** A camera-facing label parented to its avatar anchor, so it follows walking and sitting. */
export function addNameTag(actor: THREE.Group, name: string, role: string, height: number): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 160;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is unavailable");
  context.fillStyle = "rgba(50, 32, 42, .82)";
  context.beginPath(); context.roundRect(8, 8, 496, 144, 38); context.fill();
  context.strokeStyle = "rgba(255, 237, 225, .75)";
  context.lineWidth = 3; context.stroke();
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#fffaf5";
  let fontSize = 58;
  do { context.font = `700 ${fontSize}px system-ui, sans-serif`; fontSize -= 2; }
  while (context.measureText(name).width > 448 && fontSize > 30);
  context.fillText(name, 256, 65);
  context.font = "500 30px system-ui, sans-serif";
  context.fillStyle = "#f3ceda";
  context.fillText(role, 256, 119);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false });
  const sprite = new THREE.Sprite(material);
  sprite.name = `NameTag_${role}`;
  sprite.position.y = height + .31;
  const width = Math.min(1.3, Math.max(.72, Array.from(name).length * .058));
  sprite.scale.set(width, width * canvas.height / canvas.width, 1);
  actor.add(sprite);
  return sprite;
}

/** A short speech bubble placed above, not over, the character name tag. */
export function addSpeechBubble(actor: THREE.Group, text: string, height: number): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 336;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is unavailable");
  context.fillStyle = "#fffaf5";
  context.strokeStyle = "#b96e87";
  context.lineWidth = 7;
  context.beginPath(); context.roundRect(8, 8, 496, 270, 34); context.fill(); context.stroke();
  context.beginPath(); context.moveTo(225, 276); context.lineTo(256, 329); context.lineTo(287, 276); context.closePath(); context.fill(); context.stroke();
  context.fillStyle = "#653e50";
  context.textAlign = "center"; context.textBaseline = "middle";
  const words = text.split(" ");
  const lines = [words.slice(0, 3).join(" "), words.slice(3).join(" ")];
  for (const [index, line] of lines.entries()) {
    let fontSize = 56;
    do { context.font = `700 ${fontSize}px system-ui, sans-serif`; fontSize -= 2; }
    while (context.measureText(line).width > 440 && fontSize > 34);
    context.fillText(line, 256, index === 0 ? 100 : 190);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false }));
  sprite.name = "Reception_Speech_Bubble";
  sprite.position.y = height + .76;
  sprite.scale.set(.95, .95 * canvas.height / canvas.width, 1);
  sprite.visible = false;
  actor.add(sprite);
  return sprite;
}
