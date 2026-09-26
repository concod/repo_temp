--liquibase formatted sql
--changeset praharsh.snehi@impactanalytics.co:store_attributes_filter_bealls_initial stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for saf, skip check
CREATE TABLE IF NOT EXISTS "global".store_attributes_filter (
    store_description varchar NULL,
    close_date date NULL,
    s0_id varchar NOT NULL,
    s0_name varchar NOT NULL,
    channel varchar NULL,
    store_name varchar NULL,
    created_at timestamptz NULL,
    updated_at timestamptz NULL,
    created_by int4 NULL,
    updated_by int4 NULL,
    is_deleted bool NULL,
    channel_desc varchar NULL,
    zipcode varchar NULL,
    store_type varchar NULL,
    open_date date NULL,
    active bool NOT NULL,
    special_classification varchar NULL,
    dc_name varchar NULL,
    region_name varchar NULL,
    dc_flag varchar NULL,
    store_name_display varchar NULL,
    store_code varchar NOT NULL,
    s1_name varchar NULL,
    s2_name varchar NULL,
    s3_name varchar NULL,
    s4_name varchar NULL,
    s1_id varchar NOT NULL,
    s2_id varchar NOT NULL,
    s3_id varchar NOT NULL,
    s4_id varchar NOT NULL,
    channel_group varchar NULL,
    store_size float8 NULL,
    latitude float8 NULL,
    longitude float8 NULL,
    climate varchar NULL,
    comp_date varchar NULL,
    comp_status varchar NULL,
    like_store_id varchar NULL,
    store_selling_area float8 NULL,
    total_store_area float8 NULL,
    traffic float8 NULL,
    dc_code int4 NULL,
    fc_code int4 NULL,
    CONSTRAINT store_attributes_filter_pk PRIMARY KEY (store_code)
);
CREATE INDEX IF NOT EXISTS store_attributes_filter_s0_name_idx ON global.store_attributes_filter USING btree (s0_name);
CREATE INDEX IF NOT EXISTS store_attributes_filter_store_code_idx ON global.store_attributes_filter USING btree (store_code);
ALTER TABLE "global".store_attributes_filter DROP CONSTRAINT IF EXISTS store_attributes_filter_fk;
ALTER TABLE "global".store_attributes_filter ADD CONSTRAINT store_attributes_filter_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;

--changeset vikash.kumar@impactanalytics.co:store_attributes_filter_Bealls_sync_02 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: change in dc flag data type
ALTER TABLE "global".store_attributes_filter ALTER COLUMN dc_flag TYPE bool USING dc_flag::boolean;


--changeset ujjawal.singh@impactanalytics.co:store_attributes_filter_bealls_sync_03 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: rename of region and  adding country column 

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'global' 
        AND table_name = 'store_attributes_filter' 
        AND column_name = 'region_name'
    ) THEN
        ALTER TABLE "global".store_attributes_filter
        RENAME COLUMN region_name TO region;
    END IF;
END $$;

ALTER TABLE "global".store_attributes_filter
ADD COLUMN if not exists country varchar NULL;

--changeset ujjawal.singh@impactanalytics.co:store_attributes_filter_bealls_sync_04 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment:    adding  column 
ALTER TABLE "global".store_attributes_filter
ADD COLUMN if not exists channel_plan   varchar NULL,
ADD COLUMN if not exists s10_name   varchar NULL;


--changeset ujjawal.singh@impactanalytics.co:store_attributes_filter_bealls_sync_05 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment:  altering column type to varchar 
ALTER TABLE "global".store_attributes_filter
ALTER COLUMN  store_selling_area type varchar ;

--changeset ujjawal.singh@impactanalytics.co:store_attributes_filter_bealls_sync_06 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment:  adding column s11_name
ALTER TABLE "global".store_attributes_filter
ADD COLUMN if not exists s11_name   varchar NULL; 

