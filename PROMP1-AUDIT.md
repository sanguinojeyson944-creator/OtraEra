# Auditoría PROMP1: capítulos I y II

**Fecha:** 2026-10-17  
**Build auditado:** cliente principal (`index.html` + `app.js`); no se toma `vercel-static/app.js` como fuente equivalente porque es una implementación anterior.

## Concepto y plan

La campaña actual funciona como historia principal lineal: Glemier dirige la investigación, Dohan cubre el arma, Barric la forja, Mikel los materiales y el Bosque de los Lamentos contiene las amenazas. La geografía existente es suficiente: no hace falta un mapa nuevo para cerrar estos dos capítulos.

Plan aplicado: mantener el HUD compacto y verificar zonas seguras; hacer que la orientación de escarcha apunte a la criatura que realmente entrega el objeto; conservar el progreso ya persistido y exponer un cierre visible cuando la campaña llega a `complete`; documentar el inventario real de misiones y la investigación de Arcuz por separado.

## Misiones existentes

Todas las filas son misiones principales. No se encontró una misión secundaria de Walpira implementada en `WALPIRA_STORY_QUESTS`.

| ID / misión | Cap. | Entrega / función | Zona y objetivo verificable | Prerrequisitos y cierre | Recompensa / siguiente | Estado |
|---|---|---|---|---|---|---|
| `c1_glemier` · La llamada de la frontera | I | Glemier, consejero | Villa; hablar con Glemier | Aceptar la misión en su panel; la misión de tipo `talk` se completa al aceptarla | 20 XP, 15 GP; `c1_weapon` | Implementada |
| `c1_weapon` · Acero para el camino | I | Dohan, maestro de armas | Villa; comprar arma a Dohan y equipar ese mismo ID | Aceptar; registrar compra válida en Dohan y equipar ID comprado | 35 XP; 1500 GP de adelanto; `c1_forest` | Implementada; inicio de dificultad/ventas aún requiere playthrough |
| `c1_forest` · Ecos entre los árboles | I | Encargo de Glemier, sin NPC en campo | Bosque; derrotar 3 criaturas forestales | Solo cuenta `isForestCreature` | 55 XP, 65 GP y `piedra_de_condena`; `c1_forge` | Implementada |
| `c1_forge` · Templa tu acero | I | Barric, herrero | Villa; mejorar arma a +1 | Usar la forja real, Piedra de Condena y 80 GP | 45 XP, 30 GP; `c1_report` | Implementada; piedra queda pendiente si la mochila está llena |
| `c1_report` · Regreso a la villa | I | Glemier, consejero | Villa; reportar lo hallado | Interactuar después de volver del Bosque | 70 XP, 40 GP; desbloquea capítulo II | Implementada |
| `c2_mikel` · La savia oscura | II | Mikel, boticario y alquimista | Villa; hablar sobre corrupción | Aceptar en su panel; la misión de tipo `talk` se completa al aceptarla | 25 XP, 20 GP; `c2_crystals` | Implementada |
| `c2_crystals` · Fragmentos de escarcha | II | Encargo derivado de Mikel | Bosque; recoger 2 `cristal_de_escarcha` | La Escupidora de Espinas garantiza el cristal mientras esta misión está activa; contar solo al recogerlo | 60 XP, 25 GP; `c2_forest` | Implementada; la navegación se corrigió para buscar Escupidoras |
| `c2_forest` · Silencia la arboleda | II | Encargo derivado de Mikel | Bosque; derrotar 4 criaturas forestales | Conteo de bajas forestales; no cuenta entrenamiento | 85 XP, 40 GP; `c2_report` | Implementada |
| `c2_report` · La señal del Coloso | II | Glemier, consejero | Villa; informar del despertar | Conversación final cambia `story.questId` a `complete` y guarda el estado en `rpgData` | 120 XP, 75 GP; cierre narrativo al norte | Implementada; ahora el HUD conserva el cierre visible |

## Navegación y HUD

