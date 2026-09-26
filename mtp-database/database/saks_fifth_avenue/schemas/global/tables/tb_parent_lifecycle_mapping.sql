--liquibase formatted sql
--changeset liquibase:tb_parent_lifecycle_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_parent_lifecycle_mapping
CREATE TABLE "global"."tb_parent_lifecycle_mapping" (
    l5_id int8 NULL,
    product_id int4 NULL,
    lifecycle_indicator_id int4 NULL,
    lifecycle_indicator text NULL
)
;


--changeset liquibase:tb_parent_lifecycle_mapping_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_parent_lifecycle_mapping
ALTER TABLE global.tb_parent_lifecycle_mapping ALTER COLUMN l5_id TYPE text USING l5_id::text;