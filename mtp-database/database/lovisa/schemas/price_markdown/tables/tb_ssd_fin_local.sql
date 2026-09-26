--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co::tb_ssd_fin_local_20251106 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_ssd_fin_local

CREATE TABLE price_markdown.tb_ssd_fin_local (
	strategy_id int4 NOT NULL,
	product_id int4 NOT NULL,
	store_id int4 NOT NULL,
	product_level_id int8 NOT NULL,
	store_level_id int8 NOT NULL,
	recommendation_date date NOT NULL,
	recommended_offer_percentage float8 NOT NULL,
	effective_price_point float8 NOT NULL,
	pcd_id int4 NOT NULL,
	sales_units float8 NULL,
	margin float8 NULL,
	revenue float8 NULL,
	status int4 NULL,
	created_at timestamptz NULL,
	updated_at timestamptz NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	rem_inv float8 NULL,
	spend float8 NULL,
	sales_units_uncapped float8 NULL,
	previous_markdown_percentage float8 NULL,
	channel_info varchar NULL,
	currency_id int8 NULL,
	effective_price_point_with_vat float8 NULL,
	margin_with_vat float8 NULL,
	revenue_with_vat float8 NULL,
	spend_with_vat float8 NULL
)
PARTITION BY LIST (strategy_id);