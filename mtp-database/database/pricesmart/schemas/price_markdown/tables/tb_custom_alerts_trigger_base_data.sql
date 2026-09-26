--liquibase formatted sql
--changeset surya.avinash@impactanalytics.co:tb_custom_alerts_trigger_base_data stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_custom_alerts_trigger_base_data

CREATE TABLE price_markdown.tb_custom_alerts_trigger_base_data (
	strategy_id int4 NOT NULL,
	pcd_id int4 NOT NULL,
	product_id int4 NOT NULL,
	product_level_id int4 NOT NULL,
	store_id int4 NOT NULL,
	store_level_id int4 NOT NULL,
	sales_units float8 NOT NULL,
	inventory float8 NOT NULL,
	revenue float8 NOT NULL,
	margin float8 NOT NULL
)
PARTITION BY LIST (strategy_id);