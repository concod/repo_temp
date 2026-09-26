--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:sync_store_season_time_attribute_v1 runOnChange:true stripComments:false splitStatements:false context:VS_inv_smart labels:VPP-310
--comment: Updated sync_store_season_time_attribute for VS
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_store_season_time_attribute();
CREATE OR REPLACE PROCEDURE public.sync_store_season_time_attribute()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare 
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_store_season_time_attribute';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
 		_store_code varchar;
         _count int;
 	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 		---Sync Season master
 		begin
 		insert into global.season_master (name,
 		season_type,
 		season_status,
 		year,
 		season_start_date,
 		season_end_date)
 		select distinct season, 'Season' season_type, false  as  season_status, 
 		DATE_PART('year', season_start_date::date) as "year", season_start_date,season_end_date 
 		from 
 		public.store_status a
 		where not exists (select 'p' from  global.season_master sm
 		where sm."name" =a.season
 		);
         exception when others then 
         SELECT COUNT(*) INTO _count FROM global.season_master;
         if _count =0 then
             insert into global.season_master (name,
                         season_type,
                         season_status,
                         year,
                         season_start_date,
                         season_end_date)
             values ('General_season',
                     'General_season' ,
                     True,
                     DATE_PART('year', current_date) ,
                     current_date-365,
                     '2050-12-31');
                     
         end if; 
 		end;
 	---- build partition
 	
 		call global.build_list_partitions('store_time_attributes');
 	
 		for _store_code in 
 		select store_code from 
 			global.store_master sm
 			where 
 			exists (select 'p' from public.store_status a
 				where  a.store_code::varchar =sm.store_code 
 					)
 		Loop
 		insert into global.store_time_attributes 
 		(store_code,attribute_name,attribute_value, start_time, end_time)
 		    select x.store_code, 
 						x.attribute_name, 
-- 						case when 
--                         gsm.generic_column_datatype = 'varchar[]' then 
--                         array(select jsonb_array_elements_text(x.attribute_value::jsonb))::varchar else 
                         x.attribute_value
                          as attribute_value,
                         x.season_start_date,
 						x.season_end_date
                         from (
                         select store_code ,season_start_date,
                         season_end_date,
                         j.key as attribute_name, 
                         j.value as attribute_value
                         from(
                         select 
                         t.store_code,
                         t.season_start_date::date season_start_date,
                         t.season_end_date::date season_end_date,
                         to_jsonb(t) as j
                         from 
                         ( select
 					     a.*
 					from
 						public.store_status a 
 						) t
                         ) x, jsonb_each_text(j) as j
                         where value is not null
                         and key not in('store_code','season_start_date','season_end_date')
                         )x
                        join global.storeseason_generic_schema_mapping gsm
                         on x.attribute_name =  'status'  
                      where 1=1
                       and store_code::varchar =_store_code  
                       ON CONFLICT (store_code, start_time,end_time, attribute_name)
 						do update 
 						set attribute_value = EXCLUDED.attribute_value;
                       
                      
                --commit ;
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
