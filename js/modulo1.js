(function () {
  "use strict";

  var RONDA_MAX = 5;
  var CARDINALES = { 0: "Norte", 90: "Este", 180: "Sur", 270: "Oeste" };

  var viaje = null;
  var map = null;
  var capaAnclas = null, capaLinea = null;
  var ronda = 0, puntos = 0, aciertos = 0;
  var pregunta = null, respondida = false;
  var mejorGlobal = parseInt(localStorage.getItem("rumbo_mejor1") || "0", 10);
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
  }

  function mostrarMapa(visible, rotado) {
    $("mapa-wrap").hidden = !visible;
    $("mapa1").classList.toggle("rotado180", !!(visible && rotado));
    if (brujNorte) brujNorte.classList.toggle("abajo", !!(visible && rotado));
    if (visible && map) map.invalidateSize();
  }

  function contador(ms, cb) {
    var total = Math.max(1, Math.round(ms / 1000));
    $("contador").textContent = total;
    var iv = setInterval(function () {
      total--;
      if (total <= 0) { clearInterval(iv); cb(); return; }
      $("contador").textContent = total;
    }, 1000);
  }

  function marcarDestino(tipo) {
    var t = RUMBO.TIPOS[tipo] || RUMBO.TIPOS.hito;
    return L.divIcon({
      className: "ancla-icono",
      html: '<div class="ancla-destino" style="border-color:' + t.color + '"><span>' + t.simbolo + "</span></div>",
      iconSize: [30, 34],
      iconAnchor: [15, 17],
      popupAnchor: [0, -18]
    });
  }

  function dibujarAnclas() {
    capaAnclas.clearLayers();
    (viaje.anclas || []).forEach(function (a) {
      var icono = a === pregunta.origen
        ? RUMBO.pinPulsoIcon(a.tipo)
        : (a === pregunta.destino ? marcarDestino(a.tipo) : RUMBO.pinIcon(a.tipo));
      L.marker([a.lat, a.lng], { icon: icono }).addTo(capaAnclas);
    });
  }

  function sectorDe(delta) {
    var d = Math.abs(delta);
    if (d <= 45) return "FRENTE";
    if (d <= 135) return delta > 0 ? "DERECHA" : "IZQUIERDA";
    return "DETRAS";
  }

  function generarPregunta() {
    var anclas = viaje.anclas;
    var io = Math.floor(Math.random() * anclas.length);
    var id, intentos = 0;
    do {
      id = Math.floor(Math.random() * anclas.length);
      intentos++;
    } while ((id === io || anclas[id].nombre === anclas[io].nombre) && intentos < 50);
    var origen = anclas[io], destino = anclas[id];
    var h = [0, 90, 180, 270][Math.floor(Math.random() * 4)];
    var brg = RUMBO.rumboEntre(origen, destino);
    var delta = ((brg - h + 540) % 360) - 180;
    return { origen: origen, destino: destino, h: h, brg: brg, sector: sectorDe(delta) };
  }

  function mostrarPregunta() {
    var c = $("consigna1");
    c.dataset.origen = pregunta.origen.nombre;
    c.dataset.destino = pregunta.destino.nombre;
    c.dataset.h = pregunta.h;
    c.dataset.avanzada = pregunta.avanzada ? "1" : "0";
    c.innerHTML =
      "Estas en el <b>" + pregunta.origen.nombre + "</b> mirando hacia el <b>" +
      CARDINALES[pregunta.h] + "</b>.<br>¿Dónde queda el <b>" + pregunta.destino.nombre + "</b>?";
    document.querySelectorAll(".opciones-dir .dir").forEach(function (b) {
      b.disabled = false;
      b.classList.remove("ok", "mal", "gris");
    });
    $("feedback1").innerHTML = "";
    $("feedback1").hidden = true;
    $("btn-siguiente1").hidden = true;
    setFase("pregunta");
  }

  function coordValida(lat, lng) {
    if (lat === null || lat === undefined || lat === "" ||
        lng === null || lng === undefined || lng === "") return false;
    var la = +lat, ln = +lng;
    return la === la && ln === ln && !(la === 0 && ln === 0) &&
      Math.abs(la) <= 90 && Math.abs(ln) <= 180;
  }

  function spanDe(pts) {
    var b = L.latLngBounds(pts);
    var ne = b.getNorthEast(), sw = b.getSouthWest();
    return Math.max(Math.abs(ne.lat - sw.lat), Math.abs(ne.lng - sw.lng));
  }

  function encuadrar(pares) {
    var pts = (pares || []).filter(function (p) { return coordValida(p[0], p[1]); });
    var usados = pts.slice();
    while (usados.length > 2 && spanDe(usados) > 0.05) {
      var cx = 0, cy = 0;
      usados.forEach(function (p) { cx += p[0]; cy += p[1]; });
      cx /= usados.length; cy /= usados.length;
      var fi = 0, fd = -1;
      usados.forEach(function (p, i) {
        var d = Math.abs(p[0] - cx) + Math.abs(p[1] - cy);
        if (d > fd) { fd = d; fi = i; }
      });
      usados.splice(fi, 1);
    }
    if (usados.length < 2) return 0;
    try {
      map.fitBounds(L.latLngBounds(usados).pad(0.3));
      return usados.length;
    } catch (e) { return 0; }
  }

  function finMemoria() {
    mostrarMapa(false, false);
    mostrarPregunta();
  }

  function nuevaRonda() {
    if (ronda >= RONDA_MAX) { fin(); return; }
    pregunta = generarPregunta();
    respondida = false;

    setFase("ninguna");
    var avanzada = ronda >= RONDA_MAX - 2;
    pregunta.avanzada = avanzada;
    $("banner-rotado").hidden = !avanzada;
    mostrarMapa(true, avanzada);

    if (!map) {
      map = L.map("mapa1", { zoomControl: false, attributionControl: true })
        .setView(viaje.centro, viaje.zoom);
      RUMBO.tileSkeleton().addTo(map);
      if (viaje.esqueleto) RUMBO.dibujarEsqueleto(map, viaje.esqueleto.calles);
      capaAnclas = L.layerGroup().addTo(map);
      capaLinea = L.layerGroup().addTo(map);
    }
    capaLinea.clearLayers();
    dibujarAnclas();

    var nOk = encuadrar(viaje.anclas.map(function (a) { return [a.lat, a.lng]; }));
    var esq = viaje.esqueleto;
    var nCalles = (esq && esq.calles) ? esq.calles.length : 0;
    var nDentro = (esq && esq.bbox)
      ? viaje.anclas.filter(function (a) { return RUMBO.enBbox(a.lat, a.lng, esq.bbox); }).length
      : viaje.anclas.length;
    var bd = $("banner-datos");
    if (bd) {
      var z = 0;
      try { z = map.getZoom(); } catch (e) {}
      var aviso = "";
      if (!nCalles) aviso = "GENERALAS EN MODO VIAJE";
      else if (!nDentro) aviso = "ESQUELETO DE OTRA ZONA";
      else if (nDentro < nOk) aviso = "ESQUELETO PARCIAL";
      else if (nOk < viaje.anclas.length) aviso = "REVISA ANCLAS EN MODO VIAJE";
      var base = nOk + "/" + viaje.anclas.length + " ANCLAS · " + nCalles + " CALLES · z" + z + " · " + RUMBO.VER;
      if (aviso) {
        bd.innerHTML = base + " · " + aviso + ' · <a href="mapa.html">ABRIR MODO VIAJE</a>';
        bd.classList.add("warn");
      } else {
        bd.textContent = base;
        bd.classList.remove("warn");
      }
      bd.hidden = false;
    }
    $("contador").style.display = "";
    var ms = window.__RUMBO_MEMORIA_MS__ || 10000;
    contador(ms, finMemoria);
  }

  function responder(btn, sector) {
    if (respondida) return;
    respondida = true;
    var correcta = sector === pregunta.sector;
    if (correcta) { puntos += 100; aciertos++; }
    actualizarUI();

    document.querySelectorAll(".opciones-dir .dir").forEach(function (b) {
      b.disabled = true;
      b.classList.add(b.dataset.dir === pregunta.sector ? "ok" : "gris");
      if (b === btn && !correcta) b.classList.add("mal");
    });

    var delta = ((pregunta.brg - pregunta.h + 540) % 360) - 180;
    var fb = $("feedback1");
    fb.innerHTML =
      '<div class="rf"><span>' + (correcta ? "CORRECTO" : "NO ERA ESA") + "</span><b>" +
      (correcta ? "+100 pts" : "0 pts") + "</b></div>" +
      '<div class="rf"><span>EL ' + pregunta.destino.nombre.toUpperCase() + " QUEDA</span><b>" +
      RUMBO.etiquetaRumbo(pregunta.brg) + " " +
      ("00" + Math.round(pregunta.brg)).slice(-3) + "\u00b0 de tu rumbo</b></div>";
    fb.hidden = false;
    $("btn-siguiente1").hidden = false;
    $("btn-siguiente1").textContent = ronda + 1 >= RONDA_MAX ? "Ver resumen" : "Siguiente";
    $("btn-siguiente1").onclick = function () {
      mostrarMapa(false, false);
      ronda++;
      actualizarUI();
      nuevaRonda();
    };

    mostrarMapa(true, false);
    encuadrar([[pregunta.origen.lat, pregunta.origen.lng], [pregunta.destino.lat, pregunta.destino.lng]]);
    L.polyline(
      [[pregunta.origen.lat, pregunta.origen.lng], [pregunta.destino.lat, pregunta.destino.lng]],
      { color: "#c9a227", weight: 3, dashArray: "6 6", opacity: 0.9 }
    ).addTo(capaLinea);
  }

  function fin() {
    if (puntos > mejorGlobal) {
      mejorGlobal = puntos;
      localStorage.setItem("rumbo_mejor1", String(mejorGlobal));
    }
    $("resumen-filas").innerHTML =
      '<div class="rf"><span>PUNTOS TOTALES</span><b>' + puntos + "</b></div>" +
      '<div class="rf"><span>ACERTADOS</span><b>' + aciertos + "/" + RONDA_MAX + "</b></div>" +
      '<div class="rf"><span>RECORD PERSONAL</span><b>' + mejorGlobal + " pts</b></div>";
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
    document.querySelectorAll(".opciones-dir .dir").forEach(function (b) {
      b.addEventListener("click", function () { responder(b, b.dataset.dir); });
    });
    if (navigator.serviceWorker) {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
