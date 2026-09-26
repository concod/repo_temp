
--liquibase formatted sql
--changeset liquibase:tb_store_hierarchy_combination stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_store_hierarchy_combination
CREATE TABLE price_promo.tb_store_hierarchy_combination (
	hierarchy_id serial4 NOT NULL,
	s0_id int4 NULL,
	s0_name text NULL,
	s1_id int4 NULL,
	s1_name text NULL,
	s2_id int4 NULL,
	s2_name text NULL,
	s3_id int4 NULL,
	s3_name text NULL,
	s4_id int4 NULL,
	s4_name text NULL,
	s5_id int4 NULL,
	s5_name text NULL
);
CREATE INDEX idx_tb_store_hierarchy_combination ON price_promo.tb_store_hierarchy_combination USING btree (hierarchy_id);
CREATE INDEX idx_tb_store_hierarchy_combination_s0_s1 ON price_promo.tb_store_hierarchy_combination USING btree (s0_id, s1_id);