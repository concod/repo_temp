--liquibase formatted sql
--changeset liquibase:oms_deep_dive_base_update2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start_update2
--comment: initial changeset for oms_deep_dive_base_update2

CREATE TABLE IF NOT EXISTS inventory_smart.oms_deep_dive_base (
	product_code varchar(50) NULL,
	"style" varchar(50) NULL,
	article varchar(50) NULL,
	"size" varchar(50) NULL,
	channel varchar(50) NULL,
	vendor_code varchar NULL,
	vendor_name varchar(50) NULL,
	loc_code varchar(50) NULL,
	fiscal_year_week int8 NULL,
	week date NULL,
	"month" varchar(50) NULL,
	predicted_qty float4 NULL,
	eff_lead_time int4 NULL,
	rolling_std_dev float4 NULL,
	rolling_forecast float4 NULL,
	variance float4 NULL,
	safety_stock float4 NULL,
	receipt1 float4 NULL,
	receipt1_qc float4 NULL,
	total_dc_forecast float4 NULL,
	dc_inv int4 NULL,
	total_mins float4 NULL,
	additional_forecast float4 NULL,
	additional_inventory float4 NULL,
	approved_receipt float4 NULL,
	lost_sales float4 NULL,
	inventory_deficit float4 NULL,
	ecom_forecast float4 NULL,
	ecom_reserve float4 NULL,
	id serial4 NOT NULL,
	created_by int4 NULL,
	created_at timestamptz NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	column_updated varchar(50) NULL,
	CONSTRAINT oms_deep_dive_base_pkey PRIMARY KEY (id)
);

--changeset pradeep.kumar:setting_not_null stripComments:false splitStatements:false context:Release_1_0 labels:set_not_null_constraint
--comment: setting not null to required columns

ALTER TABLE inventory_smart.oms_deep_dive_base ALTER COLUMN product_code SET NOT NULL;
ALTER TABLE inventory_smart.oms_deep_dive_base ALTER COLUMN style SET NOT NULL;
ALTER TABLE inventory_smart.oms_deep_dive_base ALTER COLUMN article SET NOT NULL;
ALTER TABLE inventory_smart.oms_deep_dive_base ALTER COLUMN size SET NOT NULL;
ALTER TABLE inventory_smart.oms_deep_dive_base ALTER COLUMN channel SET NOT NULL;
ALTER TABLE inventory_smart.oms_deep_dive_base ALTER COLUMN vendor_code SET NOT NULL;
ALTER TABLE inventory_smart.oms_deep_dive_base ALTER COLUMN loc_code SET NOT NULL;
ALTER TABLE inventory_smart.oms_deep_dive_base ALTER COLUMN fiscal_year_week SET NOT NULL;

ALTER TABLE inventory_smart.oms_deep_dive_base
DROP CONSTRAINT IF EXISTS oms_deep_dive_base_pkey;
ALTER TABLE inventory_smart.oms_deep_dive_base
ADD CONSTRAINT pk_oms_deep_dive_base PRIMARY KEY (product_code, style, article, size, channel, vendor_code, loc_code, fiscal_year_week);

--changeset sairaghunath.k:adding a new column total_dc_forecast_final_roq keeping it nullable stripComments:false splitStatements:false context:Release_1_0 labels:set_not_null_constraint
--comment: adding a new column total_dc_forecast_final_roq

ALTER TABLE inventory_smart.oms_deep_dive_base
ADD COLUMN if not exists total_dc_forecast_final_roq float4 NULL ;

--changeset pradeep.kumar:adding_ly_sales_column stripComments:false splitStatements:false context:Release_1_0 labels:adding_ly_sales
--comment: adding last year sales column

ALTER TABLE inventory_smart.oms_deep_dive_base ADD COLUMN IF NOT EXISTS ly_sales float4 NULL;
ALTER TABLE inventory_smart.oms_deep_dive_base ADD COLUMN IF NOT EXISTS ly_oh float4 NULL;

--changeset pradeep.kumar:adding_store_count_column stripComments:false splitStatements:false context:Release_1_0 labels:adding_store_count_column
--comment: adding store count column

ALTER TABLE inventory_smart.oms_deep_dive_base ADD COLUMN IF NOT EXISTS total_stores_count int4 NULL;