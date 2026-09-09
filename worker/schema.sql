-- ============================================================
-- WorkSpace OS · Esquema Cloudflare D1 (SQLite)
-- Espeja el modelo de datos local de la app (src/lib/types.ts)
-- ============================================================

CREATE TABLE IF NOT EXISTS areas (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  icono TEXT,
  color TEXT
);

CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  icono TEXT,
  color TEXT,
  area_id TEXT,
  es_sistema INTEGER DEFAULT 0,
  schema_json TEXT
);

CREATE TABLE IF NOT EXISTS proyectos (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  area_id TEXT,
  tipo TEXT,
  estado TEXT DEFAULT 'idea',
  prioridad TEXT DEFAULT 'media',
  destacado INTEGER DEFAULT 0,
  fecha_inicio TEXT,
  fecha_limite TEXT,
  stack_json TEXT,
  descripcion TEXT,
  cliente_id TEXT,
  campos_json TEXT,
  presupuesto REAL,
  tarifa_hora REAL,
  facturado REAL,
  creado_en TEXT
);

CREATE TABLE IF NOT EXISTS tareas (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  area_id TEXT,
  proyecto_id TEXT,
  estado TEXT DEFAULT 'por_hacer',
  prioridad TEXT DEFAULT 'media',
  destacado INTEGER DEFAULT 0,
  fecha_limite TEXT,
  notas TEXT,
  etiquetas_json TEXT,
  arrastrada INTEGER DEFAULT 0,
  mi_dia INTEGER DEFAULT 0,
  subtareas_json TEXT,
  recurrencia TEXT,
  cerrada_en TEXT,
  creado_en TEXT
);

CREATE TABLE IF NOT EXISTS notas (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  proyecto_id TEXT,
  area_id TEXT,
  plantilla_id TEXT,
  tipo TEXT,
  estado TEXT DEFAULT 'borrador',
  contenido_md TEXT,
  resumen TEXT,
  etiquetas_json TEXT,
  creado_en TEXT,
  actualizado_en TEXT
);

CREATE TABLE IF NOT EXISTS clientes (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  contacto TEXT,
  estado TEXT DEFAULT 'prospecto',
  notas TEXT
);

CREATE TABLE IF NOT EXISTS ideas (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  categoria TEXT,
  potencial TEXT DEFAULT 'medio',
  estado TEXT DEFAULT 'explorando',
  proyecto_id TEXT,
  leida INTEGER DEFAULT 0,
  notas TEXT
);

CREATE TABLE IF NOT EXISTS eventos (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  fecha TEXT NOT NULL,
  hora TEXT,
  lugar TEXT,
  tipo TEXT DEFAULT 'personal',
  etiquetas_json TEXT,
  completado INTEGER DEFAULT 0,
  recurrencia TEXT,
  notas TEXT
);

CREATE TABLE IF NOT EXISTS materias (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  semestre TEXT,
  docente TEXT,
  horario TEXT,
  bloques_json TEXT,
  unidades_json TEXT,
  creditos INTEGER DEFAULT 3,
  color TEXT
);

CREATE TABLE IF NOT EXISTS asistencias (
  materia_id TEXT NOT NULL,
  fecha TEXT NOT NULL,
  estado TEXT NOT NULL,
  PRIMARY KEY (materia_id, fecha)
);

CREATE TABLE IF NOT EXISTS fichas (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  subtitulo TEXT,
  tipo TEXT NOT NULL,
  entidad_id TEXT,
  area_id TEXT,
  estado TEXT,
  estado_color TEXT,
  propiedades_json TEXT,
  secciones_json TEXT,
  mapas_json TEXT
);

CREATE TABLE IF NOT EXISTS pomodoro_log (
  fecha TEXT PRIMARY KEY,
  sesiones INTEGER DEFAULT 0,
  minutos INTEGER DEFAULT 0
);

-- Índices de uso frecuente
CREATE INDEX IF NOT EXISTS idx_tareas_fecha ON tareas (fecha_limite);
CREATE INDEX IF NOT EXISTS idx_tareas_estado ON tareas (estado);
CREATE INDEX IF NOT EXISTS idx_tareas_proyecto ON tareas (proyecto_id);
CREATE INDEX IF NOT EXISTS idx_proyectos_estado ON proyectos (estado);
CREATE INDEX IF NOT EXISTS idx_eventos_fecha ON eventos (fecha);
CREATE INDEX IF NOT EXISTS idx_notas_etiquetas ON notas (tipo);
CREATE INDEX IF NOT EXISTS idx_asistencias_fecha ON asistencias (fecha);