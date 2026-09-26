--liquibase formatted sql
--changeset shaik.azmathulla@impactanalytics.co:product_attributes_filter_v3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: modified the schema as per core_v2.
CREATE TABLE IF NOT EXISTS global.product_attributes_filter
(
    product_code character varying  NOT NULL,
    product_name character varying  NOT NULL,
    product_description text ,
    price double precision,
    cost double precision,
    original_price double precision,
    active boolean NOT NULL,
    clearance boolean NOT NULL,
    receipt_date date,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    created_by integer,
    updated_by integer,
    replacement_product_codes character varying[] ,
    reference_product_codes character varying[] ,
    is_deleted boolean,
    l0_id character varying  NOT NULL,
    l1_id character varying  NOT NULL,
    l1_name character varying  NOT NULL,
    l2_id character varying  NOT NULL,
    l2_name character varying  NOT NULL,
    l3_id character varying  NOT NULL,
    l3_name character varying  NOT NULL,
    l4_id character varying  NOT NULL,
    l4_name character varying  NOT NULL,
    nrf_color character varying ,
    color_family_desc character varying ,
    size character varying ,
    size_seq character varying ,
    raw_material_id character varying ,
    primary_vendor_id character varying ,
    primary_vendor_name character varying ,
    unit_retail_price double precision,
    current_msrp double precision,
    unit_cost double precision,
    unit_retail_price_wholesale double precision,
    current_msrp_wholesale double precision,
    unit_price_wholesale double precision,
    launch_date_dtg date,
    launch_date_wholesale date,
    delivery character varying ,
    season_code character varying ,
    season_code_desc character varying ,
    price_status character varying ,
    exit_date_dtg date,
    exit_date_outlet date,
    channel_exclusive_flags character varying ,
    collaboration character varying ,
    collar character varying ,
    collection character varying ,
    end_use character varying ,
    layer character varying ,
    length character varying ,
    fabric character varying ,
    silhouette character varying ,
    sleeve character varying ,
    stitch_gauge character varying ,
    type_fashion_grade character varying ,
    program character varying ,
    launch_date_outlet date,
    exit_date_wholesale date,
    property character varying ,
    product_print character varying ,
    unit_price_wholesale_offprice double precision,
    unit_cost_wholesale double precision,
    pattern character varying ,
    style_name character varying  NOT NULL,
    color_name character varying  NOT NULL,
    product_bucket_code bigint NOT NULL,
    style_id character varying  NOT NULL,
    color_id character varying  NOT NULL,
    dimension character varying ,
    l0_name character varying  NOT NULL,
    product_concept character varying ,
    CONSTRAINT product_attributes_filter_pk PRIMARY KEY (product_code, l0_name),
    CONSTRAINT product_attributes_filter_fk FOREIGN KEY (product_code)
        REFERENCES global.product_master (product_code) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
) PARTITION BY LIST (l0_name);

CREATE INDEX IF NOT EXISTS product_attributes_filter_l0_name_idx ON global.product_attributes_filter USING btree (l0_name);

CREATE INDEX IF NOT EXISTS product_attributes_filter_product_code_idx ON global.product_attributes_filter USING btree (product_code);

--changeset pritesh.jain@impactanalytics.co:product_attributes_filter_change1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS article character varying;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS style_color_desc character varying;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS delivery_assort character varying[];
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS delivery_ada character varying[];
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS price_bucket character varying;