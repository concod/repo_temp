--liquibase formatted sql
--changeset liquibase:updateable_tables_schema stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for updateable_tables_schema
CREATE TABLE "cache".updateable_tables_schema (
	table_name varchar NOT NULL,
	table_type varchar NOT NULL,
	col varchar NOT NULL,
	"datatype" varchar NOT NULL,
	is_null_allowed bool NOT NULL,
	CONSTRAINT updateable_tables_schema_un UNIQUE (table_name, table_type, col)
);


--changeset ashish@impactanalytics.co:updateable_tables_schema_gbq_compatiable stripComments:false splitStatements:false context:Release_2 labels:Cold_Updates
--comment: Cold Updates Ada Visual Changes
ALTER TABLE IF EXISTS cache.updateable_tables_schema ADD COLUMN is_virtual boolean NOT NULL;
CREATE INDEX updateable_tables_schema_col_idx ON cache.updateable_tables_schema USING btree (col);

INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'store_pack_size', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'price_bucket', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'gender', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'product_tag', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'cost', 'float64', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'product_cost_price_per_unit', 'float64', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 's0_name', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'size', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'promo_percentage', 'int64', false, false);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'hierarchy_3', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'fc_code', 'int64', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'actual_price_per_unit', 'float64', true, false);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'drop_ship_ind', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'shop_in_shop', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'brand', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'child_skus', 'array<string>', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'product_banner_orig', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'close_date', 'date', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'flag', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'brand_currency', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'store_name', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'division_name', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'clearance', 'bool', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'vendor_style', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'vendor_currency', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'article', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'original_price', 'float64', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'l0_name', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'merchandise_brand', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'metal_color', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'product_banner', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'fiscal_year_month', 'int64', false, false);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'longitude', 'float64', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'product_description', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'product_channel_name', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'store_code', 'string', false, false);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'dma_name', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'l2_name', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'created_by', 'string', false, false);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'minimum_order_quantity', 'int64', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'open_date', 'date', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'state', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'store_grade', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'dc_code', 'int64', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'hierarchy_1', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'product_final_price_per_unit', 'float64', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'vendor_code', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'store_size', 'float64', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'fiscal_year_quarter', 'int64', false, false);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'update_type', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'channel', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'promo_type', 'string', true, false);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'updated_by', 'string', true, false);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'store_banner', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'store_channel_description', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'end_date', 'date', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'launch_date', 'date', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'product_retail_price_per_unit', 'float64', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'adjusted_forecast_qty', 'float64', true, false);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'dotcom_exclusive', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 's2_name', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'default_discount_flag', 'bool', false, false);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'primary_sub_sku', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'product_type', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'primary_wh', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'city', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'fiscal_date', 'date', false, false);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'district', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'product_code', 'string', false, false);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'active', 'bool', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'hierarchy_2', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'combo_store', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'metal_type', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'product_channel', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'special_classification', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'division_code', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'updated_at', 'datetime', true, false);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'is_deleted', 'bool', false, false);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'latitude', 'float64', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'dc_name', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'merchandise_category', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'l1_name', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'production_method', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 's3_name', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'clearance_end_date', 'date', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'clearance_start_date', 'date', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'region', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'store_description', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'price', 'float64', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'fiscal_year_week', 'int64', false, false);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'product_bucket_code', 'int64', false, false);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'predicted_qty', 'float64', true, false);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'ordering', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'predicted_qty_round', 'float64', true, false);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'vendor_name', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'product_name', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'supplier_lead_time', 'int64', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'store_type', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'is_set', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 's1_name', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'adjusted_discount_flag', 'bool', false, false);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'sku_grade', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'store_code_name', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'receipt_date', 'date', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'planning_ownership', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'vendor_name_and_number', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'created_at', 'datetime', false, false);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'supplier_pack_size', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'zipcode', 'string', true, true);
INSERT INTO "cache".updateable_tables_schema
(table_name, table_type, col, "datatype", is_null_allowed, is_virtual)
VALUES('impactsmart.signet_ingestion_zpb.ada_visual_predictions', 'gbq', 'UUID', 'string', false, false);
