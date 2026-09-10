# RUMBO - Manual de usuario

App de entrenamiento de orientacion espacial. La idea: antes de pisar una ciudad
nueva, entrenas en casa la capacidad de saber donde quedan las cosas y como volver
sobre tus pasos. Estetica de carta nautica; tus mapas y records se guardan en tu
telefono, sin cuentas ni servidores.

Ojo: no es 100% offline. La app instalada abre sin internet, y tus viajes
guardados y los juegos de memoria andan sin conexion. Pero buscar zonas, bajar
calles y ver el mapa base necesitan internet (usan OpenStreetMap, Nominatim y
Overpass, que son servicios externos).

## 0. Donde se juega cada cosa

| Lugar | Modulos | Necesita |
|-------|---------|----------|
| En casa (sillon, sin salir) | Modo Viaje (armar mapa), Jugar Modo A, Modulo 1, Modo B, Modulo 4, Modo C | Internet para buscar zona y bajar calles; despues el entrenamiento es en pantalla |
| Afuera (calle, plaza) | Modulo 2, Modulo 3 | Celu con GPS; Modulo 3 ademas brujula; cielo abierto |

Regla simple: si el juego usa TU mapa guardado o escenas 3D, es de sillon.
Si el juego mide donde estas parado de verdad, es de calle.

Importante: la practica sale siempre de tu ZONA ELEGIDA Y GUARDADA, no de tu
GPS del momento. Puedes estar en tu casa entrenando el barrio de tu proximo
viaje. La unica excepcion son los Modulos 2 y 3, que miden tu cuerpo de verdad
(pasos y retorno) y usan tu posicion GPS actual: esos sirven en cualquier calle.

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

## 3. Modo Viaje (la base de todo, EN CASA con internet)

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

## 4. Modo A "La Brujula del Turista" (Jugar, EN CASA)

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

## 5. Modo B "Sigue la linea" (EN CASA)

Requiere viaje con al menos 2 anclas. Entrena rutas sobre el mapa rotado.

1. Aparece el esqueleto con tus anclas; en las rondas avanzadas esta **rotado 180
   grados** (banner rojo).
2. Desde tu ancla origen (pin que pulsa) sale una **linea punteada dorada que se
   corta a mitad de camino**.
3. Prolongala mentalmente sobre las calles y tocá a cual de tus anclas llega.
4. Al responder, la linea se completa hasta el destino real. Acertar = +100 pts.
5. Son 5 rondas; record propio.

## 6. Modo C "Vistazo atras" (EN CASA, con internet)

Memoria visual con escenas 3D (mismo motor que el Modulo 4, sin API key).

1. La escena 3D del barrio aparece desde un lado al azar y tenes unos segundos
   para mirarla (**el vistazo**, contador gigante en pantalla).
2. La escena se oculta y aparecen 4 capturas de los 4 lados: elegi cual es la
   vista hacia **ATRAS** (el lado opuesto de donde mirabas), de memoria.
3. Al responder, la escena reaparece girando animada hacia la vista correcta.
   Acertar = +100 pts. 5 rondas, record propio.
4. Usa tu ancla HITO como objetivo (o El Obelisco si no hay viaje).

---

## 7. Modulo N "El Punto Ciego" (EN CASA)

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

## 8. Modulo E "El Radar Ciego" (AFUERA, con GPS)

Para que sirve: aprender a llegar a un punto caminando a ciegas, contando pasos
y giros. En viaje es estimar distancias ("el hotel esta a unos 100 m"), salir de
un subte y seguir derecho sin mirar el celu a cada rato.

Como es por dentro: la app NO te muestra el objetivo en ningun mapa. Te dicta una
ruta escrita de 2 o 3 tramos y calcula en silencio donde deberias terminar si
caminaras perfecto. Despues compara con donde terminaste de verdad (GPS) y te da
el error en metros y en grados.

### Afuera (juego real)

1. Anda a un lugar abierto: plaza, calle tranquila, parque. El GPS adentro de
   edificios no sirve.
2. Elegi tu largo de paso (60 / 70 / 80 cm; 70 es el defecto) y toca
   **Marcar inicio y empezar**. Acepta el permiso de ubicacion.
3. Aparece la ruta por tramos, ejemplo:
   - "Camina 12 pasos hacia adelante"
   - "Gira 90 grados a la derecha y camina 8 pasos"
   - "Da la vuelta (180) y camina 10 pasos"
   Las rutas tienen 2 o 3 tramos, de 8 a 15 pasos cada uno, con giros de 90 o 180.
4. Camina contando SIN mirar el telefono y toca **PARE** al terminar cada tramo
   (**MARCAR LLEGADA** en el ultimo). Conta los giros en voz alta si te ayuda.
5. Resultado: a cuantos metros y grados quedaste del objetivo real, mas una pista:
   - 3 m o menos = 100 pts ("IMPRESIONANTE: tu radar esta calibrado")
   - 6 m o menos = 75 ("BUENA ESTIMACION. Afina los pasos")
   - 10 m o menos = 50 ("SE VA ACERCANDO. Repeti la ruta en tu cabeza")
   - mas de 10 m = 0 ("REVISA PASOS Y GIROS")
