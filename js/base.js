(function (global) {
  "use strict";

  var TIPOS = {
    hotel:       { nombre: "Hotel",       color: "#1f6fb2", simbolo: "H" },
    subte:       { nombre: "Subte",       color: "#2e8b57", simbolo: "M" },
    restaurante: { nombre: "Restaurante", color: "#c0392b", simbolo: "R" },
    hito:        { nombre: "Hito",        color: "#c9a227", simbolo: "*" }
  };

  var PESOS = {
    motorway:      { color: "#232323", peso: 9 },
    trunk:         { color: "#2d2d2d", peso: 8 },
    primary:       { color: "#3a3a3a", peso: 6 },
    secondary:     { color: "#5b5b5b", peso: 5 },
    tertiary:      { color: "#787878", peso: 4 },
    unclassified:  { color: "#8a8a8a", peso: 3 },
    residential:   { color: "#9c9c9c", peso: 3 },
    living_street: { color: "#9c9c9c", peso: 3 },
    pedestrian:    { color: "#b0b0b0", peso: 2 },
    service:       { color: "#b9b9b9", peso: 2 },
    footway:       { color: "#c8c8c8", peso: 1 },
    path:          { color: "#c8c8c8", peso: 1 }
  };

  function tileOsm() {
    return L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>"
    });
  }

  // Fondo del esqueleto: capa vacia sobre fondo papel (CSS).
  // CARTO light_nolabels dejo de ser gratis sin key (devuelve "API KEY REQUIRED"),
  // asi que el laberinto lo dibujan solo las calles vectoriales de Overpass.
  // getAttribution mantiene el credito OSM en el control de Leaflet.
  function tileSkeleton() {
    var g = L.layerGroup();
    g.getAttribution = function () {
      return "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>";
    };
    return g;
  }

  function pinIcon(tipo) {
    var t = TIPOS[tipo] || TIPOS.hito;
    return L.divIcon({
      className: "ancla-icono",
      html: '<div class="ancla-pin" style="background:' + t.color + '"><span>' + t.simbolo + "</span></div>",
      iconSize: [30, 34],
      iconAnchor: [15, 32],
      popupAnchor: [0, -30]
    });
  }

  function pinPulsoIcon(tipo) {
    var t = TIPOS[tipo] || TIPOS.hito;
    return L.divIcon({
      className: "ancla-icono",
      html: '<div class="ancla-pulso" style="background:' + t.color + '"><span>' + t.simbolo + "</span></div>",
      iconSize: [34, 38],
      iconAnchor: [17, 34],
      popupAnchor: [0, -30]
    });
  }

  function dibujarEsqueleto(target, calles) {
    (calles || []).forEach(function (c) {
      var e = PESOS[c.clase] || { color: "#9c9c9c", peso: 3 };
      L.polyline(c.coords, { color: e.color, weight: e.peso, opacity: 0.9, smoothFactor: 1.2 })
        .addTo(target);
    });
  }

  function rumboEntre(orig, dest) {
    var dLon = (dest.lng - orig.lng) * Math.PI / 180;
    var lat1 = orig.lat * Math.PI / 180;
    var lat2 = dest.lat * Math.PI / 180;
    var y = Math.sin(dLon) * Math.cos(lat2);
    var x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    var ang = Math.atan2(y, x) * 180 / Math.PI;
    return (ang + 360) % 360;
  }

  function cardinalDe(grados) {
    var i = Math.round(grados / 90) % 4;
    return ["N", "E", "S", "O"][(i + 4) % 4];
  }

  function etiquetaRumbo(grados) {
    var p = Math.round(grados / 45) % 8;
    return ["N", "NE", "E", "SE", "S", "SO", "O", "NO"][(p + 8) % 8];
  }

  function angError(a, b) {
    return Math.abs(((a - b) + 540) % 360 - 180);
  }

  function distanciaEntre(a, b) {
    var R = 6371000;
    var dLat = (b.lat - a.lat) * Math.PI / 180;
    var dLon = (b.lng - a.lng) * Math.PI / 180;
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  function destinoDesde(orig, rumbo, metros) {
    var R = 6371000;
    var dR = metros / R;
    var brg = rumbo * Math.PI / 180;
    var la1 = orig.lat * Math.PI / 180;
    var lo1 = orig.lng * Math.PI / 180;
    var la2 = Math.asin(Math.sin(la1) * Math.cos(dR) + Math.cos(la1) * Math.sin(dR) * Math.cos(brg));
    var lo2 = lo1 + Math.atan2(
      Math.sin(brg) * Math.sin(dR) * Math.cos(la1),
      Math.cos(dR) - Math.sin(la1) * Math.sin(la2)
    );
    return { lat: la2 * 180 / Math.PI, lng: lo2 * 180 / Math.PI };
  }

  var CLAVE_VIAJE = "rumbo_viaje";
  var CLAVE_VIAJES = "rumbo_viajes";
  var CLAVE_ACTIVO = "rumbo_activo";

  function genId() {
    return "v" + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
  }

  function leerTodos() {
    try {
      return JSON.parse(localStorage.getItem(CLAVE_VIAJES) || "{}") || {};
    } catch (e) {
      return {};
    }
  }

  function guardarTodos(obj) {
    try { localStorage.setItem(CLAVE_VIAJES, JSON.stringify(obj)); } catch (e) {}
  }

  function leerActivoId() {
    try { return localStorage.getItem(CLAVE_ACTIVO) || null; } catch (e) { return null; }
  }

  function setActivoId(id) {
    try { localStorage.setItem(CLAVE_ACTIVO, id); } catch (e) {}
  }

  function migrarLegado() {
    var todos = leerTodos();
    if (Object.keys(todos).length) return todos;
    var legado = null;
    try { legado = JSON.parse(localStorage.getItem(CLAVE_VIAJE) || "null"); } catch (e) {}
    if (legado) {
      var id = genId();
      todos[id] = legado;
      guardarTodos(todos);
      setActivoId(id);
    }
    return todos;
  }

  function leerViaje() {
    try {
      var todos = migrarLegado();
      var ids = Object.keys(todos);
      if (ids.length) {
        var aid = leerActivoId();
        if (aid && todos[aid]) return todos[aid];
        setActivoId(ids[0]);
        return todos[ids[0]];
      }
      return JSON.parse(localStorage.getItem(CLAVE_VIAJE) || "null");
    } catch (e) {
      return null;
    }
  }

  function guardarViaje(viaje) {
    var todos = migrarLegado();
    var aid = leerActivoId();
    if (!aid || !todos[aid]) {
      aid = genId();
      setActivoId(aid);
    }
    todos[aid] = viaje;
    guardarTodos(todos);
    try { localStorage.setItem(CLAVE_VIAJE, JSON.stringify(viaje)); } catch (e) {}
    return aid;
  }

  function listarViajes() {
    var todos = migrarLegado();
    return Object.keys(todos).map(function (id) {
      var v = todos[id] || {};
      return {
        id: id,
        nombre: v.nombre || "Viaje",
        nAnclas: (v.anclas || []).length,
        tieneEsqueleto: !!(v.esqueleto && v.esqueleto.calles && v.esqueleto.calles.length)
      };
    });
  }

  function crearViaje(nombre, centro, zoom) {
    var todos = migrarLegado();
    var id = genId();
    var v = { nombre: nombre || "Nuevo viaje", centro: centro || null, zoom: zoom || 14, bloq: false, anclas: [], esqueleto: null };
    todos[id] = v;
    guardarTodos(todos);
    setActivoId(id);
    try { localStorage.setItem(CLAVE_VIAJE, JSON.stringify(v)); } catch (e) {}
    return id;
  }

  function activarViaje(id) {
    var todos = migrarLegado();
    if (!todos[id]) return null;
    setActivoId(id);
    try { localStorage.setItem(CLAVE_VIAJE, JSON.stringify(todos[id])); } catch (e) {}
    return todos[id];
  }

  function borrarViaje(id) {
    var todos = migrarLegado();
    if (!todos[id]) return false;
    if (Object.keys(todos).length <= 1) return false;
    delete todos[id];
    guardarTodos(todos);
    var aid = leerActivoId();
    if (aid === id) {
      var resto = Object.keys(todos)[0];
      setActivoId(resto);
      try { localStorage.setItem(CLAVE_VIAJE, JSON.stringify(todos[resto])); } catch (e) {}
    }
    return true;
  }

  function renombrarViaje(id, nombre) {
    var todos = migrarLegado();
    if (!todos[id]) return false;
    todos[id].nombre = nombre;
    guardarTodos(todos);
    if (leerActivoId() === id) {
      try { localStorage.setItem(CLAVE_VIAJE, JSON.stringify(todos[id])); } catch (e) {}
    }
    return true;
  }

  function duplicarViaje(id) {
    var todos = migrarLegado();
    if (!todos[id]) return null;
    var nid = genId();
    var copia = JSON.parse(JSON.stringify(todos[id]));
    copia.nombre = (copia.nombre || "Viaje") + " (copia)";
    todos[nid] = copia;
    guardarTodos(todos);
    return nid;
  }

  function viajeValido(v) {
    if (!v || typeof v !== "object") return false;
    if (typeof v.nombre !== "string") return false;
    if (!Array.isArray(v.anclas)) return false;
    for (var i = 0; i < v.anclas.length; i++) {
      var a = v.anclas[i];
      if (!a || typeof a.lat !== "number" || typeof a.lng !== "number") return false;
      if (!TIPOS[a.tipo]) return false;
    }
    if (v.esqueleto !== null && v.esqueleto !== undefined) {
      if (typeof v.esqueleto !== "object" || !Array.isArray(v.esqueleto.calles)) return false;
    }
    return true;
  }

  function exportarRespaldo() {
    var todos = migrarLegado();
    return { app: "rumbo", formato: 1, fecha: new Date().toISOString(), activo: leerActivoId(), viajes: todos };
  }

  function importarRespaldo(datos) {
    var todos = migrarLegado();
    var importados = 0;
    function agregar(v) {
      if (!viajeValido(v)) return false;
      var nid = genId();
      var copia = JSON.parse(JSON.stringify(v));
      todos[nid] = copia;
      importados++;
      return nid;
    }
    if (datos && datos.viajes && typeof datos.viajes === "object") {
      Object.keys(datos.viajes).forEach(function (k) { agregar(datos.viajes[k]); });
    } else if (Array.isArray(datos)) {
      datos.forEach(agregar);
    } else if (viajeValido(datos)) {
      agregar(datos);
    } else {
      return { ok: false, importados: 0 };
    }
    if (!importados) return { ok: false, importados: 0 };
    guardarTodos(todos);
    if (!leerActivoId()) {
      var primero = Object.keys(todos)[0];
      setActivoId(primero);
    }
    var aid = leerActivoId();
    if (aid && todos[aid]) {
      try { localStorage.setItem(CLAVE_VIAJE, JSON.stringify(todos[aid])); } catch (e) {}
    }
    return { ok: true, importados: importados };
  }

  function enBbox(lat, lng, bbox) {
    try {
      return lat >= bbox[0][0] && lat <= bbox[1][0] &&
        lng >= bbox[0][1] && lng <= bbox[1][1];
    } catch (e) {
      return true;
    }
  }

  function brujulaMapa(idContenedor) {
    var cont = document.getElementById(idContenedor);
    if (!cont) return null;
    if (window.getComputedStyle(cont).position === "static") {
      cont.style.position = "relative";
    }
    var b = document.createElement("div");
    b.className = "brujula-mapa";
    b.title = "Norte";
    b.innerHTML = '<span class="flecha-n">\u25B2</span><span class="letra-n">N</span>';
    cont.appendChild(b);
    return b;
  }

  global.RUMBO = {
    VER: "v38",
    TIPOS: TIPOS,
    PESOS: PESOS,
    tileOsm: tileOsm,
    tileSkeleton: tileSkeleton,
    pinIcon: pinIcon,
    pinPulsoIcon: pinPulsoIcon,
    dibujarEsqueleto: dibujarEsqueleto,
    rumboEntre: rumboEntre,
    cardinalDe: cardinalDe,
    etiquetaRumbo: etiquetaRumbo,
    angError: angError,
    distanciaEntre: distanciaEntre,
    destinoDesde: destinoDesde,
    leerViaje: leerViaje,
    guardarViaje: guardarViaje,
    listarViajes: listarViajes,
    crearViaje: crearViaje,
    activarViaje: activarViaje,
    borrarViaje: borrarViaje,
    renombrarViaje: renombrarViaje,
    duplicarViaje: duplicarViaje,
    leerActivoId: leerActivoId,
    exportarRespaldo: exportarRespaldo,
    importarRespaldo: importarRespaldo,
    viajeValido: viajeValido,
    enBbox: enBbox,
    brujulaMapa: brujulaMapa
  };
})(window);
