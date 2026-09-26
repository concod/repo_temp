--liquibase formatted sql
--changeset liquibase:dc_pack_configuration stripComments:false splitStatements:false context:MTP-64270_1 labels:MTP-64270_1
--comment: initial changeset for dc_pack_configuration
CREATE TABLE if not exists inventory_smart.dc_pack_configuration (
    article varchar NOT NULL,
    pack_type_id varchar NOT NULL,
    pack_type varchar NOT NULL,
    product_code varchar NOT NULL,
    "size" varchar NOT NULL,
    units_in_pack int4 NOT NULL,
    pack_description varchar NULL,
    pack_size varchar NULL,
    parent_article varchar NOT NULL,
    CONSTRAINT dc_pack_configuration_unique UNIQUE (product_code, pack_type_id)
);

--changeset abhishek.sagar@impactanalytics.co:dc_pack_config_add_cols stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts
--comment:  addition of ordering col changeset for dc_pack_config
ALTER TABLE inventory_smart.dc_pack_configuration
ADD COLUMN IF NOT EXISTS pack_size varchar null,
ADD COLUMN IF NOT EXISTS parent_article varchar NOT null;