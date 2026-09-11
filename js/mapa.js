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
  var bloqueadas = false;

  function viajeActual(nombreForzado) {
    var nombre = nombreForzado || null;
    if (!nombre) {
      var guardado = null;
      try { guardado = RUMBO.leerViaje(); } catch (e) {}
      var auto = "Buenos Aires · " + zonaNombre();
      if (guardado && guardado.nombre && guardado.nombre.indexOf("·") === -1) {
        nombre = guardado.nombre;
      } else {
        nombre = auto;
      }
    }
    return {
      nombre: nombre,
      centro: map.getCenter(),
      zoom: map.getZoom(),
      bloq: bloqueadas,
      anclas: anclas.map(function (a) {
        return { tipo: a.tipo, nombre: a.nombre, lat: a.marker.getLatLng().lat, lng: a.marker.getLatLng().lng };
      }),
      esqueleto: esqueletoData
    };
  }

  function guardar() {
    RUMBO.guardarViaje(viajeActual());
    refrescarSelector();
    var b = document.getElementById("barra-guardar");
    if (b) { b.textContent = "Viaje guardado (" + new Date().toLocaleTimeString() + ")"; }
  }

  function refrescarSelector() {
    var sel = document.getElementById("sel-viaje");
    if (!sel) return;
    var lista = RUMBO.listarViajes();
    var activo = null;
    try { activo = RUMBO.leerActivoId(); } catch (e) {}
    sel.innerHTML = "";
    lista.forEach(function (v) {
      var o = document.createElement("option");
      o.value = v.id;
      o.textContent = v.nombre + " (" + v.nAnclas + ")";
      if (v.id === activo) o.selected = true;
      sel.appendChild(o);
    });
    var btnB = document.getElementById("btn-borrar");
    if (btnB) btnB.disabled = lista.length <= 1;
  }

  function limpiarMapa() {
    anclas.forEach(function (a) { try { map.removeLayer(a.marker); } catch (e) {} });
    anclas = [];
    capaEsqueleto.clearLayers();
    esqueletoData = null;
    if (marcadorBase) { try { map.removeLayer(marcadorBase); } catch (e) {} marcadorBase = null; }
  }

  function cargarViajeEnMapa(viaje) {
    limpiarMapa();
    bloqueadas = !!(viaje && viaje.bloq);
    if (viaje && viaje.centro && viaje.zoom) {
      try { map.setView(viaje.centro, viaje.zoom); } catch (e) {}
    }
    if (viaje && viaje.nombre && viaje.nombre.indexOf("·") !== -1) {
      document.getElementById("buscar").value = viaje.nombre.split("·")[1].trim();
    }
    ((viaje && viaje.anclas) || []).forEach(function (d) {
      var a = { tipo: d.tipo, nombre: d.nombre, lat: d.lat, lng: d.lng };
      a.marker = crearMarcador(a);
      a.marker.addTo(map);
      anclas.push(a);
    });
    if (viaje && viaje.esqueleto && viaje.esqueleto.calles && viaje.esqueleto.calles.length) {
      esqueletoData = viaje.esqueleto;
      restaurarEsqueleto(viaje.esqueleto);
      setModo("esqueleto");
    } else {
      setModo("normal");
    }
    aplicarBloqueo();
    pintarAnclas();
  }

  function zonaNombre() {
    var v = document.getElementById("buscar").value.trim();
    return v ? v.split(",")[0] : "zona elegida";
  }

  function crearMarcador(a) {
    var m = L.marker([a.lat, a.lng], { icon: RUMBO.pinIcon(a.tipo), draggable: !bloqueadas });
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

  function agregarAncla(latlng, tipo) {    var t = TIPOS[tipo];
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

  function aplicarBloqueo() {
    anclas.forEach(function (a) {
      if (!a.marker || !a.marker.dragging) return;
      if (bloqueadas) a.marker.dragging.disable();
      else a.marker.dragging.enable();
    });
    var b = document.getElementById("btn-bloq");
    if (b) b.textContent = bloqueadas ? "Soltar anclas" : "Fijar anclas";
  }

  function setTipo(t) {    tipoActual = t;
    document.querySelectorAll("#seleccion-tipo .chip").forEach(function (c) {
      c.classList.toggle("activo", c.dataset.tipo === t);
    });
    if (marcadorBase) { map.removeLayer(marcadorBase); marcadorBase = null; }
  }

  function setModo(nuevo) {
    modo = nuevo;
    var txt = document.getElementById("estado-modo");
    document.getElementById("mapa").classList.toggle("esqueleto", modo === "esqueleto");
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
      "&email=vale707vale@gmail.com" +
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
    RUMBO.brujulaMapa("mapa");

    var btnToggle = document.createElement("button");
    btnToggle.id = "btn-toggle-skeleton";
    btnToggle.className = "btn papel";
    btnToggle.style.marginTop = "6px";
    btnToggle.textContent = "Ver esqueleto";
    btnToggle.addEventListener("click", function () {
      setModo(modo === "esqueleto" ? "normal" : "esqueleto");
    });
    document.getElementById("btn-esqueleto").insertAdjacentElement("afterend", btnToggle);

    refrescarSelector();
    cargarViajeEnMapa(RUMBO.leerViaje());

    document.getElementById("sel-viaje").addEventListener("change", function () {
      var nid = this.value;
      guardar();
      var v = RUMBO.activarViaje(nid);
      cargarViajeEnMapa(v);
      refrescarSelector();
    });

    document.getElementById("btn-nuevo").addEventListener("click", function () {
      guardar();
      var nombre = window.prompt("Nombre del nuevo mapa:", zonaNombre() || "Nuevo barrio");
      if (nombre === null) return;
      nombre = (nombre || "").trim() || "Nuevo barrio";
      RUMBO.crearViaje(nombre, map.getCenter(), map.getZoom());
      document.getElementById("buscar").value = nombre;
      cargarViajeEnMapa(RUMBO.leerViaje());
      refrescarSelector();
      guardar();
    });

    document.getElementById("btn-renombrar").addEventListener("click", function () {
      var actual = RUMBO.leerViaje();
      var nombre = window.prompt("Renombrar mapa:", actual ? actual.nombre : "");
      if (nombre === null) return;
      nombre = (nombre || "").trim();
      if (!nombre) return;
      RUMBO.guardarViaje(viajeActual(nombre));
      refrescarSelector();
      var b = document.getElementById("barra-guardar");
      if (b) { b.textContent = "Viaje guardado (" + new Date().toLocaleTimeString() + ")"; }
    });

    document.getElementById("btn-duplicar").addEventListener("click", function () {
      guardar();
      var nid = null;
      try { nid = RUMBO.duplicarViaje(RUMBO.leerActivoId()); } catch (e) {}
      if (nid) {
        RUMBO.activarViaje(nid);
        cargarViajeEnMapa(RUMBO.leerViaje());
        refrescarSelector();
      }
    });

    document.getElementById("btn-borrar").addEventListener("click", function () {
      var lista = RUMBO.listarViajes();
      if (lista.length <= 1) return;
      var actual = RUMBO.leerViaje();
      if (!window.confirm("Borrar '" + (actual ? actual.nombre : "") + "'?")) return;
      var ok = false;
      try { ok = RUMBO.borrarViaje(RUMBO.leerActivoId()); } catch (e) {}
      if (ok) {
        cargarViajeEnMapa(RUMBO.leerViaje());
        refrescarSelector();
      }
    });

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

    function descargar(nombre, texto) {
      var blob = new Blob([texto], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }

    function nombreArchivo(base) {
      return "rumbo-" + (base || "mapa").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".json";
    }

    document.getElementById("btn-exp-uno").addEventListener("click", function () {
      guardar();
      var v = RUMBO.leerViaje();
      if (!v) return;
      descargar(nombreArchivo(v.nombre), JSON.stringify(v, null, 2));
    });

    document.getElementById("btn-exp-todo").addEventListener("click", function () {
      guardar();
      descargar("rumbo-backup.json", JSON.stringify(RUMBO.exportarRespaldo(), null, 2));
    });

    document.getElementById("btn-importar").addEventListener("click", function () {
      document.getElementById("file-importar").click();
    });

    document.getElementById("file-importar").addEventListener("change", function () {
      var f = this.files && this.files[0];
      var msg = document.getElementById("barra-importar");
      if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var datos = JSON.parse(rd.result);
          var res = RUMBO.importarRespaldo(datos);
          if (!res.ok) throw new Error("formato");
          guardar();
          cargarViajeEnMapa(RUMBO.leerViaje());
          refrescarSelector();
          msg.textContent = "Importados " + res.importados + " mapa(s).";
        } catch (e) {
          msg.textContent = "Archivo invalido: no es un JSON de RUMBO.";
        }
      };
      rd.readAsText(f);
      this.value = "";
    });

    function refrescarHojaPrint() {
      var v = viajeActual();
      var pn = document.getElementById("print-nombre");
      var pm = document.getElementById("print-meta");
      var pa = document.getElementById("print-anclas");
      if (pn) pn.textContent = v.nombre;
      if (pm) pm.textContent = (modo === "esqueleto" ? "Esqueleto sin nombres" : "Mapa con nombres") +
        " · " + v.anclas.length + " anclas · " +
        (v.esqueleto && v.esqueleto.calles ? v.esqueleto.calles.length + " tramos" : "sin esqueleto") +
        " · " + new Date().toLocaleString();
      if (pa) {
        pa.innerHTML = "";
        v.anclas.forEach(function (a) {
          var t = TIPOS[a.tipo] || { nombre: a.tipo };
          var d = document.createElement("div");
          d.className = "pa";
          d.textContent = t.nombre + " · " + a.nombre + " · " + a.lat.toFixed(5) + ", " + a.lng.toFixed(5);
          pa.appendChild(d);
        });
      }
    }

    document.getElementById("btn-imprimir").addEventListener("click", function () {
      guardar();
      refrescarHojaPrint();
      window.print();
    });
    window.addEventListener("beforeprint", refrescarHojaPrint);

    document.getElementById("btn-esqueleto").addEventListener("click", generarEsqueleto);
    document.getElementById("btn-guardar").addEventListener("click", guardar);
    document.getElementById("btn-bloq").addEventListener("click", function () {
      bloqueadas = !bloqueadas;
      aplicarBloqueo();
      guardar();
    });

    document.getElementById("btn-panel").addEventListener("click", function () {
      document.getElementById("mapa-layout").classList.toggle("panel-cerrado");
      setTimeout(function () { map.invalidateSize(); }, 50);
    });

    if (navigator.serviceWorker) {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
