--liquibase formatted sql
--changeset liquibase:sync_product_unit_definition runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_product_unit_definition
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_product_unit_definition();
CREATE OR REPLACE PROCEDURE public.sync_product_unit_definition()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_product_unit_definition';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		INSERT INTO "global".product_unit_definitions (
		  "name", description, definition_type, 
		  pack_quantity, metric_type, source_pud_code
		) 
		SELECT 
		  "name", 
		  description, 
		  definition_type, 
		  pack_quantity, 
		  metric_type, 
		  pud_code 
		FROM 
		  public.product_unit_definitions on conflict(source_pud_code) do 
		update 
		set 
		  "name" = excluded."name", 
		  description = excluded.description, 
		  definition_type = excluded.definition_type, 
		  pack_quantity = excluded.pack_quantity, 
		  metric_type = excluded.metric_type;
		INSERT INTO "global".product_unit_definition_metrics (
		  pud_code, "size", color, value, product_code
		) 
		SELECT 
		  pud.pud_code, 
		  pas.attribute_value, 
		  pac.attribute_value, 
		  quantity, 
		  product_code 
		FROM 
		  public.product_unit_definition_metrics x 
		  join "global".product_unit_definitions pud on x.pud_code = pud.source_pud_code 
		  left join (
		    select 
		      * 
		    from 
		      global.product_attributes 
		    where 
		      attribute_name = 'size'
		  ) pas using(product_code) 
		  left join (
		    select 
		      * 
		    from 
		      global.product_attributes 
		    where 
		      attribute_name = 'color'
		  ) pac using(product_code) on conflict(pud_code, product_code) do 
		update 
		set 
		  "size" = excluded."size", 
		  color = excluded.color, 
		  value = excluded.value;
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
