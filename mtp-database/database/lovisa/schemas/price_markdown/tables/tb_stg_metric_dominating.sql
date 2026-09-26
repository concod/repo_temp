--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co:tb_stg_metric_dominating_20251106 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_stg_metric_dominating

CREATE TABLE price_markdown.tb_stg_metric_dominating (
	strategy_id int4 NOT NULL,
	sales_units_ia float8 DEFAULT 0 NULL,
	sales_units_fin float8 DEFAULT 0 NULL,
	margin_ia float8 DEFAULT 0 NULL,
	margin_fin float8 DEFAULT 0 NULL,
	revenue_ia float8 DEFAULT 0 NULL,
	revenue_fin float8 DEFAULT 0 NULL,
	spend_ia float8 DEFAULT 0 NULL,
	spend_fin float8 DEFAULT 0 NULL,
	currency_id int8 NULL,
	margin_ia_with_vat float8 NULL,
	margin_fin_with_vat float8 NULL,
	revenue_ia_with_vat float8 NULL,
	revenue_fin_with_vat float8 NULL,
	spend_ia_with_vat float8 NULL,
	spend_fin_with_vat float8 NULL
);