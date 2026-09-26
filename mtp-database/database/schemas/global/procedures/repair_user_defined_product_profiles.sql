--liquibase formatted sql
--changeset liquibase:repair_user_defined_product_profiles runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for repair_user_defined_product_profiles
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS global.repair_user_defined_product_profiles();
CREATE OR REPLACE PROCEDURE global.repair_user_defined_product_profiles()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.repair_user_defined_product_profiles';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	_pp_code int;
	_product_filters jsonb;
	_store_filters jsonb;
	_query_pa text;
	_query_sa text;
	_ph_codes int[];
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
for _pp_code, 
_product_filters, 
_store_filters in 
select 
  x.pp_code, 
  x.product_filters, 
  y.store_filters 
from 
  (
    select 
      pp_code, 
      attribute_value :: jsonb as product_filters 
    from 
      inventory_smart.product_profile_attributes 
    where 
      attribute_name = 'product_hierarchy_filters'
  ) x 
  join (
    select 
      pp_code, 
      attribute_value :: jsonb as store_filters 
    from 
      inventory_smart.product_profile_attributes 
    where 
      attribute_name = 'store_hierarchy_filters'
  ) y using(pp_code) 
order by 
  x.pp_code asc loop _query_pa := inventory_smart.form_main_table_filters('ph_master', _product_filters);
_query_sa := "global".form_attribute_table_filters_v2(
  'store_attributes', 'store_code', 
  _store_filters
);
execute 'select 
      array_agg(distinct pa.ph_code)
    from 
      (
        select 
          * 
        from 
          inventory_smart.ph_master ' || _query_pa || '
      ) pa 
      join "global".product_mapping_product_store pmps on pmps.product_code = any(pa.product_codes) 
      join (' || _query_sa || ') sa on sa.store_code = pmps.store_code
    ' into _ph_codes;
UPDATE 
  inventory_smart.product_profile_attributes 
SET 
  attribute_value = _ph_codes 
WHERE 
  attribute_name = 'ph_codes' 
  and pp_code = _pp_code;
end loop;
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
