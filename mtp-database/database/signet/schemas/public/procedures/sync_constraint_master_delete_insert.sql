--liquibase formatted sql
--changeset liquibase:kakumanu.abhishek_abc runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:TPC_1_a
--comment: optimized version of sync_constraint_master_delete_insert sp1
--rollback: SELECT 1  

DROP PROCEDURE IF EXISTS public.sync_constraint_master_delete_insert(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_constraint_master_delete_insert(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
AS $procedure$
declare _worker text;
    current_fiscal_year_week INT;
    _l0_name text;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_constraint_master_delete_insert';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin 
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    SELECT fiscal_year_week INTO current_fiscal_year_week
    FROM global.fiscal_date_mapping
    WHERE date = current_date;
    if _is_historic then
        select async_query into _worker
        from public.async_query('call global.build_list_partitions(''constraint_master'');');
        perform public.async_query_status(_worker, 'cleanup'); 
        raise notice 'Step1: %',(clock_timestamp() - _st);
    end if;
    select async_query into _worker
    from public.async_query('Truncate table inventory_smart.constraint_master;'); 
    perform public.async_query_status(_worker, 'cleanup'); 
    raise notice 'Step2: %',(clock_timestamp() - _st);
    for _l0_name in select attribute_value from global.product_attributes pa where attribute_name = 'l0_name' group by 1 order by 1 loop
        raise notice '_l0_name: %', _l0_name;
        perform public.parellel_insert(
        'WITH rows AS (
           INSERT INTO inventory_smart.constraint_master ( 
               mapping_code,l0_name,channel,
               product_code,store_code,wos,transit_time,
               safety_stock,min_stock,
               max_stock,aps,ros,
               created_at,updated_at,updated_by,
               created_by,upload_flag
             ) 
             SELECT  
                pmps.mapping_code,
                pmps.l0_name,
                channel,
                product_code, 
                store_code, 
                wos, 
                transit_time, 
                safety_stock,  
                min_stock,
                max_stock,
                aps,
                ros, 
                cmw.created_at,
                cmw.updated_at,
                cmw.updated_by,
                cmw.created_by,
                upload_flag 
                FROM inventory_smart.constraint_master_weekly cmw left join global.product_mapping_product_store pmps using(product_code,store_code) {where}  
                and cmw.l0_name = ''' || _l0_name || ''' and pmps.l0_name = ''' || _l0_name || ''' and cmw.fiscal_year_week = ' || current_fiscal_year_week || ' RETURNING 1 
               )
            SELECT 
              count(1) as cnt 
            FROM 
              rows;',
            50,
            'inventory_smart.constraint_master_weekly where l0_name = ''' || _l0_name || ''' and fiscal_year_week = ' || current_fiscal_year_week, 
            'product_code',
            null,
            200 
        );
        raise notice 'Step3: %', (clock_timestamp() - _st);
    end loop;
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