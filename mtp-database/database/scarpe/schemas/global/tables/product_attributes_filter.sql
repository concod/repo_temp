--liquibase formatted sql
--changeset liquibase:product_attributes_filter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter

CREATE TABLE "global".product_attributes_filter (


    product_code varchar NOT NULL,

    product_name varchar NOT NULL,

    product_description text NULL,

    price float8 NULL,

    "cost" float8 NULL,

    original_price float8 NULL,

    active bool NOT NULL,

    clearance bool NOT NULL,

    receipt_date date NULL,

    created_at timestamptz NULL,

    updated_at timestamptz NULL,

    created_by int4 NULL,

    updated_by int4 NULL,

    replacement_product_codes _varchar NULL,

    reference_product_codes _varchar NULL,

    is_deleted bool NULL,



    l0_name varchar NOT NULL,
 
    l1_id varchar NOT NULL,

    l2_id varchar NOT NULL,

    l3_id varchar NOT NULL,

    l4_id varchar NOT NULL,

    l5_id varchar NOT NULL,

    l6_id varchar NULL,

    l7_id varchar NULL,

    l1_name varchar NOT NULL,

    l2_name varchar NOT NULL,

    l3_name varchar NOT NULL,

    l4_name varchar NOT NULL,

    l5_name varchar NOT NULL,

    l6_name varchar NULL,

    style_id_desc varchar NOT NULL,

    color_family_desc varchar NULL,

    launch_price float8 NULL,

    msrp float8 NOT NULL,

    launch_date date NULL,

    fashion_grade varchar NULL,

    ean varchar NULL,

    carryover int4 NULL,

    price_status varchar NULL,

    exit_date date NULL,

    brand varchar NULL,

    product_lifecycle varchar NULL,

    launch_season_flag bool NULL,

    created_timestamp timestamptz NULL,

    updated_timestamp timestamptz NULL,

    syncstartdatetime timestamptz NULL,


    --color varchar NULL,

    material varchar NULL,

    collection varchar NULL,

    --productbrand varchar  NULL,

    season_code varchar  NULL,

    season_code_desc varchar  NULL,

    vendor_id varchar NULL,

    vendor_desc varchar NULL,





CONSTRAINT product_attributes_filter_pk 
PRIMARY KEY (product_code, l0_name)

)


PARTITION BY LIST (l0_name);


CREATE INDEX product_attributes_filter_l0_name_idx ON global.product_attributes_filter USING btree (l0_name);


CREATE INDEX product_attributes_filter_product_code_idx ON global.product_attributes_filter USING btree (product_code);


ALTER TABLE "global".product_attributes_filter ADD CONSTRAINT product_attributes_filter_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;

