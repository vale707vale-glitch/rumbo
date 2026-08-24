# RUMBO - Manual de usuario

App de entrenamiento de orientacion espacial. La idea: antes de pisar una ciudad
nueva, entrenas en casa la capacidad de saber donde quedan las cosas y como volver
sobre tus pasos. Estetica de carta nautica; todo funciona 100% local en tu telefono,
sin cuentas ni servidores: tus mapas y records nunca salen del aparato.

---

## 1. Instalacion en el celular

1. Abrí en el navegador: `https://vale707vale-glitch.github.io/rumbo/`
2. Android (Chrome): menu de los 3 puntos -> **Anadir a pantalla principal**.
   iPhone (Safari): boton Compartir -> **Añadir a pantalla de inicio**.
3. Abrila desde ese icono: queda a pantalla completa como una app mas.

Requisitos:
- GPS y brujula funcionan solo con HTTPS o localhost (GitHub Pages ya da HTTPS).
- Los modulos 2 y 3 se juegan al aire libre con señal GPS.
- En iOS, la primera vez la app pide permiso de brujula con un boton (Apple lo exige).

---

## 2. Pantalla de inicio

Una rosa de los vientos con los 4 modulos ubicados en los 4 puntos cardinales
(eso es exactamente lo que la app entrena):

| Rumbo | Modulo | Que entrena |
|-------|--------|-------------|
| N | El Punto Ciego | Memoria del mapa |
| E | El Radar Ciego | Dead reckoning (contar pasos y giros) |
| S | Donde quedo mi casa | GPS + brujula reales: el vector de regreso |
| O | Rotacion 3D de Hitos | Reconocer la vista opuesta de un lugar |

Debajo, la tarjeta **PROXIMO VIAJE** muestra el ultimo mapa guardado y te deja ir
directo a Jugar o a armar el mapa. Los extras del viaje estan en el menu:
**Modo B** y **Modo C**.

---

## 3. Modo Viaje (la base de todo)

Aqui armas el mapa del barrio que vas a pisar. Sin un viaje guardado no hay juegos
(excepto el 4 y el C, que usan un barrio por defecto).

### Paso a paso

