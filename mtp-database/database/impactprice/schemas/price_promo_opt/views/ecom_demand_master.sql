--liquibase formatted sql
--changeset mohan.krishna@impactanalytics.co:ecom_demand_master_v1 runAlways:true stripComments:false splitStatements:false context:ecom_demand_master labels:ecom_demand_master
--comment: adding channel column to ecom_demand_master
--rollback: SELECT 1

-- block_start1
DROP VIEW IF EXISTS price_promo_opt.ecom_demand_master;
-- block_end

CREATE OR REPLACE VIEW price_promo_opt.ecom_demand_master
AS SELECT order_date,
    order_type,
    order_id,
    total_paid_amount,
    total_line_discount_amount,
    total_overall_discount_amount,
    total_effective_discount_amount,
    total_demand_units,
    total_canceled_units,
    total_net_units,
    universal_sku_number,
    universal_customer_choice_number,
    total_current_price_net,
    total_original_price_net
   FROM price_promo_opt.ecom_demand_master_version
  WHERE version_code = global.get_table_version('price_promo_opt.ecom_demand_master_version'::text);
