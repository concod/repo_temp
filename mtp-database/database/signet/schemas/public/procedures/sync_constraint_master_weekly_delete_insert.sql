--liquibase formatted sql
--changeset liquibase:kakumanu.abhishek runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:TPC_sp_2
--comment: optimised version of sync_constraint_master_weekly_delete_insert sp 
--rollback: SELECT 1 

DROP PROCEDURE IF EXISTS public.sync_constraint_master_weekly_delete_insert(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_constraint_master_weekly_delete_insert(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
AS $procedure$
declare _worker text;
		current_fiscal_year_week INT;
    	thirty_first_fyweek INT;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_constraint_master_weekly_delete_insert';
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

    	SELECT fiscal_year_week INTO thirty_first_fyweek
   	 	FROM global.fiscal_date_mapping
    	WHERE date = current_date + INTERVAL '30 weeks';
	    
		IF _is_historic 
		then
			select async_query into _worker
			from public.async_query('call global.build_list_partitions(''constraint_master_weekly'');');
			perform public.async_query_status(_worker, 'cleanup'); 
			raise notice 'Step1: %',(clock_timestamp() - _st);
		end if;
			select async_query into _worker
			from public.async_query('DELETE FROM inventory_smart.constraint_master_weekly where fiscal_year_week = ' || current_fiscal_year_week || ';');
			perform public.async_query_status(_worker, 'cleanup'); 
			raise notice 'Step2: %',(clock_timestamp() - _st);
		perform public.parellel_insert(
    	'WITH rows AS (
       		INSERT INTO inventory_smart.constraint_master_weekly (
          		l0_name, l1_name,fiscal_year_week,
            	product_code, store_code, wos, transit_time, safety_stock, ros, aps,
            	min_stock, max_stock, mapping_code, channel, flag,
				created_at,updated_at,updated_by,created_by,upload_flag
    		  )
    		  SELECT  
            	 x.l0_name,
                 x.l1_name,
            	 case 
	            	when x.fiscal_year_week % 100 = 52 then (x.fiscal_year_week / 100 + 1) * 100 + 1  
    	 			when x.fiscal_year_week % 100 = 53 then (x.fiscal_year_week / 100 + 1) * 100 + 1 
    				else x.fiscal_year_week + 1 
    			 end as fiscal_year_week,
            	 x.product_code, 
            	 x.store_code, 
            	 x.wos, 
            	 x.transit_time, 
            	 x.safety_stock,  
            	 x.ros, 
            	 x.aps,
            	 x.min_stock,
            	 x.max_stock,
            	 x.mapping_code,
            	 x.channel,
            	 x.flag,
				 x.created_at,
				 x.updated_at,
				 x.updated_by,
				 x.created_by,
            	 x.upload_flag 
    		 FROM inventory_smart.constraint_master_weekly x {where}
    	  	 and x.fiscal_year_week = ' || thirty_first_fyweek || ' RETURNING 1 
           	  )
           SELECT 
		  	 count(1) as cnt 
		   FROM 
		  	 rows;',
    	 50,
    	 'inventory_smart.constraint_master_weekly where fiscal_year_week = ' || thirty_first_fyweek, 
    	 'product_code', 
    	 null,
    	 500
);
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
