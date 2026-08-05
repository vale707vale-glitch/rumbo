(function () {
  "use strict";

  var RONDA_MAX = 5;
  var MARGEN = 15;
  var WALK_MIN = 40, WALK_MAX = 150;
  var MAX_TIEMPO_WALK = 180000;

  var ronda = 0, puntosTotal = 0, errores = [];
  var posInicio = null, posActual = null;
  var headingActual = null;
  var headingRecibido = false;
  var targetDist = 0, tInicioWalk = 0;
  var watchId = null, intervaloId = null;
  var targetRumbo = 0;
  var mejorGlobal = parseInt(localStorage.getItem("rumbo_mejor3") || "0", 10);

  function $(id) { return document.getElementById(id); }

  function setFase(nombre) {
    estado = nombre;
    ["inicial", "caminar", "parada", "resultado", "resumen"].forEach(function (f) {
      $("fase-" + f).hidden = (f !== nombre);
    });
  }

  function ceroTres(g) {
    var p = Math.round(g);
    return (p < 100 ? "0" : "") + (p < 10 ? "0" : "") + p;
  }

  function actualizarPuntajeUI() {
    $("puntaje").textContent = puntosTotal;
    $("ronda-actual").textContent = ronda;
  }

  function setHeading(g) {
    if (typeof g !== "number" || !isFinite(g)) return;
    headingActual = ((g % 360) + 360) % 360;
    headingRecibido = true;
    if (estado === "parada") actualizarParadaUI();
  }

  function iniciar() {
    if (!navigator.geolocation) {
      alert("Este navegador no soporta geolocalizacion.");
      return;
    }
    function arrancar() {
      navigator.geolocation.getCurrentPosition(function (pos) {
        posInicio = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        ronda = 0; puntosTotal = 0; errores = [];
        actualizarPuntajeUI();
        caminar();
      }, function () {
        alert("No se pudo obtener tu ubicacion. Probá de nuevo afuera o en un lugar abierto.");
      }, { enableHighAccuracy: true, timeout: 15000 });
    }
    var d = window.DeviceOrientationEvent;
    if (d && d.requestPermission) {
      d.requestPermission().then(function (res) {
        if (res === "granted") arrancar();
        else alert("Permiso de orientacion denegado: la brujula no funcionara.");
      }).catch(function () { arrancar(); });
    } else {
      if ("Notification" in window && Notification.permission === "default") {
        try { Notification.requestPermission(); } catch (e) {}
      }
      arrancar();
    }
  }

  function caminar() {
    setFase("caminar");
    targetDist = WALK_MIN + Math.random() * (WALK_MAX - WALK_MIN);
    tInicioWalk = Date.now();
    $("instruccion-caminar").textContent =
      "Alejate unos " + targetDist.toFixed(0) + " m de tu inicio. Sin mirar mapas.";
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    watchId = navigator.geolocation.watchPosition(function (pos) {
      posActual = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      if (estado !== "caminar") return;
      var d = RUMBO.distanciaEntre(posInicio, posActual);
      $("dist-grande").textContent = d.toFixed(0) + " m";
      $("dist-lectura").textContent = d.toFixed(0) + " m";
      if (d >= targetDist || Date.now() - tInicioWalk >= MAX_TIEMPO_WALK) parar();
    }, null, { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 });
  }

  function parar() {
    if (estado !== "caminar") return;
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    if (!posActual) posActual = posInicio;
    targetRumbo = RUMBO.rumboEntre(posActual, posInicio);
    setFase("parada");
    actualizarParadaUI();
    if (intervaloId) clearInterval(intervaloId);
    intervaloId = setInterval(actualizarParadaUI, 200);
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
      try {
        new Notification("RUMBO - PARADA", { body: "Apunta hacia tu punto de inicio." });
      } catch (e) {}
    }
  }

  function actualizarParadaUI() {
    var err = headingActual !== null ? RUMBO.angError(headingActual, targetRumbo) : null;
    if (headingActual !== null) {
      $("aguja-gauge").setAttribute("transform", "rotate(" + headingActual + ")");
      $("gauge-lectura").textContent =
        ceroTres(headingActual) + "\u00b0 " + RUMBO.etiquetaRumbo(headingActual);
    } else {
      $("gauge-lectura").textContent = "--";
    }
    var d = $("desviacion");
    if (err === null) {
      d.textContent = "Desviacion: --";
      d.className = "desviacion";
    } else if (err <= MARGEN) {
      d.textContent = "Desviacion: " + err.toFixed(0) + "\u00b0  DENTRO DEL MARGEN";
      d.className = "desviacion ok";
    } else {
      d.textContent = "Desviacion: " + err.toFixed(0) + "\u00b0";
      d.className = "desviacion mal";
    }
  }

  function fijar() {
    if (estado !== "parada") return;
    if (intervaloId) clearInterval(intervaloId);
    var error = headingActual !== null ? RUMBO.angError(headingActual, targetRumbo) : 999;
    var pts = error <= 5 ? 100 : (error <= MARGEN ? 75 : 0);
    errores.push(error);
    puntosTotal += pts;
    ronda++;
    actualizarPuntajeUI();

    var d = RUMBO.distanciaEntre(posInicio, posActual);
    var feedback =
      '<div class="rf"><span>DESVIACION</span><b>' + error.toFixed(0) + "\u00b0</b></div>" +
      '<div class="rf"><span>EL INICIO QUEDO</span><b>' + RUMBO.etiquetaRumbo(targetRumbo) +
      " " + ceroTres(targetRumbo) + "\u00b0</b></div>" +
      '<div class="rf"><span>A</span><b>' + d.toFixed(0) + " m</b></div>" +
      '<div class="rf"><span>PUNTOS</span><b>+' + pts + "</b></div>";
    $("resultado-feedback").innerHTML = feedback;

    var btn = $("btn-siguiente");
    if (ronda >= RONDA_MAX) {
      btn.textContent = "Ver resumen";
      btn.onclick = fin;
    } else {
      btn.textContent = "Seguir caminando";
      btn.onclick = function () { caminar(); };
    }
    setFase("resultado");
  }

  function fin() {
    if (puntosTotal > mejorGlobal) {
      mejorGlobal = puntosTotal;
      localStorage.setItem("rumbo_mejor3", String(mejorGlobal));
    }
    var promedio = errores.length ? errores.reduce(function (a, b) { return a + b; }, 0) / errores.length : 0;
    var filas =
      '<div class="rf"><span>PUNTOS TOTALES</span><b>' + puntosTotal + "</b></div>" +
      '<div class="rf"><span>PROMEDIO DESVIACION</span><b>' + promedio.toFixed(1) + "\u00b0</b></div>" +
      '<div class="rf"><span>RECORD PERSONAL</span><b>' + mejorGlobal + " pts</b></div>";
    $("resumen-filas").innerHTML = filas;
    setFase("resumen");
  }

  function crearTicks() {
    var g = $("ticks-gauge");
    for (var d = 0; d < 360; d += 15) {
      var largo = (d % 90 === 0) ? 10 : (d % 45 === 0 ? 7 : 4);
      var a = d * Math.PI / 180;
      var l = document.createElementNS("http://www.w3.org/2000/svg", "line");
      l.setAttribute("x1", Math.sin(a) * 92); l.setAttribute("y1", -Math.cos(a) * 92);
      l.setAttribute("x2", Math.sin(a) * (92 - largo)); l.setAttribute("y2", -Math.cos(a) * (92 - largo));
      l.setAttribute("stroke", (d % 90 === 0) ? "var(--bronce-claro)" : "var(--paper-3)");
      l.setAttribute("stroke-width", "1.5");
      g.appendChild(l);
    }
    var lg = $("letras-gauge");
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

  function init() {
    crearTicks();
    $("btn-iniciar").addEventListener("click", iniciar);
    $("btn-medir-ahora").addEventListener("click", parar);
    $("btn-fijar").addEventListener("click", fijar);
    $("btn-repetir").addEventListener("click", function () {
      ronda = 0; puntosTotal = 0; errores = [];
      actualizarPuntajeUI();
      iniciar();
    });

    window.addEventListener("deviceorientationabsolute", function (e) { setHeading(e.alpha); }, true);
    window.addEventListener("deviceorientation", function (e) { setHeading(e.alpha); }, true);

    $("sim-slider").addEventListener("input", function () {
      var g = parseInt($("sim-slider").value, 10);
      $("sim-lectura").textContent = ceroTres(g) + "\u00b0";
      setHeading(g);
    });

    setTimeout(function () {
      if (!headingRecibido) {
        $("sim").hidden = false;
        $("aviso-sin-brujula").hidden = false;
      }
    }, 4000);

    if (navigator.serviceWorker) {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    }
  }

  var estado = "inicial";
  document.addEventListener("DOMContentLoaded", init);
})();
