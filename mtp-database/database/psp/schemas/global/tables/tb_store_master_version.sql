--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:tb_store_master_version_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_store_master_version

DROP TABLE IF EXISTS "global".tb_store_master_version CASCADE;
CREATE TABLE IF NOT EXISTS "global".tb_store_master_version (
    country text NULL,
	city text NULL,
	store_id int4 NOT NULL,
	store_name text NULL,
	address text NULL,
	address_2 text NULL,
	open_date date NULL,
	closed bool NULL,
	compqualify_date date NULL,
	county text NULL,
	dma text NULL,
	state text NULL,
	store_name_heading text NULL,
	loyalty_scheme text NULL,
	store_model_id int4 NULL,
	store_model_cid int4 NULL,
	store_model text NULL,
	store_type_id int4 NULL,
	store_type_cid int4 NULL,
	store_type text NULL,
	s0_id int4 NULL,
	s0_cid int4 NULL,
	s0_name text NULL,
	active bool NULL,
	store_reco_level text NULL,
	version_code int4 NOT NULL,
	is_active int4 NULL,
	hierarchy_id int4 NULL,
	CONSTRAINT pk_store_master_version PRIMARY KEY (version_code, store_id)
)
PARTITION BY LIST (version_code);
CREATE INDEX store_master_v_idx ON global.tb_store_master_version USING btree (store_id);