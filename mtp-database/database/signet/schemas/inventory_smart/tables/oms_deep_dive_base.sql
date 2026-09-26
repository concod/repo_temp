--liquibase formatted sql
--changeset vishal.kumar:oms_deep_dive_base_1 stripComments:false splitStatements:false context:Release_1_1 labels:DAT-978
--comment: initial changeset for oms_deep_dive_base
CREATE TABLE IF NOT EXISTS inventory_smart.oms_deep_dive_base (
	id bigserial NOT NULL,
	product_code varchar NULL,
	dc_id varchar NULL,
	fiscal_year_week int4 NULL,
	week date NULL,
	"Month" varchar NULL,
	predicted_qty float4 NULL,
	eff_lead_time int4 NULL,
	rolling_std_dev float4 NULL,
	rolling_forecast float4 NULL,
	variance float4 NULL,
	safety_stock float4 NULL,
	receipt1 float4 NULL,
	receipt1_qc float4 NULL,
	total_dc_forecast float4 NULL,
	dc_inv float4 NULL,
	total_stores int4 NULL,
	total_mins float4 NULL,
	additional_forecast float4 NULL,
	additional_inventory float4 NULL,
	lost_sales float4 NULL,
	inventory_deficit float4 NULL,
	ecom_forecast float4 NULL,
	ecom_reserve float4 NULL,
	CONSTRAINT pk_oms_deep_dive_base PRIMARY KEY (id),
	CONSTRAINT uk_oms_deep_dive_base UNIQUE (product_code, dc_id, fiscal_year_week)
);

--changeset aman_lakkoju:Added excess inv column stripComments:false splitStatements:false context:Release_1_0 labels:MTP-43713
--comment: Added excess inv column

ALTER TABLE inventory_smart.oms_deep_dive_base ADD COLUMN IF NOT EXISTS excess_inv float4 NULL;

--changeset aman_lakkoju:ecom_forecast_org,net_allocation_total_0,SMA_inv column added stripComments:false splitStatements:false context:Release_1_0 labels:MTP-43713
--comment: ecom_forecast_org,net_allocation_total_0,SMA_inv column added

ALTER TABLE inventory_smart.oms_deep_dive_base ADD COLUMN IF NOT EXISTS ecom_forecast_org float4 NULL;
ALTER TABLE inventory_smart.oms_deep_dive_base ADD COLUMN IF NOT EXISTS net_allocation_total_0 float4 NULL;
ALTER TABLE inventory_smart.oms_deep_dive_base ADD COLUMN IF NOT EXISTS SMA_inv float4 NULL;