--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:tb_store_hierarchy_combination_version  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Initial changeset for price_promo.tb_store_hierarchy_combination_version

CREATE TABLE IF NOT EXISTS price_promo.tb_store_hierarchy_combination_version (
	s0_id text NULL,
	s0_cid int4 NULL,
	s0_cuq text NULL,
	hierarchy_id int4 NULL,
	version_code int4 NOT NULL,
	CONSTRAINT tb_store_hierarchy_cid_v_uniq_key UNIQUE (version_code, hierarchy_id)
)
PARTITION BY LIST (version_code);
CREATE INDEX tb_store_hierarchy_combination_v_hier_idx ON price_promo.tb_store_hierarchy_combination_version USING btree (hierarchy_id);