--liquibase formatted sql
--changeset shreyansh.pathak@impactanalytics.co:sp_get_lf_info runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: initial changeset for sp_get_lf_info
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.sp_get_lf_info();

CREATE OR REPLACE FUNCTION item_smart.sp_get_lf_info()
RETURNS TABLE(
    "Year week" character varying,
    "Channel" character varying,
    "Customer Group" character varying,
    "Category" character varying,
    "Style Color" character varying,
    "BOP U" numeric,
    "BOP $" numeric,
    "BOP AUC" numeric,
    "Sls $" numeric,
    "Sls U" numeric,
    "AIR" numeric,
    "DR%" numeric,
    "IMU%" numeric,
    "AUR" numeric,
    "COGS" numeric,
    "AUC" numeric,
    "GM %" numeric,
    "GM $" numeric,
    "Rec Rcpt Cost" numeric,
    "Rec Rcpt U" numeric,
    "Total Rcpt $" numeric,
    "Total Rcpt U" numeric,
    "OO $ (Total-P)" numeric,
    "OO Units (Total-P)" numeric,
    "OO AUC (Total-P)" numeric,
    "OO $ (Total - UP)" numeric,
    "OO Units (Total - UP)" numeric,
    "OO AUC (Total-UP)" numeric,
    "EOP Units" numeric,
    "EOP $" numeric,
    "EOP AUC" numeric,
    "FWOS" numeric,
    "Return%" numeric,
    "Return U" numeric,
    "Damage Rate%" numeric,
    "Return Inv" numeric,
    "Return $" numeric,
    "Net Sls $" numeric,
    "Net Sls U" numeric,
    "Committed Orders" numeric
)
LANGUAGE plpgsql
AS $function$
BEGIN
RETURN QUERY
SELECT 
    a.current_week::VARCHAR as "Year week", 
    a.channel::VARCHAR as "Channel", 
    a.sub_channel::VARCHAR as "Customer Group", 
    a.dept::VARCHAR as "Category", 
    b.article::VARCHAR as "Style Color", 
    a.bop_units::NUMERIC as "BOP U", 
    (a.written_aur * a.bop_units)::NUMERIC as "BOP $", 
    a.bop_auc::NUMERIC as "BOP AUC", 
    a.written_sales_dollars::NUMERIC as "Sls $", 
    a.written_sales_units::NUMERIC as "Sls U", 
    a.written_air::NUMERIC as "AIR", 
    a.written_dr_perc::NUMERIC as "DR%", 
    a.written_imu::NUMERIC as "IMU%", 
    a.written_aur::NUMERIC as "AUR", 
    a.written_sales_cost::NUMERIC as "COGS", 
    a.written_auc::NUMERIC as "AUC", 
    a.written_gm_perc::NUMERIC as "GM %", 
    a.written_gm_dollar::NUMERIC as "GM $", 
    a.recomm_receipt_cost::NUMERIC as "Rec Rcpt Cost", 
    a.recomm_receipt_units::NUMERIC as "Rec Rcpt U", 
    a.total_receipt_cost::NUMERIC as "Total Rcpt $", 
    a.total_receipt_units::NUMERIC as "Total Rcpt U", 
    a.on_order_placed_total::NUMERIC as "OO $ (Total-P)", 
    a.on_order_placed_total_unit::NUMERIC as "OO Units (Total-P)", 
    a.on_order_placed_total_auc::NUMERIC as "OO AUC (Total-P)", 
    a.on_order_unplaced_total::NUMERIC as "OO $ (Total - UP)", 
    a.on_order_unplaced_total_unit::NUMERIC as "OO Units (Total - UP)", 
    a.on_order_unplaced_total_auc::NUMERIC as "OO AUC (Total-UP)", 
    a.eop_units::NUMERIC as "EOP Units",
    (a.written_aur * a.eop_units)::NUMERIC as "EOP $", 
    a.eop_auc::NUMERIC as "EOP AUC", 
    a.bop_fwos_units::NUMERIC as "FWOS", 
    a.return_perc::NUMERIC as "Return%", 
    a.return_units::NUMERIC as "Return U", 
    a.damage_rate_perc::NUMERIC as "Damage Rate%", 
    a.return_inv::NUMERIC as "Return Inv", 
    a.return_dollars::NUMERIC as "Return $", 
    a.net_sales_dollars::NUMERIC as "Net Sls $", 
    a.net_sales_units::NUMERIC as "Net Sls U", 
    a.committed_orders::NUMERIC as "Committed Orders"
FROM item_smart.lf_master a
JOIN item_smart.mv_product_hierarchies_filter b
ON a.hierarchy_code = b.hierarchy_code
WHERE a.created_at >= NOW() - INTERVAL '1 day';
END;
$function$;