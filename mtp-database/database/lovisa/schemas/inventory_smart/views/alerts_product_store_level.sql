--liquibase formatted sql
--changeset swapnil.bhange:alerts_product_store_level runOnChange:true stripComments:false splitStatements:false context:zdt-views labels:MTP-1
--comment: initial changeset for alerts_product_store_level
--rollback: SELECT 1
do
$$
DECLARE 
	_is_view int;
	_is_table int;
begin

	select count(*) as cnt into _is_table
	from information_schema."tables" c  
	where table_name = 'alerts_product_store_level' and table_schema = 'inventory_smart' 
	and table_type = 'BASE TABLE';

	select count(*) as cnt into _is_view
	from information_schema."tables" c  
	where table_name = 'alerts_product_store_level' and table_schema = 'inventory_smart' 
	and table_type = 'VIEW';

	IF _is_table = 1 THEN 
	
		DROP TABLE IF EXISTS inventory_smart.alerts_product_store_level;
		--raise notice 'dropping table....';
		
	END IF;
	
	IF _is_view = 1 THEN 
	
		DROP VIEW IF EXISTS inventory_smart.alerts_product_store_level;
		--raise notice 'dropping view....';
		
	END IF;
	
    CREATE OR REPLACE VIEW inventory_smart.alerts_product_store_level
    AS SELECT alerts_product_store_level_version.version_code,
    alerts_product_store_level_version.l0_name,
    alerts_product_store_level_version.l1_name,
    alerts_product_store_level_version.l2_name,
    alerts_product_store_level_version.l3_name,
    alerts_product_store_level_version.l4_name,
    alerts_product_store_level_version.store_code,
    alerts_product_store_level_version.store_grade,
    alerts_product_store_level_version.product_code,
    alerts_product_store_level_version.first_weekly_predicted_qty,
    alerts_product_store_level_version.second_weekly_predicted_qty,
    alerts_product_store_level_version.third_weekly_predicted_qty,
    alerts_product_store_level_version.fourth_weekly_predicted_qty,
    alerts_product_store_level_version.next_4_weeks_predicted_qty,
    alerts_product_store_level_version.max_stock,
    alerts_product_store_level_version.is_resolved,
    alerts_product_store_level_version.forecast_over_max,
    alerts_product_store_level_version.article,
    alerts_product_store_level_version.launch_date,
    alerts_product_store_level_version.min_stock,
    alerts_product_store_level_version.style_name,
    alerts_product_store_level_version.store_name,
    alerts_product_store_level_version.range_name,
    alerts_product_store_level_version.store_type,
    alerts_product_store_level_version.lw_qty,
    alerts_product_store_level_version.oh,
    alerts_product_store_level_version.it,
    alerts_product_store_level_version.oo,
    alerts_product_store_level_version.tot_inv
   FROM inventory_smart.alerts_product_store_level_version
  WHERE alerts_product_store_level_version.version_code = global.get_table_version('inventory_smart.alerts_product_store_level_version'::text);


end;
$$;

