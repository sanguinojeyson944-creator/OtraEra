# Walpira — estado de auditoría y continuación

## Estado actual verificado

- El proyecto ya incorpora la estructura de los capítulos I y II en `app.js`, con cadenas de misión, introducciones de capítulo y sistema de guía de objetivos.
- La progresión principal está centralizada en `WALPIRA_STORY_QUESTS`, `WALPIRA_CHAPTERS` y `WALPIRA_MISSION_GUIDES`, lo que permite seguimiento narrativo y evolución del jugador.
- La guía de objetivos (`story-guidance-arrow`) existe y se actualiza en tiempo real, pero su ubicación podía colisionar con el joystick y la zona inferior de HUD.
- La campaña está preparada para avanzar de manera narrativa y bregar con misiones de combate, compra/equipamiento, forja y entrega de informes.

## Corrección aplicada

- Se limitó el posicionamiento del indicador de objetivo a una zona segura del HUD para que no entre en conflicto con:
  - el joystick izquierdo,
  - el panel de objetivos principal,
  - los paneles de minimapa y la parte inferior de la interfaz.
- El ajuste se aplica tanto en la versión principal como en la copia usada para despliegue estático en `vercel-static/`.

## Concepto y plan justificando la continuación

1. Consolidar la progresión de los capítulos I y II como una pista narrativa completa, con misiones verificadas y recompensas persistentes.
2. Validar que cada misión tenga su NPC, región, objetivo y condición de cierre visibles en el juego real.
3. Separar claramente la investigación de Arcuz (continuación narrativa) de la implementación del capítulo III, sin forzar contenido futuro sobre la trama actual.
4. Mantener la interfaz jugable segura para móvil y orientación horizontal, evitando que los títulos o flechas bloqueen controles esenciales.

## Siguiente bloque de trabajo recomendado

- Revisar las misiones de capítulo I y II una por una para detectar huecos de dependencia o estados de progreso no visibles.
- Comprobar la cadena de reasignación de NPC y artefactos a través de `recordStoryNpcInteraction`, `acceptStoryQuest`, `completeStoryQuest` y `advanceStoryCount`.
- Preparar un documento de continuidad de Arcuz basado en el punto equivalente al final del capítulo II, sin implementar aún el tercer capítulo.

## Evidencia de verificación

- Se validó sintaxis del código JavaScript principal con `node --check app.js`.
- El ajuste del sistema de guía no rompe la estructura del juego y deja la interfaz más segura para gameplay táctil.
