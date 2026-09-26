--liquibase formatted sql
--changeset liquibase:tb_stg_metric stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for tb_stg_metric

CREATE TABLE price_markdown.tb_stg_metric (
	strategy_id int4 NOT NULL,
	sales_units_ia float8 NULL DEFAULT 0,
	sales_units_fin float8 NULL DEFAULT 0,
	margin_ia float8 NULL DEFAULT 0,
	margin_fin float8 NULL DEFAULT 0,
	revenue_ia float8 NULL DEFAULT 0,
	revenue_fin float8 NULL DEFAULT 0,
	spend_ia float8 NULL DEFAULT 0,
	spend_fin float8 NULL DEFAULT 0
);