--liquibase formatted sql
--changeset siddharth.bajpai@impactanalytics.co:tb_store_split_mkd_version_20251216 stripComments:false splitStatements:false context:Release_1_0 labels:tb_store_split_mkd
--comment: Create tb_store_split_mkd_version table

CREATE TABLE IF NOT EXISTS price_markdown_opt.tb_store_split_mkd_version (
	store_id int4 NOT NULL,
	product_id int4 NOT NULL,
	simulation_week_start_date date NOT NULL,
	store_split_ratio float8 NOT NULL,
	s1_id int4 NOT NULL,
	store_reco_level text NULL,
	s0_id int4 NOT NULL,
	version_code int4 NOT NULL,
	CONSTRAINT tb_store_split_mkd_version_pk PRIMARY KEY (product_id, store_id, simulation_week_start_date, version_code)
)
PARTITION BY LIST (version_code);
CREATE INDEX idx_prd_cid_simweekstart_mkd_version ON price_markdown_opt.tb_store_split_mkd_version USING btree (product_id, simulation_week_start_date);

