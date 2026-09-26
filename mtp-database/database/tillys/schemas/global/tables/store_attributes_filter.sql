
--liquibase formatted sql
--changeset nischay.p@impactanalytics.co:store_attributes_filter_tillys_new stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_new
--comment: initial changeset for store_attributes_filters_new

CREATE TABLE  "global".store_attributes_filter (
store_code varchar NOT NULL,
active bool NOT NULL,
created_at timestamptz NULL,
updated_at timestamptz NULL,
created_by int4 NULL,
updated_by int4 NULL,
store_name varchar not null,
s0_name varchar not null,
country_code varchar not null,
country varchar not null,
s1_name varchar not null,
s2_name varchar not null,
state_code varchar not null,
state varchar not null,
city_code varchar not null,
updated_city_id varchar not null,
city varchar not null,
store_type varchar not null,
zipcode varchar null,
store_open_date date not null,
store_close_date date null,
store_status varchar not null,
comp_status varchar not null,
store_selling_size float not null,
store_size float not null,

CONSTRAINT store_attributes_filter_pk PRIMARY KEY (store_code),
CONSTRAINT store_attributes_filter_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);



--changeset nischay.p@impactanalytics.co:store_attributes_filter_tillys stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts1
--comment: initial changeset for store_attributes_filter1

ALTER TABLE "global".store_attributes_filter
ADD COLUMN IF NOT EXISTS name varchar NULL,
ADD COLUMN IF NOT EXISTS age int4 NULL,
ADD COLUMN IF NOT EXISTS channel varchar NULL,
ADD COLUMN IF NOT EXISTS channel_id_name varchar NULL,
ADD COLUMN IF NOT EXISTS classification varchar NULL,
ADD COLUMN IF NOT EXISTS dc_code int4 NULL,
ADD COLUMN IF NOT EXISTS dc_name varchar NULL,
ADD COLUMN IF NOT EXISTS district varchar NULL,
ADD COLUMN IF NOT EXISTS district_id_name varchar NULL,
ADD COLUMN IF NOT EXISTS fc_code int4 NULL,
ADD COLUMN IF NOT EXISTS fc_name varchar NULL,
ADD COLUMN IF NOT EXISTS geo_region varchar NULL,
ADD COLUMN IF NOT EXISTS is_deleted bool NULL,
ADD COLUMN IF NOT EXISTS location_id_name varchar DEFAULT '0' NOT NULL,
ADD COLUMN IF NOT EXISTS location_indicator varchar NULL,
ADD COLUMN IF NOT EXISTS location_type varchar NULL,
ADD COLUMN IF NOT EXISTS open_date date NULL,
ADD COLUMN IF NOT EXISTS region varchar NULL,
ADD COLUMN IF NOT EXISTS region_id_name varchar NULL,
ADD COLUMN IF NOT EXISTS s0_id varchar NOT NULL,
ADD COLUMN IF NOT EXISTS s1_id varchar NOT NULL,
ADD COLUMN IF NOT EXISTS s2_id varchar NOT NULL,
ADD COLUMN IF NOT EXISTS special_classification varchar NULL,
ADD COLUMN IF NOT EXISTS store_description text NULL;


