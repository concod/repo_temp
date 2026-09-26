--liquibase formatted sql
--changeset himansh.bhardwaj:dc_pack_configuration stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_pack_configuration

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'inventory_smart'
          AND table_name = 'dc_pack_configuration'
    ) THEN
        CREATE TABLE inventory_smart.dc_pack_configuration (
            article varchar NULL,
            pack_type_id varchar NULL,
            pack_type varchar NULL,
            product_code varchar NULL,
            "size" varchar NULL,
            units_in_pack int4 NULL,
            pack_description varchar NULL
        );
    END IF;
END $$;