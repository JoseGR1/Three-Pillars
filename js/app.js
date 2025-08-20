// =========================
//  Stars Background + "Lucero" al pasar el puntero
// =========================

// Año en el footer (si existe el span#year)
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

const cvs = document.getElementById("stars");
const ctx = cvs.getContext("2d");

// Configuración visual
const CONFIG = {
  densityDivisor: 20000, // menor = más estrellas
  maxStars: 260,
  hoverRadius: 90,       // radio de influencia
  hoverGrow: 2.2,        // crecimiento del núcleo
  hoverBoost: 0.9,       // aumento de brillo base
  maxTwinkle: 0.35,      // amplitud del parpadeo
  baseAlpha: 0.6,        // alpha base
  halo: true,            // halo alrededor
  lucero: {
    threshold: 0.15,     // a partir de qué cercanía empezamos a mostrar picos (0..1)
    spikeMain: 26,       // longitud base de picos principales (px)
    spikeSub: 14,        // longitud base de picos secundarios (px)
    lineWidth: 1.6,      // grosor base de los picos
    colorCore: "#ffffff",
    colorGlow: "rgba(180,220,255,0.9)", // leve tinte azulado para el destello
  }
};

let W = 0, H = 0, DPR = 1, stars = [];
let mouseX = -1000, mouseY = -1000; // fuera de pantalla
let t = 0;

// Escalado retina + resize
function resize() {
  DPR = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  W = Math.floor(window.innerWidth);
  H = Math.floor(window.innerHeight);

  cvs.style.width = W + "px";
  cvs.style.height = H + "px";
  cvs.width = W * DPR;
  cvs.height = H * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  const n = Math.min(CONFIG.maxStars, Math.floor((W * H) / CONFIG.densityDivisor));
  stars = Array.from({ length: n }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.2 + 0.2,
    tw: Math.random() * 0.03 + 0.005,
  }));
}
resize();
window.addEventListener("resize", resize);

// Eventos (escuchar en window para que funcione aunque el canvas esté detrás)
window.addEventListener("mousemove", (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});
window.addEventListener("mouseleave", () => {
  mouseX = -1000; mouseY = -1000;
});
window.addEventListener("touchmove", (e) => {
  const tch = e.touches && e.touches[0];
  if (tch) { mouseX = tch.clientX; mouseY = tch.clientY; }
}, { passive: true });
window.addEventListener("touchend", () => {
  mouseX = -1000; mouseY = -1000;
});

// --- Utilidad: dibujar un "lucero" con picos ---
function drawLucero(x, y, k, rBase) {
  // k: 0..1 cercanía (1 = muy cerca)
  // rBase: radio base de la estrella sin hover

  const {
    spikeMain, spikeSub, lineWidth, colorCore, colorGlow
  } = CONFIG.lucero;

  // Longitudes escaladas por cercanía
  const L1 = spikeMain * (0.35 + 0.65 * k); // principales
  const L2 = spikeSub  * (0.35 + 0.65 * k); // secundarios
  const lw = lineWidth * (0.7 + 0.8 * k);

  // Núcleo (ligeramente más grande y brillante)
  const r = rBase + CONFIG.hoverGrow * k;

  // Halo suave
  if (CONFIG.halo) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.65, 0.25 + k * 0.5);
    ctx.shadowColor = colorGlow;
    ctx.shadowBlur = 14 + k * 18;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = colorCore;
    ctx.fill();
    ctx.restore();
  }

  // Picos: dibujamos líneas con "lighter" para sumar brillo
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = colorGlow;
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  ctx.globalAlpha = 0.6 + 0.4 * k;

  // 4 picos principales (cruz)
  ctx.beginPath();
  ctx.moveTo(x - L1, y); ctx.lineTo(x + L1, y);
  ctx.moveTo(x, y - L1); ctx.lineTo(x, y + L1);
  ctx.stroke();

  // 4 picos secundarios (diagonales)
  ctx.beginPath();
  const d = L2 * Math.SQRT1_2; // para 45°
  ctx.moveTo(x - d, y - d); ctx.lineTo(x + d, y + d);
  ctx.moveTo(x + d, y - d); ctx.lineTo(x - d, y + d);
  ctx.stroke();
  ctx.restore();

  // Núcleo encima (nítido)
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(1.2, r), 0, Math.PI * 2);
  ctx.fillStyle = colorCore;
  ctx.fill();
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  for (const s of stars) {
    // parpadeo base
    let a = CONFIG.baseAlpha + Math.sin(t * s.tw + s.x) * CONFIG.maxTwinkle;
    let r = s.r;

    // distancia al puntero
    const dx = s.x - mouseX;
    const dy = s.y - mouseY;
    const dist = Math.hypot(dx, dy);

    if (dist < CONFIG.hoverRadius) {
      const k = (CONFIG.hoverRadius - dist) / CONFIG.hoverRadius; // 0..1 cercanía

      // Si pasa del umbral, lo dibujamos como lucero con picos
      if (k > CONFIG.lucero.threshold) {
        drawLucero(s.x, s.y, k, s.r);
        continue; // ya se pintó como lucero
      }

      // Si no llega al umbral, solo brillo/crecimiento suave
      a = Math.min(1, a + k * CONFIG.hoverBoost);
      r = s.r + k * CONFIG.hoverGrow;

      if (CONFIG.halo) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.6, 0.2 + k * 0.5);
        ctx.shadowColor = "rgba(255,255,255,0.9)";
        ctx.shadowBlur = 12 + k * 16;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.restore();
        continue; // ya dibujado con halo
      }
    }

    // estrella normal (fuera de hover)
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
  }

  t += 1;
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);


// Mobile menu toggle
(() => {
  const btn = document.getElementById('menuToggle');
  const nav = document.getElementById('siteNav');
  if (!btn || !nav) return;

  const close = () => {
    document.body.classList.remove('menu-open');
    btn.setAttribute('aria-expanded', 'false');
  };
  const toggle = () => {
    const open = document.body.classList.toggle('menu-open');
    btn.setAttribute('aria-expanded', String(open));
  };

  btn.addEventListener('click', toggle);
  document.addEventListener('click', (e) => {
    if (document.body.classList.contains('menu-open') && !e.target.closest('.site-header')) close();
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 720) close();
  });
})();


