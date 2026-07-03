-- CreateTable
CREATE TABLE "lotes" (
    "id" TEXT NOT NULL,
    "insumo_id" TEXT NOT NULL,
    "proveedor_id" TEXT NOT NULL,
    "orden_compra_id" TEXT,
    "numero_lote" TEXT NOT NULL,
    "season" VARCHAR(60),
    "rango_tono" VARCHAR(60),
    "color" VARCHAR(60),
    "cantidad_inicial" DECIMAL(10,2) NOT NULL,
    "cantidad_actual" DECIMAL(10,2) NOT NULL,
    "ubicacion_almacen" VARCHAR(80),
    "fecha_entrada" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lotes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lotes_numero_lote_key" ON "lotes"("numero_lote");

-- AddForeignKey
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "insumos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
