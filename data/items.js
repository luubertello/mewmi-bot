// item_type: 'titulo' | 'fondo' | 'marco' | 'mascota' | 'coleccionable' | 'insignia' | 'bio'

const ITEMS = [

  // ── TÍTULOS COMPRABLES ──────────────────────────────────────────────────────
  { id: 'titulo_delulu',           type: 'titulo', label: 'delulu',            precio: 90  },
  { id: 'titulo_tilteada',         type: 'titulo', label: 'tilteada',          precio: 90  },
  { id: 'titulo_clutch',           type: 'titulo', label: 'clutch',            precio: 120 },
  { id: 'titulo_ace',              type: 'titulo', label: 'ace',               precio: 130 },
  { id: 'titulo_pentakill',        type: 'titulo', label: 'pentakill',         precio: 140 },
  { id: 'titulo_ff15',             type: 'titulo', label: 'ff al 15',          precio: 90  },
  { id: 'titulo_one_trick',        type: 'titulo', label: 'one trick',         precio: 110 },
  { id: 'titulo_gg_ez',            type: 'titulo', label: 'gg ez',             precio: 100 },
  { id: 'titulo_sin_dormir',       type: 'titulo', label: 'sin dormir',        precio: 90  },
  { id: 'titulo_ranked3am',        type: 'titulo', label: 'ranked 3am',        precio: 120 },
  { id: 'titulo_lag_mental',       type: 'titulo', label: 'lag mental',        precio: 110 },
  { id: 'titulo_siempre_online',   type: 'titulo', label: 'siempre online',    precio: 130 },
  { id: 'titulo_carreada',         type: 'titulo', label: 'carreada',          precio: 90  },
  { id: 'titulo_cat_energy',       type: 'titulo', label: 'cat energy',        precio: 130 },
  { id: 'titulo_touch_grass',      type: 'titulo', label: 'tocando pasto',     precio: 100 },
  { id: 'titulo_nocturna',         type: 'titulo', label: 'nocturna',          precio: 100 },
  { id: 'titulo_madrugadora',      type: 'titulo', label: 'madrugadora',       precio: 110 },
  { id: 'titulo_duo_finder',       type: 'titulo', label: 'duo finder',        precio: 120 },
  { id: 'titulo_reyna_instalock',  type: 'titulo', label: 'reyna instalock',   precio: 140 },
  { id: 'titulo_jett_instalock',   type: 'titulo', label: 'jett instalock',    precio: 140 },
  { id: 'titulo_sage_main',        type: 'titulo', label: 'sage main',         precio: 120 },
  { id: 'titulo_lux_main',         type: 'titulo', label: 'lux main',          precio: 120 },
  { id: 'titulo_ahri_main',        type: 'titulo', label: 'ahri main',         precio: 120 },

  // ── TÍTULOS DESBLOQUEABLES ─────────────────────────────────────────────────
  { id: 'titulo_og',               type: 'titulo', label: 'OG',                precio: 0, desbloqueable: true },
  { id: 'titulo_beta',             type: 'titulo', label: 'beta tester',       precio: 0, desbloqueable: true },
  { id: 'titulo_duo_legendario',   type: 'titulo', label: 'duo legendario',    precio: 0, desbloqueable: true },
  { id: 'titulo_5am',              type: 'titulo', label: '5am survivor',      precio: 0, desbloqueable: true },

  // ── FONDOS SUAVES ──────────────────────────────────────────────────────────
  { id: 'fondo_soft_pink',         type: 'fondo', label: 'soft pink',          precio: 100 },
  { id: 'fondo_soft_lilac',        type: 'fondo', label: 'soft lilac',         precio: 100 },
  { id: 'fondo_soft_blue',         type: 'fondo', label: 'soft blue',          precio: 100 },
  { id: 'fondo_soft_mint',         type: 'fondo', label: 'soft mint',          precio: 100 },
  { id: 'fondo_midnight',          type: 'fondo', label: 'midnight',           precio: 120 },
  { id: 'fondo_matcha',            type: 'fondo', label: 'matcha milk',        precio: 120 },
  { id: 'fondo_cream',             type: 'fondo', label: 'cream cafe',         precio: 120 },

  // ── FONDOS CON PATRÓN ──────────────────────────────────────────────────────
  { id: 'fondo_stars',             type: 'fondo', label: 'stars',              precio: 180 },
  { id: 'fondo_hearts',            type: 'fondo', label: 'hearts',             precio: 180 },
  { id: 'fondo_paws',              type: 'fondo', label: 'paws',               precio: 180 },
  { id: 'fondo_clouds',            type: 'fondo', label: 'clouds',             precio: 180 },
  { id: 'fondo_sparkles',          type: 'fondo', label: 'sparkles',           precio: 180 },
  { id: 'fondo_plaid',             type: 'fondo', label: 'plaid',              precio: 180 },

  // ── FONDOS PREMIUM ─────────────────────────────────────────────────────────
  { id: 'fondo_galaxy',            type: 'fondo', label: 'galaxy',             precio: 320 },
  { id: 'fondo_sakura',            type: 'fondo', label: 'sakura night',       precio: 320 },
  { id: 'fondo_rainy',             type: 'fondo', label: 'rainy night',        precio: 320 },
  { id: 'fondo_arcade',            type: 'fondo', label: 'sunset arcade',      precio: 320 },
  { id: 'fondo_cozy',              type: 'fondo', label: 'cozy room',          precio: 320 },
  { id: 'fondo_3am',               type: 'fondo', label: '3am queue',          precio: 320 },

  // ── MARCOS ─────────────────────────────────────────────────────────────────
  { id: 'marco_stars',             type: 'marco', label: 'stars frame',        precio: 120 },
  { id: 'marco_sakura',            type: 'marco', label: 'sakura frame',       precio: 140 },
  { id: 'marco_hearts',            type: 'marco', label: 'hearts frame',       precio: 130 },
  { id: 'marco_galaxy',            type: 'marco', label: 'galaxy frame',       precio: 150 },
  { id: 'marco_ribbons',           type: 'marco', label: 'ribbons frame',      precio: 150 },
  { id: 'marco_blackcat',          type: 'marco', label: 'black cat frame',    precio: 160 },

  // ── BIO ────────────────────────────────────────────────────────────────────
  { id: 'bio_unlock',              type: 'bio',   label: 'bio personalizada',  precio: 120 },

  // ── MASCOTAS ── GATOS ──────────────────────────────────────────────────────
  { id: 'mascota_gato_naranja',    type: 'mascota', label: 'gato naranja',     precio: 120 },
  { id: 'mascota_gato_calico',     type: 'mascota', label: 'gato calico',      precio: 150 },
  { id: 'mascota_gato_atigrado',   type: 'mascota', label: 'gato atigrado',    precio: 130 },
  { id: 'mascota_gato_siames',     type: 'mascota', label: 'gato siamés',      precio: 160 },
  { id: 'mascota_gato_carey',      type: 'mascota', label: 'gato carey',       precio: 150 },
  { id: 'mascota_gato_negro',      type: 'mascota', label: 'gato negro',       precio: 170 },
  { id: 'mascota_gato_blanco',     type: 'mascota', label: 'gato blanco',      precio: 160 },
  { id: 'mascota_gato_gris',       type: 'mascota', label: 'gato gris',        precio: 130 },

  // ── MASCOTAS ── OTROS ──────────────────────────────────────────────────────
  { id: 'mascota_poro',            type: 'mascota', label: 'poro',             precio: 140 },
  { id: 'mascota_shiba',           type: 'mascota', label: 'shiba',            precio: 220 },
  { id: 'mascota_husky',           type: 'mascota', label: 'husky',            precio: 210 },
  { id: 'mascota_conejito',        type: 'mascota', label: 'conejito',         precio: 180 },
  { id: 'mascota_atun',            type: 'mascota', label: 'atún',             precio: 100 },
  { id: 'mascota_suculenta',       type: 'mascota', label: 'suculenta',        precio: 80  },

  // ── COLECCIONABLES ── BEBIDAS / COMIDA ─────────────────────────────────────
  { id: 'item_matcha',             type: 'coleccionable', label: 'matcha',              precio: 120 },
  { id: 'item_bubbletea',          type: 'coleccionable', label: 'bubble tea',          precio: 130 },
  { id: 'item_icedcoffee',         type: 'coleccionable', label: 'iced coffee',         precio: 120 },
  { id: 'item_monster_rosa',       type: 'coleccionable', label: 'monster rosa',        precio: 150 },
  { id: 'item_monster_blanca',     type: 'coleccionable', label: 'monster blanca',      precio: 150 },
  { id: 'item_ramen',              type: 'coleccionable', label: 'ramen',               precio: 100 },
  { id: 'item_oreo',               type: 'coleccionable', label: 'oreo',                precio: 90  },
  { id: 'item_sushi',              type: 'coleccionable', label: 'sushi',               precio: 120 },

  // ── COLECCIONABLES ── SETUP / COZY ────────────────────────────────────────
  { id: 'item_ipad',               type: 'coleccionable', label: 'ipad',                precio: 180 },
  { id: 'item_switch',             type: 'coleccionable', label: 'switch',              precio: 180 },
  { id: 'item_teclado_rgb',        type: 'coleccionable', label: 'teclado rgb',         precio: 170 },
  { id: 'item_auris_kitty',        type: 'coleccionable', label: 'auris kitty',         precio: 200 },
  { id: 'item_vela',               type: 'coleccionable', label: 'vela aromática',      precio: 120 },
  { id: 'item_manta',              type: 'coleccionable', label: 'manta cozy',          precio: 130 },

  // ── COLECCIONABLES ── AESTHETIC ───────────────────────────────────────────
  { id: 'item_tamagotchi',         type: 'coleccionable', label: 'tamagotchi',          precio: 160 },
  { id: 'item_polaroid',           type: 'coleccionable', label: 'polaroid',            precio: 140 },
  { id: 'item_cdplayer',           type: 'coleccionable', label: 'cd player',           precio: 160 },
  { id: 'item_digicam',            type: 'coleccionable', label: 'digicam',             precio: 170 },

  // ── COLECCIONABLES ── HOBBIES ─────────────────────────────────────────────
  { id: 'item_sketchbook',         type: 'coleccionable', label: 'sketchbook',          precio: 120 },
  { id: 'item_pintura',            type: 'coleccionable', label: 'pintura',             precio: 120 },
  { id: 'item_guitarra',           type: 'coleccionable', label: 'guitarra',            precio: 150 },
  { id: 'item_crochet',            type: 'coleccionable', label: 'crochet',             precio: 140 },

  // ── COLECCIONABLES ── CUTE STUFF ──────────────────────────────────────────
  { id: 'item_plush_kuromi',       type: 'coleccionable', label: 'peluche kuromi',      precio: 180 },
  { id: 'item_plush_cinna',        type: 'coleccionable', label: 'peluche cinnamoroll', precio: 180 },
  { id: 'item_cattoy',             type: 'coleccionable', label: 'juguete de gato',     precio: 110 },
  { id: 'item_crocs',              type: 'coleccionable', label: 'crocs',               precio: 140 },

  // ── INSIGNIAS (automáticas, precio 0, no comprables) ──────────────────────
  { id: 'badge_og',                type: 'insignia', label: 'OG member',       precio: 0, desbloqueable: true },
  { id: 'badge_beta',              type: 'insignia', label: 'beta tester',     precio: 0, desbloqueable: true },
  { id: 'badge_first_match',       type: 'insignia', label: 'primera partida', precio: 0, desbloqueable: true },
  { id: 'badge_duo_legendario',    type: 'insignia', label: 'duo legendario',  precio: 0, desbloqueable: true },
  { id: 'badge_5am',               type: 'insignia', label: '5am survivor',    precio: 0, desbloqueable: true },
  { id: 'badge_nocturna',          type: 'insignia', label: 'nocturna',        precio: 0, desbloqueable: true },
  { id: 'badge_madrugadora',       type: 'insignia', label: 'madrugadora',     precio: 0, desbloqueable: true },
  { id: 'badge_100_games',         type: 'insignia', label: '100 partidas',    precio: 0, desbloqueable: true },
  { id: 'badge_500_games',         type: 'insignia', label: '500 partidas',    precio: 0, desbloqueable: true },
  { id: 'badge_top3',              type: 'insignia', label: 'top 3 semanal',   precio: 0, desbloqueable: true },
  { id: 'badge_season_052026',     type: 'insignia', label: 'season 05/2026',  precio: 0, desbloqueable: true },
];

function getById(id)     { return ITEMS.find(i => i.id === id) || null; }
function getByType(type) { return ITEMS.filter(i => i.type === type); }
function getComprables() { return ITEMS.filter(i => i.precio > 0 && !i.desbloqueable); }

module.exports = { ITEMS, getById, getByType, getComprables };