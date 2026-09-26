
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

--changeset shrrayan.sheel@impactanalytics.co:tb_store_hierarchy_combination_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Combined ALTER statement to transform tb_store_hierarchy_combination and create index
ALTER TABLE price_promo.tb_store_hierarchy_combination
  	ADD COLUMN market_id int4 null,
    ADD COLUMN market_name text null,
    ADD COLUMN store_id int4 null,
    ADD COLUMN store_name text null;
	
--changeset shrrayan.sheel@impactanalytics.co:tb_store_hierarchy_combination_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Combined ALTER statement to transform tb_store_hierarchy_combination to get is_active
ALTER TABLE price_promo.tb_store_hierarchy_combination
  	ADD COLUMN is_active int4 null;