--liquibase formatted sql
--changeset pradeep.kumar@impactanalytics.co:adding_new_sp_test runOnChange:true stripComments:false splitStatements:false context:Release_1_1 
--comment: adding sp to update moq values in oms kpi

DROP PROCEDURE IF EXISTS public.sync_oms_moq_kpi(bool);

CREATE OR REPLACE PROCEDURE public.sync_oms_moq_kpi(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_moq_kpi';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		update 
			inventory_smart.oms_kpi ok
		set 
			min_order_quantity_style=x.min_order_quantity_style,
			max_order_quantity_style=x.max_order_quantity_style,
			min_order_quantity_sku=x.min_order_quantity_sku,
			max_order_quantity_sku=x.max_order_quantity_sku,
			min_order_quantity_shipment=x.min_order_quantity_shipment,
			max_order_quantity_shipment=x.max_order_quantity_shipment
		from
			(
				select
					product_code,
					loc_code,
					channel,
					vendor_code,
					fiscal_year_week,
					min_order_quantity_style,
					max_order_quantity_style,
					min_order_quantity_sku,
					max_order_quantity_sku,
					min_order_quantity_shipment,
					max_order_quantity_shipment
				from
					public.oms_recommendation_input_data
			)x
		where 
			ok.product_code=x.product_code
			and ok.loc_code=x.loc_code
			and ok.channel=x.channel
			and ok.vendor_code=x.vendor_code
			and ok.year_week=x.fiscal_year_week;
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