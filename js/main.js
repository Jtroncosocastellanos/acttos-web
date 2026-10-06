/* ==========================================================================
   ACTTOS — interacción
   ========================================================================== */

/* URL del backend que guardará las inscripciones del Acttos Challenge.
   Mientras esté vacía, el formulario muestra el mensaje de éxito sin guardar nada. */
const FORM_ENDPOINT = "https://script.google.com/macros/s/AKfycbz99EfucT0k-oZQGvBWLA-sglqRP1v3Ars0OXoimgv4-rCWghNw9vMNRbUg5BQoGN-7/exec";

/* Cifras del contador de la comunidad (Home y Acttos Challenge).
   Para actualizarlas, cambia solo estos números. */
const ACTTOS_STATS = {
  acttos: 602,    // acttos de generosidad realizados
  personas: 80,   // personas que han participado
  llamadas: 74,   // llamadas a seres queridos
};

document.documentElement.classList.remove("no-js");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Wordmark: ajusta el tamaño para ocupar todo el ancho ---------- */
function fitWordmarks() {
  document.querySelectorAll(".wordmark").forEach((el) => {
    const inner = el.querySelector(".wordmark__inner");
    if (!inner) return;
    inner.style.fontSize = "100px";
    const cs = getComputedStyle(el);
    const available = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const natural = inner.getBoundingClientRect().width;
    if (natural > 0) inner.style.fontSize = (100 * available) / natural + "px";
  });
}
fitWordmarks();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitWordmarks);
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(fitWordmarks, 80);
});

/* ---------- Navegación flotante ---------- */
const pill = document.querySelector(".pill");
if (pill) {
  const toggle = pill.querySelector(".pill__toggle");
  const word = pill.querySelector(".pill__word");
  const setCollapsed = (collapsed) => {
    pill.classList.toggle("is-collapsed", collapsed);
    toggle.setAttribute("aria-expanded", String(!collapsed));
    toggle.setAttribute("aria-label", collapsed ? "Abrir menú" : "Cerrar menú");
    if (word) word.setAttribute("aria-expanded", String(!collapsed));
  };
  setCollapsed(true);

  // Arriba del todo solo se ve el botón pequeño junto al título; la barra aparece
  // al pulsarlo. Al hacer scroll, la barra baja a su posición flotante abajo.
  const menuBtn = document.querySelector(".menu-btn");
  const isDocked = () => pill.classList.contains("is-docked");
  const openTop = (open) => {
    pill.classList.toggle("is-open-top", open);
    setCollapsed(!open);
    if (menuBtn) {
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    }
  };
  const dock = () => {
    const docked = window.scrollY > 60;
    if (docked === isDocked()) return;
    pill.classList.toggle("is-docked", docked);
    if (docked) openTop(false);
    else { pill.classList.remove("is-open-top"); setCollapsed(true); }
  };
  dock();
  window.addEventListener("scroll", dock, { passive: true });

  if (menuBtn) menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openTop(!pill.classList.contains("is-open-top"));
    if (pill.classList.contains("is-open-top")) pill.querySelector(".pill__links a")?.focus({ preventScroll: true });
  });

  // Tanto el "+" como la palabra ACTTOS abren y cierran el menú
  [toggle, word].forEach((el) => el && el.addEventListener("click", () => {
    const collapse = !pill.classList.contains("is-collapsed");
    if (collapse && !isDocked()) openTop(false); else setCollapsed(collapse);
  }));
  // Cerrar con Escape o al pulsar fuera del menú
  const close = () => { if (isDocked()) setCollapsed(true); else openTop(false); };
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !pill.classList.contains("is-collapsed")) { close(); menuBtn?.focus(); }
  });
  document.addEventListener("click", (e) => {
    if (!pill.contains(e.target) && pill.classList.contains("is-open-top")) close();
  });
}

/* ---------- Slideshow ---------- */
document.querySelectorAll(".slides").forEach((root) => {
  const slides = [...root.querySelectorAll(".slide")];
  const dots = [...root.querySelectorAll(".dots button")];
  if (slides.length < 2) return;
  let i = 0;
  let timer;
  const show = (n) => {
    i = (n + slides.length) % slides.length;
    slides.forEach((s, k) => s.classList.toggle("is-active", k === i));
    dots.forEach((d, k) => d.setAttribute("aria-current", String(k === i)));
  };
  const play = () => {
    if (reducedMotion) return;
    clearInterval(timer);
    timer = setInterval(() => show(i + 1), 5200);
  };
  dots.forEach((d, k) => d.addEventListener("click", () => { show(k); play(); }));
  root.addEventListener("mouseenter", () => clearInterval(timer));
  root.addEventListener("mouseleave", play);
  show(0);
  play();
});

/* ---------- Animaciones de entrada ---------- */
const revealEls = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window && !reducedMotion) {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    }),
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add("is-in"));
}

/* ---------- Filtros del blog ---------- */
const chips = document.querySelectorAll(".chip[data-filter]");
chips.forEach((chip) => chip.addEventListener("click", () => {
  const f = chip.dataset.filter;
  chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
  document.querySelectorAll(".post[data-cat]").forEach((p) => {
    p.hidden = f !== "todos" && p.dataset.cat !== f;
  });
}));

