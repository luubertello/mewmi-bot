const db = require('../database');

// Asegura que el usuario tenga fila en coins
function init(userId) {
  db.prepare('INSERT OR IGNORE INTO coins (user_id, balance, total_earned) VALUES (?, 0, 0)').run(userId);
}

// Suma coins y registra el total histórico
function add(userId, amount, razon = '') {
  init(userId);
  db.prepare('UPDATE coins SET balance = balance + ?, total_earned = total_earned + ? WHERE user_id = ?')
    .run(amount, amount, userId);
  return get(userId);
}

// Resta coins. Devuelve false si no hay suficiente saldo
function spend(userId, amount) {
  init(userId);
  const row = get(userId);
  if (row.balance < amount) return false;
  db.prepare('UPDATE coins SET balance = balance - ? WHERE user_id = ?').run(amount, userId);
  return true;
}

// Devuelve { balance, total_earned, last_daily }
function get(userId) {
  init(userId);
  return db.prepare('SELECT * FROM coins WHERE user_id = ?').get(userId);
}

// Daily bonus: +5 una vez por día UTC. Devuelve los coins dados o 0 si ya lo cobró.
function daily(userId) {
  init(userId);
  const hoy = new Date().toISOString().slice(0, 10); // "2025-03-15"
  const row = get(userId);
  if (row.last_daily === hoy) return 0;
  db.prepare('UPDATE coins SET balance = balance + 5, total_earned = total_earned + 5, last_daily = ? WHERE user_id = ?')
    .run(hoy, userId);
  return 5;
}

// Top N usuarios por balance
function top(n = 5) {
  return db.prepare(`
    SELECT c.user_id, c.balance, c.total_earned, p.nick, p.username
    FROM coins c
    LEFT JOIN perfiles p ON p.user_id = c.user_id
    ORDER BY c.balance DESC
    LIMIT ?
  `).all(n);
}

module.exports = { init, add, spend, get, daily, top };