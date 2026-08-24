# RUMBO - Guia de uso

App (PWA) que entrena el sentido de la orientacion espacial antes de pisar una
ciudad nueva. Estetica de carta nautica. Todo funciona 100% local: tus mapas,
anclas y records se guardan en el telefono, nunca se suben a un servidor.

## Instalacion en el celular

1. Abri la app en el navegador (desde GitHub Pages o un servidor local con HTTPS).
2. En el menu del navegador toca "Agregar a pantalla de inicio".
3. La app queda instalada como una aplicacion de pantalla completa.

Requisitos:
- GPS y brujula funcionan solo en contexto seguro (HTTPS o localhost). GitHub
  Pages ya da HTTPS gratis.
- Los modulos 2 y 3 usan GPS y brujula reales: conviene usarlos al aire libre.
- La primera vez que el Modulo 3 pide la brujula en iOS hay que tocar un boton
  (Apple exige permiso explicito por gesto).

## Pantalla de inicio

La rosa de los vientos (o su grilla en celular) tiene los 4 modulos en los
4 puntos cardinales, porque eso es lo que la app entrena:

- N - Modulo 1 "El Punto Ciego": memoria del mapa.
- E - Modulo 2 "El Radar Ciego": caminar a ciegas.
- S - Modulo 3 "Donde quedo mi casa": GPS + brujula de verdad.
- O - Modulo 4 "Rotacion 3D de Hitos": reconocer la vista opuesta.

Tambien muestra la tarjeta "Proximo viaje" con los datos del ultimo mapa
guardado.

## Modo Viaje (armar tu mapa)

Es la base de todo: sin un viaje guardado no hay esqueleto ni modulos 1 y A.

1. Busca el barrio (ej. "Palermo, Buenos Aires") y toca "Ir", o toca "GPS"
   para ir a tu ubicacion.
2. Elegi un tipo de ancla (HOTEL / SUBTE / RESTAURANTE / HITO) y toca el mapa
   para marcarla. Se pide un nombre; arrastralas para moverlas.
3. Toca "Generar esqueleto": la app baja las calles de la zona visible y las
   dibuja como un laberinto sin nombres. El toggle cambia entre esqueleto y
   mapa con nombres.
4. Toca "Guardar viaje". Todo se guarda automatico en el telefono
   (clave `rumbo_viaje`).

Consejo: marcá tu hotel, el subte mas cercano, un restaurante y un hito
conocido. Esas 4 anclas son las que usan los juegos.

## Modo A "La Brujula del Turista" (Jugar)

Requiere un viaje guardado con al menos 2 anclas.

1. El juego te pone en una ancla de origen (tu hotel) y te pide el rumbo hacia
   otro destino.
2. Arrastra la brujula (o usa los atajos N/E/S/O) y toca "Confirmar rumbo".
3. Despues de responder se dibuja la linea real y calcula tu error en grados.
   Si acertas el cardinal exacto hay bonus "RUMBO EXACTO".
4. Puntaje por ronda: menos error, mas puntos (maximo 100 + 25 de bonus).

## Modulo 1 "El Punto Ciego"

Requiere un viaje guardado con al menos 2 anclas.

1. Mira el mapa esqueleto con tus anclas durante 10 segundos (contador en pantalla).
2. El mapa se apaga y te pregunta la posicion relativa: "estas en el hotel
   mirando al Norte, donde queda el restaurante?"
3. Responde DE FRENTE / A LA DERECHA / A LA IZQUIERDA / DETRAS.
4. Las ultimas rondas son el nivel avanzado: mapa rotado 180 grados
   (aparece el banner "MAPA ROTADO 180").

## Modulo 2 "El Radar Ciego"

Se mide con GPS; para el juego real sali a la calle.

1. Elegi tu largo de paso (60/70/80 cm) y toca "Marcar inicio y empezar".
2. La app te dicta la ruta tramo a tramo ("caminá 12 pasos, gira 90 grados a la
   derecha, caminá 8").
3. Caminas contando pasos y giros sin mirar. Toca PAR&Eacute; al fin de cada tramo
   y MARCAR LLEGADA en el ultimo.
4. La app compara tu punto estimado contra tu posicion real: error en metros y
   en grados (con lado: derecha/izquierda).
5. Puntaje: menor error, mas puntos. Pista segun el rango (IMPRESIONANTE /
   BUENA ESTIMACION / SE VA ACERCANDO / REVISA PASOS Y GIROS).

## Modulo 3 "Donde quedo mi casa"

GPS + brujula reales. Es el que mas se parece a volver a tu hotel.

1. Toca "Marcar inicio y empezar" (te pide permiso de ubicacion y brujula).
2. Caminas; la app te avisa PARADA (vibra) con un objetivo de 40-150 m.
3. Apunta la parte trasera del telefono (la camara) hacia donde empezaste.
   El gauge en vivo muestra tu desviacion.
4. Toca "Fijar rumbo" cuando apuntes bien. Dentro de 15 grados de margen sumas
   puntos (5 grados o menos = 100 pts, 15 o menos = 75 pts).

## Modulo 4 "Rotacion 3D de Hitos"

Escena 3D del barrio (edificios de OpenStreetMap, sin API key).

1. Fijate bien en la vista 3D y de que lado estas parado.
2. Elegi cual de las 4 opciones es la vista desde el lado opuesto de la manzana.
3. +100 si acertas. Al responder la escena gira animada hacia la vista correcta
   para que compares.

## Simulaciones (para probar en la PC)

- Modulo 2 sin GPS: aparece un panel con dos sliders (error en distancia y en
  angulo) para simular donde quedaste.
- Modulo 3 sin brujula: aparece un slider que simula hacia donde apunta el
  telefono.

Sirven para probar el flujo en el escritorio, pero el entrenamiento real es en
la calle con GPS y brujula.

## Datos guardados en el telefono

- `rumbo_viaje`: el mapa, las anclas y el esqueleto del ultimo viaje.
- `rumbo_mejor`, `rumbo_mejor1`...`rumbo_mejor4`: tus records de cada juego.

Para borrarlos: en el navegador, ajustes del sitio / borrar datos.

## Version instalada vieja?

La app cachea archivos para funcionar offline. Si despues de una actualizacion
ves la version anterior, cerra la app y reabri (o recarga la pagina).