/* ---------- Formulario del Acttos Challenge ---------- */
const form = document.querySelector("#challenge-form");
if (form) {
  const status = form.querySelector(".form__status");
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "";
    status.classList.remove("is-error");
    if (!form.reportValidity()) return;

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando…";

    try {
      if (FORM_ENDPOINT) {
        // Envío como formulario (sin cabeceras JSON) para que Google Apps Script lo acepte sin bloqueo CORS.
        const res = await fetch(FORM_ENDPOINT, {
          method: "POST",
          body: new URLSearchParams(formData),
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const result = await res.json().catch(() => ({ ok: true }));
        if (result.ok === false) throw new Error(result.error || "Error del servidor");
      } else {
        console.warn("[Acttos] FORM_ENDPOINT vacío: la inscripción NO se ha guardado.", data);
        await new Promise((r) => setTimeout(r, 600));
      }
      const success = document.querySelector("#form-success");
      success.querySelector("[data-name]").textContent = data.nombre || "";
      form.hidden = true;
      success.hidden = false;
      success.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
    } catch (err) {
      status.textContent = "No hemos podido enviar tu inscripción. Inténtalo de nuevo en unos minutos.";
      status.classList.add("is-error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Enviar";
    }
  });
}

/* ---------- Año del footer ---------- */
document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

/* ---------- Galería "Cada día recibirás" ---------- */
document.querySelectorAll(".ch-gallery").forEach((gallery) => {
  const track = gallery.querySelector(".ch-gallery__track");
  const prev = gallery.querySelector(".ch-gallery__btn--prev");
  const next = gallery.querySelector(".ch-gallery__btn--next");
  const slides = [...track.children];

  const jumps = [...document.querySelectorAll(".ch-jump [data-goto]")];
  const pad = () => parseFloat(getComputedStyle(track).scrollPaddingLeft) || 0;

  const update = () => {
    const max = track.scrollWidth - track.clientWidth;
    prev.disabled = track.scrollLeft <= 4;
    next.disabled = track.scrollLeft >= max - 4;
    // Marca el botón 1 · 2 · 3 del elemento que se está viendo
    const left = track.getBoundingClientRect().left + pad();
    let current = slides.findIndex((s) => s.getBoundingClientRect().right > left + 40);
    if (track.scrollLeft >= max - 4) current = slides.length - 1;
    jumps.forEach((b, i) => b.setAttribute("aria-current", String(i === current)));
  };

  // Botones 1 · 2 · 3: llevan la galería al elemento elegido
  jumps.forEach((btn) => btn.addEventListener("click", () => {
    const slide = slides[Number(btn.dataset.goto)];
    if (!slide) return;
    const offset = slide.getBoundingClientRect().left - track.getBoundingClientRect().left - pad();
    track.scrollBy({ left: offset, behavior: reducedMotion ? "auto" : "smooth" });
    jumps.forEach((b) => b.setAttribute("aria-current", String(b === btn)));
    gallery.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "nearest" });
  }));

  const go = (dir) => {
    const left = track.getBoundingClientRect().left;
    const offsets = slides.map((s) => s.getBoundingClientRect().left - left);
    const target = dir > 0
      ? offsets.find((o) => o > 8)
      : [...offsets].reverse().find((o) => o < -8);
    if (target !== undefined) track.scrollBy({ left: target, behavior: reducedMotion ? "auto" : "smooth" });
  };

  prev.addEventListener("click", () => go(-1));
  next.addEventListener("click", () => go(1));
  track.addEventListener("scroll", update, { passive: true });
  track.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
  });
  window.addEventListener("resize", update);
  track.querySelectorAll("img").forEach((img) => img.addEventListener("load", update));
  update();
});

/* ---------- Contador de la comunidad (banner en movimiento) ---------- */
(() => {
  const fmt = (n) => "+" + Number(n).toLocaleString("es-ES");
  document.querySelectorAll("[data-stats] [data-stat]").forEach((item) => {
    const n = ACTTOS_STATS[item.dataset.stat];
    if (n != null) item.querySelector(".stat__value").textContent = fmt(n);
  });
  document.querySelectorAll("[data-stats] .sr-only").forEach((p) => {
    p.textContent = `Más de ${ACTTOS_STATS.acttos} acttos realizados, más de ${ACTTOS_STATS.personas} personas que han participado y más de ${ACTTOS_STATS.llamadas} llamadas a seres queridos.`;
  });
})();

/* ---------- Líneas de título que nunca se parten ([data-fit="shrink"]) ----------
   Mantienen el tamaño normal del título y solo se reducen si no caben en el ancho. */
function fitLines() {
  document.querySelectorAll("[data-fit]").forEach((line) => {
    const box = line.parentElement;
    line.style.fontSize = "";
    const base = parseFloat(getComputedStyle(box).fontSize);
    const natural = line.getBoundingClientRect().width;
    const available = box.clientWidth;
    if (natural > available && natural > 0) line.style.fontSize = (base * available) / natural + "px";
  });
}
fitLines();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitLines);
window.addEventListener("resize", () => requestAnimationFrame(fitLines));

/* ---------- Vídeos (reels): se reproducen al pulsar, de uno en uno ---------- */
const reels = [...document.querySelectorAll(".reel")];
reels.forEach((reel) => {
  const video = reel.querySelector("video");
  const play = reel.querySelector(".reel__play");
  play.addEventListener("click", () => {
    reels.forEach((other) => { if (other !== reel) other.querySelector("video").pause(); });
    video.controls = true;
    video.play();
  });
  video.addEventListener("play", () => reel.classList.add("is-playing"));
  video.addEventListener("pause", () => { if (!video.seeking) reel.classList.remove("is-playing"); });
  video.addEventListener("ended", () => { reel.classList.remove("is-playing"); video.controls = false; });
});
