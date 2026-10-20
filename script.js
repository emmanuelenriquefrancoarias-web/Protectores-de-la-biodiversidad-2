// ==========================================
// NAVEGACIÓN SIN RECARGA (SPA LIGERO)
// ==========================================
// Reemplaza el contenido de <main id="app-content"> con el de la página
// destino usando fetch(), en vez de dejar que el navegador recargue todo
// el documento. Esto evita el parpadeo, mantiene la música sonando sin
// cortes y hace que cambiar de sección se sienta instantáneo.
//
// IMPORTANTE: esto solo funciona si la página se sirve por http/https
// (Live Server, GitHub Pages, Netlify, un servidor local, etc.). Si se
// abre el archivo directamente con doble clic (file://), el navegador
// bloquea el fetch entre archivos locales; en ese caso el código cae
// automáticamente en la navegación normal, así que el sitio nunca se rompe.

const APP_CONTENT_ID = "app-content";
let isNavigating = false;

function esEnlaceInternoNavegable(link) {
  if (!link) return false;
  const href = link.getAttribute("href");
  if (!href) return false;
  if (href.startsWith("#")) return false;
  if (href.startsWith("javascript:")) return false;
  if (href.startsWith("mailto:") || href.startsWith("tel:")) return false;
  if (/^https?:\/\//i.test(href)) return false; // enlaces externos
  if (link.hasAttribute("target") || link.hasAttribute("download")) return false;
  if (link.getAttribute("aria-disabled") === "true") return false;
  if (!href.toLowerCase().endsWith(".html")) return false;
  return true;
}

function actualizarLinkActivo(url) {
  const archivo = url.split("/").pop().split("?")[0].split("#")[0] || "index.html";
  document.querySelectorAll(".nav-links a").forEach((a) => {
    const href = (a.getAttribute("href") || "").split("/").pop();
    const activo = href === archivo;
    a.classList.toggle("active", activo);
    if (activo) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
}

async function navegarA(url, { push = true } = {}) {
  const contenedorActual = document.getElementById(APP_CONTENT_ID);
  if (!contenedorActual) {
    // Página sin el contenedor esperado: navegación normal de respaldo.
    window.location.href = url;
    return;
  }

  if (isNavigating) return;
  isNavigating = true;

  try {
    const respuesta = await fetch(url, { cache: "no-cache" });
    if (!respuesta.ok) throw new Error("No se pudo cargar la página: " + url);

    const html = await respuesta.text();
    const parser = new DOMParser();
    const nuevoDoc = parser.parseFromString(html, "text/html");
    const nuevoContenido = nuevoDoc.getElementById(APP_CONTENT_ID);

    if (!nuevoContenido) {
      // El destino no tiene el mismo contenedor: hacemos navegación normal.
      window.location.href = url;
      return;
    }

    contenedorActual.innerHTML = nuevoContenido.innerHTML;
    contenedorActual.className = nuevoContenido.className; // evita que se pierda el centrado u otras clases
    document.title = nuevoDoc.title;
    actualizarLinkActivo(url);

    if (push) {
      history.pushState({ url }, "", url);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
    vincularEventosDeContenido();
    inicializarTodosLosCarruseles();
  } catch (err) {
    // Si algo falla (por ejemplo, abierto con file:// sin servidor),
    // usamos la navegación normal del navegador para no dejar la web rota.
    window.location.href = url;
  } finally {
    isNavigating = false;
  }
}

// ==========================================
// CARRUSEL DE TARJETAS (usado en la descripción de niveles)
// ==========================================
function calcularDesplazamiento(track) {
  const primeraTarjeta = track.querySelector(".carousel-card");
  if (!primeraTarjeta) return 280;
  const estilos = getComputedStyle(track);
  const gap = parseFloat(estilos.columnGap || estilos.gap) || 20;
  return primeraTarjeta.getBoundingClientRect().width + gap;
}

function inicializarCarrusel(track) {
  if (!track || track.dataset.carouselBound === "true") return;
  track.dataset.carouselBound = "true";

  const wrapper = track.closest(".carousel-niveles");
  if (!wrapper) return;

  const btnPrev = wrapper.querySelector(".carousel-prev");
  const btnNext = wrapper.querySelector(".carousel-next");
  const tarjetas = Array.from(track.querySelectorAll(".carousel-card"));
  const dotsContenedor = wrapper.parentElement.querySelector(".carousel-dots");

  btnPrev?.addEventListener("click", () => {
    track.scrollBy({ left: -calcularDesplazamiento(track), behavior: "smooth" });
  });

  btnNext?.addEventListener("click", () => {
    track.scrollBy({ left: calcularDesplazamiento(track), behavior: "smooth" });
  });

  if (dotsContenedor && tarjetas.length > 0) {
    dotsContenedor.innerHTML = "";
    tarjetas.forEach((_, indice) => {
      const punto = document.createElement("button");
      punto.type = "button";
      punto.setAttribute("aria-label", "Ir al nivel " + (indice + 1));
      punto.className = "carousel-dot" + (indice === 0 ? " active" : "");
      punto.addEventListener("click", () => {
        track.scrollTo({ left: indice * calcularDesplazamiento(track), behavior: "smooth" });
      });
      dotsContenedor.appendChild(punto);
    });

    let scrollTimeout;
    track.addEventListener("scroll", () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const indiceActivo = Math.round(track.scrollLeft / calcularDesplazamiento(track));
        dotsContenedor.querySelectorAll(".carousel-dot").forEach((punto, i) => {
          punto.classList.toggle("active", i === indiceActivo);
        });
      }, 80);
    });
  }
}

function inicializarTodosLosCarruseles() {
  document.querySelectorAll(".carousel-track").forEach(inicializarCarrusel);
}

function vincularEventosDeContenido() {
  document.querySelectorAll("a").forEach((link) => {
    if (link.dataset.navBound === "true") return;
    link.dataset.navBound = "true";

    link.addEventListener("click", (e) => {
      if (esEnlaceInternoNavegable(link)) {
        e.preventDefault();
        navegarA(link.getAttribute("href"));
      }
    });
  });

}

window.addEventListener("popstate", () => {
  const archivo = location.pathname.split("/").pop() || "index.html";
  navegarA(archivo, { push: false });
});

document.addEventListener("DOMContentLoaded", () => {
  actualizarLinkActivo(location.pathname.split("/").pop() || "index.html");
  vincularEventosDeContenido();
  inicializarTodosLosCarruseles();
});


// ==========================================
// MENÚ HAMBURGUESA (CELULAR / TABLET)
// ==========================================
function cerrarMenu() {
  const boton = document.querySelector(".nav-toggle");
  const menu = document.getElementById("menu-principal");
  if (!boton || !menu) return;
  menu.classList.remove("open");
  boton.setAttribute("aria-expanded", "false");
  boton.setAttribute("aria-label", "Abrir menú");
}

document.addEventListener("DOMContentLoaded", () => {
  const boton = document.querySelector(".nav-toggle");
  const menu = document.getElementById("menu-principal");
  if (!boton || !menu) return;

  boton.addEventListener("click", () => {
    const abierto = menu.classList.toggle("open");
    boton.setAttribute("aria-expanded", String(abierto));
    boton.setAttribute("aria-label", abierto ? "Cerrar menú" : "Abrir menú");
  });

  // Al elegir una sección, el menú se cierra solo
  menu.addEventListener("click", (e) => {
    if (e.target.closest("a")) cerrarMenu();
  });

  // Si se pasa a pantalla grande, se restablece
  window.matchMedia("(min-width: 981px)").addEventListener("change", (e) => {
    if (e.matches) cerrarMenu();
  });
});
