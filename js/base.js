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

  function tileSkeleton() {
    return L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
      attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OSM</a> &copy; <a href='https://carto.com/attributions'>CARTO</a>"
    });
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

  function leerViaje() {
    return JSON.parse(localStorage.getItem("rumbo_viaje") || "null");
  }

  global.RUMBO = {
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
    leerViaje: leerViaje
  };
})(window);
