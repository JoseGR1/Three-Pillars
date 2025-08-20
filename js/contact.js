// contact.js – IG abre perfil; Discord copia el user/ID al portapapeles

(async function () {
  const container = document.getElementById("contactCards");

  // Año footer
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  // Helpers
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  };
  const initialsOf = (nameOrUser = "") => {
    const s = (nameOrUser || "").trim();
    if (!s) return "•";
    const parts = s.replace(/@/g, "").split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  // Toast sencillo
  function showToast(msg) {
    let toast = document.querySelector(".toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("show"), 1400);
  }

  // Cargar JSON local
  let contacts = [];
  try {
    const res = await fetch("data/contacts.json", { cache: "no-store" });
    if (res.ok) contacts = await res.json();
  } catch (e) {
    console.error("No se pudo cargar contacts.json", e);
  }

  if (!contacts.length) {
    container.innerHTML = `<p class="empty">No hay contactos disponibles.</p>`;
    return;
  }

  // Orden opcional: Instagram primero, luego Discord
  contacts.sort((a, b) => (a.type > b.type ? 1 : a.type < b.type ? -1 : 0));

  for (const c of contacts) {
    const isIG = c.type === "instagram";
    const isDC = c.type === "discord";

    // Tarjeta base
    const a = el("a", `card-contact ${isIG ? "is-ig" : "is-discord"}`);

    // IG: enlace a perfil
    if (isIG) {
      const user = (c.user || "").replace(/^@/, "");
      a.href = user ? `https://www.instagram.com/${user}/` : "#";
      if (user) { a.target = "_blank"; a.rel = "noopener"; }
    }

    // Discord: NO redirige → copia al portapapeles
    if (isDC) {
      a.href = "#";
      a.setAttribute("role", "button");
      a.setAttribute("tabindex", "0");
      // Qué copiar: prefiero discordId si existe, si no el handle de usuario
      const toCopy = (c.discordId && String(c.discordId).trim()) || (c.user || "").trim();
      a.dataset.copy = toCopy;
      a.title = toCopy ? `Clic para copiar: ${toCopy}` : "Sin identificador";
      // Cursor mano siempre
      a.style.cursor = "pointer";
    }

    // Avatar de iniciales
    const avatar = el("div", "avatar-initials", initialsOf(c.name || c.user));
    a.appendChild(avatar);

    // Info
    const info = el("div", "info");
    const name = el("div", "name", c.name || (isIG ? `@${c.user}` : c.user || "Discord"));
    const meta = el("div", "meta");
    const handle = el("span", "handle",
      isIG ? `@${(c.user || "").replace(/^@/, "")}` : (c.user || "")
    );
    const role = el("span", "role", c.label || (isIG ? "Instagram" : "Discord"));
    meta.appendChild(handle);
    meta.appendChild(role);
    info.appendChild(name);
    info.appendChild(meta);
    a.appendChild(info);

    // Badge servicio
    const badge = el("span", "badge", isIG ? "Instagram" : "Discord");
    a.appendChild(badge);

    container.appendChild(a);
  }

  // Delegación: clic/teclas en tarjetas de Discord → copiar
  container.addEventListener("click", async (e) => {
    const card = e.target.closest(".card-contact.is-discord");
    if (!card) return;
    e.preventDefault();
    const text = card.dataset.copy || "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast("Usuario de Discord copiado");
    } catch {
      showToast("No se pudo copiar");
    }
  });

  container.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target.closest(".card-contact.is-discord");
    if (!card) return;
    e.preventDefault();
    const text = card.dataset.copy || "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast("Usuario de Discord copiado");
    } catch {
      showToast("No se pudo copiar");
    }
  });
})();
