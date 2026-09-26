--liquibase formatted sql
--changeset abhimanyu.sheoran@impactanalytics.co:oms_deep_dive_base_store stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:oms_deep_dive_base_store
--comment: initial changeset for oms_deep_dive_base_store

CREATE TABLE IF NOT EXISTS inventory_smart.oms_deep_dive_base_store (
	product_code varchar NOT NULL,
	store_code varchar NOT NULL,
	fiscal_year_week int8 NOT NULL,
	week date NULL,
	"month" varchar NULL,
	predicted_qty float8 NULL,
	rolling_std_dev float8 NULL,
	rolling_forecast float8 NULL,
	variance float8 NULL,
	safety_stock float8 NULL,
	receipt1 int8 NULL,
	receipt1_qc int8 NULL,
	sales_forecast float8 NULL,
	store_inv float8 NULL,
	lost_sales float8 NULL,
	"style" varchar NOT NULL,
	article varchar NOT NULL,
	"size" varchar NOT NULL,
	channel varchar NOT NULL,
	vendor_code varchar NOT NULL,
	vendor_name varchar NULL,
	store_tier varchar NULL,
	week_starting date NULL,
	week_ending date NULL,
	total_mins int8 NULL,
	additional_forecast int8 NULL,
	additional_inventory int8 NULL,
	inventory_deficit int8 NULL,
	ecom_forecast float8 NULL,
	ecom_reserve float8 NULL,
	created_by int8 NULL,
	created_at timestamptz NULL,
	updated_by int8 NULL,
	updated_at timestamptz NULL,
	eff_lead_time int4 NULL,
	approved_receipt float4 NULL,
	ly_sales float8 NULL,
	ly_oh float8 NULL,
	total_stores_count int4 NULL,
	total_store_forecast float4 NULL,
	CONSTRAINT uk_oms_deep_dive_base_store PRIMARY KEY (product_code, style, article, size, channel, vendor_code, store_code, fiscal_year_week)
);

--changeset priyansh.gautam@impactanalytics.co:deep_dive_base_store_update_indexing_added stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:deep_dive_base_store
--comment: schema for oms_deep_divebase_store indexing added
CREATE INDEX idx_oddbs_lookup_covering 
    ON inventory_smart.oms_deep_dive_base_store 
    (product_code, store_code, channel, vendor_code, fiscal_year_week)
    INCLUDE (
        total_store_forecast, receipt1, approved_receipt,
        safety_stock, eff_lead_time, lost_sales, 
        inventory_deficit, total_stores_count, store_inv,
        week, month,
        sales_forecast, predicted_qty, ly_sales, ly_oh,
        article, size, vendor_name
    ); 