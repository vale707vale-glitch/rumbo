(function () {
  "use strict";

  var RONDA_MAX = 5;
  var RADIO_BBOX = 0.004;
  var ZOOM = 15.3;
  var PITCH = 60;
  var PALERMO = [-34.5886, -58.4292];
  var VISTAZO_MS = function () { return window.__RUMBO_VISTAZO_MS__ || 6000; };

  var map = null;
  var target = null;
  var frontBearing = 0;
  var ronda = 0, puntos = 0;
  var respondido = false;
  var mejorGlobal = parseInt(localStorage.getItem("rumbo_mejor6") || "0", 10);

  function $(id) { return document.getElementById(id); }

  function cero(n) { var p = Math.round(n); return (p < 100 ? "0" : "") + (p < 10 ? "0" : "") + p; }

  function setFase(nombre) {
    ["inicio", "juego", "resumen"].forEach(function (f) {
      $("fase-" + f).hidden = (f !== nombre);
    });
  }

  function estado(msg, err) {
    var b = $("barra-estado");
    b.textContent = msg || "";
    b.className = "barra-estado" + (err ? " error" : "");
  }

  function elegirObjetivo() {
    var viaje = RUMBO.leerViaje();
    if (viaje && viaje.anclas && viaje.anclas.length) {
      var hito = viaje.anclas.find(function (a) { return a.tipo === "hito"; });
      var obj = hito || viaje.anclas[Math.floor(Math.random() * viaje.anclas.length)];
      return { lat: obj.lat, lng: obj.lng, nombre: obj.nombre };
    }
    return { lat: PALERMO[0], lng: PALERMO[1], nombre: "El Obelisco" };
  }

  function alturaDe(tags) {
    if (tags.height) {
      var h = parseFloat(tags.height.replace(/[^0-9.]/g, ""));
      if (isFinite(h) && h > 0) return Math.min(h, 80);
    }
    if (tags["building:levels"]) {
      var n = parseInt(tags["building:levels"], 10);
      if (isFinite(n) && n > 0) return Math.min(n * 3, 80);
    }
    return 8;
  }

  function geoJSONBuilding(el) {
    var ring = (el.geometry || []).map(function (p) { return [p.lon, p.lat]; });
    if (ring.length < 3) return null;
    var primero = ring[0], ultimo = ring[ring.length - 1];
    if (primero[0] !== ultimo[0] || primero[1] !== ultimo[1]) ring.push([primero[0], primero[1]]);
    return {
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [ring] },
      properties: { altura: alturaDe(el.tags || {}) }
    };
  }

  function geoJSONCalle(el) {
    var coords = (el.geometry || []).map(function (p) { return [p.lon, p.lat]; });
    if (coords.length < 2) return null;
    return {
      type: "Feature",
      geometry: { type: "LineString", coordinates: coords },
      properties: { clase: el.tags.highway }
    };
  }

  /* Escena sintetica para el modo demo (?stub): sin red ni Overpass. */
  function escenaStub() {
    var edificios = [], calles = [];
    var i, a, b, w, h;
    for (i = 0; i < 8; i++) {
      a = target.lat + ((i % 4) - 1.5) * 0.0013;
      b = target.lng + (Math.floor(i / 4) - 0.5) * 0.0019;
      w = 0.0007; h = 0.0005;
      edificios.push({
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [[[b, a], [b + w, a], [b + w, a + h], [b, a + h], [b, a]]] },
        properties: { altura: 10 + i * 5 }
      });
    }
    [[target.lat - 0.0022, target.lng - 0.004, target.lat - 0.0022, target.lng + 0.004],
     [target.lat + 0.0022, target.lng - 0.004, target.lat + 0.0022, target.lng + 0.004],
     [target.lat - 0.004, target.lng - 0.0022, target.lat + 0.004, target.lng - 0.0022],
     [target.lat - 0.004, target.lng + 0.0022, target.lat + 0.004, target.lng + 0.0022]
    ].forEach(function (c, idx) {
      calles.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: [[c[1], c[0]], [c[3], c[2]]] },
        properties: { clase: idx % 2 === 0 ? "primary" : "residential" }
      });
    });
    return {
      edificios: { type: "FeatureCollection", features: edificios },
      calles: { type: "FeatureCollection", features: calles }
    };
  }

  var MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.osm.jp/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass.openstreetmap.ru/api/interpreter"
  ];

  function cargarEscena(cb) {
    if (window.__RUMBO_STUB__) { cb(escenaStub()); return; }
    var sur = target.lat - RADIO_BBOX, oeste = target.lng - RADIO_BBOX;
    var norte = target.lat + RADIO_BBOX, este = target.lng + RADIO_BBOX;
    var q = "[out:json][timeout:40];(" +
      "way[\"building\"](" + sur + "," + oeste + "," + norte + "," + este + ");" +
      "way[\"highway\"](" + sur + "," + oeste + "," + norte + "," + este + ");" +
      ");out geom;";
    estado("Descargando edificios y calles de OpenStreetMap\u2026");

    var i = 0;
    function pedir() {
      if (i >= MIRRORS.length) {
        estado("No se pudo descargar la escena (Overpass no responde). Reintenta en un momento.", true);
        $("btn-iniciar").disabled = false;
        return;
      }
      var url = MIRRORS[i] + "?data=" + encodeURIComponent(q);
      var ctrl = new AbortController();
      var timer = setTimeout(function () { ctrl.abort(); }, 25000);
      fetch(url, { headers: { "Accept": "application/json" }, signal: ctrl.signal })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function (data) {
          clearTimeout(timer);
          var edificios = [], calles = [];
          (data.elements || []).forEach(function (el) {
            if (el.type !== "way") return;
            if (el.tags.building) {
              var b = geoJSONBuilding(el);
              if (b) edificios.push(b);
            } else if (el.tags.highway && !/footway|path|steps|track|cycleway|service|pedestrian/.test(el.tags.highway)) {
              var c = geoJSONCalle(el);
              if (c) calles.push(c);
            }
          });
          estado("Escena lista: " + edificios.length + " edificios, " + calles.length + " calles.");
          cb({
            edificios: { type: "FeatureCollection", features: edificios },
            calles: { type: "FeatureCollection", features: calles }
          });
        })
        .catch(function () {
          clearTimeout(timer);
          i++;
          pedir();
        });
    }
    pedir();
  }

  function estilo3D(escena) {
    return {
      version: 8,
      sources: {
        calles: { type: "geojson", data: escena.calles },
        edificios: { type: "geojson", data: escena.edificios },
        objetivo: {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [{
              type: "Feature",
              geometry: { type: "Point", coordinates: [target.lng, target.lat] },
              properties: {}
            }]
          }
        }
      },
      layers: [
        { id: "fondo", type: "background", paint: { "background-color": "#0b2539" } },
        {
          id: "calles", type: "line", source: "calles",
          paint: {
            "line-color": "#34506b",
            "line-width": ["case", ["==", ["get", "clase"], "primary"], 3,
              ["==", ["get", "clase"], "secondary"], 2.5, ["==", ["get", "clase"], "trunk"], 3, 1.5],
            "line-opacity": 0.85
          }
        },
        {
          id: "edificios3d", type: "fill-extrusion", source: "edificios",
          paint: {
            "fill-extrusion-color": ["interpolate", ["linear"], ["get", "altura"],
              0, "#7a6a4e", 12, "#b0884e", 25, "#c9a227", 60, "#e0b96e"],
            "fill-extrusion-height": ["get", "altura"],
            "fill-extrusion-base": 0,
            "fill-extrusion-opacity": 0.95
          }
        },
        {
          id: "objetivo-halo", type: "circle", source: "objetivo",
          paint: { "circle-radius": 16, "circle-color": "#c9a227", "circle-opacity": 0.25, "circle-stroke-color": "#c9a227", "circle-stroke-width": 2 }
        },
        {
          id: "objetivo", type: "circle", source: "objetivo",
          paint: { "circle-radius": 5, "circle-color": "#e0b96e", "circle-stroke-color": "#0b2539", "circle-stroke-width": 2 }
        }
      ]
    };
  }

  function inicializar() {
    target = elegirObjetivo();
    cargarEscena(function (escena) {
      setFase("juego");
      try {
        map = new maplibregl.Map({
          container: "mapa4",
          style: estilo3D(escena),
          center: [target.lng, target.lat],
          zoom: ZOOM,
          pitch: PITCH,
          bearing: 0,
          attributionControl: { compact: true }
        });
        map.dragPan.disable();
        map.scrollZoom.disable();
        map.doubleClickZoom.disable();
        map.keyboard.disable();
        map.touchZoomRotate.disable();
        map.on("load", function () { nuevaRonda(); });
      } catch (e) {
        estado("No se pudo iniciar el 3D (WebGL): " + e.message, true);
      }
    });
  }

  function idle(fn) {
    var listo = false;
    var t = setTimeout(function () { if (!listo) { listo = true; fn(); } }, 500);
    map.once("idle", function () { if (!listo) { listo = true; clearTimeout(t); fn(); } });
  }

  function capturarVista() {
    return map.getCanvas().toDataURL("image/png");
  }

  function cardinalVista(b) {
    return RUMBO.cardinalDe(((b % 360) + 360) % 360);
  }

  /* Captura las 4 vistas con la escena oculta (despues del vistazo). */
  function capturarCuatro(frontB, cb) {
    var opciones = [
      { bearing: (frontB + 180) % 360, correcta: true },
      { bearing: frontB % 360, correcta: false },
      { bearing: (frontB + 90) % 360, correcta: false },
      { bearing: (frontB + 270) % 360, correcta: false }
    ];
    $("mapa4").style.opacity = "0";
    var i = 0;
    function paso() {
      if (i >= opciones.length) { cb(opciones); return; }
      map.jumpTo({ bearing: opciones[i].bearing });
      idle(function () {
        opciones[i].url = capturarVista();
        i++;
        paso();
      });
    }
    paso();
  }

  function mezclar(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function nuevaRonda() {
    respondido = false;
    if (ronda >= RONDA_MAX) { fin(); return; }

    $("consigna4").textContent = "Mirá bien la escena\u2026";
    $("opciones-grid").innerHTML = "";
    $("feedback4").hidden = true;
    $("feedback4").innerHTML = "";
    $("btn-siguientec").hidden = true;

    frontBearing = [0, 90, 180, 270][Math.floor(Math.random() * 4)];
    $("ronda-actual").textContent = ronda + 1;
    $("etiqueta-vista").textContent = "MIRANDO DESDE EL " + cardinalVista(frontBearing);

    $("mapa4").style.opacity = "";
    map.jumpTo({ bearing: frontBearing });
    idle(function () {
      var total = Math.max(1, Math.round(VISTAZO_MS() / 1000));
      $("contadorv").textContent = total;
      var iv = setInterval(function () {
        total--;
        if (total <= 0) {
          clearInterval(iv);
          $("contadorv").textContent = "";
          ocultarYCapturar();
          return;
        }
        $("contadorv").textContent = total;
      }, 1000);
    });
  }

  function ocultarYCapturar() {
    $("consigna4").textContent =
      "Se acabo el vistazo. Sin mirar la escena: \u00bfcual es la vista hacia ATRAS?";
    capturarCuatro(frontBearing, function (opciones) {
      var grid = $("opciones-grid");
      grid.innerHTML = "";
      mezclar(opciones).forEach(function (op, idx) {
        var btn = document.createElement("button");
        btn.className = "opcion";
        btn.innerHTML = '<img src="' + op.url + '" alt="vista">' +
          '<span class="letra">' + String.fromCharCode(65 + idx) + "</span>";
        btn.addEventListener("click", function () { elegir(op, btn, opciones); });
        grid.appendChild(btn);
      });
    });
  }

  function elegir(opcion, btn, opciones) {
    if (respondido) return;
    respondido = true;
    var correcta = opcion.correcta;
    if (correcta) puntos += 100;

    document.querySelectorAll("#opciones-grid .opcion").forEach(function (b) {
      var img = b.querySelector("img").src;
      var esCorrecta = opciones.find(function (o) { return o.url === img; }).correcta;
      b.disabled = true;
      b.classList.add(esCorrecta ? "ok" : "gris");
      if (b === btn && !correcta) b.classList.add("mal");
    });

    var fb = $("feedback4");
    fb.innerHTML = correcta
      ? '<div class="rf"><span>CORRECTO</span><b>+100 pts</b></div>'
      : '<div class="rf"><span>NO ERA ESA</span><b>0 pts</b></div>';
    fb.innerHTML += '<div class="hint">La vista opuesta (desde el ' +
      cardinalVista((frontBearing + 180) % 360) + ") era la destacada. Mirala girar.</div>";
    fb.hidden = false;

    $("puntaje").textContent = puntos;

    /* Reaparece la escena girando desde el lado original hacia el opuesto. */
    map.jumpTo({ bearing: frontBearing });
    $("mapa4").style.opacity = "";
    map.easeTo({ bearing: (frontBearing + 180) % 360, duration: 1800 });

    $("btn-siguientec").hidden = false;
    $("btn-siguientec").textContent = ronda + 1 >= RONDA_MAX ? "Ver resumen" : "Siguiente";
    $("btn-siguientec").onclick = function () { ronda++; nuevaRonda(); };
  }

  function fin() {
    if (puntos > mejorGlobal) {
      mejorGlobal = puntos;
      localStorage.setItem("rumbo_mejor6", String(mejorGlobal));
    }
    $("resumen-filas").innerHTML =
      '<div class="rf"><span>PUNTOS TOTALES</span><b>' + puntos + "</b></div>" +
      '<div class="rf"><span>ACERTADOS</span><b>' + (puntos / 100) + "/" + RONDA_MAX + "</b></div>" +
      '<div class="rf"><span>RECORD PERSONAL</span><b>' + mejorGlobal + " pts</b></div>";
    actualizarUI();
    $("btn-volver").textContent = "Volver a empezar";
    $("btn-volver").disabled = false;
    setFase("resumen");
  }

  function actualizarUI() {
    $("ronda-actual").textContent = Math.min(ronda + 1, RONDA_MAX);
    $("puntaje").textContent = puntos;
    $("mejor").textContent = mejorGlobal;
  }

  function init() {
    $("mejor").textContent = mejorGlobal;
    $("btn-iniciar").addEventListener("click", function () {
      $("btn-iniciar").disabled = true;
      inicializar();
    });
    $("btn-volver").addEventListener("click", function () {
      ronda = 0; puntos = 0;
      actualizarUI();
      $("btn-volver").textContent = "Cargando\u2026";
      $("btn-volver").disabled = true;
      if (map) {
        setFase("juego");
        nuevaRonda();
      } else {
        inicializar();
      }
    });
    if (navigator.serviceWorker) {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
