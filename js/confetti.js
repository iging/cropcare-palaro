/**
 * Lightweight canvas confetti for win celebrations.
 * Self-contained — no DOM dependencies, no external libraries. Listens
 * for `sw:stop` and bursts when `isWin` is true. Respects reduced motion.
 */
import { bus } from "./state.js";

const COLORS = ["#1f6b3a", "#2a8b4d", "#a3d9b1", "#f4cf8a", "#c83a2c"];
const GRAVITY = 0.18;
const DRAG = 0.012;

let canvas,
  ctx,
  dpr = 1;
let particles = [];
let rafId = 0;
let lastT = 0;

function ensureCanvas() {
  if (canvas) return;
  canvas = document.createElement("canvas");
  canvas.className = "confetti-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  ctx = canvas.getContext("2d");
  resize();
  window.addEventListener("resize", resize);
}

function resize() {
  if (!canvas) return;
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function spawn(count, originX, originY) {
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
    const speed = 6 + Math.random() * 8;
    particles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 2,
      vy: Math.sin(angle) * speed - 2,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.4,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      life: 1, // 0..1, decays with time
      shape: Math.random() < 0.5 ? "rect" : "circle",
    });
  }
}

function frame(now) {
  if (!ctx) return;
  const dt = Math.min(32, now - lastT) / 16.6667;
  lastT = now;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.vx -= p.vx * DRAG * dt;
    p.vy = p.vy * (1 - DRAG * dt) + GRAVITY * dt * 6;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
    p.life -= 0.005 * dt;

    if (p.y > window.innerHeight + 40 || p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.4));
    ctx.fillStyle = p.color;
    if (p.shape === "rect") {
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    } else {
      ctx.beginPath();
      ctx.ellipse(0, 0, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  if (particles.length > 0) {
    rafId = requestAnimationFrame(frame);
  } else {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
}

function celebrate() {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  ensureCanvas();

  // Origin: try to center the burst on the dial; fall back to viewport center.
  const dial = document.getElementById("dial");
  const rect = dial?.getBoundingClientRect();
  const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
  const cy = rect ? rect.top + rect.height * 0.55 : window.innerHeight / 2;

  spawn(140, cx, cy);
  // A small secondary salvo from the sides for a more organic look.
  spawn(40, rect ? rect.left + 20 : 80, cy);
  spawn(40, rect ? rect.right - 20 : window.innerWidth - 80, cy);

  if (!rafId) {
    lastT = performance.now();
    rafId = requestAnimationFrame(frame);
  }
}

export function initConfetti() {
  bus.on("sw:stop", ({ isWin }) => {
    if (isWin) celebrate();
  });
}
