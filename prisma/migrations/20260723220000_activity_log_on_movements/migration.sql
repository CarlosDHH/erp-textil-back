-- Bitácora de actividad sobre `movimientos_inventario`.
--
-- Objetivo: poder registrar eventos de tipo `update` (modificación de un
-- insumo, un lote o un usuario) en la misma tabla que ya alimenta la pestaña
-- "Actividad Reciente" del perfil.
--
-- Una modificación de insumo o de usuario no ocurre sobre ningún lote y no
-- mueve cantidad alguna, así que las dos columnas obligatorias que lo impedían
-- pasan a ser opcionales. Todos los cambios son ADITIVOS: no se borra ni se
-- reescribe ninguna fila existente, y los movimientos de stock ya guardados
-- conservan su lote y su cantidad.

ALTER TABLE "movimientos_inventario"
  ALTER COLUMN "lote_id" DROP NOT NULL,
  ALTER COLUMN "quantity" DROP NOT NULL;

ALTER TABLE "movimientos_inventario"
  ADD COLUMN IF NOT EXISTS "entidad" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "entidad_id" TEXT,
  ADD COLUMN IF NOT EXISTS "entidad_nombre" TEXT;

-- El feed del perfil filtra por usuario y ordena por fecha descendente.
CREATE INDEX IF NOT EXISTS "movimientos_inventario_usuario_id_fecha_idx"
  ON "movimientos_inventario" ("usuario_id", "fecha" DESC);

-- Las consultas de auditoría buscan "qué le pasó a este registro".
CREATE INDEX IF NOT EXISTS "movimientos_inventario_entidad_idx"
  ON "movimientos_inventario" ("entidad", "entidad_id");
