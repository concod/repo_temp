--liquibase formatted sql
--changeset liquibase:dc_forecast_week_level stripComments:false splitStatements:false context:Release_1_0 labels:MTP-68896
--comment: initial changeset for dc_forecast_week_level
CREATE TABLE inventory_smart.dc_forecast_week_level (
	article varchar NOT NULL,
	product_code varchar NOT NULL,
	fiscal_year_week int4 NOT NULL,
	dc_code int4 NOT NULL,
	dc_outbound float8 NOT NULL
);


--changeset kamuju.mahaveer:dc_forecast_week_level_v1 stripComments:false splitStatements:false context:Release_1_0 labels:VS-629
--comment: Updated schema for dc_forecast_week_level
ALTER TABLE inventory_smart.dc_forecast_week_level ADD COLUMN IF NOT EXISTS dc_inv_bop_pre_reserve float8 NULL;
ALTER TABLE inventory_smart.dc_forecast_week_level ADD COLUMN IF NOT EXISTS dc_inv_bop_post_allocation float8 NULL;
ALTER TABLE inventory_smart.dc_forecast_week_level ADD COLUMN IF NOT EXISTS sales_forecast float8 NULL;
ALTER TABLE inventory_smart.dc_forecast_week_level ADD COLUMN IF NOT EXISTS safety_stock float8 NULL;
ALTER TABLE inventory_smart.dc_forecast_week_level ADD COLUMN IF NOT EXISTS dc_inv_bop float8 NULL;
ALTER TABLE inventory_smart.dc_forecast_week_level ADD CONSTRAINT dc_forecast_week_level_dc_code FOREIGN KEY (dc_code) REFERENCES global.distribution_centres(dc_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.dc_forecast_week_level ADD CONSTRAINT dc_forecast_week_level_product_code FOREIGN KEY (product_code) REFERENCES global.product_master(product_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.dc_forecast_week_level ADD CONSTRAINT dc_forecast_week_level_unique UNIQUE (product_code, fiscal_year_week, dc_code);


--changeset shashwat.yadav:dc_forecast_week_level_v1 stripComments:false splitStatements:false context:Release_1_0 labels:VS-629
--comment: Added index for dc_forecast_week_level
CREATE INDEX IF NOT EXISTS dc_forecast_week_level_apd_idx on inventory_smart.dc_forecast_week_level using btree(article, product_code, dc_code);