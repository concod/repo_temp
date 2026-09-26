--liquibase formatted sql
--changeset liquibase:tb_strategy_date_metrics_fin stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for tb_strategy_date_metrics_fin

CREATE TABLE price_markdown.tb_strategy_date_metrics_fin (
	strategy_id int4 NULL,
	pcd_id int4 NULL,
	recommendation_date date NULL,
	sku_count int8 NULL,
	store_count int8 NULL,
	is_approved int4 NULL,
	clearance_discount float8 NULL,
	margin float8 NULL,
	sales_units float8 NULL,
	revenue float8 NULL,
	inventory float8 NULL,
	inventory_cost float8 NULL,
	inventory_retail float8 NULL,
	spend float8 NULL
)
PARTITION BY LIST (strategy_id);

--changeset keerthana.reddy@impactanalytics.co:tb_strategy_date_metrics_fin_v13052025 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding currency and vat columns

ALTER TABLE price_markdown.tb_strategy_date_metrics_fin
ADD COLUMN currency_id int8,
ADD COLUMN margin_with_vat float8,
ADD COLUMN revenue_with_vat float8,
ADD COLUMN inventory_cost_with_vat float8,
ADD COLUMN inventory_retail_with_vat float8,
ADD COLUMN spend_with_vat float8;