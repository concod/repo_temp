--liquibase formatted sql
--changeset liquibase:alerts_product_level_0_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for alerts_product_level
CREATE TABLE IF NOT EXISTS inventory_smart.alerts_product_level (
    product_code varchar NULL,
    product_description text NULL,
    l0_name varchar NULL,
    l1_name varchar NULL,
    l2_name varchar NULL,
    merchandise_category varchar NULL,
    planning_ownership varchar NULL,
    product_channel_name varchar NULL,
    its_store_group varchar NULL,
    its_dc_oh int4 NULL,
    its_is_resolved int4 NULL,
    nsfe_fiscal_year_week int4 NULL,
    nsfe_actual_sales int4 NULL,
    nsfe_inv_oh int4 NULL,
    nsfe_absolute_error float4 NULL,
    nsfe_absolute_error_percentage float4 NULL,
    nsfe_adjusted_forecast_qty float4 NULL,
    nsfe_is_resolved int4 NULL,
    nfmscs_dc_oh int4 NULL,
    nfmscs_min float4 NULL,
    nfmscs_max float4 NULL,
    nfmscs_model_stock float4 NULL,
    nfmscs_is_resolved int4 NULL,
    nfmsp_dc_oh int4 NULL,
    nfmsp_min float4 NULL,
    nfmsp_max float4 NULL,
    nfmsp_model_stock float4 NULL,
    nfmsp_is_resolved int4 NULL,
    pdfesc_fiscal_year_week int4 NULL,
    pdfesc_actual_sales int4 NULL,
    pdfesc_adjusted_forecast_qty float4 NULL,
    pdfesc_inv_oh int4 NULL,
    pdfesc_absolute_error float4 NULL,
    pdfesc_absolute_error_percentage float4 NULL,
    pdfesc_is_resolved int4 NULL,
    pdfep_fiscal_year_week int4 NULL,
    pdfep_actual_sales int4 NULL,
    pdfep_adjusted_forecast_qty float4 NULL,
    pdfep_inv_oh int4 NULL,
    pdfep_absolute_error float4 NULL,
    pdfep_absolute_error_percentage float4 NULL,
    pdfep_is_resolved int4 NULL,
    uip_oh int4 NULL,
    uip_wos float4 NULL,
    uip_total_forecasted_sales_26_weeks float4 NULL,
    uip_is_resolved int4 NULL,
    uisc_oh int4 NULL,
    uisc_wos float4 NULL,
    uisc_total_forecasted_sales_13_weeks float4 NULL,
    uisc_is_resolved int4 NULL,
    cf_oh int4 NULL,
    cf_wos float4 NULL,
    cf_total_forecasted_sales_weeks float4 NULL,
    cf_net_demand float4 NULL,
    cf_lead_time float4 NULL,
    cf_expected_po float4 NULL,
    cf_is_resolved int4 NULL,
    initial_test_skus int4 NULL,
    new_skus_forecast_error int4 NULL,
    no_future_model_stock_cl_sd int4 NULL,
    no_future_model_stock_prog int4 NULL,
    percentage_dc_forecast_error_sd_cl int4 NULL,
    percentage_dc_forecast_error_prog int4 NULL,
    unproductive_inventory_prog int4 NULL,
    unproductive_inventory_sd_cl int4 NULL,
    constrained_forecast int4 NULL
);
ALTER TABLE inventory_smart.alerts_product_level DROP CONSTRAINT IF EXISTS alerts_product_level_product_fk;
ALTER TABLE inventory_smart.alerts_product_level ADD CONSTRAINT alerts_product_level_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;

--changeset saumya.agnihotri:alerts_product_level_1 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-21638
--comment: new columns addition as per client request

alter table inventory_smart.alerts_product_level
add column IF NOT EXISTS uip_store_cnt int4 NULL,
add column IF NOT EXISTS uip_store_inv int4 NULL,
add column IF NOT EXISTS uisc_store_cnt int4 NULL,
add column IF NOT EXISTS uisc_store_inv int4 NULL;

--changeset swapnil.bhange:alerts_product_level_3 stripComments:false splitStatements:false context:Release_1_0 labels:123456
--comment: schema change for alerts_product_level_3
ALTER TABLE inventory_smart.alerts_product_level ADD COLUMN IF NOT EXISTS zfea_dc_oh int4 NULL;
ALTER TABLE inventory_smart.alerts_product_level ADD COLUMN IF NOT EXISTS zfea_balance_stores_six_weeks_forecast float4 NULL;
ALTER TABLE inventory_smart.alerts_product_level ADD COLUMN IF NOT EXISTS zfea_ecom_reserve float4 NULL;
ALTER TABLE inventory_smart.alerts_product_level ADD COLUMN IF NOT EXISTS zfea_ecom_sales_last_six_weeks int4 NULL;
ALTER TABLE inventory_smart.alerts_product_level ADD COLUMN IF NOT EXISTS zfsa_six_weeks_forecast float4 NULL;
ALTER TABLE inventory_smart.alerts_product_level ADD COLUMN IF NOT EXISTS zfsa_dc_oh int4 NULL;
ALTER TABLE inventory_smart.alerts_product_level ADD COLUMN IF NOT EXISTS zfsa_total_store_inventory float4 NULL;
ALTER TABLE inventory_smart.alerts_product_level ADD COLUMN IF NOT EXISTS zfsa_sales_last_six_weeks int4 NULL;
ALTER TABLE inventory_smart.alerts_product_level ADD COLUMN IF NOT EXISTS zero_forecast_ecom_alert int4 NULL;
ALTER TABLE inventory_smart.alerts_product_level ADD COLUMN IF NOT EXISTS zero_forecast_sku_alert int4 NULL;
ALTER TABLE inventory_smart.alerts_product_level ADD COLUMN IF NOT EXISTS zfsa_is_resolved int4 NULL;
ALTER TABLE inventory_smart.alerts_product_level ADD COLUMN IF NOT EXISTS zfea_is_resolved int4 NULL;

--changeset kakumanu.abhishek@impactanalytics.co:alerts_product_level_cf_alert stripComments:false splitStatements:false context:Release_1_0 labels:MTP-35049
--comment: schema change added column for constrained_forecast alert
ALTER TABLE inventory_smart.alerts_product_level ADD COLUMN IF NOT EXISTS cf_oh_it int4 NULL;
--changeset laraib.ahmad@impactanalytics.co:alerts_product_level_cf_alert stripComments:false splitStatements:false context:Release_1_0 labels:product_access_hierarchy
--comment:  added column for product_access_hierarchy 
ALTER TABLE inventory_smart.alerts_product_level ADD COLUMN IF NOT EXISTS product_access_hierarchy varchar NULL;