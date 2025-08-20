// =========================
// app.js
// Fondo de estrellas + "lucero" al hover + estrellas fugaces + menú móvil
// =========================
"use strict";

// Año en el footer (si existe el span#year)
(() => {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();

// Canvas de estrellas (si no existe, salimos sin romper nada)
const cvs = document.getElementById("stars");
if (!cvs) {
  // No hay canvas; solo inicializa menú móvil y termina.
  initMobileMenu();
} else {
  const ctx = cvs.getContext("2d");

  // ---------- Configuración visual ----------
  const CONFIG = {
    densityDivisor: 20000, // menor = más estrellas
    maxStars: 260,
    hoverRadius: 90,       // radio de influencia del cursor
    hoverGrow: 2.2,        // crecimiento del núcleo
    hoverBoost: 0.9,       // aumento de brillo base
    maxTwinkle: 0.35,      // amplitud del parpadeo
    baseAlpha: 0.6,        // alpha base
    halo: true,            // halo alrededor
    lucero: {
      threshold: 0.15,     // a partir de qué cercanía mostramos picos (0..1)
      spikeMain: 26,       // longitud picos principales (px)
      spikeSub: 14,        // longitud picos secundarios (px)
      lineWidth: 1.6,      // grosor base de los picos
      colorCore: "#ffffff",
      colorGlow: "rgba(180,220,255,0.9)", // tinte azulado para el destello
    },
    shooters: { // estrellas fugaces
      perMinute: 16,                        // cuántas por minuto (promedio)
      angleRad: Math.PI / 4,               // dirección base (45°)
      spreadRad: Math.PI / 10,             // variación del ángulo
      speedMin: 600,  speedMax: 1100,      // px/s
      lengthMin: 160, lengthMax: 300,      // largo de la cola (px)
      thicknessMin: 1.2, thicknessMax: 2.2,
      lifeMin: 0.8,  lifeMax: 1.6,         // segundos
      colorTrail0: "rgba(160,200,255,0)",  // cola (inicio)
      colorTrail1: "rgba(180,210,255,.35)",// cola (medio)
      colorHead:   "#fae5abff",              // cabeza
      glow: "rgba(220,235,255,.9)"
    }
  };

  // Respeta "reducir movimiento" si el usuario lo prefiere
  const PREFERS_REDUCED = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  if (PREFERS_REDUCED) {
    CONFIG.maxTwinkle = 0.2;
    CONFIG.shooters.perMinute = Math.max(0, Math.round(CONFIG.shooters.perMinute / 2));
  }

  // ---------- Estado ----------
  let W = 0, H = 0, DPR = 1;
  let stars = [];
  let mouseX = -1000, mouseY = -1000; // fuera de pantalla
  let t = 0;                           // “tiempo” para el twinkle
  let shooters = [];                   // estrellas fugaces
  let lastTS = performance.now();

  // ---------- Utils ----------
  const rand   = (a,b)=> a + Math.random()*(b-a);
  const clamp  = (v, a, b)=> Math.max(a, Math.min(b, v));

  // ---------- Resize con soporte retina ----------
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

  // ---------- Eventos de puntero (mouse/touch) ----------
  window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX; mouseY = e.clientY;
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

  // ---------- Dibuja “lucero” con picos ----------
  function drawLucero(x, y, k, rBase) {
    const { spikeMain, spikeSub, lineWidth, colorCore, colorGlow } = CONFIG.lucero;

    // Longitudes y grosor escalan con cercanía (k: 0..1)
    const L1 = spikeMain * (0.35 + 0.65 * k);
    const L2 = spikeSub  * (0.35 + 0.65 * k);
    const lw = lineWidth * (0.7 + 0.8 * k);
    const r  = rBase + CONFIG.hoverGrow * k;

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

    // Picos con suma de luz
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = colorGlow;
    ctx.lineWidth = lw;
    ctx.lineCap = "round";
    ctx.globalAlpha = 0.6 + 0.4 * k;

    // Cruz principal
    ctx.beginPath();
    ctx.moveTo(x - L1, y); ctx.lineTo(x + L1, y);
    ctx.moveTo(x, y - L1); ctx.lineTo(x, y + L1);
    ctx.stroke();

    // Diagonales
    ctx.beginPath();
    const d = L2 * Math.SQRT1_2; // 45°
    ctx.moveTo(x - d, y - d); ctx.lineTo(x + d, y + d);
    ctx.moveTo(x + d, y - d); ctx.lineTo(x - d, y + d);
    ctx.stroke();
    ctx.restore();

    // Núcleo nítido por encima
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1.2, r), 0, Math.PI * 2);
    ctx.fillStyle = colorCore;
    ctx.fill();
    ctx.restore();
  }

  // ---------- Estrella fugaz ----------
  function spawnShooter() {
    const S = CONFIG.shooters;
    const margin = 80;
    // Sale desde zona “arriba/izquierda” para entrar al viewport
    const startX = rand(-margin, W * 0.35);
    const startY = rand(-margin, H * 0.35);
    const ang = S.angleRad + rand(-S.spreadRad, S.spreadRad);
    const spd = rand(S.speedMin, S.speedMax);
    shooters.push({
      x: startX, y: startY,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      len: rand(S.lengthMin, S.lengthMax),
      w: rand(S.thicknessMin, S.thicknessMax),
      life: rand(S.lifeMin, S.lifeMax),
      age: 0
    });
  }

  function updateAndDrawShooters(dt) {
    const S = CONFIG.shooters;
    const perSec = S.perMinute / 60;
    if (!PREFERS_REDUCED && Math.random() < perSec * dt) spawnShooter();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    shooters = shooters.filter(m => {
      m.age += dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;

      const spd = Math.hypot(m.vx, m.vy);
      const nx = m.vx / spd, ny = m.vy / spd;
      const tx = m.x - nx * m.len;
      const ty = m.y - ny * m.len;

      // Cola
      const grad = ctx.createLinearGradient(tx, ty, m.x, m.y);
      grad.addColorStop(0,   S.colorTrail0);
      grad.addColorStop(0.7, S.colorTrail1);
      grad.addColorStop(1,   S.colorHead);

      ctx.lineWidth = m.w;
      ctx.strokeStyle = grad;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(m.x, m.y);
      ctx.stroke();

      // Cabeza/halo
      ctx.shadowColor = S.glow;
      ctx.shadowBlur  = 16;
      ctx.fillStyle   = S.colorHead;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 1.6 + m.w, 0, Math.PI * 2);
      ctx.fill();

      const out = m.x < -120 || m.x > W + 120 || m.y < -120 || m.y > H + 120;
      return m.age < m.life && !out;
    });

    ctx.restore();
  }

  // ---------- Loop principal (time-based) ----------
  function loop(now) {
    const dt = clamp((now - lastTS) / 1000, 0, 0.05); // seg; cap para evitar saltos
    lastTS = now;

    ctx.clearRect(0, 0, W, H);

    // Estrellas base + efecto "lucero"
    for (const s of stars) {
      let a = CONFIG.baseAlpha + Math.sin(t * s.tw + s.x) * CONFIG.maxTwinkle;
      let r = s.r;

      const dx = s.x - mouseX;
      const dy = s.y - mouseY;
      const dist = Math.hypot(dx, dy);

      if (dist < CONFIG.hoverRadius) {
        const k = (CONFIG.hoverRadius - dist) / CONFIG.hoverRadius; // 0..1
        if (k > CONFIG.lucero.threshold) {
          drawLucero(s.x, s.y, k, s.r);
          continue;
        }
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
          continue;
        }
      }

      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
    }

    // Twinkle avanza de forma estable (~60 “tics” por segundo)
    t += dt * 60;

    // Estrellas fugaces
    updateAndDrawShooters(dt);

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Inicializa menú móvil
  initMobileMenu();
}

// =========================
//  Menú móvil (hamburguesa)
// =========================
function initMobileMenu() {
  const btn = document.getElementById("menuToggle");
  // Admite id="siteNav"; si no está, toma la primera .nav dentro del header
  const nav = document.getElementById("siteNav") || document.querySelector(".site-header .nav");
  if (!btn || !nav) return;

  const close = () => {
    document.body.classList.remove("menu-open");
    btn.setAttribute("aria-expanded", "false");
  };
  const toggle = () => {
    const open = document.body.classList.toggle("menu-open");
    btn.setAttribute("aria-expanded", String(open));
  };

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggle();
  });

  // Cierra al click fuera del header
  document.addEventListener("click", (e) => {
    const header = e.target.closest(".site-header");
    if (document.body.classList.contains("menu-open") && !header) close();
  });

  // Cierra si pasamos a escritorio
  window.addEventListener("resize", () => {
    if (window.innerWidth > 720) close();
  });

  // Cierra con ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
}
