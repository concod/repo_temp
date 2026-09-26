--liquibase formatted sql
--changeset swapnil.bhange:alerts_product_level runOnChange:true stripComments:false splitStatements:false context:zdt-views labels:MTP-1
--comment: initial changeset for alerts_product_level
--rollback: SELECT 1
do
$$
DECLARE 
	_is_view int;
	_is_table int;
begin

	select count(*) as cnt into _is_table
	from information_schema."tables" c  
	where table_name = 'alerts_product_level' and table_schema = 'inventory_smart' 
	and table_type = 'BASE TABLE';

	select count(*) as cnt into _is_view
	from information_schema."tables" c  
	where table_name = 'alerts_product_level' and table_schema = 'inventory_smart' 
	and table_type = 'VIEW';

	IF _is_table = 1 THEN 
	
		DROP TABLE IF EXISTS inventory_smart.alerts_product_level;
		--raise notice 'dropping table....';
		
	END IF;
	
	IF _is_view = 1 THEN 
	
		DROP VIEW IF EXISTS inventory_smart.alerts_product_level;
		--raise notice 'dropping view....';
		
	END IF;
	
	CREATE OR REPLACE VIEW inventory_smart.alerts_product_level
    AS SELECT alerts_product_level_version.product_code,
    alerts_product_level_version.l0_name,
    alerts_product_level_version.l1_name,
    alerts_product_level_version.l2_name,
    alerts_product_level_version.l3_name,
    alerts_product_level_version.l4_name,
    alerts_product_level_version.channel,
    alerts_product_level_version.excs_flg,
    alerts_product_level_version.shrtfl_flg,
    alerts_product_level_version.stckout_flg,
    alerts_product_level_version.excess,
    alerts_product_level_version.shortfall,
    alerts_product_level_version.stockout,
    alerts_product_level_version.normal,
    alerts_product_level_version.oh,
    alerts_product_level_version.it,
    alerts_product_level_version.oo,
    alerts_product_level_version.lw_qty,
    alerts_product_level_version.lw_revenue,
    alerts_product_level_version.lw_margin,
    alerts_product_level_version.promo_percentage,
    alerts_product_level_version.dos,
    alerts_product_level_version.size_integrity,
    alerts_product_level_version.week_to_date_sales,
    alerts_product_level_version.last_day_sales,
    alerts_product_level_version.oh_dc,
    alerts_product_level_version.sales_1_ago,
    alerts_product_level_version.sales_2_ago,
    alerts_product_level_version.sales_3_ago,
    alerts_product_level_version.sales_4_ago,
    alerts_product_level_version.aur,
    alerts_product_level_version.clearance_alert_flg,
    alerts_product_level_version.newly_launched_alert_flg,
    alerts_product_level_version.number_of_allocations,
    alerts_product_level_version.dos_oh,
    alerts_product_level_version.dos_oh_it,
    alerts_product_level_version.tot_inv,
    alerts_product_level_version.launch_date,
    alerts_product_level_version.recent_deviation_flg,
    alerts_product_level_version.repeat_deviation_flg,
    alerts_product_level_version.new_deviation_flg,
    alerts_product_level_version.article,
    alerts_product_level_version.style_name,
    alerts_product_level_version.range_name
   FROM inventory_smart.alerts_product_level_version
  WHERE alerts_product_level_version.version_code = global.get_table_version('inventory_smart.alerts_product_level_version'::text);


end;
$$;
