(function () {
  "use strict";

  var RONDA_MAX = 5;
  var BASE = { lat: -34.5886, lng: -58.4292 };

  var ronda = 0, puntosTotal = 0;
  var erroresDist = [], erroresAng = [];
  var posInicio = null, legStart = null, legEnd = null;
  var legs = [], legIdx = 0, legMetros = [];
  var bearing0 = null, pasoLargo = 0.7;
  var simActivo = false;
  var mejorGlobal = parseInt(localStorage.getItem("rumbo_mejor2") || "0", 10);

  function $(id) { return document.getElementById(id); }

  function setFase(nombre) {
    estado = nombre;
    ["inicial", "caminar", "resultado", "resumen"].forEach(function (f) {
      $("fase-" + f).hidden = (f !== nombre);
    });
  }

  function actualizarUI() {
    $("puntaje").textContent = puntosTotal;
    $("ronda-actual").textContent = Math.min(ronda + 1, RONDA_MAX);
    $("tramo-actual").textContent = Math.min(legIdx + 1, legs.length || 1);
    $("tramo-total").textContent = legs.length || 0;
  }

  function textoInstruccion(leg) {
    if (leg.giro === null) return "Camin\u00e1 " + leg.pasos + " pasos hacia adelante.";
    if (leg.giro === 180) return "Dale la vuelta (180\u00b0) y camin\u00e1 " + leg.pasos + " pasos.";
    var lado = leg.giro > 0 ? "a la derecha" : "a la izquierda";
    return "Gir\u00e1 " + Math.abs(leg.giro) + "\u00b0 " + lado + " y camin\u00e1 " + leg.pasos + " pasos.";
  }

  function generarRuta() {
    var n = 2 + Math.floor(Math.random() * 2);
    var giros = [90, -90, 180];
    var lista = [];
    for (var i = 0; i < n; i++) {
      lista.push({
        pasos: 8 + Math.floor(Math.random() * 8),
        giro: i === 0 ? null : giros[Math.floor(Math.random() * giros.length)]
      });
    }
    return lista;
  }

  function renderRuta() {
    var html = "";
    legs.forEach(function (leg, i) {
      var cls = i < legIdx ? "tramo hecho" : (i === legIdx ? "tramo activo" : "tramo");
      var medido = i < legIdx && legMetros[i] !== undefined && legMetros[i] !== null
        ? ' <span class="mono">(' + legMetros[i].toFixed(0) + " m)</span>" : "";
      html += '<div class="' + cls + '"><b>' + (i + 1) + ".</b> " + textoInstruccion(leg) + medido + "</div>";
    });
    $("ruta-lista").innerHTML = html;
  }

  function puntoDR() {
    var dr = posInicio;
    var b = bearing0;
    legs.forEach(function (leg, i) {
      dr = RUMBO.destinoDesde(dr, b, leg.pasos * pasoLargo);
      if (i + 1 < legs.length) b = ((b + legs[i + 1].giro) % 360 + 360) % 360;
    });
    return dr;
  }

  function medir() {
    var errDist, errAngAbs, dir;
    if (simActivo) {
      errDist = parseFloat($("sim-dist").value);
      var sa = parseInt($("sim-ang").value, 10);
      errAngAbs = Math.abs(sa);
      dir = sa > 0 ? "a la derecha" : (sa < 0 ? "a la izquierda" : "");
    } else {
      var dr = puntoDR();
      errDist = RUMBO.distanciaEntre(dr, legEnd);
      var brgDR = RUMBO.rumboEntre(posInicio, dr);
      var brgAct = RUMBO.rumboEntre(posInicio, legEnd);
      if (RUMBO.distanciaEntre(posInicio, dr) < 1.5 || RUMBO.distanciaEntre(posInicio, legEnd) < 1.5) {
        errAngAbs = 0; dir = "";
      } else {
        var firmado = ((brgDR - brgAct + 540) % 360) - 180;
        errAngAbs = Math.abs(firmado);
        dir = errAngAbs >= 1 ? (firmado > 0 ? "a la derecha" : "a la izquierda") : "";
      }
    }
    var pts = errDist <= 3 ? 100 : (errDist <= 6 ? 75 : (errDist <= 10 ? 50 : 0));
    erroresDist.push(errDist);
    erroresAng.push(errAngAbs);
    puntosTotal += pts;
    ronda++;
    actualizarUI();

    var pista = errDist <= 3
      ? "IMPRESIONANTE: tu radar esta calibrado."
      : (errDist <= 6 ? "BUENA ESTIMACION. Afin\u00e1 los pasos." : (errDist <= 10 ? "SE VA ACERCANDO. Repet\u00ed la ruta en tu cabeza." : "REVIS\u00c1 PASOS Y GIROS: cont\u00e1 los giros en voz alta."));

    $("error-distancia").textContent = errDist.toFixed(1) + " m";
    var filas =
      '<div class="rf"><span>QUEDASTE A</span><b>' + errDist.toFixed(1) + " m del objetivo</b></div>" +
      '<div class="rf"><span>DESVIO ANGULAR</span><b>' + errAngAbs.toFixed(0) + "\u00b0 " + dir + "</b></div>" +
      '<div class="rf"><span>PUNTOS</span><b>+' + pts + "</b></div>" +
      '<div class="rf total"><span>PISTA</span><b>' + pista + "</b></div>";
    $("resultado-feedback").innerHTML = filas;

    var btn = $("btn-siguiente");
    if (ronda >= RONDA_MAX) {
      btn.textContent = "Ver resumen";
      btn.onclick = fin;
    } else {
      btn.textContent = "Siguiente ronda";
      btn.onclick = function () { nuevaRonda(); };
    }
    setFase("resultado");
  }

  function parar() {
    if (estado !== "caminar") return;
    $("btn-parar").disabled = true;
    if (simActivo) {
      terminarTramo();
      return;
    }
    navigator.geolocation.getCurrentPosition(function (pos) {
      legEnd = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      var metros = RUMBO.distanciaEntre(legStart, legEnd);
      legMetros[legIdx] = metros;
      if (bearing0 === null) {
        bearing0 = metros < 1 ? 0 : RUMBO.rumboEntre(legStart, legEnd);
      }
      legStart = legEnd;
      terminarTramo();
    }, function () {
      simActivo = true;
      $("sim").hidden = false;
      $("aviso-sin-gps").hidden = false;
      terminarTramo();
    }, { enableHighAccuracy: true, timeout: 10000 });
  }

  function terminarTramo() {
    legIdx++;
    if (legIdx >= legs.length) {
      medir();
      return;
    }
    renderRuta();
    actualizarUI();
    $("btn-parar").textContent = legIdx === legs.length - 1 ? "MARCAR LLEGADA" : "PAR&Eacute;";
    $("btn-parar").disabled = false;
  }

  function nuevaRonda() {
    legs = generarRuta();
    legIdx = 0;
    legMetros = [];
    bearing0 = null;
    legStart = posInicio;
    setFase("caminar");
    $("btn-parar").textContent = legs.length === 1 ? "MARCAR LLEGADA" : "PAR&Eacute;";
    $("btn-parar").disabled = false;
    renderRuta();
    actualizarUI();
  }

  function iniciar() {
    pasoLargo = parseFloat(document.querySelector("input[name=paso]:checked").value);
    function arrancar() {
      ronda = 0; puntosTotal = 0; erroresDist = []; erroresAng = [];
      actualizarUI();
      nuevaRonda();
    }
    if (!navigator.geolocation) {
      simActivo = true;
      posInicio = BASE;
      $("sim").hidden = false;
      $("aviso-sin-gps").hidden = false;
      arrancar();
      return;
    }
    navigator.geolocation.getCurrentPosition(function (pos) {
      simActivo = false;
      $("sim").hidden = true;
      $("aviso-sin-gps").hidden = true;
      posInicio = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      arrancar();
    }, function () {
      simActivo = true;
      posInicio = BASE;
      $("sim").hidden = false;
      $("aviso-sin-gps").hidden = false;
      arrancar();
    }, { enableHighAccuracy: true, timeout: 10000 });
  }

  function fin() {
    if (puntosTotal > mejorGlobal) {
      mejorGlobal = puntosTotal;
      localStorage.setItem("rumbo_mejor2", String(mejorGlobal));
    }
    var promDist = erroresDist.length
      ? erroresDist.reduce(function (a, b) { return a + b; }, 0) / erroresDist.length : 0;
    var promAng = erroresAng.length
      ? erroresAng.reduce(function (a, b) { return a + b; }, 0) / erroresAng.length : 0;
    var filas =
      '<div class="rf"><span>PUNTOS TOTALES</span><b>' + puntosTotal + "</b></div>" +
      '<div class="rf"><span>PROMEDIO ERROR DISTANCIA</span><b>' + promDist.toFixed(1) + " m</b></div>" +
      '<div class="rf"><span>PROMEDIO DESVIO ANGULAR</span><b>' + promAng.toFixed(1) + "\u00b0</b></div>" +
      '<div class="rf"><span>RECORD PERSONAL</span><b>' + mejorGlobal + " pts</b></div>";
    $("resumen-filas").innerHTML = filas;
    setFase("resumen");
  }

  function init() {
    $("btn-iniciar").addEventListener("click", iniciar);
    $("btn-parar").addEventListener("click", parar);
    $("btn-descartar").addEventListener("click", function () {
      if (estado === "caminar") nuevaRonda();
    });
    $("btn-repetir").addEventListener("click", iniciar);

    $("sim-dist").addEventListener("input", function () {
      $("sim-dist-lectura").textContent = parseFloat($("sim-dist").value).toFixed(1) + " m";
    });
    $("sim-ang").addEventListener("input", function () {
      var a = parseInt($("sim-ang").value, 10);
      $("sim-ang-lectura").textContent = (a > 0 ? "+" : "") + a + "\u00b0";
    });

    if (navigator.serviceWorker) {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    }
  }

  var estado = "inicial";
  document.addEventListener("DOMContentLoaded", init);
})();
