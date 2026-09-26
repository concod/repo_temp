-- liquibase formatted sql
-- changeset kaustubh.gupta:sync_dc_split_ratio runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_dc_split_ratio
-- comment: initial changeset sync_dc_split_ratio

DROP PROCEDURE IF EXISTS public.sync_dc_split_ratio(bool);
CREATE OR REPLACE PROCEDURE public.sync_dc_split_ratio(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_dc_split_ratio';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  if _is_historic then 
            delete from 
              inventory_smart.dc_split_ratio
            where 
              true;
        end if;
INSERT INTO inventory_smart.dc_split_ratio(
	article, 
	product_code, 
	"size", 
	loc_code, 
	channel, 
	fiscal_year_week, 
	penetration
)
SELECT 
	src.article, 
	src.product_code, 
	src."size", 
	src.loc_code, 
	src.channel, 
	src.fiscal_year_week,
	src.penetration
FROM public.oms_dc_split_ratio AS src
ON CONFLICT (product_code, loc_code, channel, fiscal_year_week)
DO UPDATE 
SET 
	article=EXCLUDED.article, 
	"size"=EXCLUDED."size", 
	penetration=EXCLUDED.penetration;
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
