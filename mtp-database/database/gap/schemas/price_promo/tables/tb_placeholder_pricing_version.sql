--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:tb_placeholder_pricing_version_2  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_placeholder_pricing_version

DROP TABLE IF EXISTS price_promo.tb_placeholder_pricing_version CASCADE;

CREATE TABLE price_promo.tb_placeholder_pricing_version (
	"month" int4 NOT NULL,
	"year" int4 NOT NULL,
	weighted_base_price float8 NULL,
	weighted_cost_price float8 NULL,
	version_code int4 NOT NULL
)
PARTITION BY LIST (version_code);
CREATE INDEX idx_tb_placeholder_pricing_version_month_year ON price_promo.tb_placeholder_pricing_version USING btree (month, year);