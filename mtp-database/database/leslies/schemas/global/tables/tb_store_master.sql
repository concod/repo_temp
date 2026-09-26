--liquibase formatted sql
--changeset liquibase:tb_store_master_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_store_master_v2
DROP TABLE IF EXISTS "global".tb_store_master CASCADE;
CREATE TABLE "global".tb_store_master (
	s0_name varchar NULL,
	s0_id int4 NULL,
	s0_cid int4 NULL,
	s1_name varchar NULL,
	s1_id int4 NULL,
	s1_cid int4 NULL,
	s2_name varchar NULL,
	s2_id int4 NULL,
	s2_cid int4 NULL,
	s3_name varchar NULL,
	s3_id int4 NULL,
	s3_cid int4 NULL,
	s4_name varchar NULL,
	s4_id int4 NULL,
	s4_cid int4 NULL,
	s5_name varchar NULL,
	s5_id int4 NULL,
	s5_cid int4 NULL,
	store_code int4 NULL,
	store_name text NULL,
	"type" varchar NULL,
	store_open_flag varchar NULL,
	active bool NULL,
	latitude float8 NULL,
	longitude float8 NULL,
	open_date timestamp NULL,
	close_date timestamp NULL,
	is_active int2 NULL,
	store_id int4 NULL,
	market_name varchar NULL,
	currency_id int4 NULL,
	market_id int4 NULL
);
CREATE INDEX store_master_product_id_idx ON global.tb_store_master USING btree (store_code);

--changeset vamsi.balaga@impactanalytics.co:tb_store_master_added_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added primary key to tb_store_master
ALTER TABLE "global".tb_store_master
    ADD CONSTRAINT tb_store_master_pk PRIMARY KEY (store_id);


--changeset kumaran.k@impactanalytics.co:tb_store_master_v4 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added cols to tb_store_master
ALTER TABLE global.tb_store_master
ADD COLUMN zone_nm text NULL,
ADD COLUMN state text NULL,
ADD COLUMN city text NULL,
ADD COLUMN ps_reco_level varchar NULL;


--changeset kumaran.k@impactanalytics.co:tb_store_master_v5 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added cols to tb_store_master
ALTER TABLE global.tb_store_master
ADD COLUMN is_active_value varchar NULL;