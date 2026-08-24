(function () {
  "use strict";

  var PALERMO = [-34.5886, -58.4292];
  var TIPOS = RUMBO.TIPOS;
  var PESOS = RUMBO.PESOS;
  var EXCLUIDOS = /footway|path|steps|track|cycleway|bridleway|corridor|proposed|construction|raceway|bus_guideway|escape|services|rest_area|platform/;

  var map, marcadorBase;
  var anclas = [];
  var capaEsqueleto = L.layerGroup();
  var tipoActual = "hotel";
  var modo = "normal";
  var esqueletoData = null;
  var tileOsm, tileSkeleton;

  function guardar() {
    var viaje = {
      nombre: "Buenos Aires · " + zonaNombre(),
      centro: map.getCenter(),
      zoom: map.getZoom(),
      anclas: anclas.map(function (a) {
        return { tipo: a.tipo, nombre: a.nombre, lat: a.marker.getLatLng().lat, lng: a.marker.getLatLng().lng };
      }),
      esqueleto: esqueletoData
    };
    localStorage.setItem("rumbo_viaje", JSON.stringify(viaje));
    var b = document.getElementById("barra-guardar");
    if (b) { b.textContent = "Viaje guardado (" + new Date().toLocaleTimeString() + ")"; }
  }

  function zonaNombre() {
    var v = document.getElementById("buscar").value.trim();
    return v ? v.split(",")[0] : "zona elegida";
  }

  function crearMarcador(a) {
    var m = L.marker([a.lat, a.lng], { icon: RUMBO.pinIcon(a.tipo), draggable: true });
    var t = TIPOS[a.tipo];
    m.bindPopup("<b>" + a.nombre + "</b><br><span class='mono'>" + t.nombre + "</span><br>" +
      "lat " + a.lat.toFixed(5) + " lng " + a.lng.toFixed(5));
    m.on("dragend", function () { guardar(); });
    return m;
  }

  function pintarAnclas() {
    document.getElementById("lista-anclas").innerHTML = "";
    document.getElementById("cont-anclas").textContent = anclas.length;
    if (!anclas.length) {
      document.getElementById("lista-anclas").innerHTML = '<div class="vacio">Todavia no hay anclas.</div>';
      return;
    }
    anclas.forEach(function (a) {
      var fila = document.createElement("div");
      fila.className = "ancla";
      var t = TIPOS[a.tipo];
      fila.innerHTML =
        '<span class="pto" style="background:' + t.color + '"></span>' +
        '<span class="nombre">' + a.nombre + "</span>" +
        '<span class="latlng">' + a.lat.toFixed(4) + ", " + a.lng.toFixed(4) + "</span>" +
        '<button class="quitar" title="Quitar">\u2715</button>';
      fila.querySelector(".quitar").addEventListener("click", function () {
        map.removeLayer(a.marker);
        anclas = anclas.filter(function (x) { return x !== a; });
        pintarAnclas();
        guardar();
      });
      fila.addEventListener("click", function (ev) {
        if (ev.target.className === "quitar") return;
        map.setView(a.marker.getLatLng(), Math.max(map.getZoom(), 15));
        a.marker.openPopup();
      });
      document.getElementById("lista-anclas").appendChild(fila);
    });
  }

  function agregarAncla(latlng, tipo) {
    var t = TIPOS[tipo];
    var n = anclas.filter(function (a) { return a.tipo === tipo; }).length + 1;
    var a = { tipo: tipo, nombre: t.nombre + " " + n, lat: latlng.lat, lng: latlng.lng };
    a.marker = crearMarcador(a);
    a.marker.addTo(map);
    anclas.push(a);
    pintarAnclas();
    guardar();

    var popup = L.popup({ autoClose: true, closeOnClick: false })
      .setLatLng(latlng)
      .setContent(
        '<div style="font-family:var(--sans)">' +
        "<b>" + t.nombre + "</b><br>" +
        '<input type="text" id="nombre-ancla" value="' + a.nombre + '" ' +
        'style="width:180px;padding:5px;margin:6px 0;font-family:var(--mono)">' +
        '<button id="ok-ancla" style="display:block;width:100%;padding:6px;cursor:pointer">Guardar nombre</button>' +
        "</div>"
      )
      .openOn(map);
    setTimeout(function () {
      var inp = document.getElementById("nombre-ancla");
      if (!inp) return;
      inp.focus();
      inp.select();
      inp.addEventListener("keydown", function (e) {
        if (e.key === "Enter") document.getElementById("ok-ancla").click();
      });
      document.getElementById("ok-ancla").addEventListener("click", function () {
        a.nombre = inp.value.trim() || a.nombre;
        a.marker.setPopupContent("<b>" + a.nombre + "</b><br><span class='mono'>" + t.nombre +
          "</span><br>lat " + a.lat.toFixed(5) + " lng " + a.lng.toFixed(5));
        pintarAnclas();
        guardar();
        map.closePopup();
      });
    }, 100);
  }

  function setTipo(t) {
    tipoActual = t;
    document.querySelectorAll("#seleccion-tipo .chip").forEach(function (c) {
      c.classList.toggle("activo", c.dataset.tipo === t);
    });
    if (marcadorBase) { map.removeLayer(marcadorBase); marcadorBase = null; }
  }

  function setModo(nuevo) {
    modo = nuevo;
    var txt = document.getElementById("estado-modo");
    if (modo === "esqueleto") {
      map.removeLayer(tileOsm);
      map.addLayer(tileSkeleton);
      map.addLayer(capaEsqueleto);
      txt.textContent = "ESQUELETO · SIN NOMBRES";
      document.getElementById("leyenda").hidden = false;
      document.getElementById("btn-toggle-skeleton").textContent = "Ver mapa con nombres";
    } else {
      map.removeLayer(tileSkeleton);
      map.addLayer(tileOsm);
      map.removeLayer(capaEsqueleto);
      txt.textContent = "MAPA NORMAL";
      document.getElementById("leyenda").hidden = true;
      document.getElementById("btn-toggle-skeleton").textContent = "Ver esqueleto";
    }
  }

  function estado(msg, esError) {
    var b = document.getElementById("barra-estado");
    b.textContent = msg;
    b.className = "barra-estado" + (esError ? " error" : "");
  }

  function generarEsqueleto() {
    if (map.getZoom() < 12) {
      map.setView(map.getCenter(), 13);
    }
    var bounds = map.getBounds();
    var sur = bounds.getSouth(), oeste = bounds.getWest();
    var norte = bounds.getNorth(), este = bounds.getEast();
    var q = "[out:json][timeout:30];" +
      "way[\"highway\"](" + sur + "," + oeste + "," + norte + "," + este + ");" +
      "out geom;";
    var url = "https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(q);
    estado("Descargando calles de Overpass\u2026");
    document.getElementById("btn-esqueleto").disabled = true;

    function pedir(u) {
      var ctrl = new AbortController();
      var timer = setTimeout(function () { ctrl.abort(); }, 25000);
      fetch(u, { headers: { "Accept": "application/json" }, signal: ctrl.signal })
        .then(function (r) {
          clearTimeout(timer);
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        })
        .then(function (data) {
          procesarCalles(data.elements || []);
        })
        .catch(function () {
          clearTimeout(timer);
          if (u.indexOf("kumi") === -1) {
            estado("Reintentando con espejo\u2026");
            pedir("https://overpass.kumi.systems/api/interpreter?data=" + encodeURIComponent(q));
          } else {
            estado("Fallo Overpass. Revisa tu conexion.", true);
            document.getElementById("btn-esqueleto").disabled = false;
          }
        });
    }
    pedir(url);
  }

  function procesarCalles(elements) {
    capaEsqueleto.clearLayers();
    var calles = [];
    elements.forEach(function (el) {
      if (el.type !== "way" || !el.tags || !el.tags.highway) return;
      if (EXCLUIDOS.test(el.tags.highway)) return;
      var estilo = PESOS[el.tags.highway];
      if (!estilo) return;
      var coords = (el.geometry || []).map(function (p) { return [p.lat, p.lon]; });
      if (coords.length < 2) return;
      calles.push({ clase: el.tags.highway, coords: coords, peso: estilo.peso });
    });

    calles.sort(function (a, b) { return b.peso - a.peso; });
    if (calles.length > 2200) calles = calles.slice(0, 2200);

    calles.forEach(function (c) {
      var estilo = PESOS[c.clase] || { color: "#9c9c9c", peso: 3 };
      L.polyline(c.coords, { color: estilo.color, weight: estilo.peso, opacity: 0.9, smoothFactor: 1.2 })
        .addTo(capaEsqueleto);
    });

    if (!calles.length) {
      estado("No se encontraron calles en esta zona.", true);
      document.getElementById("btn-esqueleto").disabled = false;
      return;
    }
    var bounds = map.getBounds();
    esqueletoData = {
      bbox: [[bounds.getSouth(), bounds.getWest()], [bounds.getNorth(), bounds.getEast()]],
      calles: calles
    };
    setModo("esqueleto");
    estado("Esqueleto listo: " + calles.length + " tramos de calle.");
    document.getElementById("btn-esqueleto").disabled = false;
    guardar();
  }

  function restaurarEsqueleto(data) {
    capaEsqueleto.clearLayers();
    RUMBO.dibujarEsqueleto(capaEsqueleto, data.calles);
  }

  function buscar(q, cb) {
    var url = "https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=es" +
      "&q=" + encodeURIComponent(q);
    fetch(url, { headers: { "Accept": "application/json" } })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (res) {
        if (!res.length) { cb(new Error("Sin resultados")); return; }
        cb(null, res[0]);
      })
      .catch(function (e) { cb(e); });
  }

  function init() {
    tileOsm = RUMBO.tileOsm();
    tileSkeleton = RUMBO.tileSkeleton();

    map = L.map("mapa", { zoomControl: true }).setView(PALERMO, 14);
    map.addLayer(tileOsm);
    map.addLayer(capaEsqueleto);

    var btnToggle = document.createElement("button");
    btnToggle.id = "btn-toggle-skeleton";
    btnToggle.className = "btn papel";
    btnToggle.style.marginTop = "6px";
    btnToggle.textContent = "Ver esqueleto";
    btnToggle.addEventListener("click", function () {
      setModo(modo === "esqueleto" ? "normal" : "esqueleto");
    });
    document.getElementById("btn-esqueleto").insertAdjacentElement("afterend", btnToggle);

    var viaje = RUMBO.leerViaje();
    if (viaje) {
      if (viaje.centro && viaje.zoom) map.setView(viaje.centro, viaje.zoom);
      if (viaje.nombre && viaje.nombre.indexOf("·") !== -1) {
        document.getElementById("buscar").value = viaje.nombre.split("·")[1].trim();
      }
      (viaje.anclas || []).forEach(function (d) {
        var a = { tipo: d.tipo, nombre: d.nombre, lat: d.lat, lng: d.lng };
        a.marker = crearMarcador(a);
        a.marker.addTo(map);
        anclas.push(a);
      });
      if (viaje.esqueleto) {
        esqueletoData = viaje.esqueleto;
        restaurarEsqueleto(viaje.esqueleto);
        setModo("esqueleto");
      }
      pintarAnclas();
    }

    map.on("click", function (e) {
      if (marcadorBase) map.removeLayer(marcadorBase);
      marcadorBase = L.circleMarker(e.latlng, {
        radius: 9, color: TIPOS[tipoActual].color, weight: 2, fillOpacity: 0.25,
        fillColor: TIPOS[tipoActual].color
      }).addTo(map);
      agregarAncla(e.latlng, tipoActual);
    });

    map.on("mousemove", function (e) {
      document.getElementById("estado-coord").textContent =
        "lat " + e.latlng.lat.toFixed(5) + " lng " + e.latlng.lng.toFixed(5);
    });

    document.querySelectorAll("#seleccion-tipo .chip").forEach(function (c) {
      c.addEventListener("click", function () { setTipo(c.dataset.tipo); });
    });

    document.getElementById("btn-buscar").addEventListener("click", function () {
      var q = document.getElementById("buscar").value.trim();
      if (!q) return;
      estado("Buscando\u2026");
      buscar(q, function (err, r) {
        if (err || !r) { estado("No se encontro. Prueba con mas datos.", true); return; }
        map.flyTo([parseFloat(r.lat), parseFloat(r.lon)], 15);
        estado(r.display_name);
      });
    });
    document.getElementById("buscar").addEventListener("keydown", function (e) {
      if (e.key === "Enter") document.getElementById("btn-buscar").click();
    });

    document.getElementById("btn-loc").addEventListener("click", function () {
      if (!navigator.geolocation) { estado("Este navegador no soporta geolocalizacion.", true); return; }
      estado("Obteniendo tu ubicacion\u2026");
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          var ll = [pos.coords.latitude, pos.coords.longitude];
          map.flyTo(ll, 16);
          estado("Estas aqui. Ancla tu hotel para empezar.");
        },
        function () { estado("No se pudo obtener la ubicacion.", true); },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });

    document.getElementById("btn-esqueleto").addEventListener("click", generarEsqueleto);
    document.getElementById("btn-guardar").addEventListener("click", guardar);

    if (navigator.serviceWorker) {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
