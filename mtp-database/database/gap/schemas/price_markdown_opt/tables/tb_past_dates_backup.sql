--liquibase formatted sql
--changeset liquibase:tb_past_dates_backup stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_past_dates_backup

CREATE TABLE price_markdown_opt.tb_past_dates_backup (
	strategy_id int4 NULL,
	product_id int4 NULL,
	store_id int4 NULL,
	product_level_id int8 NULL,
	store_level_id int8 NULL,
	recommendation_date date NULL,
	recommended_offer_percentage float8 NULL,
	effective_price_point float8 NULL,
	pcd_id int4 NULL,
	sales_units float8 NULL,
	margin float8 NULL,
	revenue float8 NULL,
	rem_inv float8 NULL,
	spend float8 NULL,
	sales_units_uncapped float8 NULL,
	ingestion_date date NOT NULL
)
PARTITION BY RANGE (recommendation_date);

--changeset keerthana.reddy@impactanalytics.co:tb_past_dates_backup_v13052025 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding currency and vat columns

ALTER TABLE price_markdown_opt.tb_past_dates_backup
ADD COLUMN currency_id int8,
ADD COLUMN effective_price_point_with_vat float8,
ADD COLUMN margin_with_vat float8,
ADD COLUMN revenue_with_vat float8,
ADD COLUMN spend_with_vat float8;
