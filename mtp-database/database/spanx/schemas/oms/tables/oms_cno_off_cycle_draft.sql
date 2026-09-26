--liquibase formatted sql
--changeset liquibase:oms_cno_off_cycle_draft_1 stripComments:false splitStatements:false context:initial_release_1 labels:liquibase_project_start_1
--comment: initial changeset for oms_cno_off_cycle_draft_1

CREATE SEQUENCE IF NOT EXISTS inventory_smart.oms_cno_off_cycle_draft_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START 1
    CACHE 1
    NO CYCLE;

CREATE SEQUENCE IF NOT EXISTS inventory_smart.oms_cno_off_cycle_draft_draft_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START 1
    CACHE 1
    NO CYCLE;

CREATE TABLE IF NOT EXISTS inventory_smart.oms_cno_off_cycle_draft (
    id int4 DEFAULT nextval('inventory_smart.oms_cno_off_cycle_draft_id_seq'::regclass) NOT NULL,
    draft_id int4 DEFAULT nextval('inventory_smart.oms_cno_off_cycle_draft_draft_id_seq'::regclass) NOT NULL,
    draft_name varchar NULL,
    article varchar NULL,
    loc_code varchar NULL,
    channel varchar NULL,
    vendor_code varchar NULL,
    vendor_name varchar NULL,
    last_order_placement_date date NULL,
    last_order_quantity int4 NULL,
    demand_period_selection varchar NULL,
    demand_start_date date NULL,
    demand_end_date date NULL,
    demand_twos int4 NULL,
    buffer_stock_addition_method varchar NULL,
    service_level_pct float4 NULL,
    safety_stock_units int4 NULL,
    safety_stock_wos int4 NULL,
    sell_through_pct float4 NULL,
    min_order_quantity_sku int4 NULL,
    min_order_quantity_style_color int4 NULL,
    min_order_quantity_style int4 NULL,
    order_generation_date date NULL,
    delivery_date date NULL,
    lead_time int4 NULL,
    shipment_mode varchar NULL,
    created_by int4 NULL,
    created_at timestamptz NULL,
    updated_by int4 NULL,
    updated_at timestamptz NULL,
    CONSTRAINT oms_cno_off_cycle_draft_pkey PRIMARY KEY (id)
);

--changeset raja.duraisamy@impactanalytics.co:oms_cno_off_cycle_draft_update1 stripComments:false splitStatements:false context:Release_1_1 labels:MTP-93604
--comment: Add is_deleted column to oms_cno_off_cycle_draft table update1
ALTER TABLE inventory_smart.oms_cno_off_cycle_draft ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;

--changeset mssprakash.yashwanth@impactanalytics.co:oms_cno_off_cycle_draft_update2 stripComments:false splitStatements:false context:Release_1_1 labels:MTP-93604
--comment: Add product_code, product_description, brand, category, class, subclass columns to oms_cno_off_cycle_draft table update2
ALTER TABLE inventory_smart.oms_cno_off_cycle_draft ADD COLUMN IF NOT EXISTS product_code varchar NULL;
ALTER TABLE inventory_smart.oms_cno_off_cycle_draft ADD COLUMN IF NOT EXISTS product_description varchar NULL;
ALTER TABLE inventory_smart.oms_cno_off_cycle_draft ADD COLUMN IF NOT EXISTS brand varchar NULL;
ALTER TABLE inventory_smart.oms_cno_off_cycle_draft ADD COLUMN IF NOT EXISTS category varchar NULL;
ALTER TABLE inventory_smart.oms_cno_off_cycle_draft ADD COLUMN IF NOT EXISTS class varchar NULL;
ALTER TABLE inventory_smart.oms_cno_off_cycle_draft ADD COLUMN IF NOT EXISTS subclass varchar NULL;

--changeset mssprakash.yashwanth@impactanalytics.co:oms_cno_off_cycle_draft_update3 stripComments:false splitStatements:false context:Release_1_1 labels:MTP-93604
--comment: Drop product_code column from oms_cno_off_cycle_draft table update3
ALTER TABLE inventory_smart.oms_cno_off_cycle_draft DROP COLUMN IF EXISTS product_code;