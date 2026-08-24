# RUMBO - Entrenamiento de orientacion espacial

Documento de arranque para retomar el proyecto en cualquier momento o chat.
Idea original en: `C:\Users\roros\Downloads\app orientacion espacial.docx`

## Que es RUMBO

App (PWA) que entrena el sentido de la orientacion. Los 4 modulos estan ubicados
en los puntos cardinales de una rosa de los vientos, porque eso es lo que la app
entrena. Estetica de carta nautica: azul carta, papel envejecido, bronce, datos en
tipografia monoespaciada.

## Los 4 modulos

- N - Modulo 1 "El Punto Ciego": ver el esqueleto + anclas 10 segundos, se apaga,
  y responder la posicion relativa de un ancla respecto de otra ("estas en el
  hotel mirando al Norte, ¿dónde queda el restaurante?"). Nivel avanzado: mapa
  rotado 180 grados.
- E - Modulo 2 "El Radar Ciego": dead reckoning. La app dicta una ruta a ciegas
  (pasos y giros de 90/180 grados), caminas contando pasos sin mirar, y al final
  mide tu error: a cuantos metros y grados del objetivo real quedaste.
- S - Modulo 3 "Donde quedo mi casa": GPS + brujula reales. La app avisa al azar
  mientras caminas y medis tu vector de regreso (error en grados, margen 15 grados).
- O - Modulo 4 "Rotacion 3D de Hitos": reconocer la misma esquina/edificio desde la
  vista opuesta. Edificios extruidos en 3D con MapLibre GL (sin Mapillary).

Ademas existe el "Modo Viaje": elegis el barrio que vas a pisar (ej. Palermo, BA),
marcas tus anclas (hotel, subte, restaurante, hito) y la app genera un "mapa
esqueleto" (calles sin nombres) para memorizar la estructura del barrio antes de
viajar. De ahi sale la mecanica del "Modo A: La Brujula del Turista" (preguntas de
rumbo sobre el esqueleto), "Modo B: Sigue la linea" (trazar rutas en mapa rotado) y
"Modo C: Vistazo atras" (foto real de la vista opuesta).

## Decisiones tomadas

- Plataforma: Web app PWA (HTML/CSS/JS puro), sin build tools, sin frameworks.
  Se abre en el navegador, se agrega a la pantalla de inicio del celu, y despues se
  instala con HTTPS. GPS y brujula funcionan con Geolocation API + DeviceOrientation
  API (requieren contexto seguro: localhost o HTTPS).
- Stack de mapas 100% gratis, sin API key:
  - Leaflet 1.9.4 (CDN unpkg) + tiles de OpenStreetMap.
  - Tiles sin etiquetas para el esqueleto: CARTO `light_nolabels` (subdominios abcd).
  - Geocoder: Nominatim (limit 1 req/s, uso personal).
  - Calles vectoriales: Overpass API (`overpass-api.de`, espejo `overpass.kumi.systems`,
    con cadena de espejos en modulo4). Requiere User-Agent de navegador; en tests por
    PowerShell agregar header UA.
  - 3D extruido: MapLibre GL 4.7.1 (unpkg), estilos `fill-extrusion` con altura de
    `building:levels`/`height` de OSM. Sin raster tiles ni API key.
- Orden de fases (por prioridad de valor): Fase 1 mapas/anclas/esqueleto (hecha),
  Fase 2 Modo A jugable, Fase 3 Modulo 3 real (GPS+brujula), Fase 4 Modulo 4.

## Estado del avance

### Fase 1 - COMPLETA (pantallas 01 y 02 del diseno)

- `index.html`: pantalla Inicio. Rosa de los vientos en CSS con los 4 modulos en
  N/E/S/O (cada rumbo enlaza a su modulo), tarjeta "Proximo viaje" que lee lo
  guardado en localStorage.
- `mapa.html` + `js/mapa.js`: pantalla Modo Viaje (Fase 1).
  - Busqueda por barrio/direccion con Nominatim (boton Ir, Enter, y boton GPS para
    geolocalizar al usuario).
  - Anclas: tipos hotel/subte/restaurante/hito con colores. Se agregan tocando el
    mapa (popup pide nombre, Enter acepta), se pueden arrastrar, quitar y re-nombrar.
  - "Generar esqueleto": baja las calles de la zona visible via Overpass, dibuja
    polylines con grosor segun tipo de via (avenidas oscuras gruesas, residenciales
    finas claras), pasa a tiles sin nombres y oculta/limita a 2200 tramos para
    rendimiento en celu. Toggle "Ver esqueleto" / "Ver mapa con nombres".
  - Persistencia en `localStorage` clave `rumbo_viaje` (centro, zoom, anclas,
    esqueleto). Guardado automatico en cada cambio.
  - Esqueleto restaurado al recargar si ya existe.
- `css/estilos.css`: paleta carta nautica completa + pines de ancla (divIcon Leaflet).
- PWA: `manifest.webmanifest` + `sw.js` (cache basico, version `rumbo-v2`) + icono SVG/PNG.
- Servidor local probado: `python -m http.server 8000` en la carpeta del proyecto.
  Verificado con Edge headless: mapa inicializa, tiles OSM de Palermo cargan,
  boton toggle inyectado (JS sin errores), rosa de los vientos renderiza.

### Fase 2 - COMPLETA (Modo A "La Brujula del Turista")

- `juego.html` + `js/juego.js`: juego de rumbo sobre el mapa guardado.
  - Requiere viaje guardado con >= 2 anclas (si no, muestra aviso con link a Modo Viaje).
  - Origen = hotel (o primera ancla). Destinos = resto de anclas barajadas (hasta 6 rondas).
  - Mapa esqueleto centrado en la ronda, pin pulsante en origen, pin de destino,
    pregunta de consigna con los tipos coloreados. Linea punteada del rumbo real
    solo despues de responder.
  - Brujula SVG arrastrable (pointer events) con ticks cada 15 grados, letras
    cardinales, lectura en grados + punto intercardinal, y atajos N/E/S/O.
  - Puntaje por ronda: `pts = round(100 - error * (100/180))`; si el cardinal
    coincide con el real, bonus +25 "RUMBO EXACTO". Record en `rumbo_mejor`.
  - Resumen final con totales y boton "Jugar de nuevo".
- Refactor: se extrajo `js/base.js` con lo compartido (TIPOS, PESOS, tiles OSM/skeleton,
  `pinIcon`/`pinPulsoIcon`, `dibujarEsqueleto`, `rumboEntre`, `cardinalDe`,
  `etiquetaRumbo`, `leerViaje`). `mapa.js` y `juego.js` lo usan.
- Nav actualizada: enlaces Inicio / Jugar / Modo Viaje en las 3 pantallas.
- Tests: math de rumbos verificado en Node (hotel->restaurante 333 deg NO,
  hotel->subte 125 deg SE, error con wraparound 0/350 = 10 deg). Test end-to-end
  via Chrome DevTools Protocol (Edge headless + localStorage sembrado): ronda 1/2,
  consigna correcta, brújula con 24 ticks, confirmar muestra "SE 125° / error 125°
  / +31 pts", dibuja la linea de rumbo y avanza a ronda 2.

### Estructura de archivos

```
C:\Users\roros\Documents\rumbo\
  index.html            Inicio (rosa de los vientos + proximo viaje)
  mapa.html             Modo Viaje (editor de mapa)
  juego.html            Modo A (La Brujula del Turista)
  modulo1.html          Modulo 1 (El Punto Ciego - memoria espacial)
  modulo2.html          Modulo 2 (El Radar Ciego - dead reckoning)
  modulo3.html          Modulo 3 (Donde quedo mi casa - GPS + brujula)
  css\estilos.css       Paleta carta nautica + pines + brujulas
  js\base.js            Compartido: TIPOS, PESOS, tiles, pines, rumbos, viaje
  js\mapa.js            Editor: Leaflet, Nominatim, Overpass, anclas, guardado
  js\juego.js           Modo A: rondas, brujula arrastrable, puntaje
  js\modulo1.js         Modulo 1: memorizacion 10 s, preguntas relativas, rotacion 180
  js\modulo2.js         Modulo 2: rutas a ciegas, GPS por tramo, error m/grados
  js\modulo3.js         Modulo 3: GPS, brujula, vector de regreso
   modulo4.html          Modulo 4 (Rotacion 3D de Hitos)
   js\modulo4.js         Modulo 4: MapLibre 3D, capturas, rondas, puntaje
   modulob.html          Modo B (Sigue la linea - rutas sobre mapa rotado)
   js\modulob.js         Modo B: linea parcial, prolongacion, opciones
   moduloc.html          Modo C (Vistazo atras - vista opuesta de memoria)
   js\moduloc.js         Modo C: vistazo temporizado, capturas ocultas, puntaje
   manifest.webmanifest  PWA
   sw.js                 Service worker (cache, version rumbo-v13)
  icons\icono.svg       Icono (rosa de los vientos)
  icons\icono-512.png   Icono PNG 512 (para instalacion)
```

### Fase 3 - COMPLETA (Modulo 3 "Donde quedo mi casa")

- `modulo3.html` + `js/modulo3.js`: entrenamiento del vector de regreso con GPS y
  brujula reales (Geolocation API + DeviceOrientation API).
  - Flujo: "Marcar inicio" (getCurrentPosition) -> caminar (watchPosition) con
    distancia desde el inicio en vivo y objetivo aleatorio de 40-150 m -> PARADA
    (vibracion `navigator.vibrate`, alerta en pantalla, notificacion si hay permiso
    y la pestaña esta oculta).
  - Fase parada: gauge SVG en vivo con la lectura del telefono (heading de
    `deviceorientation`/`deviceorientationabsolute`), desviacion en grados respecto
    al rumbo real hacia el inicio; se pone "DENTRO DEL MARGEN" cuando <= 15 grados.
  - Puntaje: <= 5 grados = 100 pts, <= 15 = 75 pts, si no 0. Feedback post-ronda con
    "EL INICIO QUEDO {rumbo} {grados} a {distancia} m". 5 rondas, resumen con
    promedio de desviacion y record en `rumbo_mejor3`.
  - iOS: pide permiso de orientacion con `DeviceOrientationEvent.requestPermission()`
    en el gesto del boton. Android/desktop: solo geolocalizacion.
  - Simulacion: si en 4 segundos no llegan eventos de brujula (PC sin sensores), se
    muestra un slider que setea el heading manualmente.
  - Enlazado desde el modulo S de la rosa de los vientos (index.html).
- Tests: CDP end-to-end con `Emulation.setGeolocationOverride` (mover 200 m al este
  dispara PARADA) y el slider de simulacion para el heading (270 grados -> 0 de
  desviacion, +100 pts, ronda 2). Verificado el fix de `setFase` que actualizaba la
  variable `estado` (sin el fix el callback de watchPosition se descartaba).

### Fase 4 - COMPLETA (Modulo 4 "Rotacion 3D de Hitos")

- `modulo4.html` + `js/modulo4.js`: reconocer la vista opuesta de un barrio en 3D.
  - Escena 3D con MapLibre GL 4.7.1 (unpkg, sin API key): edificios extruidos desde
    Overpass (`way["building"]`) con altura por `building:levels`/`height` (color por
    altura, bronce->dorado), calles vectoriales con grosor por tipo de via, fondo
    navy. Objetivo = el ancla "hito" del viaje guardado (o El Obelisco por defecto).
  - La camara se bloquea (sin pan/zoom/rotacion del usuario) y el `front` se setea
    al azar en 0/90/180/270. El jugador ve el barrio desde ese lado y debe elegir la
    vista desde el lado opuesto (misma mecanicamente que el mapa rotado 180 grados).
  - Capturas: se genera la foto de cada opcion con `map.jumpTo({bearing})` + espera
    `idle` (fallback 500 ms) + `getCanvas().toDataURL()` (escena 100% local, canvas
    sin taint). 4 opciones: 3 vistas exploradas (0/90/270) + 1 correcta (opuesta).
  - Puntaje: +100 si acierta, 0 si no; feedback con la respuesta, animacion de giro
    hacia la vista correcta (`map.easeTo`, 1800 ms), 5 rondas, record en `rumbo_mejor4`.
  - Robustez: cadena de espejos Overpass (de, kumi, osm.jp, private.coffee, ru) con
    timeout de 25 s por request (AbortController) y error visible si todo falla.
- Nav: enlace "Modulo 4" en todas las pantallas; modulo O de la rosa de los vientos
  apunta a `modulo4.html` (los 4 rumbos ya tienen su modulo).
- Tests: CDP end-to-end con Edge headless (`--use-gl=swiftshader`) y Overpass
  stubeado (fetch mockeado, escena sintetica): mapa 3D inicializa, 4 capturas
  distintas (hashes diferentes), consigna con rumbos opuestos, respuesta correcta
  (+100) e incorrecta (0 pts), avance de rondas, sin errores de consola.
  Nota: desde esta maquina `overpass-api.de` responde 504/406 y los espejos
  timeout (bloqueo del entorno, no del codigo); por eso el test usa el stub.

### Fase 5 - COMPLETA (Modulo 2 "El Radar Ciego")

- `modulo2.html` + `js/modulo2.js`: dead reckoning a ciegas.
  - Decision: se mide con GPS, no con acelerometro/giroscopio (en una web PWA el
    step-counting con DeviceMotion es poco confiable y frustra el entrenamiento).
    El usuario cuenta pasos y giros; la app mide los vectores reales de cada tramo
    con GPS y compara contra la ruta nominal.
  - Ruta generada al azar: 2-3 tramos de 8-15 pasos, giros de +90/-90/180 grados.
    Largo de paso configurable (60/70/80 cm).
  - Flujo: marcar inicio (GPS) -> la ruta se muestra tramo a tramo con el actual
    resaltado -> el usuario camina contando pasos y aprieta PAR&Eacute; (o
    MARCAR LLEGADA en el ultimo) -> la app mide.
  - Error: el punto estimado (dead reckoning) se calcula con `RUMBO.destinoDesde`
    anclado al rumbo real del primer tramo (medido por GPS) + los pasos/giros
    nominales. Error = distancia (m) y desvio angular (grados con lado) entre ese
    punto y la posicion real de llegada.
  - Puntaje por error en distancia: <=3 m = 100, <=6 = 75, <=10 = 50, si no 0.
    Pista segun rango ("IMPRESIONANTE / BUENA ESTIMACION / SE VA ACERCANDO /
    REVISA PASOS Y GIROS"). 5 rondas, record en `rumbo_mejor2`.
  - Simulacion: si no hay GPS (PC), se activa automaticamente un panel con dos
    sliders (error en distancia 0-15 m y error en angulo -45..45 grados) para
    probar el flujo sin salir de casa.
- `base.js` gano `destinoDesde(orig, rumbo, metros)` (punto a rumbo y distancia).
- Enlazado desde el modulo E de la rosa (index.html); nav "Modulo 2" en todas las
  pantallas. SW en `rumbo-v5`.
- Tests CDP (Edge headless):
  - Sin GPS: se activa la simulacion, ruta de 3 tramos, con sliders en 4 m y
    +15 grados da "QUEDASTE A 4.0 m" / "15 grados a la derecha" / +75 pts.
  - GPS real (geolocation override): caminando la ruta exacta (leida del DOM,
    rumbo inicial 45 grados, giros nominales) da error 0.0 m y +100 pts: valida
    que el dead reckoning cierra cuando se ejecuta bien.

### Fase 6 - COMPLETA (Modulo 1 "El Punto Ciego")

- `modulo1.html` + `js/modulo1.js`: memoria espacial con el mapa esqueleto del viaje.
  - Requiere viaje guardado con >= 2 anclas (si no, aviso con link a Modo Viaje).
  - Ronda: muestra el esqueleto + todas las anclas (origen pulsando, destino con
    aro) durante 10 s con contador, luego lo apaga y pregunta la posicion relativa:
    "Estas en el {origen} mirando hacia el {Norte}, ¿dónde queda el {destino}?".
  - 4 opciones relativas (DE FRENTE / A LA DERECHA / A LA IZQUIERDA / DETRAS),
    calculadas por el sector de 45 grados del rumbo origen->destino respecto del
    rumbo de vista H (N/E/S/O al azar).
  - Nivel avanzado: rondas 4 y 5 muestran el mapa rotado 180 grados (CSS
    `transform: rotate(180deg)` sobre `#mapa1`, banner "MAPA ROTADO 180").
  - Feedback post-respuesta: re-muestra el mapa (sin rotar) con linea punteada
    origen->destino y el rumbo real ("EL DESTINO QUEDA NE 032 grados de tu rumbo").
    +100 pts por acierto, 5 rondas, record en `rumbo_mejor1`.
  - Fix importante del test: las opciones se re-habilitan al empezar cada ronda
    (sin el fix quedaban disabled de la ronda anterior y la ronda no avanzaba).
- Enlazado desde el modulo N de la rosa (index.html); nav "Modulo 1" en todas las
  pantallas. SW en `rumbo-v6`.
- Test CDP (Edge headless, viaje sembrado en localStorage): 5/5 correctas = 500
  pts, banner de rotacion presente solo en rondas 4-5, resumen "ACERTADOS 5/5" y
  record guardado en `rumbo_mejor1`.

### Fase 7 - COMPLETA (Modos B y C, cierre del doc original)

- `modulob.html` + `js/modulob.js`: "Sigue la linea". Esqueleto + anclas con linea
  punteada parcial (45% de la distancia origen->destino); hay que prolongarla
  mentalmente y elegir la ancla destino entre botones. Rondas 4-5 con mapa rotado
  180 grados (banner). +100 por acierto, 5 rondas, record en `rumbo_mejor5`.
- `moduloc.html` + `js/moduloc.js`: "Vistazo atras" (variante de memoria del motor
  3D del Modulo 4, porque las fotos reales requerian servicios con API key).
  Vistazo temporizado (6 s, override con `__RUMBO_VISTAZO_MS__`) -> escena oculta ->
  4 capturas capturadas sin ser visibles -> elegir la vista opuesta de memoria ->
  la escena reaparece girando (`jumpTo` al frente + reveal + `easeTo` opuesto).
  +100 por acierto, 5 rondas, record en `rumbo_mejor6`. Modo demo sin red con
  `?stub` (escena sintetica, `window.__RUMBO_STUB__`).
- Fix heredado descubierto al portar: el boton "Volver a empezar" del Modulo 4
  quedaba deshabilitado ("Cargando...") en la segunda sesion; `fin()` ahora lo
  restaura (tambien en moduloc).
- Nav: "Modo B" / "Modo C" en todas las pantallas; mencion en la tarjeta de
  inicio. SW en `rumbo-v13`.

## Detalles tecnicos a recordar

- IMPORTANTE (service worker): el SW cachea los archivos de forma cache-first.
  Despues de cambiar codigo hay que subir la version de `CACHE` en `sw.js` (hoy
  `rumbo-v13`) o hacer hard refresh (Ctrl+Shift+R). Un test headless con perfil
  reutilizado puede cargar JS viejo cacheado por el SW del perfil anterior: usar
  perfil nuevo o borrar la carpeta del perfil.
- Fase 3 requiere HTTPS para probar en el celular (geolocalizacion y orientacion
  son APIs de contexto seguro; `localhost` cuenta como seguro).

- Esquema de `rumbo_viaje` en localStorage:
  `{ nombre, centro:[lat,lng], zoom, anclas:[{tipo,nombre,lat,lng}],
     esqueleto:{ bbox:[[sur,oeste],[norte,este]], calles:[{clase,coords:[[lat,lng]]}] } }`
- Query Overpass usada:
  `[out:json][timeout:30];way["highway"](sur,oeste,norte,este);out geom;`
  Se filtran en cliente: se excluyen footway/path/steps/track/cycleway/etc. y se
  clasifican con `PESOS` (color+grosor por tipo de via). Bbox en orden sur,oeste,norte,este.
- Tipos de ancla y colores: hotel #1f6fb2, subte #2e8b57, restaurante #c0392b, hito #c9a227.
- Paleta: navy #0b2539, papel #f0e8d5, bronce #b0884e, tinta #2b2418.

## Roadmap pendiente

- Los 4 modulos de la rosa (N/E/S/O) + Modo Viaje + Modo A + Modo B + Modo C
  estan completos. El alcance del doc original esta cerrado.
- Desplegar para probar en el celu: GitHub Pages ya activo
  (`https://vale707vale-glitch.github.io/rumbo/`); probar Modulo 2 y 3 en la calle
  antes del viaje (y validar la brujula real del Modulo 3).
- Extension posible del Modo C: fotos reales de vistas opuestas (requiere
  Mapillary u fotos propias; hoy usa el motor 3D).
- Pendiente general: verificar cobertura Overpass/OSM en el barrio elegido
  (modulos 4 y C dependen de datos de edificios). Nominatim ya se identifica con
  email de contacto en las consultas del Modo Viaje.

## Como probar

```
cd C:\Users\roros\Documents\rumbo
python -m http.server 8000
# abrir http://localhost:8000
```