6. Son 5 rondas. Al final ves promedio de error en metros y en grados, y tu record.
7. Si una ruta te salio mal, el boton **Descartar y rehacer la ruta** te da otra.

### En casa (simulacion)

Si no hay GPS (PC, o adentro de casa) se activa un panel con dos sliders: error
de distancia (0 a 15 m) y error de angulo (-45 a +45). Movelos para simular donde
"quedaste parado" y toca MARCAR LLEGADA para ver el flujo completo de puntaje.
Sirve para conocer el juego, no para entrenar de verdad.

Consejos: calibra tu paso midiendo 10 pasos en la vereda; camina con paso parejo;
los giros de 90 hacelos con el cuerpo entero, no solo con los pies.

---

## 9. Modulo S "Donde quedo mi casa" (AFUERA, con GPS + brujula)

Para que sirve: saber VOLVER. Es el mas parecido a salir del hotel a pasear y
volver sin mapa. El Modulo 2 mide si sabes llegar; este mide si sabes regresar.

Como es por dentro: marcas un inicio, caminas libre en cualquier direccion
(40 a 150 m, la app elige una distancia al azar por ronda), la app vibra y grita
PARADA, y tenes que apuntar con el telefono hacia donde crees que quedo el
inicio. La app compara tu punteria con el rumbo real y te da la desviacion.

### Paso a paso

1. Parate en un punto reconocible (tu puerta, un kiosco) y toca
   **Marcar inicio y empezar**. Acepta ubicacion y, en iPhone, el permiso de
   brujula (Apple lo exige con boton).
2. **Camina** en cualquier direccion, sin mirar mapas. La app cuenta los metros
   en numeros grandes. NO hace falta mirar la pantalla: cuando llegues, vibra
   y muestra PARADA (si la tenes en segundo plano y diste permiso, manda
   notificacion; igual conviene llevarla con pantalla prendida porque el
   navegador puede pausar el GPS en fondo). Si sentis que ya estas lejos, toca
   **Ya estoy lejos, medir** para frenar vos.
3. Fase parada: agarra el celu con las dos manos, horizontal, y apunta con el
   borde de arriba hacia donde crees que esta el inicio, como si el celu fuera
   una flecha. Gira tu cuerpo entero, no solo el brazo. La brujula en pantalla
   (gauge) muestra tu rumbo en vivo en grados y cardinal, y la desviacion:
   si baja de 15 grados se pone verde (DENTRO DEL MARGEN).
4. Toca **Fijar rumbo**. Puntaje: 5 grados o menos = 100 pts, 15 o menos = 75,
   mas = 0. Feedback: "EL INICIO QUEDO SO 215 grados a 87 m".
5. Son 5 rondas; cada "Seguir caminando" arranca desde donde estas. Al final ves
   el promedio de desviacion y tu record.

Truco honesto: la pantalla muestra la desviacion en vivo, asi que podrias
"acomodarla" hasta el verde. Para entrenar de verdad, apunta primero a ojo y
recien despues mira la pantalla para confirmar y fijar.

Calibracion: antes de jugar, gira el telefono mirando el gauge; apuntando al
norte debe marcar cerca de 000, al este 090. Si marca otra cosa, hace ochos en
el aire con el celu, aleja imanes, fundas magneticas y parlantes. Si a los
4 segundos no hay brujula, aparece el modo simulacion (slider de 0 a 359).

---

## 10. Modulo O "Rotacion 3D de Hitos" (EN CASA, con internet)

Para que sirve: reconocer un lugar cuando lo ves desde el otro lado. Cura el
sindrome de "esta calle no la reconozco al volver": de ida memorizas una fachada
y a la vuelta, desde atras, todo parece distinto.

Escena 3D del barrio con edificios reales de OpenStreetMap (sin API key).
Necesita internet para descargar edificios y calles; necesita WebGL.

1. Toca Empezar: baja los edificios y calles alrededor de tu ancla HITO (si no
   marcaste hito, usa otra ancla al azar; si no hay viaje, usa El Obelisco).
   La barra avisa cuantos edificios y calles cargo.
2. La camara mira el barrio inclinada (pitch 60, zoom 15.3) desde uno de los 4
   lados (N/E/S/O, al azar). La etiqueta dice ej. "VISTA DESDE EL N". No la
   podes mover: solo mirarla. Fijate en el CONJUNTO (que torre tapa a cual,
   donde dobla la calle), no en un edificio suelto.
3. Abajo aparecen **4 capturas**: la vista opuesta (correcta), la misma que ves,
   y las dos de costado. Estan mezcladas con letras A-D. Elegi cual es la vista
   desde el **lado opuesto**.
4. Al responder, la escena gira animada hasta la vista correcta para que compares.
   Acierto = +100 pts. Son 5 rondas.

Nota: necesita edificios cargados en OSM para tu barrio. En zonas bien mapeadas
funciona perfecto; en zonas vacias puede haber pocas torres. Si Overpass no
responde, prueba con otro momento: rota entre 5 espejos solo.

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
