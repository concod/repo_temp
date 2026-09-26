--liquibase formatted sql
--changeset ujjawal.singh@impactanalytics.co:article_instock_change stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_vdc_mapping

CREATE TABLE IF NOT EXISTS "inventory_smart".dc_vdc_mapping (
    store_code varchar not  NULL,
    dc_code varchar not  NULL,
    transit_time int4 NULL,
    created_timestamp timestamptz DEFAULT now(),
    updated_timestamp timestamptz DEFAULT now(),
    holding_transportation_cost numeric NULL,
    distance numeric NULL,
    order_cycle_time int4 NULL,
    virtual_dc varchar null 
);



--changeset ujjawal.singh@impactanalytics.co:dc_vdc_mapping_change stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_vdc_mapping_01
ALTER TABLE inventory_smart.dc_vdc_mapping
ALTER COLUMN order_cycle_time
TYPE timestamptz
USING to_timestamp(order_cycle_time)::timestamptz;
