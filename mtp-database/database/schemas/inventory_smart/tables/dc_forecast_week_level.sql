--liquibase formatted sql
--changeset liquibase:dc_forecast_week_level_modified stripComments:false splitStatements:false context:Release_1_0 labels:MTP-68896
--comment: initial changeset for dc_forecast_week_level
CREATE TABLE IF NOT EXISTS inventory_smart.dc_forecast_week_level (
	article varchar NOT NULL,
	product_code varchar NOT NULL,
	fiscal_year_week int4 NOT NULL,
	dc_code int4 NOT NULL,
	dc_outbound float8 NOT NULL,
	dc_inv_bop_pre_reserve float8 NULL,
	dc_inv_bop_post_allocation float8 NULL,
	sales_forecast float8 NULL,
	safety_stock float8 NULL,
	dc_inv_bop float8 NULL,
	CONSTRAINT dc_forecast_week_level_unique UNIQUE (product_code, fiscal_year_week, dc_code),
	CONSTRAINT dc_forecast_week_level_dc_code FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code) ON DELETE CASCADE,
	CONSTRAINT dc_forecast_week_level_product_code FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS dc_forecast_week_level_apd_idx ON inventory_smart.dc_forecast_week_level USING btree (article, product_code, dc_code);


--changeset shashwat.yadav:idx_dc_forecast_article_modified stripComments:false splitStatements:false context:Release_1_0 labels:VS-629
--comment: Added index for dc_forecast_week_level
CREATE INDEX IF NOT EXISTS idx_dc_forecast_product_dc ON inventory_smart.dc_forecast_week_level (product_code, dc_code);