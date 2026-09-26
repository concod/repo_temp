--liquibase formatted sql
--changeset aman.lakkoju:modelled_flag added runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-26861
--comment: modelled_flag added
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS sync_oms_drop_ship_projections(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_oms_drop_ship_projections(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_drop_ship_projections';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	if _is_historic then 
            delete from 
              inventory_smart.oms_drop_ship_forecast_projection 
            where 
              true;
        end if;
       
    delete from inventory_smart.oms_drop_ship_forecast_projection 
	where concat(product_code,'-',loc_code,'-',fiscal_year_month) in 
	(select distinct concat(a.product_code,'-',a.loc_code,'-',fiscal_year_month) as key from inventory_smart.oms_drop_ship_forecast_projection as a
	left join (select distinct cast(product_code as varchar) as product_code,cast(location as varchar) as loc_code
			   from public.oms_drop_ship_forecast_projection ) as b
	using(product_code,loc_code)
	
	left join (select distinct fiscal_year_month
			   from public.oms_drop_ship_forecast_projection ) as c
	using(fiscal_year_month)
	
	where b.product_code is null or c.fiscal_year_month is null);

    delete from inventory_smart.oms_drop_ship_forecast_projection 
    where updated_at is null;
   
    INSERT INTO inventory_smart.oms_drop_ship_forecast_projection
	(product_code, 
	loc_code, 
	vendor_code, 
	fiscal_year_month, 
	fiscal_month_name, 
	predictions, 
	total_cost, 
	created_by,
    created_at,
    updated_by,
    updated_at,
	adjusted_predictions, 
	adjusted_total_cost,
	unit_cost,
	sku_vendor_id,
	modelled_flag)
	
	SELECT product_code, 
	"location",
	vendor_code,
	fiscal_year_month,
	fiscal_month_name, 
	predictions, 
	total_cost, 
	3 as created_by,
    current_timestamp as created_at,
    null as updated_by,
    null as updated_at,
    predictions,
	total_cost,
	cost,
	product_code||'_'||vendor_code,
	modelled_flag
	FROM public.oms_drop_ship_forecast_projection
	on conflict ON CONSTRAINT uk_oms_drop_ship_forecast_projection do update
	set predictions = excluded.predictions,
		created_at = current_timestamp,
		created_by = 3,
		sku_vendor_id = excluded.product_code||'_'||excluded.vendor_code,
		modelled_flag = excluded.modelled_flag,
		total_cost = excluded.total_cost,
		unit_cost = excluded.unit_cost,
		adjusted_predictions = case when oms_drop_ship_forecast_projection.is_reverted = true then excluded.predictions else oms_drop_ship_forecast_projection.adjusted_predictions end,
		adjusted_total_cost = case when oms_drop_ship_forecast_projection.is_reverted = true then excluded.total_cost else oms_drop_ship_forecast_projection.adjusted_total_cost end;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
	END
$procedure$
;
