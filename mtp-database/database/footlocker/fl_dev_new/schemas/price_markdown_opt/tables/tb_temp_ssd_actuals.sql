--liquibase formatted sql
--changeset liquibase:tb_temp_ssd_actuals stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_temp_ssd_actuals


CREATE TABLE price_markdown_opt.tb_temp_ssd_actuals (
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
	status int4 NULL,
	created_at timestamptz NULL,
	updated_at timestamptz NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	rem_inv float8 NULL,
	spend float8 NULL
);

--changeset keerthana.reddy@impactanalytics.co:tb_temp_ssd_actuals_v13052025 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding currency and vat columns

ALTER TABLE price_markdown_opt.tb_temp_ssd_actuals
ADD COLUMN currency_id int8,
ADD COLUMN effective_price_point_with_vat float8,
ADD COLUMN margin_with_vat float8,
ADD COLUMN revenue_with_vat float8,
ADD COLUMN spend_with_vat float8;
