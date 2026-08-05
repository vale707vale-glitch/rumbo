(function () {
  "use strict";

  var map, capa = L.layerGroup();
  var viaje = RUMBO.leerViaje();
  var orig = null, metas = [];
  var ronda = 0, puntosTotal = 0, aciertos = 0, mejorRonda = 0;
  var rumboActual = 0;
  var respondido = false;
  var metaActual = null;
  var marcadorOrigen = null, marcadorMeta = null, linea = null;
  var mejorGlobal = parseInt(localStorage.getItem("rumbo_mejor") || "0", 10);
  var arrastrando = false;

  function estadoErr() {
    document.getElementById("consigna").innerHTML =
      '<div class="sin-datos">' +
      "Todavia no hay un viaje con anclas cargado.<br>" +
      "Anda a <b>Modo Viaje</b>, marca tu hotel y al menos otra ancla (subte, restaurante, hito) y genera el esqueleto." +
      "</div>";
    document.getElementById("zona-brujula").hidden = true;
    document.getElementById("btn-confirmar").hidden = true;
    document.getElementById("ronda-total").textContent = "0";
  }

  function build() {
    map = L.map("mapa", { zoomControl: true });
    var tile = viaje.esqueleto ? RUMBO.tileSkeleton() : RUMBO.tileOsm();
    map.addLayer(tile);
    if (viaje.esqueleto) {
      RUMBO.dibujarEsqueleto(capa, viaje.esqueleto.calles);
      map.addLayer(capa);
    }

    var hotel = null;
    viaje.anclas.forEach(function (a) {
      if (a.tipo === "hotel" && !hotel) hotel = a;
    });
    orig = hotel || viaje.anclas[0];

    var resto = viaje.anclas.filter(function (a) { return a !== orig; });
    for (var i = resto.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = resto[i]; resto[i] = resto[j]; resto[j] = tmp;
    }
    metas = resto.slice(0, 6);

    document.getElementById("mejor").textContent = mejorGlobal;
    document.getElementById("ronda-total").textContent = metas.length;

    var b = document.getElementById("btn-repetir");
    if (b) b.addEventListener("click", repetir);
    initBrujula();
    nuevaRonda();
  }

  function etiquetaAncla(a) {
    var t = RUMBO.TIPOS[a.tipo];
    return '<span class="pto" style="background:' + t.color + '"></span>' +
      "<b>" + a.nombre + "</b> <span class='mono'>(" + t.nombre + ")</span>";
  }

  function nuevaRonda() {
    respondido = false;
    if (ronda >= metas.length) { fin(); return; }
    metaActual = metas[ronda];

    if (marcadorOrigen) map.removeLayer(marcadorOrigen);
    if (marcadorMeta) map.removeLayer(marcadorMeta);
    if (linea) map.removeLayer(linea);

    marcadorOrigen = L.marker([orig.lat, orig.lng], {
      icon: RUMBO.pinPulsoIcon(orig.tipo), zIndexOffset: 1000
    }).addTo(map).bindPopup("<b>" + orig.nombre + "</b><br><span class='mono'>Origen</span>");
    marcadorMeta = L.marker([metaActual.lat, metaActual.lng], {
      icon: RUMBO.pinIcon(metaActual.tipo), zIndexOffset: 900
    }).addTo(map).bindPopup("<b>" + metaActual.nombre + "</b><br><span class='mono'>Destino</span>");

    var bnds = L.latLngBounds([[orig.lat, orig.lng], [metaActual.lat, metaActual.lng]]).pad(0.35);
    map.fitBounds(bnds);

    document.getElementById("ronda-actual").textContent = ronda + 1;
    document.getElementById("consigna").innerHTML =
      "Estas en " + etiquetaAncla(orig) + ".<br>Necesitas llegar a " + etiquetaAncla(metaActual) +
      ".<br><br><i>Sin mirar los letreros: apunta hacia el rumbo por el que caminarias.</i>";
    document.getElementById("resultado").hidden = true;
    document.getElementById("resultado").innerHTML = "";
    document.getElementById("btn-siguiente").hidden = true;
    document.getElementById("btn-confirmar").disabled = false;
    setRumbo(0);
  }

  function fin() {
    document.getElementById("consigna").hidden = true;
    document.getElementById("zona-brujula").hidden = true;
    document.getElementById("btn-confirmar").hidden = true;
    document.getElementById("btn-siguiente").hidden = true;
    document.getElementById("resultado").hidden = true;
    document.getElementById("resumen").hidden = false;

    var filas = "";
    filas += '<div class="rf"><span>PUNTOS TOTALES</span><b>' + puntosTotal + "</b></div>";
    filas += '<div class="rf"><span>RUMBOS EXACTOS</span><b>' + aciertos + "/" + metas.length + "</b></div>";
    filas += '<div class="rf"><span>MEJOR RONDA</span><b>' + mejorRonda + " pts</b></div>";
    filas += '<div class="rf"><span>RECORD PERSONAL</span><b>' + mejorGlobal + " pts</b></div>";
    document.getElementById("resumen-filas").innerHTML = filas;

    if (puntosTotal > mejorGlobal) {
      mejorGlobal = puntosTotal;
      localStorage.setItem("rumbo_mejor", String(mejorGlobal));
      document.getElementById("mejor").textContent = mejorGlobal;
    }
  }

  function repetir() {
    document.getElementById("resumen").hidden = true;
    document.getElementById("consigna").hidden = false;
    document.getElementById("zona-brujula").hidden = false;
    document.getElementById("btn-confirmar").hidden = false;
    ronda = 0; puntosTotal = 0; aciertos = 0; mejorRonda = 0;
    document.getElementById("puntaje").textContent = "0";
    var resto = viaje.anclas.filter(function (a) { return a !== orig; });
    for (var i = resto.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = resto[i]; resto[i] = resto[j]; resto[j] = tmp;
    }
    metas = resto.slice(0, 6);
    document.getElementById("ronda-total").textContent = metas.length;
    nuevaRonda();
  }

  function angError(a, b) {
    var d = Math.abs(((a - b) + 540) % 360 - 180);
    return d;
  }

  function confirmar() {
    if (respondido) return;
    respondido = true;

    var verdadero = RUMBO.rumboEntre({ lat: orig.lat, lng: orig.lng }, { lat: metaActual.lat, lng: metaActual.lng });
    var error = angError(rumboActual, verdadero);
    var pts = Math.max(0, Math.round(100 - error * (100 / 180)));
    var bonus = 0;

    linea = L.polyline([[orig.lat, orig.lng], [metaActual.lat, metaActual.lng]], {
      color: "#c9a227", weight: 3, dashArray: "6 6", opacity: 0.9
    }).addTo(map);

    var html =
      '<div class="rf"><span>RUMBO REAL</span><b>' + RUMBO.etiquetaRumbo(verdadero) + " " +
      verdaderogrados(verdadero) + "&deg;</b></div>" +
      '<div class="rf"><span>TU RUMBO</span><b>' + RUMBO.etiquetaRumbo(rumboActual) + " " +
      verdaderogrados(rumboActual) + "&deg;</b></div>" +
      '<div class="rf"><span>ERROR</span><b>' + error.toFixed(0) + "&deg;</b></div>";

    if (RUMBO.cardinalDe(rumboActual) === RUMBO.cardinalDe(verdadero)) {
      bonus = 25;
      aciertos++;
      html += '<div class="rf exacto"><span>RUMBO EXACTO</span><b>+' + bonus + " pts</b></div>";
    }
    html += '<div class="rf total"><span>PUNTOS RONDA</span><b>+' + (pts + bonus) + "</b></div>";

    var r = document.getElementById("resultado");
    r.innerHTML = html;
    r.hidden = false;

    puntosTotal += pts + bonus;
    if (pts + bonus > mejorRonda) mejorRonda = pts + bonus;
    document.getElementById("puntaje").textContent = puntosTotal;
    document.getElementById("btn-confirmar").disabled = true;
    document.getElementById("btn-siguiente").hidden = false;
  }

  function verdaderogrados(g) {
    var p = Math.round(g);
    return (p < 100 ? "0" : "") + (p < 10 ? "0" : "") + p;
  }

  /* ---------------- brujula ---------------- */

  function crearTicks() {
    var g = document.getElementById("ticks-brujula");
    for (var d = 0; d < 360; d += 15) {
      var largo = (d % 90 === 0) ? 10 : (d % 45 === 0 ? 7 : 4);
      var a = d * Math.PI / 180;
      var x1 = Math.sin(a) * 92, y1 = -Math.cos(a) * 92;
      var x2 = Math.sin(a) * (92 - largo), y2 = -Math.cos(a) * (92 - largo);
      var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", x1); line.setAttribute("y1", y1);
      line.setAttribute("x2", x2); line.setAttribute("y2", y2);
      line.setAttribute("stroke", (d % 90 === 0) ? "var(--bronce-claro)" : "var(--paper-3)");
      line.setAttribute("stroke-width", "1.5");
      g.appendChild(line);
    }
    var lg = document.getElementById("letras-brujula");
    [["N", 0, 70, "var(--bronce-claro)"], ["E", 90, 70, "var(--paper)"],
     ["S", 180, 70, "var(--paper)"], ["O", 270, 70, "var(--paper)"]].forEach(function (c) {
      var a = c[1] * Math.PI / 180;
      var t = document.createElementNS("http://www.w3.org/2000/svg", "text");
      t.setAttribute("x", Math.sin(a) * c[2]);
      t.setAttribute("y", -Math.cos(a) * c[2] + 4);
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("font-family", "var(--mono)");
      t.setAttribute("font-size", "14");
      t.setAttribute("font-weight", "700");
      t.setAttribute("fill", c[3]);
      t.textContent = c[0];
      lg.appendChild(t);
    });
  }

  function setRumbo(g) {
    rumboActual = ((Math.round(g) % 360) + 360) % 360;
    document.getElementById("aguja").setAttribute("transform", "rotate(" + rumboActual + ")");
    document.getElementById("lectura-grados").textContent = verdaderogrados(rumboActual) + "&deg;";
    document.getElementById("lectura-cardinal").textContent =
      RUMBO.cardinalDe(rumboActual) + " " + RUMBO.etiquetaRumbo(rumboActual);
  }

  function anguloDeEvento(e) {
    var svg = document.getElementById("brujula");
    var r = svg.getBoundingClientRect();
    var dx = e.clientX - (r.left + r.width / 2);
    var dy = e.clientY - (r.top + r.height / 2);
    return ((Math.atan2(dx, -dy) * 180 / Math.PI) + 360) % 360;
  }

  function initBrujula() {
    crearTicks();
    var svg = document.getElementById("brujula");
    svg.addEventListener("pointerdown", function (e) {
      arrastrando = true;
      svg.setPointerCapture(e.pointerId);
      setRumbo(anguloDeEvento(e));
      e.preventDefault();
    });
    svg.addEventListener("pointermove", function (e) {
      if (arrastrando) setRumbo(anguloDeEvento(e));
    });
    ["pointerup", "pointercancel"].forEach(function (ev) {
      svg.addEventListener(ev, function () { arrastrando = false; });
    });

    document.querySelectorAll(".cardinales-rapidos .chip").forEach(function (c) {
      c.addEventListener("click", function () { setRumbo(parseInt(c.dataset.g, 10)); });
    });
    document.getElementById("btn-confirmar").addEventListener("click", confirmar);
    document.getElementById("btn-siguiente").addEventListener("click", function () {
      ronda++;
      nuevaRonda();
    });
  }

  if (!viaje || !viaje.anclas || viaje.anclas.length < 2) {
    document.addEventListener("DOMContentLoaded", function () {
      estadoErr();
      document.getElementById("ronda-total").textContent = "0";
    });
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      build();
      if (navigator.serviceWorker) navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
})();
