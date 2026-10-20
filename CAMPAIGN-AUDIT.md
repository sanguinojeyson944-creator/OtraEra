# Auditoría y matriz de campaña de Walpira

## Alcance

Informe basado en el proyecto actual y en la parte legible de `vercel-static/PROMP`. El prompt termina cortado dentro de una regla de botín, por lo que no atribuyo requisitos a la parte ausente.

La revisión completa solicitada en `PROMP1` está en [PROMP1-AUDIT.md](PROMP1-AUDIT.md); la investigación histórica separada está en [ARCUZ-CONTINUATION-RESEARCH.md](ARCUZ-CONTINUATION-RESEARCH.md).

## Estado auditado

- La partida se conserva en `profiles[].rpgData`; el guardado manual conserva además posición y copia de `rpgData`.
- Hay inventario, equipo por ranuras, catálogo, tiendas, almacén, forja +1 a +5, atributos, habilidades, experiencia y orbes.
- NPC existentes: Elena (almacén/cofre), Dohan (armas), Glemier (consejero; anteriormente solo mostraba texto), Mikel (alquimia) y Barric (forja).
- Enemigos de historia disponibles: Duende del Liquen, Escupidora de Espinas y Tronco Hueco, en el Bosque de los Lamentos. Tienen vida, daño, nivel y XP; no existía una cadena de botín/misiones.
- Zonas reutilizables: Villa Walpira y Bosque de los Lamentos. El bosque tiene transición por la Puerta Norte, criaturas y minimapa.
- La línea de historia y el tutorial estaban desacoplados: la pantalla de capítulo era fija, el texto de Glemier era estático y el tutorial se decidía mediante localStorage global.
- No se halló un jefe de campaña del Coloso ni misiones narrativas persistentes antes de esta adaptación.

## Matriz de equivalencias

| Referencia funcional | Función original | Equivalente Walpira | Estado previo | Recurso real asociado | Acción | Dependencias | Validación |
|---|---|---|---|---|---|---|---|
| Wayne / protagonista | Iniciar y recorrer la progresión | Kaelen, protagonista nombrado en la introducción existente | Existente | `heroRoot`, campaña y perfil RPG | Reutilizar | Perfil, escenas, combate | Confirmar que el avance sobrevive a guardar/cargar |
| Gran | Preparar armas/equipo | Barric, herrero de la Fragua | Existente; forja funcional | NPC `barric`, catálogo de materiales, `upgradeForgeItem` | Reutilizar y enlazar misión | Arma en yunque, piedra, oro | La misión solo avanza tras una mejora +1 real |
| Susan | Consumibles/alquimia | Mikel, Boticario y Alquimista | Existente; catálogo comercial | NPC `mikel`, catálogo de pociones y cristales | Reutilizar y enlazar Capítulo II | Artículos del catálogo | Hablar con Mikel activa la siguiente misión |
| Kimura | Exploración/caza | No existe un NPC con esa función | Inexistente | Enemigos forestales y bosque existentes | No crear duplicado; usar zona/enemigos | Bosque, IA y criaturas | Solo cuentan criaturas con `isForestCreature` |
| Anna | Encargo personal | No existe equivalente confirmado | Inexistente | NPCs actuales no tienen arco personal | Fuera de la cadena principal | Requeriría nuevo personaje/diálogo | No se declara implementada |
| Chung | Comerciante general/economía | Elena administra cofre; no es comerciante general | Parcial | NPC `elena`, almacenamiento | No cambiar su función para evitar duplicidad | Inventario y almacenamiento | La misión no depende de Elena |
| Paul | Desafío de combate | Glemier dirige la historia; Barric prepara equipo | Sin equivalente directo | NPCs y enemigos existentes | Reutilizar progresión de combate, no inventar NPC | Bosque, armas y forja | Bajas y forja verificadas por eventos de juego |
| Zack | Misterio central | Glemier conduce el misterio del Coloso, pero no es un “Zack” equivalente | Parcial | Diálogo de Glemier y canon del Coloso | Adaptar como guía, no reemplazarlo | Campaña y puerta norte | La misión final entrega el aviso del despertar |
| Arma inicial | Comprar/equipar arma | IDs existentes, como `iron_sword` y catálogo de Dohan | Existente | `RPG_ITEMS`, `ITEM_CATALOG`, `NPC_CATALOGS.dohan` | Reutilizar | Compra, mochila, ranura weapon | Misión requiere comprar a Dohan y equipar el mismo ID |
| Escudo/armadura | Supervivencia/equipo | `oak_shield`, piezas y sets de armadura | Existente | Catálogo y ranuras de equipo | Reutilizar | Equipo y visuales | No se crean duplicados narrativos |
| Consumibles | Curación/preparación | `red_potion` y catálogo de Mikel | Existente | RPG data e inventario | Reutilizar | Inventario | No requeridos por la cadena actual |
| Piedra de mejora | Composición/forja | `piedra_de_condena` | Existente | `ITEM_CATALOG` y forja Barric | Reutilizar como recompensa garantizada | Bolsa llena yunque + oro | Se conserva como recompensa pendiente si la mochila está llena |
| Cristal de escarcha | Material de misión | `cristal_de_escarcha` | Existente en catálogo; la Escupidora lo deja en el suelo durante la misión | Catálogo de materiales, botín forestal y progreso de campaña | Garantizar el objeto solo mientras está activa la misión y contar al recogerlo | Inventario, capítulo II, cambio entre mundos | El contador avanza al recoger el ID existente; la pila se elimina al abandonar su mapa |
| Enemigos básicos | Practicar y medir progresión | Tres especies del bosque | Existentes | `BESTIARY_CREATURES`, spawn forestal, IA | Reutilizar | Vida/XP/IA | Conteo excluye entrenamiento y actores no forestales |
| Moneda | Recompensa de actividad | GP ya guardado en `rpgData.gold` | Existente | Tienda, venta y recompensas | Reutilizar | Guardado | GP de misión aparece en perfil |
| Seguimiento | Mantener objetivo y destino actualizados | HUD de historia, marcador de mundo y mapas existentes | Parcial (mapas sí, misión no) | HUD, `drawVillaMap`, `drawForestMap`, transiciones | Adaptar | Estado `story.questId` | Marcador sigue NPC, salida o criatura según etapa |

