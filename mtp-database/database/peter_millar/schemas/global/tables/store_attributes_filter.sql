--liquibase formatted sql
--changeset shivam.tiwari@impactanalytics.co:store_attributes_filter_sm stripComments:false splitStatements:false context:Release_1_0_1 labels:liquibase_project_start_sm
--comment: initial changeset for store_attributes_filter_sm

CREATE TABLE "global".store_attributes_filter (
    store_code varchar NOT NULL,
    store_name varchar NOT NULL,
    store_description text NULL,
    active bool NOT NULL,
    special_classification varchar NULL,
    created_at timestamptz NULL,
    updated_at timestamptz NULL,
    created_by int4 NULL,
    updated_by int4 NULL,
    dc_code int4 NULL,
    fc_code int4 NULL,
    is_deleted bool NULL,
    s0_name varchar NULL,
    s1_name varchar NULL,
    s2_name varchar NULL,
    s3_name varchar NULL,
    s4_name varchar NULL,
    s5_name varchar NULL,
    business_unit varchar NULL,
    channel varchar NULL,
    city varchar NULL,
    phone varchar NULL,
    region varchar NULL,
    state varchar NULL,
    store_address varchar NULL,
    store_category varchar NULL,
    store_open_date date NULL,
    store_type varchar NULL,
    sub_channel varchar NULL,
    unique_store varchar NULL,
    zipcode varchar NULL,
    CONSTRAINT store_attributes_filter_pk PRIMARY KEY (store_code),
    CONSTRAINT store_attributes_filter_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);
CREATE INDEX saf_active_common_idx ON "global".store_attributes_filter(channel, special_classification) WHERE active = true and is_deleted = false;
CREATE INDEX saf_common_idx ON "global".store_attributes_filter(channel, special_classification);
CREATE INDEX store_attributes_filter_s0_name_idx ON global.store_attributes_filter USING btree (s0_name);
