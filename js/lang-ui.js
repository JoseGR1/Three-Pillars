// lang-ui.js – UI custom para el selector de idioma (usa el select nativo para i18n.js)
(() => {
  const wrap   = document.querySelector(".fancy-lang");
  if (!wrap) return;

  const select = document.getElementById("langSwitcher");
  const btn    = document.getElementById("langTrigger");
  const menu   = wrap.querySelector(".lang-menu");
  const label  = wrap.querySelector(".lang-current");

  function setActive(val){
    menu.querySelectorAll("li").forEach(li => {
      li.classList.toggle("active", li.dataset.value === val);
    });
    label.textContent = (val || "es").toUpperCase();
  }

  function open(){ wrap.classList.add("open"); btn.setAttribute("aria-expanded","true"); }
  function close(){ wrap.classList.remove("open"); btn.setAttribute("aria-expanded","false"); }
  function toggle(){ wrap.classList.contains("open") ? close() : open(); }

  btn.addEventListener("click", toggle);

  // click opción
  menu.addEventListener("click", (e) => {
    const li = e.target.closest("li"); if(!li) return;
    const val = li.dataset.value;
    if (!val) return;
    // Actualiza select nativo para que i18n.js lo procese
    select.value = val;
    select.dispatchEvent(new Event("change", { bubbles:true }));
    setActive(val);
    close();
  });

  // cerrar al clicar fuera o con Esc
  document.addEventListener("click", (e) => { if(!wrap.contains(e.target)) close(); });
  document.addEventListener("keydown", (e) => { if(e.key === "Escape") close(); });

  // Inicializa estado según valor actual del select (i18n.js lo puede haber fijado)
  setActive(select.value || "es");
})();
