-- CreateTable
CREATE TABLE "insumos" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "unidad_medida" VARCHAR(30) NOT NULL,
    "stock_minimo" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "stock_actual" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "dias_duracion" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insumos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "insumos_code_key" ON "insumos"("code");
