--liquibase formatted sql
--changeset prince.kumar:store_attributes_filter_1 stripComments:false splitStatements:false context:Release_1_0 labels:DAT-1517
--comment: initial changeset for store_attributes_filter


CREATE TABLE IF NOT EXISTS "global".store_attributes_filter (
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
    country_id varchar NULL,
    state varchar NULL,
    district varchar NULL,
    city varchar NULL,
    account_store_number varchar NULL,
    affiliate_id varchar NULL,
    affiliate_name varchar NULL,
    businessmodel varchar NULL,
    channel varchar NULL,
    channel_description varchar NULL,
    channel_id varchar NULL,
    climate varchar NULL,
    close_date date NULL,
    dc_flag bool NOT NULL,
    dc_name varchar NULL,
    fc_flag bool NULL,
    markdown_store varchar NULL,
    open_date date NULL,
    planning_group_id varchar NULL,
    planning_group_name varchar NULL,
    region varchar NULL,
    ship_to varchar NULL,
    sls_floor_capacity float8 NULL,
    sold_to varchar NULL,
    square_footage float8 NULL,
    store_cluster_m varchar NULL,
    store_cluster_w varchar NULL,
    store_grade_m varchar NULL,
    store_grade_w varchar NULL,
    store_status varchar NULL,
    store_tier varchar NULL,
    store_type varchar NULL,
    subchannel varchar NULL,
    territory varchar NULL,
    tourist_local_attribute varchar NULL,
    zipcode varchar NULL,
    CONSTRAINT store_attributes_filter_pk PRIMARY KEY (store_code),
    CONSTRAINT store_attributes_filter_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);

--changeset prince.kumar:store_attributes_filter_2 stripComments:false splitStatements:false context:Release_1_0 labels:DAT-1517
--comment: initial changeset for store_attributes_filter

ALTER TABLE global.store_attributes_filter ADD COLUMN workstream text NULL;

--changeset himansh.bhardwaj:adding like_store_id column stripComments:false splitStatements:false context:Release_1_0 labels:DAT-1517
--comment: adding like_store_id column
ALTER TABLE global.store_attributes_filter ADD COLUMN IF NOT EXISTS like_store_id varchar NULL;

--changeset himansh.bhardwaj:adding_DD_column stripComments:false splitStatements:false context:Release_1_0 labels:DAT-1517
--comment: adding_DD_column
ALTER TABLE global.store_attributes_filter ADD COLUMN IF NOT EXISTS delivery_date date NULL;

--changeset prince.kumar@impactanalytics.co:adding_DD_column stripComments:false splitStatements:false context:Release_1_0 labels:DAT-1517
--comment: adding franchise_name column
ALTER TABLE global.store_attributes_filter ADD COLUMN IF NOT EXISTS franchise_name varchar NULL;

--changeset prince.kumar@impactanalytics.co:adding_sold_to_name_column stripComments:false splitStatements:false context:Release_1_0 labels:DAT-1517
--comment: adding sold_to_name column
ALTER TABLE global.store_attributes_filter ADD COLUMN IF NOT EXISTS sold_to_name varchar NULL;