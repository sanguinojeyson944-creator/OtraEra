export const COMBAT_TRAINING_LESSONS = [
  { id: 'movement', title: '1 · Movimiento básico', instruction: 'Camina hacia delante y atrás, desplázate a un lado y corre. El rival espera.', controls: 'Joystick / WASD · mantener para correr', requirements: { moveForward: 1, moveBack: 1, strafe: 1, run: 1 } },
  { id: 'lock', title: '2 · Cámara y objetivo', instruction: 'Fija al rival, rodéalo un poco y vuelve a soltar el objetivo.', controls: 'Q · mover alrededor · Q', requirements: { lock: 1, orbit: 1, unlock: 1 } },
  { id: 'light', title: '3 · Ataque ligero', instruction: 'Conecta tres golpes ligeros con la espada.', controls: 'A · A · A', requirements: { lightHit: 3 } },
  { id: 'combo', title: '4 · Combo de espada', instruction: 'Encadena los tres cortes: horizontal, diagonal descendente y remate ascendente.', controls: 'A, espera el impacto y vuelve a pulsar A', requirements: { combo: 1 } },
  { id: 'heavy', title: '5 · Ataque pesado', instruction: 'Prepara y conecta un corte pesado. Tiene más alcance, pero tarda en salir.', controls: 'PESADO / G', requirements: { heavyHit: 1 } },
  { id: 'dodge', title: '6 · Esquiva', instruction: 'Esquiva hacia delante y luego hacia un lado para salir de la línea del rival.', controls: 'DASH / F + dirección', requirements: { dashForward: 1, dashSide: 1 } },
  { id: 'block', title: '7 · Bloqueo', instruction: 'Mantén el escudo hasta bloquear un ataque anunciado.', controls: 'Mantén ESCUDO / Shift', requirements: { block: 1 } },
  { id: 'parry', title: '8 · Parada y contraataque', instruction: 'Pulsa escudo justo antes del impacto y castiga la apertura.', controls: 'Pulsa ESCUDO al final de la preparación · A', requirements: { parry: 1, counter: 1 } },
  { id: 'jump', title: '9 · Salto y aterrizaje', instruction: 'Salta, deja que el personaje aterrice y recupere la postura.', controls: 'SALTO / Espacio', requirements: { jump: 1, land: 1 } },
  { id: 'throw', title: '10 · Lanzamiento', instruction: 'Lanza la espada hacia el rival de entrenamiento.', controls: 'LANZAR / R', requirements: { throw: 1 } },
  { id: 'recover', title: '11 · Recuperación', instruction: 'Ve hasta la espada y vuelve a equiparla. No tiene retorno automático.', controls: 'Acércate · RECOGER / R', requirements: { recover: 1 } },
  { id: 'unarmed', title: '12 · Combate sin arma', instruction: 'Con la espada en el suelo, conecta un puñetazo y prueba la defensa.', controls: 'A · ESCUDO', requirements: { fistHit: 1, block: 1 } },
  { id: 'active', title: '13 · Combate activo', instruction: 'Combina un golpe, una esquiva, un bloqueo y una parada contra el rival controlado.', controls: 'A · DASH · ESCUDO', requirements: { lightHit: 1, dash: 1, block: 1, parry: 1 } },
  { id: 'multiple', title: '14 · Varios rivales', instruction: 'Cambia de objetivo y mantén espacio entre los dos rivales de práctica.', controls: 'Q · mover y reposicionarte', requirements: { retarget: 1, reposition: 1 } }
];

export class CombatTraining {
  constructor(onChange = () => {}) {
    this.onChange = onChange;
    this.active = false;
    this.paused = false;
    this.index = 0;
    this.status = COMBAT_TRAINING_LESSONS.map(() => 'pending');
    this.progress = {};
  }

  get lesson() {
    return COMBAT_TRAINING_LESSONS[this.index] || null;
  }

  get completedCount() {
    return this.status.filter(status => status === 'complete').length;
  }

  start() {
    this.active = true;
    this.paused = false;
    this.index = 0;
    this.progress = {};
    this.status = COMBAT_TRAINING_LESSONS.map(() => 'pending');
    this.notify();
  }

  record(action, amount = 1) {
    const lesson = this.lesson;
    if (!this.active || this.paused || !lesson || !lesson.requirements[action] || this.status[this.index] === 'complete') return false;
    const current = this.progress[action] || 0;
    if (current >= lesson.requirements[action]) return false;
    this.progress[action] = Math.min(lesson.requirements[action], current + amount);
    const complete = Object.entries(lesson.requirements).every(([required, count]) => (this.progress[required] || 0) >= count);
    if (complete) this.status[this.index] = 'complete';
    this.notify();
    return complete;
  }

  repeat() {
    if (!this.active || !this.lesson) return;
    this.progress = {};
    this.status[this.index] = 'pending';
    this.paused = false;
    this.notify();
  }

  select(index) {
    if (!Number.isInteger(index) || index < 0 || index >= COMBAT_TRAINING_LESSONS.length) return;
    this.index = index;
    this.progress = {};
    this.status[index] = 'pending';
    this.paused = false;
    this.active = true;
    this.notify();
  }

  continue() {
    if (!this.active || !this.lesson || !['complete', 'skipped'].includes(this.status[this.index])) return false;
    if (this.index + 1 >= COMBAT_TRAINING_LESSONS.length) {
      this.active = false;
      this.notify();
      return true;
    }
    this.index++;
    this.progress = {};
    this.paused = false;
    this.notify();
    return false;
  }

  skip() {
    if (!this.active || !this.lesson) return;
    this.status[this.index] = 'skipped';
    this.notify();
  }

  setPaused(paused) {
    this.paused = Boolean(paused);
    this.notify();
  }

  stop() {
    this.active = false;
    this.paused = false;
    this.notify();
  }

  notify() {
    this.onChange(this);
  }
}