1. **Busca el barrio**: escribilo en el campo de busqueda (ej. "Palermo, Buenos
   Aires") y toca **Ir**, o toca **GPS** para volar a donde estas parado.
2. **Marca anclas**: elegi un tipo abajo a la izquierda y toca el mapa:
   - HOTEL (azul) - tu base
   - SUBTE (verde)
   - RESTAURANTE (rojo)
   - HITO (dorado) - un monumento o edificio conocido
   Aparece un cartel para ponerle nombre (Enter o "Guardar nombre" acepta).
   Para moverla: arrastrala. Para quitarla: la X en la lista. Tocando una fila de
   la lista el mapa centra esa ancla.
3. **Genera el esqueleto**: tocá **Generar esqueleto** y la app baja las calles de
   la zona visible y las dibuja como un laberinto SIN nombres de calles ni
   negocios. Ese es el punto: memorizas la estructura, no los letreros.
   El boton **Ver esqueleto / Ver mapa con nombres** alterna entre ambos mapas.
4. **Guarda**: se guarda automatico en cada cambio (tambien podes tocar
   **Guardar viaje**).

Consejo: marcá minimo tu hotel + subte + restaurante + hito. Con 4 anclas bien
elegidas alcanza para todos los juegos.

---

## 4. Modo A "La Brujula del Turista" (Jugar)

Requiere viaje con al menos 2 anclas.

1. Arrancas en tu hotel (o primera ancla) y hay que decir el rumbo hacia otra
   ancla de la lista.
2. **Arrastras la brujula** con el dedo hasta el rumbo que crees correcto (los
   botones N/E/S/O son atajos rapidos).
3. Tocá **Confirmar rumbo**: aparece el rumbo real dibujado en linea dorada, tu
   error en grados y los puntos (maximo 100 por ronda; si acertas el cardinal
   exacto, bonus RUMBO EXACTO +25).
4. Hasta 6 rondas barajadas. Al final: resumen y record personal guardado.

---

## 5. Modo B "Sigue la linea"

Requiere viaje con al menos 2 anclas. Entrena rutas sobre el mapa rotado.

1. Aparece el esqueleto con tus anclas; en las rondas avanzadas esta **rotado 180
   grados** (banner rojo).
2. Desde tu ancla origen (pin que pulsa) sale una **linea punteada dorada que se
   corta a mitad de camino**.
3. Prolongala mentalmente sobre las calles y tocá a cual de tus anclas llega.
4. Al responder, la linea se completa hasta el destino real. Acertar = +100 pts.
5. Son 5 rondas; record propio.

## 6. Modo C "Vistazo atras"

Memoria visual con escenas 3D (mismo motor que el Modulo 4, sin API key).

1. La escena 3D del barrio aparece desde un lado al azar y tenes unos segundos
   para mirarla (**el vistazo**, contador gigante en pantalla).
2. La escena se oculta y aparecen 4 capturas de los 4 lados: elegi cual es la
   vista hacia **ATRAS** (el lado opuesto de donde mirabas), de memoria.
3. Al responder, la escena reaparece girando animada hacia la vista correcta.
   Acertar = +100 pts. 5 rondas, record propio.
4. Usa tu ancla HITO como objetivo (o El Obelisco si no hay viaje).

---

## 7. Modulo N "El Punto Ciego"

Memoria espacial pura. Requiere viaje con 2+ anclas.

1. Mirá el esqueleto con tus anclas durante **10 segundos** (contador en pantalla).
2. Se apaga el mapa y llega la pregunta: *"Estas en el hotel mirando al Norte,
   donde queda el restaurante?"*
3. Respondé con los 4 botones: **DE FRENTE / A LA DERECHA / A LA IZQUIERDA /
   DETRAS**.
4. Despues de responder se vuelve a mostrar el mapa con la linea real y el rumbo
   exacto ("QUEDA NE 032 grados").
5. Son 5 rondas. Las ultimas 2 son nivel avanzado: el mapa se muestra **rotado
   180 grados** (banner avisa). Acertar = +100 pts.

---

## 8. Modulo E "El Radar Ciego"

Dead reckoning: caminar a ciegas contando pasos y giros. Se mide con GPS, asi que
en la casa usa el modo simulacion y el juego real es afuera.

### Afuera

1. Elegi tu largo de paso (60 / 70 / 80 cm) y tocá **Marcar inicio y empezar**.
2. Aparece la ruta por tramos, ejemplo:
   - "Caminá 12 pasos hacia adelante"
   - "Girá 90 grados a la derecha y caminá 8 pasos"
   - "Dale la vuelta (180) y caminá 10 pasos"
3. Caminá contando SIN mirar el telefono y tocá **PARE** al terminar cada tramo
   (**MARCAR LLEGADA** en el ultimo).
4. Resultado: a cuantos metros y grados quedaste del objetivo real.
5. Puntaje por error de distancia: 3 m o menos = 100, 6 m o menos = 75,
   10 m o menos = 50. Pista segun rango (IMPRESIONANTE / BUENA ESTIMACION /
   SE VA ACERCANDO / REVISÁ PASOS Y GIROS). 5 rondas.

### En casa (PC)

Si no hay GPS se activa un panel con dos sliders (error de distancia y de angulo):
movelos y usá MARCAR LLEGADA para probar el flujo completo.

---

## 9. Modulo S "Donde quedo mi casa"

El mas parecido a volver al hotel de memoria. GPS + brujula reales.

1. Parate en un punto de partida reconocible y tocá **Marcar inicio y empezar**
   (acepta permisos de ubicacion y brujula).
2. **Caminá** en cualquier direccion: la app cuenta metros desde el inicio y a los
   40-150 m vibra y grita PARADA.
3. Fase parada: mirá el **gauge** (la brujula en pantalla: aguja que gira segun
   hacia donde apunta el piezo del telefono). Girá sobre vos mismo hasta apuntar
   de vuelta al punto de partida. Cuando la desviacion baja de 15 grados la linea
   se pone verde: DENTRO DEL MARGEN.
4. Tocá **Fijar rumbo**. Puntaje: 5 grados o menos = 100 pts, 15 o menos = 75.
5. Feedback: "EL INICIO QUEDO SO 215 grados a 87 m". 5 rondas, promedio final.

Chequeo rapido de calibracion: antes de jugar, girá el telefono mirando el gauge;
apuntando al norte debe marcar ~000, al este ~090. Si marca otra cosa, recalibrá
con movimiento en forma de 8 o revisa que no haya imanes/carcasa metalica cerca.

---

## 10. Modulo O "Rotacion 3D de Hitos"

Escena 3D del barrio con edificios reales de OpenStreetMap (sin API key).

1. Tocá Empezar: baja los edificios y calles de la zona de tu ancla HITO
   (o El Obelisco si no hay viaje).
2. La camara mira el barrio desde uno de los 4 lados (N/E/S/O, al azar, sin poder
   moverla). Mirá bien los detalles.
3. Abajo aparecen **4 capturas**: elegi cual es la vista desde el **lado opuesto**
   de la escena.
4. Al responder, la escena gira animada hacia la vista correcta para comparar.
   Acierto = +100 pts. 5 rondas.

Nota: necesita datos de edificios cargados en OSM para tu barrio. En zonas bien
mapeadas funciona perfecto; en zonas vacias puede haber pocas torres.

---

## 11. Puntajes y records

Cada juego guarda tu mejor puntaje en el telefono:

| Juego | Clave interna | Maximo |
|-------|---------------|--------|
| Modo A | rumbo_mejor | ~750 (6 rondas x 125) |
| Modo B | rumbo_mejor5 | 500 |
| Modo C | rumbo_mejor6 | 500 |
| Modulo 1 | rumbo_mejor1 | 500 |
| Modulo 2 | rumbo_mejor2 | 500 |
| Modulo 3 | rumbo_mejor3 | 500 |
| Modulo 4 | rumbo_mejor4 | 500 |

Para borrar todo (viaje + records): ajustes del navegador -> sitio ->
borrar datos.

---

## 12. Problemas frecuentes

**La brujula marca mal (Modulo 3)**
Gira el telefono en forma de 8 para calibrar el magnetometro. Aleja imanes,
fundas magneticas y parlantes. En iOS acepta el permiso cuando lo pide.

**GPS lento o pegado en 0 m (Modulos 2 y 3)**
Salí a cielo abierto; adentro de edificios o bajo arboles densos la señal tarda.
En el Modulo 3, si la señal se cae mientras caminas, la app te avisa en pantalla.

**"Todavia no hay un viaje con anclas" (Modo A, Modo B y Modulo 1)**
Anda al Modo Viaje, marcá al menos 2 anclas y volvé.

**"Fallo Overpass" o escena 3D vacia (Modulos 4 y C)**
Es el servicio de datos de OpenStreetMap saturado o sin cobertura en esa zona.
Reintentá en un momento; el esqueleto del Modo Viaje prueba con un espejo
automaticamente.

**Despues de una actualizacion veo la version vieja**
La app cachea archivos para funcionar offline. Cerra y reabrí la app; si sigue,
recargá con la conexion activa.

**Se rompio algo y no puedo recuperar el mapa**
Borrá los datos del sitio desde el navegador (borra viaje y records) y empezá de
nuevo. Si el JSON interno se corrompe, la app arranca limpia sin romperse.

---

## 13. Rutina de entrenamiento sugerida (antes de un viaje)

1. Arma el viaje real de tu proxima ciudad: hotel, subte, restaurante, hito.
2. Jugá al Modo A 5 minutos por dia (rumbos entre anclas).
3. Modulo 1 y Modo B para memorizar el esqueleto; ambos incluyen rondas rotadas.
4. Modulo 2 y 3 en la calle cerca de casa, 2-3 veces por semana.
5. Modulo 4 y Modo C con el barrio destino para reconocer fachadas desde
   cualquier lado, incluso de memoria.

Llegás a la ciudad con el esqueleto del barrio en la cabeza: sabes hacia donde
camina cada calle y como volver al hotel sin abrir un mapa.
