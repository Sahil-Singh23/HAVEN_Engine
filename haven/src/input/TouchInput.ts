// src/input/TouchInput.ts

export function initTouchInput(): () => string[] {
  const keys = new Set<string>();
  
  // Virtual joystick zone (left side of screen)
  const zone = document.createElement('div');
  zone.style.cssText = `
    position: fixed; bottom: 20px; left: 20px;
    width: 150px; height: 150px;
    background: rgba(255,255,255,0.3);
    border-radius: 50%;
    touch-action: none; z-index: 10;
  `;
  
  // Only show on touch devices
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    document.body.appendChild(zone);
  } else {
    zone.style.display = 'none'; // Hide on non-touch devices
  }

  let startX = 0, startY = 0;
  const maxDist = 75; // Half of the zone width/height

  zone.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    const rect = zone.getBoundingClientRect();
    startX = rect.left + rect.width / 2;
    startY = rect.top + rect.height / 2;
    update(t.clientX, t.clientY);
  }, { passive: false });

  zone.addEventListener('touchmove', (e) => {
    e.preventDefault();
    update(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });

  const endTouch = () => {
    keys.clear();
  };
  zone.addEventListener('touchend', endTouch);
  zone.addEventListener('touchcancel', endTouch);


  function update(x: number, y: number): void {
    keys.clear();
    const dx = x - startX;
    const dy = y - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 15) return; // Dead zone to prevent jitter

    const normDx = dx / maxDist;
    const normDy = dy / maxDist;
    
    const threshold = 0.3;

    if (normDy < -threshold) keys.add('w');
    if (normDy > threshold) keys.add('s');
    if (normDx < -threshold) keys.add('a');
    if (normDx > threshold) keys.add('d');
  }

  return () => Array.from(keys);
}
