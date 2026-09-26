--liquibase formatted sql
--changeset liquibase:tb_placeholder_pricing stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_placeholder_pricing
CREATE TABLE price_promo.tb_placeholder_pricing (
	"month" int4 NULL,
	"year" int4 NULL,
	weighted_base_price float8 NULL,
	weighted_cost_price float8 NULL
);
CREATE INDEX idx_tb_placeholder_pricing_month ON price_promo.tb_placeholder_pricing USING btree (month);
CREATE INDEX idx_tb_placeholder_pricing_month_year ON price_promo.tb_placeholder_pricing USING btree (month, year);
CREATE INDEX idx_tb_placeholder_pricing_year ON price_promo.tb_placeholder_pricing USING btree (year);