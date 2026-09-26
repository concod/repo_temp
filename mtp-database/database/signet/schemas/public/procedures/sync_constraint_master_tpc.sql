--liquibase formatted sql
--changeset liquibase:sri.harsha_daily_sp_fix runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-44526_4
--comment: build list partitions to daily
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_constraint_master_tpc(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_constraint_master_tpc(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
AS $procedure$
declare _worker text;
	_l0 text;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_constraint_master_tpc';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin 
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    -- if _is_historic 
    -- then
        select async_query into _worker
        from public.async_query('call global.build_list_partitions(''constraint_master_weekly'');');
        perform public.async_query_status(_worker, 'cleanup'); 
        raise notice 'Step1: %',(clock_timestamp() - _st);
    -- end if;
	for _l0 in select 
						l0_name
					  from 
						global.product_attributes_filter where l0_name in (select l0_name from public.constraint_master_weekly)
					  group by 
						1
					  order by 1 loop
    perform public.parellel_insert(
    'WITH rows AS (
       INSERT INTO inventory_smart.constraint_master_weekly (
          fiscal_year_week, l0_name, l1_name, channel, 
          product_code,store_code,wos,transit_time, safety_stock, 
          min_stock,max_stock, aps,ros, flag, mapping_code,upload_flag 
        )

        SELECT 
          x.fiscal_year_week,
          pmps.l0_name,
          case when pmps.l0_name is not null then x.l1_name else null end,
          x.channel, 
          x.product_code, 
          x.store_code, 
          x.wos, 
          x.transit_time, 
          x.safety_stock, 
          coalesce(x.min_stock, 0) as min_stock,
          coalesce(x.max_stock, 0) as max_stock, 
          x.aps, 
          x.ros,
          x.flag,
          pmps.mapping_code,
		  upload_flag 
        FROM 
          (select * from public.constraint_master_weekly {where} and l0_name = ''' || _l0 || ''') x 
          inner join (select mapping_code, l0_name, product_code, store_code from global.product_mapping_product_store where l0_name = ''' || _l0 || ''') pmps 
		  using(product_code, store_code)
		  on conflict do nothing
		  RETURNING 1
      ) 
        SELECT 
          count(1) as cnt 
        FROM 
          rows;',
    50,
    'public.constraint_master_weekly where l0_name = ''' || _l0 || '''', 
    'product_code',
    null,
    100
);
end loop;
raise notice 'Step3: %',
(clock_timestamp() - _st);
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