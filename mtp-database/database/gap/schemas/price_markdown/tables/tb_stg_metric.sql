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

--changeset keerthana.reddy@impactanalytics.co:tb_stg_metric_v13052025 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding currency and vat columns

ALTER TABLE price_markdown.tb_stg_metric
ADD COLUMN currency_id int8,
ADD COLUMN margin_ia_with_vat float8,
ADD COLUMN margin_fin_with_vat float8,
ADD COLUMN revenue_ia_with_vat float8,
ADD COLUMN revenue_fin_with_vat float8,
ADD COLUMN spend_ia_with_vat float8,
ADD COLUMN spend_fin_with_vat float8;