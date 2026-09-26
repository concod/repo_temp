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