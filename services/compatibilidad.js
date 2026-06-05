const db = require('../database');

const RANGOS = {
  valorant: ['hierro', 'bronce', 'plata', 'oro', 'platino', 'diamante', 'ascendente', 'inmortal', 'radiante'],
  lol: ['hierro', 'bronce', 'plata', 'oro', 'platino', 'esmeralda', 'diamante', 'master', 'grandmaster', 'challenger']
};

function safeParseArray(val) {
  if (!val) return [];

  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [val];
  }
}

function normalizarTexto(valor) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function normalizarArray(val) {
  return safeParseArray(val)
    .map(normalizarTexto)
    .filter(Boolean)
    .map(v => v === 'casual' ? 'normal' : v);
}

function interseccion(a, b) {
  return a.filter(x => b.includes(x));
}

function getConfig(userId, juego, perfil) {
  if (perfil?.juegos_config) {
    return perfil.juegos_config.find(j => j.juego === juego);
  }

  return db.prepare('SELECT * FROM juegos_config WHERE user_id = ? AND juego = ?').get(userId, juego);
}

function distanciaRango(r1, r2, juego) {
  const lista = RANGOS[juego] || [];
  const i1 = lista.indexOf(normalizarTexto(r1));
  const i2 = lista.indexOf(normalizarTexto(r2));
  if (i1 === -1 || i2 === -1) return null;
  return Math.abs(i1 - i2);
}

function detalleCompatibilidad(base, candidato, juego, rolesYaEnEquipo = []) {
  const baseConfig = getConfig(base.user_id, juego, base);
  const candConfig = getConfig(candidato.user_id, juego, candidato);

  if (!baseConfig || !candConfig) {
    return { score: -1, razones: ['no comparte ese juego'] };
  }

  let score = 0;
  const razones = [];

  const servidoresBase = normalizarArray(baseConfig.servidor);
  const servidoresCand = normalizarArray(candConfig.servidor);
  const servidoresComun = interseccion(servidoresBase, servidoresCand);
  if (!servidoresComun.length) return { score: -1, razones: ['no comparten server'] };
  score += 35;
  razones.push(`server: ${servidoresComun.join(', ')}`);

  const horariosBase = normalizarArray(base.horario || base.horarios);
  const horariosCand = normalizarArray(candidato.horario || candidato.horarios);
  const flexible = horariosBase.includes('varia mucho') || horariosCand.includes('varia mucho');
  const horariosComun = interseccion(horariosBase, horariosCand);
  if (!flexible && !horariosComun.length) return { score: -1, razones: ['horarios muy distintos'] };
  score += flexible ? 30 : 25;
  razones.push(flexible ? 'horario flexible' : `horario: ${horariosComun.join(', ')}`);

  const modosBase = normalizarArray(baseConfig.modo || baseConfig.modos);
  const modosCand = normalizarArray(candConfig.modo || candConfig.modos);
  const modosComun = interseccion(modosBase, modosCand);
  if (modosComun.length) {
    score += modosComun.length >= 2 ? 15 : 10;
    razones.push(`modo: ${modosComun.join(', ')}`);
  }

  const dist = distanciaRango(baseConfig.rango, candConfig.rango, juego);
  if (dist !== null && modosBase.includes('ranked') && modosCand.includes('ranked')) {
    if (dist === 0) score += 15;
    else if (dist === 1) score += 12;
    else if (dist === 2) score += 8;
    else if (dist === 3) score += 3;
    else score -= 5;

    if (dist <= 2) razones.push(dist === 0 ? 'mismo rango' : 'rango cercano');
  }

  const rolesBase = normalizarArray(baseConfig.rol);
  const rolesCand = normalizarArray(candConfig.rol);
  const rolesEquipo = rolesYaEnEquipo.map(normalizarTexto);
  const rolNuevo = rolesCand.some(r => !rolesBase.includes(r) && !rolesEquipo.includes(r));
  if (rolNuevo) {
    score += 5;
    razones.push('roles que se complementan');
  } else if (rolesBase.length === 1 && rolesCand.length === 1 && rolesBase[0] === rolesCand[0]) {
    score -= 5;
  }

  if (base.pais && candidato.pais && normalizarTexto(base.pais) === normalizarTexto(candidato.pais)) {
    score += 5;
  }

  if (base.edad && candidato.edad && base.edad === candidato.edad) {
    score += 3;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, razones };
}

function puntajeCompatibilidad(base, candidato, juego, rolesYaEnEquipo = []) {
  return detalleCompatibilidad(base, candidato, juego, rolesYaEnEquipo).score;
}

module.exports = {
  puntajeCompatibilidad,
  detalleCompatibilidad,
  safeParseArray
};