## Cadena implementada

| Capítulo | Misión | Condición verificable | Recompensa |
|---|---|---|---|
| I | La llamada de la frontera | Hablar con Glemier | XP y GP |
| I | Acero para el camino | Comprar arma a Dohan y equipar el mismo ID | XP y GP |
| I | Ecos entre los árboles | Derrotar tres criaturas forestales | XP, GP y piedra de condena |
| I | Templa tu acero | Mejorar un arma a +1 con Barric | XP y GP; consume la piedra de condena |
| I | Regreso a la villa | Volver y hablar con Glemier | XP y GP; presenta Capítulo II |
| II | La savia oscura | Hablar con Mikel | XP y GP |
| II | Fragmentos de escarcha | Reunir dos cristales de escarcha mediante derrotas forestales | XP y GP |
| II | Silencia la arboleda | Derrotar cuatro criaturas forestales más | XP y GP |
| II | La señal del Coloso | Informar a Glemier | XP y GP; cierre y gancho al capítulo III |

## Riesgos y límites

- El Coloso como jefe jugable no existía y no se añadió una entidad/jefe nueva; el cierre es narrativo y usa las criaturas y mapas disponibles.
- En el build estático no hay campo de entrenamiento independiente; su opción “Sí” usa el tutorial interactivo existente. El cliente principal abre la arena de práctica existente y, al salir, presenta el Capítulo I.
- La compatibilidad se valida en los clientes, no en partidas multijugador de navegador ni en todos los perfiles antiguos.
- El cristal de escarcha se garantiza como botín físico de la Escupidora mientras la misión está activa; el jugador debe recogerlo, y una mochila llena no elimina la pila.
- Las pilas de botín llevan el ID del mundo y se limpian al cruzar entre Villa y Bosque; se evita que una pila permanezca visible en el otro mapa.
- El botín no puede abrirse mientras haya enemigos vivos a menos de 20 m; E y el clic quedan bloqueados y A conserva el ataque básico durante el combate.
- Las criaturas forestales aparecen en patrullas de tres con alerta compartida. La Escupidora puede curar al aliado más herido (o a sí misma) tras una canalización y tiene 14 s de cooldown.
- Las habilidades activas del jugador tienen cooldown visual: Media Luna 5.5 s, Ascenso del Dragón 10 s, Giro de Espada 9 s, Embestida 3.2 s, Corte Cargado 7 s y Escudazo 5 s. El combo básico, salto y defensa no tienen cooldown.
- Se añadieron capas procedurales de aves y campana rural a Villa, armonía más rica y llamadas de combate distintas por especie. No sustituyen grabaciones de audio externas.
- Se implementó el campamento fijo del Pacto de la Savia al este del Bosque de los Lamentos: tres chozas, empalizada con entrada, dos torres, estandarte y fogata; sus estructuras tienen colisión y el claro aparece en el mapa.
- El primer roster tiene seis miembros persistentes en dos escuadras (líder, dos vigías, dos guardias y healer); las bajas se guardan por perfil y el límite de facción está fijado en 20. Los vigías detectan a mayor distancia, comparten posición y elevan la alarma; el líder puede subirla un nivel adicional.
- La configuración permite añadir más miembros hasta 20, pero todavía no se han creado otros campamentos ni pactos entre facciones distintos.
