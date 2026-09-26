--liquibase formatted sql
--changeset siddharth.bajpai@impactanalytics.co:tb_store_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_store_master

CREATE TABLE price_promo.tb_store_master (
	s0_id int4 NULL,
	s0_name varchar NULL,
	s0_cid int4 NULL,
	s1_id int4 NULL,
	s1_name varchar NULL,
	s2_id int4 NULL,
	s2_name varchar NULL,
	s3_id int4 NULL,
	s3_name varchar NULL,
	s4_id int4 NULL,
	s4_name varchar NULL,
	s5_id int4 NULL,
	s5_name varchar NULL,
	store_code int4 NULL,
	store_name varchar NULL,
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
	is_active int4 NULL,
	store_id int4 NOT NULL,
	country text NULL,
	city text NULL,
	address text NULL,
	address_2 text NULL,
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
	store_reco_level text NULL,
	version_code int4 NULL,
	hierarchy_id int4 NULL,
	CONSTRAINT tb_store_master_pk PRIMARY KEY (store_id)
);
CREATE INDEX tb_store_master_store_id_idx ON price_promo.tb_store_master USING btree (store_id);

--changeset siddharth.bajpai@impactanalytics.co:tb_store_master_20251216 stripComments:false splitStatements:false context:Release_1_0 labels:tb_store_master
--comment: drop tb_store_master
DROP TABLE IF EXISTS price_promo.tb_store_master;