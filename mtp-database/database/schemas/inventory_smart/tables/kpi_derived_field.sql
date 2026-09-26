--liquibase formatted sql
--changeset liquibase:kpi_derived_field stripComments:false splitStatements:false context:MTP-108633 labels:MTP-108633
--comment: MTP-108633:initial changeset for kpi_derived_field
CREATE TABLE IF NOT EXISTS inventory_smart.kpi_derived_field (
    derived_field_id SERIAL PRIMARY KEY,
    field_name VARCHAR(255) UNIQUE NOT NULL,
    formula_expression TEXT NOT NULL,
    formula_tree JSONB NULL,
    derived_from_sources VARCHAR(100)[] NOT NULL,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT now(),
    description TEXT
);
CREATE INDEX idx_kpi_derived_field_field_name ON inventory_smart.kpi_derived_field (field_name);

--changeset liquibase:kpi_derived_field_add_field_label_update stripComments:false splitStatements:false context:MTP-108633 labels:MTP-108633
--comment: MTP-108633:add field_label column to kpi_derived_field
ALTER TABLE inventory_smart.kpi_derived_field ADD COLUMN IF NOT EXISTS field_label VARCHAR(255);

--changeset liquibase:kpi_derived_field_drop_formula_tree stripComments:false splitStatements:false context:MTP-108633 labels:MTP-108633
--comment: MTP-108633:drop formula_tree column from kpi_derived_field table
ALTER TABLE inventory_smart.kpi_derived_field DROP COLUMN IF EXISTS formula_tree;


--changeset liquibase:kpi_derived_field_alter_derived_from_sources stripComments:false splitStatements:false context:MTP-109895 labels:MTP-109895
--comment: MTP-109895: alter derived_from_sources from varchar[] to varchar
ALTER TABLE inventory_smart.kpi_derived_field
ALTER COLUMN derived_from_sources
TYPE VARCHAR(255)
USING array_to_string(derived_from_sources, ',');


--changeset liquibase:renamed_created_at_and_created_by_columns_and_added_kpi_list_and_is_active_column stripComments:false splitStatements:false context:MTP-108633 labels:MTP-121372
--comment: MTP-121372:renamed created_at and created_by columns and add kpi_list and is_active column

ALTER TABLE inventory_smart.kpi_derived_field
RENAME COLUMN created_by TO updated_by;

ALTER TABLE inventory_smart.kpi_derived_field
RENAME COLUMN created_at TO updated_at;

ALTER TABLE inventory_smart.kpi_derived_field
ADD COLUMN kpi_list INTEGER[],
ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

--changeset liquibase:add_field_type_column_with_default_numeric stripComments:false splitStatements:false context:MTP-124154 labels:MTP-124154
--comment: MTP-124154:Add field_type column with default 'numeric'
ALTER TABLE inventory_smart.kpi_derived_field
ADD COLUMN IF NOT EXISTS field_type VARCHAR(50);
ALTER TABLE inventory_smart.kpi_derived_field
ALTER COLUMN field_type SET DEFAULT 'numeric';