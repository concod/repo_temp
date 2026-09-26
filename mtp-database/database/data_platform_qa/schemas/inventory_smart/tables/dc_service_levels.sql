--liquibase formatted sql
--changeset akash.bhandari@impactanalytics.co:dc_service_levels stripComments:false splitStatements:false context:VS_inv_smart labels:MTP-67597
--comment: Updated changeset for dc_transfer_constraints to add missing ID, safety_stock_wos column and initialize it

CREATE TABLE IF NOT EXISTS inventory_smart.dc_service_levels (
    hierarchy JSONB NULL,
    dc VARCHAR NULL,
    min_transfer_quantity int4 NULL,
    target_wos int4 NULL,
    min_stock int4 NULL,
    safty_stock_method VARCHAR NULL,
    safty_stock_units int4 NULL,
    service_level_percentage FLOAT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NULL,
    updated_by int4 NULL,
    created_by int4 NOT NULL
 );

--changeset akash.bhandari@impactanalytics.co:add_safety_stock_wos_column stripComments:false splitStatements:false context:VS_inv_smart labels:MTP-67597
--comment: Adding Safety Stock WOS column to dc_service_level table
ALTER TABLE inventory_smart.dc_service_levels ADD COLUMN safety_stock_wos FLOAT NULL;

--changeset akash.bhandari@impactanalytics.co:add_id_column stripComments:false splitStatements:false context:VS_inv_smart labels:MTP-67597
--comment: Add the ID column if it does not already exist
ALTER TABLE inventory_smart.dc_service_levels ADD COLUMN IF NOT EXISTS id BIGSERIAL PRIMARY KEY;

--changeset akash.bhandari@impactanalytics.co:rename_safty_to_safety_columns stripComments:false splitStatements:false context:VS_inv_smart labels:MTP-67597
--comment: Rename safty_stock_method to safety_stock_method and safty_stock_units to safety_stock_units
ALTER TABLE inventory_smart.dc_service_levels RENAME COLUMN safty_stock_method TO safety_stock_method;
ALTER TABLE inventory_smart.dc_service_levels RENAME COLUMN safty_stock_units TO safety_stock_units;

--changeset kamuju.mahaveer:dc_service_levels_v1 stripComments:false splitStatements:false context:Release_1_0 labels:VS-629
--comment: Updated schema for dc_service_levels
ALTER TABLE inventory_smart.dc_service_levels ALTER COLUMN dc TYPE int4 USING dc::int4;
ALTER TABLE inventory_smart.dc_service_levels ADD CONSTRAINT dc_service_levels_unique UNIQUE (hierarchy, dc);
ALTER TABLE inventory_smart.dc_service_levels ADD CONSTRAINT dc_service_levels_dc FOREIGN KEY (dc) REFERENCES global.distribution_centres(dc_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.dc_service_levels ALTER COLUMN created_at DROP NOT NULL;
ALTER TABLE inventory_smart.dc_service_levels ALTER COLUMN created_by DROP NOT NULL;


--changeset shashwat.yadav:dc_service_levels_v1 stripComments:false splitStatements:false context:Release_1_0 labels:VS-629
--comment: Added index for dc_service_levels
CREATE INDEX IF NOT EXISTS dc_service_level_product_code_gin_idx on inventory_smart.dc_service_levels using gin(hierarchy);