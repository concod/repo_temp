--liquibase formatted sql
--changeset vivek.subramanya@impactanalytics.co:remove_cross_country_restricted_from_sdm_v3 runOnChange:true stripComments:false splitStatements:false context:New_Sync_Stratgy labels:MTP-26092
--comment: updated changeset for remove_cross_country_restricted_from_sdm with added condition
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.remove_cross_country_restricted_from_sdm();
CREATE OR REPLACE PROCEDURE public.remove_cross_country_restricted_from_sdm()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.remove_cross_country_restricted_from_sdm';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
UPDATE
  global.product_mapping_store_dc
SET
  is_active = FALSE
WHERE
  CONCAT(store_code,dc_code) IN (
 SELECT
    CONCAT(s.store_code,s.dc_code)
  FROM ( 
  select s.store_code,s.dc_code  ,saf.country,saf2.country  from "global".product_mapping_store_dc  s
left join "global".store_attributes_filter saf using(store_code)
left join "global".store_attributes_filter saf2 on s.dc_code =saf2.dc_code 
where 
s.is_active and
    upper(CONCAT(saf.s1_id,saf2.s1_id)) NOT IN ('USPR','PRUS')
    and saf.s1_id != saf2.s1_id
    and saf2.channel != 'RLS'
      ) s
)
;
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
