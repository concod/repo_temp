    --liquibase formatted sql
    --changeset rohankumar.sinha:marksmart_store_master_version stripComments:false splitStatements:false context:marksmart_store_master_version
    --comment: initial changeset for marksmart_store_master_version



CREATE TABLE price_markdown.marksmart_store_master_version (
    version_code int4 NOT NULL,
    s0_name text NULL,
    s0_id int4 NULL,
    s1_name text NULL,
    s1_id int4 NULL,
    s2_name text NULL,
    s2_id int4 NULL,
    s3_name text NULL,
    s3_id int4 NULL,
    s4_name text NULL,
    s4_id int4 NULL,
    s5_name text NULL,
    s5_id int4 NULL,
    store_code int4 NULL,
    store_name text NULL,
    store_status text NULL,
    store_type text NULL,
    store_open_flag bool NULL,
    active bool NULL,
    special_classification text NULL,
    climate_area text NULL,
    latitude float4 NULL,
    longitude float4 NULL,
    open_date date NULL,
    close_date date NULL,
    is_active int4 NOT NULL,
    store_id int4 NOT NULL,
    store_type_id int4 NULL,
    store_grade _text NULL,
    store_grade_id _int4 NULL,
    currency_id int4 NULL,
    CONSTRAINT marksmart_store_master_pk PRIMARY KEY (version_code, store_id)
)
PARTITION BY LIST (version_code);
CREATE INDEX marksmart_store_master_l0_id_idx ON price_markdown.marksmart_store_master_version USING btree (version_code, store_id);