--liquibase formatted sql
--changeset liquibase:sync_model_stock stripComments:false runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_model_stock
DROP PROCEDURE IF EXISTS public.sync_model_stock(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_model_stock(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_model_stock';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
        if _is_historic then 
            delete from 
              inventory_smart.model_stock 
            where 
              true;
            end if;
            insert into inventory_smart.model_stock (
                         product_code
                        ,product_description
                        ,store_code
                        ,store_description
                        ,date
                        ,article_status_tag
                        ,eligibility
                        ,fiscal_week_end_date
                        ,fiscal_year_week
                        ,min
                        ,max
                        ,wos
                        ,ia_forecasts_store_wos
                        ,adjusted_forecasts_store_wos
                        ,model_stock_before
                        ,model_stock_after
                        ,model_stock
                        ,constrained_flag
                        ,sku_store_constrained_flag
                        ,is_resolved
        ) 
        SELECT 
         product_code
        ,product_description
        ,store_code
        ,store_description
        ,date
        ,article_status_tag
        ,eligibility
        ,fiscal_week_end_date
        ,fiscal_year_week
        ,min
        ,max
        ,wos
        ,ia_forecasts_store_wos
        ,adjusted_forecasts_store_wos
        ,model_stock_before
        ,model_stock_after
        ,model_stock
        ,constrained_flag
        ,sku_store_constrained_flag
        ,is_resolved
        FROM 
          public.model_stock;
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
