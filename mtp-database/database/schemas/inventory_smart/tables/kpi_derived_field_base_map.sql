--liquibase formatted sql
--changeset liquibase:kpi_derived_field_base_map stripComments:false splitStatements:false context:MTP-108633 labels:MTP-108633
--comment: MTP-108633:initial changeset for kpi_derived_field_base_map
CREATE TABLE IF NOT EXISTS inventory_smart.kpi_derived_field_base_map (
    id SERIAL PRIMARY KEY,
    derived_field_id INT NOT NULL REFERENCES inventory_smart.kpi_derived_field(derived_field_id) ON DELETE CASCADE,
    base_field_id INT NOT NULL REFERENCES inventory_smart.kpi_field_master(field_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT now(),
    UNIQUE (derived_field_id, base_field_id)
);
