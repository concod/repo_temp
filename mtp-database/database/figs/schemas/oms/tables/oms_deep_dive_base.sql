--liquibase formatted sql
--changeset liquibase:oms_deep_dive_base_data_types_fixed_1 stripComments:false splitStatements:false context:Release_1_0 labels:VS-284
--comment: initial changeset for oms_deep_dive_base

CREATE TABLE IF NOT EXISTS inventory_smart.oms_deep_dive_base (
	product_code varchar NULL,
	"style" varchar NULL,
	article varchar NULL,
	"size" varchar NULL,
	channel varchar NULL,
	vendor_code varchar NULL,
	vendor_name varchar NULL,
	loc_code varchar NULL,
	fiscal_year_week int4 NULL,
	week date NULL,
	"month" varchar NULL,
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
	created_by int4 NULL,
	created_at timestamptz NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	id serial4 NOT NULL
);

--changeset kanishka.parashar@impactanalytics.co:deep_dive_base_5 stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VPP-321
--comment:  modified existing as per requirement 
-- alter table inventory_smart.oms_deep_dive_base 
-- add constraint pk_oms_deep_dive_base PRIMARY KEY (product_code, style, article, size, channel, loc_code, fiscal_year_week);

--changeset shreyansh.jain:oms_deep_dive_base_ly_sales_added_if_not_exist stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: oms_deep_dive_base_ly_sales_added_if_not_exist
ALTER TABLE inventory_smart.oms_deep_dive_base ADD COLUMN IF NOT EXISTS ly_sales float4 NULL;

--changeset shreyansh.jain:oms_deep_dive_base_ly_oh_added_if_not_exist stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: oms_deep_dive_base_ly_oh_added_if_not_exist
ALTER TABLE inventory_smart.oms_deep_dive_base ADD COLUMN IF NOT EXISTS ly_oh float4 NULL;


--changeset shreyansh.jain:total_dc_forecast_final_roq_added stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: total_dc_forecast_final_roq_added
ALTER TABLE inventory_smart.oms_deep_dive_base ADD COLUMN IF NOT EXISTS total_dc_forecast_final_roq float4 NULL;

--changeset shreyansh.jain:total_stores_count_added stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: total_stores_count_added
ALTER TABLE inventory_smart.oms_deep_dive_base ADD COLUMN IF NOT EXISTS total_stores_count int4 NULL;

--changeset poojith.krishna:oms_deep_dive_base_combined_changes stripComments:false splitStatements:false context:Release_1_1 labels:VPP-Update
--comment: Combined column type modifications and additions as per new data structure
ALTER TABLE inventory_smart.oms_deep_dive_base 
    ALTER COLUMN week TYPE varchar USING week::varchar,
    ALTER COLUMN eff_lead_time TYPE float4 USING eff_lead_time::float4,
    ALTER COLUMN receipt1 TYPE int4 USING receipt1::int4,
    ALTER COLUMN receipt1_qc TYPE int4 USING receipt1_qc::int4,
    ALTER COLUMN dc_inv TYPE float4 USING dc_inv::float4,
    ALTER COLUMN total_dc_forecast_final_roq TYPE int4 USING total_dc_forecast_final_roq::int4,
    ALTER COLUMN total_mins TYPE int4 USING total_mins::int4,
    ALTER COLUMN additional_forecast TYPE int4 USING additional_forecast::int4,
    ALTER COLUMN additional_inventory TYPE int4 USING additional_inventory::int4,
    ALTER COLUMN inventory_deficit TYPE int4 USING inventory_deficit::int4,
    ALTER COLUMN ecom_forecast TYPE int4 USING ecom_forecast::int4,
    ALTER COLUMN ecom_reserve TYPE int4 USING ecom_reserve::int4,
    ALTER COLUMN ly_sales TYPE int4 USING ly_sales::int4,
    ALTER COLUMN ly_oh TYPE int4 USING ly_oh::int4,
    ADD COLUMN IF NOT EXISTS week_starting varchar NULL,
    ADD COLUMN IF NOT EXISTS week_ending varchar NULL,
    ADD COLUMN IF NOT EXISTS approved_receipt_1 int4 NULL;


--changeset poojith.krishna:oms_deep_dive_base_constraints stripComments:false splitStatements:false context:Release_1_1 labels:VPP-Update
--comment: Combined column type modifications and additions as per new data structure
ALTER TABLE inventory_smart.oms_deep_dive_base
ADD CONSTRAINT uk_oms_deep_dive_base 
UNIQUE (product_code, loc_code, fiscal_year_week);
