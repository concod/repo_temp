--liquibase formatted sql
--changeset liquibase:kpi_module_mapping stripComments:false splitStatements:false context:MTP-108633 labels:MTP-108633
--comment: MTP-108633:initial changeset for kpi_module_mapping
CREATE TABLE IF NOT EXISTS inventory_smart.kpi_module_mapping (
    id SERIAL PRIMARY KEY,
    kpi_id INT NOT NULL REFERENCES inventory_smart.kpi_config(kpi_id) ON DELETE CASCADE,
    module_component_id INT NOT NULL REFERENCES inventory_smart.module_component_mapping(mapping_id) ON DELETE CASCADE,
    aggregate_function VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_kpi_module_mapping_kpi_id_module_component_id ON inventory_smart.kpi_module_mapping (kpi_id, module_component_id);

--changeset adesh:kpi_module_mapping_add_location_type stripComments:false splitStatements:false context:MTP-122243 labels:MTP-122243
--comment: MTP-122243: Add location_type column to support STORE, WHS, ALL filtering
ALTER TABLE inventory_smart.kpi_module_mapping 
ADD COLUMN IF NOT EXISTS location_type VARCHAR(20) DEFAULT 'STORE';

--changeset adesh:kpi_module_mapping_change_cascade_to_restrict stripComments:false splitStatements:false context:MTP-122243 labels:MTP-122243
--comment: MTP-122243: Change ON DELETE CASCADE to RESTRICT to prevent accidental data loss
-- Drop existing foreign keys with CASCADE
ALTER TABLE inventory_smart.kpi_module_mapping 
DROP CONSTRAINT IF EXISTS kpi_module_mapping_kpi_id_fkey;

ALTER TABLE inventory_smart.kpi_module_mapping 
DROP CONSTRAINT IF EXISTS kpi_module_mapping_module_component_id_fkey;

-- Re-add foreign keys with RESTRICT to prevent cascade deletes
ALTER TABLE inventory_smart.kpi_module_mapping 
ADD CONSTRAINT kpi_module_mapping_kpi_id_fkey 
FOREIGN KEY (kpi_id) REFERENCES inventory_smart.kpi_config(kpi_id) ON DELETE RESTRICT;

ALTER TABLE inventory_smart.kpi_module_mapping 
ADD CONSTRAINT kpi_module_mapping_module_component_id_fkey 
FOREIGN KEY (module_component_id) REFERENCES inventory_smart.module_component_mapping(mapping_id) ON DELETE RESTRICT;
