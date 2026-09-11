(function () {
  "use strict";

  var RONDA_MAX = 5;
  var FRACCION_LINEA = 0.55;

  var viaje = null;
  var map = null;
  var capaAnclas = null, capaLinea = null;
  var ronda = 0, puntos = 0, aciertos = 0;
  var pregunta = null, respondida = false;
  var mejorGlobal = parseInt(localStorage.getItem("rumbo_mejor5") || "0", 10);
  var brujNorte = null;

  function $(id) { return document.getElementById(id); }

  function setFase(nombre) {
    ["inicio", "pregunta", "resumen"].forEach(function (f) {
      $("fase-" + f).hidden = (f !== nombre);
    });
  }

  function actualizarUI() {
    $("ronda-actual").textContent = Math.min(ronda + 1, RONDA_MAX);
    $("puntaje").textContent = puntos;
    $("mejor").textContent = mejorGlobal;
  }

  function mostrarMapa(visible, rotado) {
    $("mapa-wrap").hidden = !visible;
    $("mapa1").classList.toggle("rotado180", !!(visible && rotado));
    if (brujNorte) brujNorte.classList.toggle("abajo", !!(visible && rotado));
    if (visible && map) map.invalidateSize();
  }

  function dibujarAnclas() {
    capaAnclas.clearLayers();
    viaje.anclas.forEach(function (a) {
      var icono = (a === pregunta.origen) ? RUMBO.pinPulsoIcon(a.tipo) : RUMBO.pinIcon(a.tipo);
      L.marker([a.lat, a.lng], { icon: icono }).addTo(capaAnclas);
    });
  }

  function lineaParcial() {
    var o = pregunta.origen, d = pregunta.destino;
    var lat = o.lat + (d.lat - o.lat) * FRACCION_LINEA;
    var lng = o.lng + (d.lng - o.lng) * FRACCION_LINEA;
    // Halo oscuro para contraste contra cualquier fondo o calle
    L.polyline([[o.lat, o.lng], [lat, lng]],
      { color: "#0b2539", weight: 7, opacity: 0.85, pane: "lineaPane" }).addTo(capaLinea);
    // Linea punteada visible en color naranja nautico
    L.polyline([[o.lat, o.lng], [lat, lng]],
      { color: "#e67e22", weight: 4, dashArray: "8 6", opacity: 1, pane: "lineaPane" }).addTo(capaLinea);
    // Punto donde se corta la linea para que sea inconfundible
    L.circleMarker([lat, lng],
      { radius: 5, color: "#0b2539", fillColor: "#e67e22", fillOpacity: 1, weight: 2, pane: "lineaPane" }).addTo(capaLinea);
  }

  function lineaCompleta() {
    capaLinea.clearLayers();
    var o = pregunta.origen, d = pregunta.destino;
    L.polyline(
      [[o.lat, o.lng], [d.lat, d.lng]],
      { color: "#0b2539", weight: 7, opacity: 0.85, pane: "lineaPane" }
    ).addTo(capaLinea);
    L.polyline(
      [[o.lat, o.lng], [d.lat, d.lng]],
      { color: "#2e8b57", weight: 4, dashArray: "8 6", opacity: 1, pane: "lineaPane" }
    ).addTo(capaLinea);
  }

  function generarPregunta() {
    var anclas = viaje.anclas;
    var io = Math.floor(Math.random() * anclas.length);
    var id;
    do { id = Math.floor(Math.random() * anclas.length); } while (id === io);
    return { origen: anclas[io], destino: anclas[id] };
  }

  function mostrarPregunta() {
    $("consignab").innerHTML =
      "Estas en el <b>" + pregunta.origen.nombre + "</b>. La linea punteada arranca" +
      " desde tu ancla y se corta: <b>a cual de tus anclas lleva?</b>";

    var cont = $("opcionesb");
    cont.innerHTML = "";
    viaje.anclas.forEach(function (a) {
      if (a === pregunta.origen) return;
      var t = RUMBO.TIPOS[a.tipo] || RUMBO.TIPOS.hito;
      var b = document.createElement("button");
      b.className = "dir";
      b.dataset.nombre = a.nombre;
      b.innerHTML =
        '<span style="width:12px;height:12px;border-radius:50%;background:' + t.color +
        ';display:inline-block"></span>' + a.nombre;
      b.addEventListener("click", function () { responder(b, a); });
      cont.appendChild(b);
    });

    $("feedbackb").innerHTML = "";
    $("feedbackb").hidden = true;
    $("btn-siguienteb").hidden = true;
    setFase("pregunta");
  }

  function nuevaRonda() {
    if (ronda >= RONDA_MAX) { fin(); return; }
    pregunta = generarPregunta();
    pregunta.avanzada = ronda >= RONDA_MAX - 2;
    respondida = false;

    $("banner-rotado").hidden = !pregunta.avanzada;
    mostrarMapa(true, pregunta.avanzada);

    if (!map) {
      map = L.map("mapa1", { zoomControl: false, attributionControl: true })
        .setView(viaje.centro, viaje.zoom);
      if (!map.getPane("lineaPane")) {
        map.createPane("lineaPane");
        map.getPane("lineaPane").style.zIndex = 650;
      }
      RUMBO.tileSkeleton().addTo(map);
      if (viaje.esqueleto) RUMBO.dibujarEsqueleto(map, viaje.esqueleto.calles);
      capaAnclas = L.layerGroup().addTo(map);
      capaLinea = L.layerGroup().addTo(map);
    }
    capaLinea.clearLayers();
    dibujarAnclas();
    lineaParcial();

    try {
      var pts = viaje.anclas.map(function (a) { return [a.lat, a.lng]; });
      map.fitBounds(L.latLngBounds(pts), { padding: [36, 36], maxZoom: 16 });
    } catch (e) {
      try {
        map.fitBounds(L.latLngBounds(
          [[pregunta.origen.lat, pregunta.origen.lng], [pregunta.destino.lat, pregunta.destino.lng]]
        ), { padding: [40, 40], maxZoom: 16 });
      } catch (err) {}
    }

    actualizarUI();
    mostrarPregunta();
  }

  function responder(btn, a) {
    if (respondida) return;
    respondida = true;
    var correcta = (a === pregunta.destino);
    if (correcta) { puntos += 100; aciertos++; }
    actualizarUI();

    document.querySelectorAll("#opcionesb .dir").forEach(function (b) {
      b.disabled = true;
      b.classList.add(b.dataset.nombre === pregunta.destino.nombre ? "ok" : "gris");
      if (b === btn && !correcta) b.classList.add("mal");
    });

    var fb = $("feedbackb");
    fb.innerHTML =
      '<div class="rf"><span>' + (correcta ? "CORRECTO" : "NO ERA ESA") + "</span><b>" +
      (correcta ? "+100 pts" : "0 pts") + "</b></div>" +
      '<div class="rf"><span>LA LINEA TERMINABA EN</span><b>' + pregunta.destino.nombre + "</b></div>";
    fb.hidden = false;
    $("btn-siguienteb").hidden = false;
    $("btn-siguienteb").textContent = ronda + 1 >= RONDA_MAX ? "Ver resumen" : "Siguiente";
    $("btn-siguienteb").onclick = function () {
      mostrarMapa(false, false);
      ronda++;
      actualizarUI();
      nuevaRonda();
    };

    lineaCompleta();
  }

  function fin() {
    if (puntos > mejorGlobal) {
      mejorGlobal = puntos;
      localStorage.setItem("rumbo_mejor5", String(mejorGlobal));
    }
    $("resumen-filas").innerHTML =
      '<div class="rf"><span>PUNTOS TOTALES</span><b>' + puntos + "</b></div>" +
      '<div class="rf"><span>ACERTADOS</span><b>' + aciertos + "/" + RONDA_MAX + "</b></div>" +
      '<div class="rf"><span>RECORD PERSONAL</span><b>' + mejorGlobal + " pts</b></div>";
    actualizarUI();
    mostrarMapa(false, false);
    setFase("resumen");
  }

  function iniciar() {
    viaje = RUMBO.leerViaje();
    if (!viaje || !viaje.anclas || viaje.anclas.length < 2) {
      $("aviso-sin-viaje").hidden = false;
      return;
    }
    $("aviso-sin-viaje").hidden = true;
    ronda = 0; puntos = 0; aciertos = 0;
    actualizarUI();
    nuevaRonda();
  }

  function init() {
    brujNorte = RUMBO.brujulaMapa("mapa-wrap");
    $("btn-iniciar").addEventListener("click", iniciar);
    $("btn-repetir").addEventListener("click", iniciar);
    if (navigator.serviceWorker) {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
