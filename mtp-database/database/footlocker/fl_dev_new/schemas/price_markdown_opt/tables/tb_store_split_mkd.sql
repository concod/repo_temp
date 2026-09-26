--liquibase formatted sql
--changeset anoop:tb_store_split_mkd stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_store_split_mkd

CREATE TABLE price_markdown_opt.tb_store_split_mkd (
	product_id int4 NULL,
	store_id int4 NULL,
	s0_id int4 NULL,
	s1_id int4 NULL,
	week_start_date date NULL,
	store_ratio numeric NULL
)
PARTITION BY RANGE (week_start_date);
CREATE INDEX idx_prd_cid_weekstartdate_mkd ON price_markdown_opt.tb_store_split_mkd USING btree (product_id, week_start_date);

--changeset siddharth.bajpai@impactanalytics.co:sync_tb_store_split_mkd_20251216_v2 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:tb_store_split_mkd
--comment: Sync tb_store_split_mkd table structure with dev DB
DROP TABLE IF EXISTS price_markdown_opt.tb_store_split_mkd CASCADE;

--changeset siddharth.bajpai@impactanalytics.co:sync_tb_store_split_mkd_20251216_v3 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:tb_store_split_mkd
--comment: Sync tb_store_split_mkd table structure with dev DB
CREATE TABLE price_markdown_opt.tb_store_split_mkd (
    store_id int4 NOT NULL,
    simulation_week_start_date date NOT NULL,
    store_split_ratio float8 NOT NULL,
    s1_id int4 NOT NULL,
    store_reco_level text NULL,
    s0_id int4 NOT NULL,
    product_id int4 NOT NULL,
    CONSTRAINT tb_store_split_mkd_pk PRIMARY KEY (product_id, store_id, simulation_week_start_date)
)
PARTITION BY RANGE (simulation_week_start_date);
CREATE INDEX idx_prd_cid_simweekstart_mkd ON price_markdown_opt.tb_store_split_mkd USING btree (product_id, simulation_week_start_date);