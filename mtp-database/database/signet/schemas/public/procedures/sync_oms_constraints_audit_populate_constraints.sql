--liquibase formatted sql
--changeset liquibase:oms_constraints_audit_populate_constraints runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-25569
--comment: initial changeset for oms_constraints_audit_populate_constraints
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS inventory_smart.oms_constraints_audit_populate_constraints();
CREATE OR REPLACE PROCEDURE inventory_smart.oms_constraints_audit_populate_constraints()
 LANGUAGE plpgsql
 security definer
 AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'inventory_smart.oms_constraints_audit_populate_constraints';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 delete from inventory_smart.oms_constraints_audit where true;
INSERT INTO inventory_smart.oms_constraints_audit
(id, product_code, loc_code, vendor_code, column_name, table_name, old_value, new_value, updated_by, updated_at, fical_year_week, fiscal_year_month)
 
SELECT nextval('inventory_smart.oms_constraints_audit_id_seq'::regclass) as id, product_code, loc_code, vendor_code, column_name, table_name, '' as old_value, new_value, updated_by, updated_at, cast(fiscal_year_week as int) as fical_year_week, cast(fiscal_year_month as int) fiscal_year_month from 
(
(select loc_code,product_code,updated_at,updated_by,vendor_code,null as fiscal_year_week, null as fiscal_year_month,cast(lead_time as varchar) as new_value,'oms_constraints_lead_time' as table_name,'lead_time' as column_name from inventory_smart.oms_constraints_lead_time where updated_at is not null) union all 
(select loc_code,product_code,updated_at,updated_by,vendor_code,null as fiscal_year_week, null as fiscal_year_month,cast(variance as varchar) as new_value,'oms_constraints_lead_time' as table_name,'variance' as column_name from inventory_smart.oms_constraints_lead_time where updated_at is not null) union all 
(select '' as loc_code,product_code,updated_at,updated_by,'' as vendor_code,null as fiscal_year_week, null as fiscal_year_month,coalesce(cast(frequency as varchar),'') as new_value,'oms_constraints_order_policy' as table_name,'frequency' as column_name from inventory_smart.oms_constraints_order_policy where updated_at is not null) union all 
(select '' as loc_code,product_code,updated_at,updated_by,'' as vendor_code,null as fiscal_year_week, null as fiscal_year_month,cast(lot_sizing_strategy as varchar) as new_value,'oms_constraints_order_policy' as table_name,'lot_sizing_strategy' as column_name from inventory_smart.oms_constraints_order_policy where updated_at is not null) union all 
(select '' as loc_code,product_code,updated_at,updated_by,'' as vendor_code,null as fiscal_year_week, null as fiscal_year_month,cast(order_cycle as varchar) as new_value,'oms_constraints_order_policy' as table_name,'order_cycle' as column_name from inventory_smart.oms_constraints_order_policy where updated_at is not null) union all 
(select '' as loc_code,product_code,updated_at,updated_by,'' as vendor_code,null as fiscal_year_week, null as fiscal_year_month,cast(replenishment_strategy as varchar) as new_value,'oms_constraints_order_policy' as table_name,'replenishment_strategy' as column_name from inventory_smart.oms_constraints_order_policy where updated_at is not null) union all 
(select '' as loc_code,product_code,updated_at,updated_by,'' as vendor_code,null as fiscal_year_week, null as fiscal_year_month,cast(wos as varchar) as new_value,'oms_constraints_order_policy' as table_name,'wos' as column_name from inventory_smart.oms_constraints_order_policy where updated_at is not null) union all 
(select '' as loc_code,product_code,updated_at,updated_by,vendor_code,null as fiscal_year_week, null as fiscal_year_month,cast(max_order_quantity as varchar) as new_value,'oms_constraints_ordering' as table_name,'max_order_quantity' as column_name from inventory_smart.oms_constraints_ordering where updated_at is not null) union all 
(select '' as loc_code,product_code,updated_at,updated_by,vendor_code,null as fiscal_year_week, null as fiscal_year_month,cast(min_order_quantity as varchar) as new_value,'oms_constraints_ordering' as table_name,'min_order_quantity' as column_name from inventory_smart.oms_constraints_ordering where updated_at is not null) union all 
(select loc_code,product_code,updated_at,updated_by,'' as vendor_code,null as fiscal_year_week, null as fiscal_year_month,cast(qc_time as varchar) as new_value,'oms_constraints_qc_time' as table_name,'qc_time' as column_name from inventory_smart.oms_constraints_qc_time where updated_at is not null) union all 
(select loc_code,product_code,updated_at,updated_by,'' as vendor_code,null as fiscal_year_week, null as fiscal_year_month,cast(inventory_hold as varchar) as new_value,'oms_constraints_safety_stock' as table_name,'inventory_hold' as column_name from inventory_smart.oms_constraints_safety_stock where updated_at is not null) union all 
(select loc_code,product_code,updated_at,updated_by,'' as vendor_code,null as fiscal_year_week, null as fiscal_year_month,cast(max_stock_units as varchar) as new_value,'oms_constraints_safety_stock' as table_name,'max_stock_units' as column_name from inventory_smart.oms_constraints_safety_stock where updated_at is not null) union all 
(select loc_code,product_code,updated_at,updated_by,'' as vendor_code,null as fiscal_year_week, null as fiscal_year_month,cast(safety_stock_method as varchar) as new_value,'oms_constraints_safety_stock' as table_name,'safety_stock_method' as column_name from inventory_smart.oms_constraints_safety_stock where updated_at is not null) union all 
(select loc_code,product_code,updated_at,updated_by,'' as vendor_code,null as fiscal_year_week, null as fiscal_year_month,cast(service_level_pct as varchar) as new_value,'oms_constraints_safety_stock' as table_name,'service_level_pct' as column_name from inventory_smart.oms_constraints_safety_stock where updated_at is not null) union all 
(select loc_code,product_code,updated_at,updated_by,'' as vendor_code,null as fiscal_year_week, null as fiscal_year_month,cast(stock_units as varchar) as new_value,'oms_constraints_safety_stock' as table_name,'stock_units' as column_name from inventory_smart.oms_constraints_safety_stock where updated_at is not null) union all 
(select loc_code,product_code,updated_at,updated_by,vendor_code,null as fiscal_year_week, null as fiscal_year_month,cast(preferred_status as varchar) as new_value,'oms_constraints_status' as table_name,'preferred_status' as column_name from inventory_smart.oms_constraints_status where updated_at is not null) union all 
(select loc_code,product_code,updated_at,updated_by,vendor_code,null as fiscal_year_week, null as fiscal_year_month,cast(status as varchar) as new_value,'oms_constraints_status' as table_name,'status' as column_name from inventory_smart.oms_constraints_status where updated_at is not null)
) as a;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end
$procedure$
;