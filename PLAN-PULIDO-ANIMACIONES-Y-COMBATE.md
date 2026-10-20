# Plan de trabajo: animaciones y combate de Kaelen

## Objetivo

Mejorar la sensacion de movimiento y los ataques del personaje principal para que se vean fluidos, legibles y con peso. Este documento registra el analisis, los criterios acordados y el estado de implementacion.

## Hallazgos del proyecto

- El juego principal carga `app.js` desde `index.html`. El movimiento y las poses del personaje se calculan proceduralmente; el estado de animacion incluye `idle`, `walk`, `run` y estados de combate.
- `personaje-editor.html` tiene su propio visor de prueba con botones para Quieto, Caminando, Corriendo, Ataque basico, Media Luna y Ataque fuerte. Sus animaciones de muestra deben evaluarse junto con las del juego, porque no son la misma ruta de ejecucion.
- Los ataques basicos se construyen con poses y fases en `app.js` (`buildAttackPoses`, `requestComboHit` y `startHeavyAttack`), en vez de seleccionar una animacion importada directamente.
- Media Luna cuenta con fases de elevacion, suspension, combo aereo y recuperacion; el combo aereo se configuro para nueve impactos y debe conservar salidas seguras y control del objetivo.
- La trayectoria anterior de los tajos basicos tenia rotaciones amplias del hombro y de la espada que desviaban brazo y hoja hacia un costado, en vez de proyectarlos al frente del personaje.
- Hay recursos que deben revisarse visualmente antes de reutilizarlos, incluidos `img/GIFs/GIF - ATAQUES BASICOS.mp4`, `img/pj1_tiles.jpeg` y `kaelen-atlas.js`, ademas de los efectos de sonido de espada.
- Existe tambien una copia en `vercel-static/`. Sus archivos `app.js` y `forest-scene.js` no tienen los mismos hashes que los del directorio principal; no se debe asumir que las dos versiones estan sincronizadas ni sobrescribir una con la otra sin revisar sus diferencias.

## Alcance y comportamiento deseado

### 1. Quieto natural

- Sustituir la postura rigida por un ciclo sutil de respiracion, pequenos cambios de peso y balance corporal.
- Mantener los pies apoyados y evitar oscilaciones repetitivas o exageradas; agregar variacion leve para que no parezca una figura mecanica.
- Hacer que el regreso desde caminar, correr, salto o ataque desacelere con suavidad y termine en la misma postura neutra.

### 2. Transiciones graduales al caminar y correr

- Al seleccionar Caminando o Corriendo en el visor, entrar en la animacion progresivamente en lugar de saltar de inmediato a la velocidad y amplitud completas.
- En el juego, suavizar aceleracion, frenado y cambio entre quieto, caminar y correr, coordinando la velocidad real del personaje con el ritmo de piernas, brazos y torso.
- Conservar respuesta inmediata de controles: la transicion visual no debe introducir retraso apreciable ni hacer que el personaje se deslice.
- Aplicar el mismo criterio a teclado, joystick y gamepad, y revisar que el visor no se confunda con el movimiento real del juego.

### 3. Ataques basicos basados en las animaciones originales

- Revisar el material original disponible y comparar sus poses, trayectoria de espada y ritmo con el combo actual de tres golpes.
- Tras identificar que recurso contiene la referencia utilizable, reproducir en el personaje del juego la secuencia reconocible, adaptandola al rig procedural existente cuando no haya clips listos para importar.
- Mejorar la preparacion, el recorrido visible de la hoja, el seguimiento del torso y la recuperacion de cada golpe. Alinear el efecto de corte y el sonido con el instante del impacto.
- Priorizar el avance frontal de la espada: llevar el brazo hacia delante desde el hombro, extender el codo en el impacto y limitar el barrido lateral del hombro y de la hoja. Mantener solo una variacion lateral pequena para distinguir los golpes.
- Conservar controles, combo, ventanas de impacto, objetivos y reglas actuales salvo que una diferencia necesaria se documente y se balancee expresamente.
- Comprobar que el recurso de referencia corresponde a Kaelen y que se puede usar como fuente del proyecto antes de convertirlo o copiarlo.

### 4. Media Luna: lanzamiento y combo aereo

1. Desde el suelo, preparar un tajo ascendente y ejecutar un corte que viaje desde abajo hacia arriba y se proyecte hacia delante, siguiendo la orientacion del personaje y del objetivo.
2. Hacer claramente visible el slash: una trayectoria amplia y limpia, buen contraste, duracion legible y alineacion con la espada. Sin tapar por completo al jugador ni al enemigo.
3. En el impacto, elevar al jugador y al objetivo de forma coordinada; mantenerlos suspendidos y cerca uno del otro durante la secuencia.
4. Encadenar aproximadamente nueve tajos basicos en el aire. Cada uno debe tener su propio movimiento de espada y slash visible; variar ligeramente trayectoria, pose y ritmo para que se lea como un combo continuo y no como golpes repetidos identicos.
5. Mantener el objetivo valido durante la suspension y evitar que la IA, la gravedad o el desplazamiento lo saquen de la secuencia. Terminar con una recuperacion controlada y devolver ambos personajes al movimiento normal.
6. Definir y probar interrupciones y salidas seguras: objetivo derrotado o invalido, jugador golpeado, fin del combo, perdida de estado o cambio de escena. No dejar personajes bloqueados en el aire.
7. Revisar el balance del dano total del poder al pasar de dos a unos nueve impactos; el numero de impactos no debe multiplicar accidentalmente el dano previsto ni permitir que el objetivo reciba impactos duplicados por fotograma.

