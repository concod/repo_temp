--liquibase formatted sql
--changeset swapnil.bhange-2:sync_product_store_attributes_filter_v3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:0078
--comment: added active = True condition in sync_product_store_attributes_filter SP
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_product_store_attributes_filter();
DROP PROCEDURE IF EXISTS public.sync_product_store_attributes_filter(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_product_store_attributes_filter(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
AS $procedure$
declare
		_worker text;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_product_store_attributes_filter';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		if _is_historic then 
	 		select async_query into _worker from public.async_query('TRUNCATE global.product_store_attributes_filter;');
			perform public.async_query_status(_worker, 'cleanup');
			raise notice 'Step1: %', (clock_timestamp() - _st);
 		end if;
		perform public.parellel_insert( 'WITH rows AS (
        insert into global.product_store_attributes_filter (psa_code,
    l0_code,
    l0_name,
    l1_code,
    l1_name,
    l3_code,
    l3_name,
    l4_code,
    l4_name,
    store_code,
    psa_name,
    l0_status,
    allocation_status_flag,
    store_group_description,
	store_hierarchy_level)
  SELECT
  a.psa_code,
  a.l0_code,
  a.l0_name,
  a.l1_code,
  a.l1_name,
  a.l3_code,
  a.l3_name,
  a.l4_code,
  a.l4_name,
  a.store_code,
  a.psa_name,
  b.l0_status,
  b.allocation_status_flag,
  a.store_group,
	''{psa_name}''::text[] as store_hierarchy_level
FROM
  public.product_store_attributes_filter a join (select l0_name, l0_status, allocation_status_flag from "global".product_attributes_filter
where not is_deleted and active = True
group by 1,2,3) b 
using(l0_name)
 {where}
  ON conflict DO nothing RETURNING 1
		) 
		SELECT 
		  count(1) as cnt 
		FROM 
		  rows;', 50, 'public.product_store_attributes_filter', 'l0_name', 'psaf_l0_idx');
		raise notice 'Step2: %', (clock_timestamp() - _st);

    -- Step 3: Clear rcl_psa_config_table
    TRUNCATE TABLE "inventory_smart".rcl_psa_config_table;

    -- Step 4: Insert data into rcl_psa_config_table
    INSERT INTO "inventory_smart".rcl_psa_config_table (
        l0_name,
        l0_id,
        l1_name,
        l1_id,
        l3_name,
        l3_id,
        l4_name,
        l4_id,
        psa_name,
        psa_code,
        sub_psa_code,
        updated_at
    )
    SELECT DISTINCT
        l0_name,
        l0_code,
        l1_name,
        l1_code,
        l3_name,
        l3_code,
        l4_name,
        l4_code,
        psa_name,
        psa_code,
        psa_name,
        now()
    FROM global.product_store_attributes_filter x
    ON CONFLICT DO NOTHING;

		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end;
$procedure$
;
