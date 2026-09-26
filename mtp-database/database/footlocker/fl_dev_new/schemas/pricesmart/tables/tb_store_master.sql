--liquibase formatted sql
--changeset liquibase:tb_store_master_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_store_master_1
CREATE TABLE pricesmart.tb_store_master (
	s0_name varchar NULL,
	s0_id int4 NULL,
	s1_name varchar NULL,
	s1_id int4 NULL,
	s2_name varchar NULL,
	s2_id int4 NULL,
	s3_name varchar NULL,
	s3_id int4 NULL,
	s4_name varchar NULL,
	s4_id int4 NULL,
	s5_name varchar NULL,
	s5_id int4 NULL,
	store_code int4 NULL,
	store_name text NULL,
	store_status varchar NULL,
	"type" varchar NULL,
	store_open_flag varchar NULL,
	active bool NULL,
	special_classification varchar NULL,
	climate_area varchar NULL,
	latitude float8 NULL,
	longitude float8 NULL,
	open_date timestamp NULL,
	close_date timestamp NULL,
	is_active int2 NULL,
	store_id int4 NOT NULL,
	ps_reco_level text GENERATED ALWAYS AS ((COALESCE(s0_id::text, ''::text) || '_'::text) || COALESCE(s1_id::text, ''::text)) STORED NULL,
	CONSTRAINT tb_store_master_pk PRIMARY KEY (store_id)
);
CREATE INDEX tb_store_master_store_code_idx ON pricesmart.tb_store_master USING btree (store_code);

--changeset siddharth.bajpai@impactanalytics.co:tb_store_master_sync_with_version stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:tb_store_master
--comment: ALTER statements to sync tb_store_master with tb_store_master_version

ALTER TABLE pricesmart.tb_store_master ADD COLUMN IF NOT EXISTS s0_cid int4 NULL;
ALTER TABLE pricesmart.tb_store_master ADD COLUMN IF NOT EXISTS country text NULL;
ALTER TABLE pricesmart.tb_store_master ADD COLUMN IF NOT EXISTS city text NULL;
ALTER TABLE pricesmart.tb_store_master ADD COLUMN IF NOT EXISTS address text NULL;
ALTER TABLE pricesmart.tb_store_master ADD COLUMN IF NOT EXISTS address_2 text NULL;
ALTER TABLE pricesmart.tb_store_master ADD COLUMN IF NOT EXISTS closed bool NULL;
ALTER TABLE pricesmart.tb_store_master ADD COLUMN IF NOT EXISTS compqualify_date date NULL;
ALTER TABLE pricesmart.tb_store_master ADD COLUMN IF NOT EXISTS county text NULL;
ALTER TABLE pricesmart.tb_store_master ADD COLUMN IF NOT EXISTS dma text NULL;
ALTER TABLE pricesmart.tb_store_master ADD COLUMN IF NOT EXISTS state text NULL;
ALTER TABLE pricesmart.tb_store_master ADD COLUMN IF NOT EXISTS store_name_heading text NULL;
ALTER TABLE pricesmart.tb_store_master ADD COLUMN IF NOT EXISTS loyalty_scheme text NULL;
ALTER TABLE pricesmart.tb_store_master ADD COLUMN IF NOT EXISTS store_model_id int4 NULL;
ALTER TABLE pricesmart.tb_store_master ADD COLUMN IF NOT EXISTS store_model_cid int4 NULL;
ALTER TABLE pricesmart.tb_store_master ADD COLUMN IF NOT EXISTS store_model text NULL;
ALTER TABLE pricesmart.tb_store_master ADD COLUMN IF NOT EXISTS store_type_id int4 NULL;
ALTER TABLE pricesmart.tb_store_master ADD COLUMN IF NOT EXISTS store_type_cid int4 NULL;
ALTER TABLE pricesmart.tb_store_master ADD COLUMN IF NOT EXISTS store_type text NULL;
ALTER TABLE pricesmart.tb_store_master ADD COLUMN IF NOT EXISTS store_reco_level text NULL;
ALTER TABLE pricesmart.tb_store_master ADD COLUMN IF NOT EXISTS hierarchy_id int4 NULL;
ALTER TABLE pricesmart.tb_store_master ALTER COLUMN store_name TYPE varchar;
ALTER TABLE pricesmart.tb_store_master ALTER COLUMN is_active TYPE int4 USING is_active::integer;

--changeset siddharth.bajpai@impactanalytics.co:drop_tb_store_master_table_pricesmart_20251216 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:tb_store_master
--comment: Drop existing tb_store_master table to replace with view

DROP TABLE IF EXISTS pricesmart.tb_store_master CASCADE;