**Criterio de control a decidir al implementar:** el combo debe sentirse como una continuacion fluida de la habilidad. Implementar una ventana de encadenamiento clara y probar si los golpes se disparan al mantener/pulsar ataque o mediante una secuencia temporizada; elegir la opcion que mejor respete el control actual y evite ataques involuntarios. La ruta especial existente de ataque hacia abajo tambien debe probarse para asegurar que no interfiera con el combo aereo.

### 5. Ataque fuerte

- Usar la silueta y trayectoria de un tajo basico, con una preparacion mas sostenida y un impacto con mas peso; no convertirlo en una habilidad visualmente distinta sin necesidad.
- Mantener el boton para cargar o sostener el golpe segun el control ya existente. El golpe ejecutado debe causar el doble de dano del golpe basico equivalente, aplicando una sola vez los modificadores y evitando duplicar el multiplicador.
- Comunicar visualmente la carga, el momento de liberacion y el impacto. Verificar cancelacion, recursos, combo y dano con arma equipada y sin arma.

## Fases de implementacion

1. **Inventario de referencias:** revisar el video de ataques, atlas/modelo, animaciones actuales y efectos; identificar el punto de entrada activo y registrar las diferencias entre la raiz y `vercel-static/`.
2. **Movimiento y visor:** pulir la postura quieta y transiciones de movimiento tanto en el juego como en la vista previa del editor, compartiendo el mismo criterio visual.
3. **Combo basico y ataque fuerte:** adaptar las referencias originales a las poses del jugador y validar ventanas de impacto, dano y sincronizacion audiovisual.
4. **Media Luna aerea:** implementar el tajo ascendente, lanzamiento coordinado y combo cercano a nueve golpes con reglas robustas de estado, objetivos e interrupcion.
5. **Integracion y entrega:** propagar los cambios a la copia estatica solo tras identificar su relacion con la version principal, y revisar ambas entradas publicables para que no diverjan.

## Criterios de aceptacion

- Quieto transmite respiracion y equilibrio humano sin deslizar los pies ni oscilar de forma mecanica.
- Seleccionar caminar/correr muestra una entrada y salida progresivas; el desplazamiento visual acompana la velocidad real y los controles siguen respondiendo.
- El combo basico se reconoce como la referencia original, con tajos visibles, impactos sincronizados y sin cambios accidentales a su dano o control.
- La hoja avanza hacia delante siguiendo la orientacion del personaje/objetivo; no se abre hacia un costado durante el golpe.
- Media Luna empieza con un corte ascendente hacia delante, eleva a ambos combatientes, permite aproximadamente nueve impactos aereos distintos y aterriza/libera siempre al jugador y al objetivo correctamente.
- Ataque fuerte conserva el movimiento de un tajo basico, se siente mas cargado y hace exactamente el doble de dano base por golpe, sin multiplicadores dobles.
- Las pruebas cubren bosque, arena/campo de entrenamiento, teclado, botones tactiles y gamepad; incluyen objetivos que mueren, salen de rango o interrumpen el ataque.
- La version principal y la version estatica reciben los cambios previstos de forma consciente, sin borrar diferencias que no pertenecen a esta tarea.

## Fuera de alcance por ahora

- Reemplazar el rig completo o rehacer el modelo del personaje.
- Cambiar todas las habilidades, el balance general del juego o las animaciones de enemigos no implicadas en estas acciones.
- Alterar la historia, la interfaz general o los controles no relacionados.

## Referencias de codigo y recursos

- Juego principal: `index.html`, `app.js`.
- Visor y personalizacion: `personaje-editor.html`.
- Version estatica: `vercel-static/index.html`, `vercel-static/app.js`.
- Recursos candidatos: `img/GIFs/GIF - ATAQUES BASICOS.mp4`, `img/pj1_tiles.jpeg`, `kaelen-atlas.js` y `audio/`.

## Estado de implementacion

- Se anadieron respiracion y ajustes sutiles de equilibrio en reposo, y transiciones progresivas de locomocion en el juego y el visor.
- Media Luna se amplio a nueve impactos aereos con poses y efectos diferenciados, suspension del objetivo y recuperacion segura.
- Ataque fuerte reutiliza la trayectoria del tajo basico con preparacion mas larga y el doble del dano base.
- Se corrigio la direccion de los tajos en `app.js`, `vercel-static/app.js` y el visor: el hombro acompana el alcance frontal, el codo se extiende al impactar y se redujo la rotacion que abria la espada lateralmente.
- La comprobacion visual del visor confirma que la animacion carga y reproduce. Falta una prueba integral del combate dentro del juego; no hay una suite automatizada configurada para estas animaciones.
