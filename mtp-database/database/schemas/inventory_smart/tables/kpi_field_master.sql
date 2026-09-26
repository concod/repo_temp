--liquibase formatted sql
--changeset liquibase:kpi_field_master stripComments:false splitStatements:false context:MTP-108633 labels:MTP-108633
--comment: MTP-108633:initial changeset for kpi_field_master
CREATE TABLE IF NOT EXISTS inventory_smart.kpi_field_master (
    field_id SERIAL PRIMARY KEY,
    data_source VARCHAR(50),
    field_name VARCHAR(255),
    field_type VARCHAR(50),
    description TEXT
);

--changeset liquibase:kpi_field_master_v2 stripComments:false splitStatements:false context:MTP-116544 labels:MTP-116544
--comment: MTP-116544:add field_label and unique constraint to kpi_field_master
ALTER TABLE inventory_smart.kpi_field_master
ADD COLUMN IF NOT EXISTS field_label VARCHAR(255);

ALTER TABLE inventory_smart.kpi_field_master
ADD CONSTRAINT uniq_field_name_per_source UNIQUE (data_source, field_name);

--changeset liquibase:added_the_is_display_field_to_control_whether_a_field_should_be_shown_or_not stripComments:false splitStatements:false context:MTP-124240 labels:MTP-124240
--comment: MTP-124240:Added the is_display field to control whether a field should be shown or not
ALTER TABLE inventory_smart.kpi_field_master
ADD COLUMN IF NOT EXISTS is_display BOOLEAN NOT NULL DEFAULT TRUE;