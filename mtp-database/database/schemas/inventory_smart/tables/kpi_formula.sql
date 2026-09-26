--liquibase formatted sql
--changeset liquibase:kpi_formula stripComments:false splitStatements:false context:MTP-108633 labels:MTP-108633
--comment: MTP-108633:initial changeset for kpi_formula
CREATE TABLE IF NOT EXISTS inventory_smart.kpi_formula (
  formula_id SERIAL PRIMARY KEY,
  kpi_id INT REFERENCES inventory_smart.kpi_config(kpi_id) ON DELETE CASCADE,
  formula_display TEXT,
  formula_tree JSONB,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_kpi_formula_kpi_id ON inventory_smart.kpi_formula (kpi_id);

--changeset liquibase:kpi_formula_drop_formula_tree stripComments:false splitStatements:false context:MTP-108633 labels:MTP-108633
--comment: MTP-108633:drop formula_tree column from kpi_formula table
ALTER TABLE inventory_smart.kpi_formula DROP COLUMN IF EXISTS formula_tree;

--changeset liquibase:kpi_formula_add_generated_sql stripComments:false splitStatements:false context:MTP-108633 labels:MTP-108633
--comment: MTP-108633:add generated_sql column to kpi_formula table
ALTER TABLE inventory_smart.kpi_formula ADD COLUMN IF NOT EXISTS generated_sql TEXT;

--changeset adesh:kpi_formula_add_granularity stripComments:false splitStatements:false context:MTP-122243 labels:MTP-122243
--comment: MTP-122243: Add granularity column with default value
ALTER TABLE inventory_smart.kpi_formula 
ADD COLUMN IF NOT EXISTS granularity VARCHAR(50) DEFAULT 'product_store';