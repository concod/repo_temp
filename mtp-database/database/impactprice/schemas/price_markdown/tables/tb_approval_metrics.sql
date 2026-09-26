--liquibase formatted sql
--changeset liquibase:tb_approval_metrics stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for tb_approval_metrics

CREATE TABLE price_markdown.tb_approval_metrics (
	strategy_id int4 NULL,
	product_level_id int8 NULL,
	pcd_id int4 NULL,
	pcd_start_date date NULL,
	pcd_end_date date NULL,
	channel_info text NULL,
	ia_markdown_type _text NULL,
	fin_markdown_type _text NULL,
	stores_with_inventory int8 NULL,
	status price_markdown."strategy_approval_status_enum" NULL,
	ia_discount float8 NULL,
	fin_discount float8 NULL,
	ia_previous_discount float8 NULL,
	fin_previous_discount float8 NULL,
	ia_pcd_price numeric NULL,
	fin_pcd_price numeric NULL,
	ia_incremental_discount float8 NULL,
	fin_incremental_discount float8 NULL,
	ia_previous_pcd_price numeric NULL,
	fin_previous_pcd_price numeric NULL,
	ia_units float8 NULL,
	fin_units float8 NULL,
	ia_revenue float8 NULL,
	fin_revenue float8 NULL,
	ia_margin float8 NULL,
	fin_margin float8 NULL,
	ia_gm_percent float8 NULL,
	fin_gm_percent float8 NULL,
	ia_sellthrough numeric NULL,
	fin_sellthrough numeric NULL,
	ia_aum numeric NULL,
	fin_aum numeric NULL,
	ia_markdown_spend float8 NULL,
	fin_markdown_spend float8 NULL,
	ia_inventory float8 NULL,
	fin_inventory float8 NULL,
	action_status price_markdown."action_status_enum" NULL
)
PARTITION BY LIST (strategy_id);

--changeset surya.avinash@impactanalytics.co:tb_approval_metrics_v110924 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for tb_approval_metrics

ALTER TABLE price_markdown.tb_approval_metrics
ADD COLUMN ia_previous_markdown_type _text NULL,
ADD COLUMN fin_previous_markdown_type _text NULL,
add column pcd_number integer,
add column dept _text,
add column class _text,
add column brand _text,
add column mfg _text,
add column base_price numeric,
add column ia_inventory_cost float8,
add column fin_inventory_cost float8,
add column updated_at timestamp ;

--changeset surya.avinash@impactanalytics.co:tb_approval_metrics_v071024 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: add age column in tb_approval_metrics

ALTER TABLE price_markdown.tb_approval_metrics
ADD COLUMN age int4 NULL;

--changeset keerthana.reddy@impactanalytics.co:tb_approval_metrics_v13052025 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding currency and vat columns

ALTER TABLE price_markdown.tb_approval_metrics
ADD COLUMN currency_id int8,
ADD COLUMN ia_pcd_price_with_vat float8,
ADD COLUMN fin_pcd_price_with_vat float8,
ADD COLUMN ia_previous_pcd_price_with_vat float8,
ADD COLUMN fin_previous_pcd_price_with_vat float8,
ADD COLUMN ia_revenue_with_vat float8,
ADD COLUMN fin_revenue_with_vat float8,
ADD COLUMN ia_margin_with_vat float8,
ADD COLUMN fin_margin_with_vat float8,
ADD COLUMN ia_aum_with_vat float8,
ADD COLUMN fin_aum_with_vat float8,
ADD COLUMN ia_markdown_spend_with_vat float8,
ADD COLUMN fin_markdown_spend_with_vat float8,
ADD COLUMN base_price_with_vat float8,
ADD COLUMN ia_inventory_cost_with_vat float8,
ADD COLUMN fin_inventory_cost_with_vat float8;

--changeset keerthana.reddy@impactanalytics.co:tb_approval_metrics_12062025 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding sub_dept column

ALTER TABLE price_markdown.tb_approval_metrics
DROP COLUMN ia_inventory_cost_with_vat,
DROP COLUMN fin_inventory_cost_with_vat,
ADD COLUMN sub_dept _text;

--changeset anoop.madamsetty@impactanalytics.co:tb_approval_metrics_12062026 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: add index for strategy_id,pcd_id,channel_info,product_level_id

CREATE INDEX tb_approval_metrics_strategy_id_idx ON price_markdown.tb_approval_metrics (strategy_id,pcd_id,channel_info,product_level_id);


--changeset siddharth.bajpai.co:tb_approval_metrics_02122025 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding store_level_id column

ALTER TABLE price_markdown.tb_approval_metrics
ADD COLUMN store_level_id int8 NULL;

DROP INDEX IF EXISTS price_markdown.tb_approval_metrics_strategy_id_idx;

CREATE INDEX tb_approval_metrics_strategy_id_idx ON price_markdown.tb_approval_metrics (strategy_id,pcd_id,product_level_id,store_level_id);

--changeset markdown:tb_approval_metrics_baseline_incremental_float_metrics stripComments:false splitStatements:false context:Release_1_0 labels:markdown_metrics
--comment: IA/FIN baseline and incremental units, revenue, margin, markdown spend (+ VAT); matches Foot Locker env DDL
ALTER TABLE price_markdown.tb_approval_metrics
ADD COLUMN ia_baseline_units float8 NULL,
ADD COLUMN fin_baseline_units float8 NULL,
ADD COLUMN ia_baseline_revenue float8 NULL,
ADD COLUMN fin_baseline_revenue float8 NULL,
ADD COLUMN ia_baseline_margin float8 NULL,
ADD COLUMN fin_baseline_margin float8 NULL,
ADD COLUMN ia_baseline_markdown_spend float8 NULL,
ADD COLUMN fin_baseline_markdown_spend float8 NULL,
ADD COLUMN ia_incremental_units float8 NULL,
ADD COLUMN fin_incremental_units float8 NULL,
ADD COLUMN ia_incremental_revenue float8 NULL,
ADD COLUMN fin_incremental_revenue float8 NULL,
ADD COLUMN ia_incremental_margin float8 NULL,
ADD COLUMN fin_incremental_margin float8 NULL,
ADD COLUMN ia_incremental_markdown_spend float8 NULL,
ADD COLUMN fin_incremental_markdown_spend float8 NULL,
ADD COLUMN ia_baseline_revenue_with_vat float8 NULL,
ADD COLUMN fin_baseline_revenue_with_vat float8 NULL,
ADD COLUMN ia_baseline_margin_with_vat float8 NULL,
ADD COLUMN fin_baseline_margin_with_vat float8 NULL,
ADD COLUMN ia_baseline_markdown_spend_with_vat float8 NULL,
ADD COLUMN fin_baseline_markdown_spend_with_vat float8 NULL,
ADD COLUMN ia_incremental_revenue_with_vat float8 NULL,
ADD COLUMN fin_incremental_revenue_with_vat float8 NULL,
ADD COLUMN ia_incremental_margin_with_vat float8 NULL,
ADD COLUMN fin_incremental_margin_with_vat float8 NULL,
ADD COLUMN ia_incremental_markdown_spend_with_vat float8 NULL,
ADD COLUMN fin_incremental_markdown_spend_with_vat float8 NULL;
