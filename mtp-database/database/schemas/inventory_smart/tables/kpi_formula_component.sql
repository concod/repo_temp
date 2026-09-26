--liquibase formatted sql
--changeset liquibase:kpi_formula_component stripComments:false splitStatements:false context:MTP-108633 labels:MTP-108633
--comment: MTP-108633:initial changeset for kpi_formula_component
CREATE TABLE IF NOT EXISTS inventory_smart.kpi_formula_component (
  component_id SERIAL PRIMARY KEY,
  formula_id INT REFERENCES inventory_smart.kpi_formula(formula_id) ON DELETE CASCADE,
  ord INT NOT NULL,
  component_type VARCHAR(30) CHECK(component_type IN ('field','function','literal','operator','subexpr')),
  field_name VARCHAR(255),
  function_name VARCHAR(100),
  function_params JSONB,
  literal_value TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

--changeset liquibase:kpi_formula_component_v2 stripComments:false splitStatements:false context:MTP-108633 labels:MTP-108633
--comment: MTP-108633:add data_source and table_name columns to kpi_formula_component
ALTER TABLE IF EXISTS inventory_smart.kpi_formula_component
ADD COLUMN IF NOT EXISTS data_source VARCHAR(50) CHECK (data_source IN ('transaction', 'inventory', 'forecast')),
ADD COLUMN IF NOT EXISTS table_name VARCHAR(255);

--changeset liquibase:kpi_formula_component_v3 stripComments:false splitStatements:false context:MTP-108633 labels:MTP-108633
--comment: MTP-108633:add field_id and derived_field_id columns with foreign key constraints to kpi_formula_component
ALTER TABLE IF EXISTS inventory_smart.kpi_formula_component
ADD COLUMN IF NOT EXISTS field_id INTEGER NULL,
ADD COLUMN IF NOT EXISTS derived_field_id INTEGER NULL;

ALTER TABLE IF EXISTS inventory_smart.kpi_formula_component
ADD CONSTRAINT fk_kpi_formula_component_field_id 
  FOREIGN KEY (field_id) REFERENCES inventory_smart.kpi_field_master(field_id) ON DELETE SET NULL,
ADD CONSTRAINT fk_kpi_formula_component_derived_field_id 
  FOREIGN KEY (derived_field_id) REFERENCES inventory_smart.kpi_derived_field(derived_field_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_kpi_formula_component_formula_id ON inventory_smart.kpi_formula_component (formula_id);
CREATE INDEX IF NOT EXISTS idx_kpi_formula_component_field_id ON inventory_smart.kpi_formula_component (field_id);
CREATE INDEX IF NOT EXISTS idx_kpi_formula_component_derived_field_id ON inventory_smart.kpi_formula_component (derived_field_id);

--changeset liquibase:kpi_formula_component_v4 stripComments:false splitStatements:false context:MTP-108633 labels:MTP-108633
--comment: MTP-108633:We are removing the check constraints since these validations are now handled on the frontend.
ALTER TABLE inventory_smart.kpi_formula_component
DROP CONSTRAINT kpi_formula_component_component_type_check;
