/*
  Warnings:

  - The primary key for the `insumos` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `lotes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `modules` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `movimientos_inventario` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `purchase_order_details` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `purchase_orders` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `role_permissions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `roles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `suppliers` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `user_permission_overrides` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "lotes" DROP CONSTRAINT "lotes_insumo_id_fkey";

-- DropForeignKey
ALTER TABLE "lotes" DROP CONSTRAINT "lotes_proveedor_id_fkey";

-- DropForeignKey
ALTER TABLE "modules" DROP CONSTRAINT "modules_parent_id_fkey";

-- DropForeignKey
ALTER TABLE "movimientos_inventario" DROP CONSTRAINT "movimientos_inventario_lote_id_fkey";

-- DropForeignKey
ALTER TABLE "purchase_order_details" DROP CONSTRAINT "purchase_order_details_purchase_order_id_fkey";

-- DropForeignKey
ALTER TABLE "purchase_order_details" DROP CONSTRAINT "purchase_order_details_supply_id_fkey";

-- DropForeignKey
ALTER TABLE "purchase_orders" DROP CONSTRAINT "purchase_orders_supplier_id_fkey";

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_module_id_fkey";

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_role_id_fkey";

-- DropForeignKey
ALTER TABLE "user_permission_overrides" DROP CONSTRAINT "user_permission_overrides_module_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_role_id_fkey";

-- AlterTable
ALTER TABLE "insumos" DROP CONSTRAINT "insumos_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "insumos_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "lotes" DROP CONSTRAINT "lotes_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "insumo_id" SET DATA TYPE TEXT,
ALTER COLUMN "proveedor_id" SET DATA TYPE TEXT,
ALTER COLUMN "orden_compra_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "lotes_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "modules" DROP CONSTRAINT "modules_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "parent_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "modules_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "movimientos_inventario" DROP CONSTRAINT "movimientos_inventario_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "lote_id" SET DATA TYPE TEXT,
ALTER COLUMN "referencia_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "movimientos_inventario_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "purchase_order_details" DROP CONSTRAINT "purchase_order_details_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "purchase_order_id" SET DATA TYPE TEXT,
ALTER COLUMN "supply_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "purchase_order_details_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "purchase_orders" DROP CONSTRAINT "purchase_orders_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "supplier_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "role_id" SET DATA TYPE TEXT,
ALTER COLUMN "module_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "roles" DROP CONSTRAINT "roles_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "suppliers" DROP CONSTRAINT "suppliers_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "user_permission_overrides" DROP CONSTRAINT "user_permission_overrides_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "module_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "user_permission_overrides_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "role_id" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "insumos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_details" ADD CONSTRAINT "purchase_order_details_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_details" ADD CONSTRAINT "purchase_order_details_supply_id_fkey" FOREIGN KEY ("supply_id") REFERENCES "insumos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