- El HUD principal mide 290 px como máximo en escritorio y se reduce a 220 px en móvil; se ancla sobre el tercio inferior izquierdo.
- Medición DOM con objetivo representativo en viewport 390×844: HUD (x16–226, y569–644), joystick (y674–828) y botones de acción (x158–374, y694–834); sin solapamiento.
- En paisaje 844×390: HUD (x16–306, y54–142), joystick (y256–380) y botones (x682–832, y288–380); sin solapamiento.
- En escritorio 1280×800: HUD (x16–306, y464–552), joystick (y630–784) y botones (x1048–1264, y650–790); sin solapamiento.
- La medición es de navegador con breakpoints reales y texto representativo; no sustituye prueba física en varios teléfonos. El límite CSS del HUD es 92–94 px.
- El título grande de capítulo solo aparece en la pantalla de presentación; durante combate se usa el panel compacto. No se movió el panel porque las mediciones no muestran interferencia con joystick, botones ni habilidades.
- Corregido: el mapa y la flecha de `c2_crystals` buscan una Escupidora viva, no cualquier enemigo; si no hay una disponible, dirigen al acceso del campamento/zona.
- El indicador de misión solo se presenta si existe una misión activa. Al completar la última, el panel ahora muestra el estado persistente de capítulo terminado en lugar de ocultarse junto con el objetivo.

## NPC, tiendas y objetos

| NPC | Coordenadas Villa (X,Z) | Función / catálogo conectado |
|---|---:|---|
| Glemier | (-17.08, -10.70) | Consejero y dador de la historia; conversación completa objetivos `talk` |
| Dohan | (6.93, 14.30) | Armas: espadas, hachas, dagas y escudos del catálogo |
| Mikel | (25.07, 6.35) | Pociones/consumibles y cristales; alquimia |
| Barric | (44.11, -6.59) | Forja; materiales de refuerzo y mejoras +1 a +5 |
| Elena | (29.05, 0.35) | Cofre/almacén; no se reasigna como vendedor general |

- Arma: `iron_sword` existe, pero la misión exige comprar a Dohan y equipar el mismo ID, evitando completar con el arma inicial.
- Piedra: `piedra_de_condena` existe en materiales; se consume al reforzar +1. Precio de catálogo 180 GP; forja requiere 80 GP.
- Cristal: `cristal_de_escarcha` existe en el catálogo de materiales (120 GP); no se inventa un identificador nuevo. El drop de misión se garantiza solo durante `c2_crystals`.
- El resto de recompensas usa GP/XP existentes; los objetos de misión pendientes de espacio se conservan en `story.pendingItems`.
- Dohan, Mikel y Barric tienen catálogos filtrados por categoría; no se creó comerciante duplicado.

## Geografía y equivalencias

- Villa Walpira concentra dador de misión, arma, alquimia y forja; la salida norte conduce al Bosque de los Lamentos.
- El Bosque concentra los objetivos de exploración, caza y recursos, con minimapa, caminos y retorno a la Puerta Norte.
- No se encontró una región adicional requerida por la historia actual; no se crea mapa nuevo.
- Equivalencias funcionales: Gran→Barric; Susan→Mikel; Wayne→protagonista Kaelen; Kimura/caza→zona y criaturas del Bosque, sin NPC duplicado; Paul/desafío→progresión de combate; Zack/misterio→Glemier como consejero. Anna y Chung no tienen equivalentes confirmados; no se fuerza su inclusión.
- Hay variedad entre hablar, comprar/equipar, cazar, forjar, recoger y entregar. No hay misión secundaria propia de Walpira todavía.

## Guardado, tutorial y límites

- `story.questId`, `completed`, `progress`, recompensas y diario se guardan dentro de `profiles[].rpgData`; eventos de objetivo invocan guardado de perfil.
- El slot manual guarda `rpgData`, posición y cámara; `loadSavedGame()` restaura el objeto antes de iniciar.
- El cierre final ahora es visible y persistente vía `questId: complete`/`chapter: 2`, no solo un toast que desaparece.
- La elección de tutorial/no tutorial existe; la arena de práctica no modifica la progresión de historia. Se requiere playthrough manual para certificar ambos recorridos completos.
- No hay jefe jugable del Coloso: el final del II es un cliffhanger narrativo, no un combate ni desbloqueo de mapa.
- La copia `vercel-static` está desfasada respecto al cliente principal y no recibe estas correcciones de forma automática.

## Validación efectuada

- Diagnósticos VS Code para `app.js` y `style.css`: sin errores.
- Cliente principal cargado en navegador con canvas y sin excepciones JavaScript en arranque.
- HUD: cálculo de intersección de rectángulos en 390×844, 844×390 y 1280×800; no solapa las cajas principales medidas.
- No completé manualmente las nueve misiones, no cargué varios perfiles/slots ni probé dispositivos físicos. Esos recorridos quedan como pruebas pendientes, no se afirman como certificados.
- Investigación histórica y límites de fuentes en [ARCUZ-CONTINUATION-RESEARCH.md](ARCUZ-CONTINUATION-RESEARCH.md).