--changeset nischay.p@impactanalytics.co:store_attributes_filter_tillys_14_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts11_14
--comment: initial changeset for store_attributes_filter11_14
ALTER TABLE "global".store_attributes_filter
ADD COLUMN IF NOT EXISTS store_code varchar NOT NULL,
ADD COLUMN IF NOT EXISTS region varchar NOT NULL,
ADD COLUMN IF NOT EXISTS country varchar NULL,
ADD COLUMN IF NOT EXISTS district varchar NOT NULL,
ADD COLUMN IF NOT EXISTS age int4 NULL,
ADD COLUMN IF NOT EXISTS channel varchar NOT NULL,
ADD COLUMN IF NOT EXISTS classification varchar NULL,
ADD COLUMN IF NOT EXISTS close_date date NULL,
ADD COLUMN IF NOT EXISTS dc_name varchar NULL,
ADD COLUMN IF NOT EXISTS fc_name varchar NULL,
ADD COLUMN IF NOT EXISTS location_indicator varchar NULL,
ADD COLUMN IF NOT EXISTS location_type varchar NULL,
ADD COLUMN IF NOT EXISTS "name" varchar NULL,
ADD COLUMN IF NOT EXISTS open_date date NULL,
ADD COLUMN IF NOT EXISTS zipcode varchar NULL,
ADD COLUMN IF NOT EXISTS active bool  NULL,
ADD COLUMN IF NOT EXISTS special_classification varchar NULL,
ADD COLUMN IF NOT EXISTS is_deleted bool NULL,
ADD COLUMN IF NOT EXISTS state_code varchar  NULL,
ADD COLUMN IF NOT EXISTS city varchar NULL,
ADD COLUMN IF NOT EXISTS updated_city_id varchar NULL,
ADD COLUMN IF NOT EXISTS store_close_date date NULL,
ADD COLUMN IF NOT EXISTS store_status varchar NULL,
ADD COLUMN IF NOT EXISTS city_code varchar NULL,
ADD COLUMN IF NOT EXISTS comp_status varchar NULL,
ADD COLUMN IF NOT EXISTS country_code varchar NULL,
ADD COLUMN IF NOT EXISTS state varchar NULL,
ADD COLUMN IF NOT EXISTS store_open_date date NULL,
ADD COLUMN IF NOT EXISTS store_selling_size float4 NULL,
ADD COLUMN IF NOT EXISTS store_size float4 NULL,
ADD COLUMN IF NOT EXISTS store_type varchar NULL,
ADD COLUMN IF NOT EXISTS s0_id varchar NULL,
ADD COLUMN IF NOT EXISTS s1_id varchar NULL,
ADD COLUMN IF NOT EXISTS s2_id varchar NULL,
ADD COLUMN IF NOT EXISTS created_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS updated_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS created_by int4 NULL,
ADD COLUMN IF NOT EXISTS updated_by int4 NULL,
ADD COLUMN IF NOT EXISTS store_name varchar NOT NULL,
ADD COLUMN IF NOT EXISTS dc_code int4 NULL,
ADD COLUMN IF NOT EXISTS fc_code int4 NULL,
ADD COLUMN IF NOT EXISTS store_description text NULL,
ADD COLUMN IF NOT EXISTS s0_name varchar NULL,
ADD COLUMN IF NOT EXISTS channel_id_name varchar NULL,
ADD COLUMN IF NOT EXISTS region_id_name varchar NULL,
ADD COLUMN IF NOT EXISTS district_id_name varchar NULL,
ADD COLUMN IF NOT EXISTS location_id_name varchar NULL DEFAULT '0',
ADD COLUMN IF NOT EXISTS geo_region varchar NULL,
DROP COLUMN IF EXISTS s1_name,
DROP COLUMN IF EXISTS s2_name;;



--changeset nischay.p@impactanalytics.co:store_attributes_filter_tillys_14_11 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts11_14_01
--comment: initial changeset for store_attributes_filter11_14_01

ALTER TABLE "global".store_attributes_filter
    ALTER COLUMN country_code DROP NOT NULL,
    ALTER COLUMN country DROP NOT NULL,
    ALTER COLUMN state_code DROP NOT NULL,
    ALTER COLUMN state DROP NOT NULL,
    ALTER COLUMN city_code DROP NOT NULL,
    ALTER COLUMN updated_city_id DROP NOT NULL,
    ALTER COLUMN city DROP NOT NULL,
    ALTER COLUMN store_type DROP NOT NULL,
    ALTER COLUMN store_open_date DROP NOT NULL,
    ALTER COLUMN store_status DROP NOT NULL,
    ALTER COLUMN comp_status DROP NOT NULL,
    ALTER COLUMN store_selling_size DROP NOT NULL,
    ALTER COLUMN store_size DROP NOT NULL,
    ALTER COLUMN district SET NOT NULL,
    ALTER COLUMN region SET NOT NULL;


--changeset nischay.p@impactanalytics.co:store_attributes_filter_tillys_05_02 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts11_05_02
--comment: initial changeset for store_attributes_filter05_02
ALTER TABLE "global".store_attributes_filter
ADD COLUMN IF NOT EXISTS store_category varchar ,
ADD COLUMN IF NOT EXISTS mall_store varchar ;

--changeset gauri.nair@impactanalytics.co:store_attributes_filter_tillys_16_02 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts11_16_02
--comment: alter table changeset for store_attributes_filter add column store_tier
ALTER TABLE "global".store_attributes_filter
ADD COLUMN IF NOT EXISTS store_tier varchar null;

--changeset anish.a@impactanalytics.co:store_attributes_filter_tillys_25_03 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts11_16_02
--comment: alter table changeset for store_attributes_filter drop column name
ALTER TABLE "global".store_attributes_filter DROP COLUMN "name";

--changeset anish.a@impactanalytics.co:store_attributes_filter_tillys_31_03 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_31_03
--comment: alter table changeset for store_attributes_filter add column name
ALTER TABLE "global".store_attributes_filter ADD like_store_id varchar NULL;
