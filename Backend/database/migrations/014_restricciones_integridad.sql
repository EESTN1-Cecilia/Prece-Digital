USE prece_digital;

-- Restricciones de integridad que hoy solo valida el backend. Requiere MySQL 8.0.16 o superior.
-- Falla si ya hay filas que no cumplen: corregirlas antes de aplicarla.

ALTER TABLE inventario_materiales
  ADD CONSTRAINT chk_inv_stock_actual CHECK (stock_actual >= 0),
  ADD CONSTRAINT chk_inv_stock_minimo CHECK (stock_minimo >= 0);

ALTER TABLE movimientos_inventario
  ADD CONSTRAINT chk_mov_cantidad CHECK (cantidad > 0);

ALTER TABLE solicitudes_materiales_items
  ADD CONSTRAINT chk_sol_cantidad CHECK (cantidad > 0),
  ADD CONSTRAINT chk_sol_cantidad_aprobada CHECK (cantidad_aprobada IS NULL OR cantidad_aprobada >= 0);

ALTER TABLE reservas_materiales
  ADD CONSTRAINT chk_res_periodo CHECK (fin > inicio);

ALTER TABLE reservas_materiales_items
  ADD CONSTRAINT chk_res_cantidad CHECK (cantidad > 0);

ALTER TABLE calificaciones_cuatrimestrales
  ADD CONSTRAINT chk_cc_cuatrimestre CHECK (cuatrimestre IN (1, 2));
