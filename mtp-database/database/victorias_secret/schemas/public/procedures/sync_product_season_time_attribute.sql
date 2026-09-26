--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:sync_product_season_time_attribute_v1 runOnChange:true stripComments:false splitStatements:false context:VS_Inv_smart labels:VPP-310
--comment: Updated sync_product_season_time_attribute for VS
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_product_season_time_attribute();
CREATE OR REPLACE PROCEDURE public.sync_product_season_time_attribute()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare 
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_product_season_time_attribute';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
 		_product_code varchar;
		_l0_name varchar;
         _count int;
        	_indx_cnt int;
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
 		select distinct season, 'Season' season_type, true  as  season_status, 
 		DATE_PART('year', season_start_date::date) as "year", season_start_date,season_end_date 
 		from 
 		public.productseason_validated_table a
 		where not exists (select 'p' from  global.season_master sm
 		where sm."name" =a.season
 		);
        exception when others then 
         SELECT COUNT(*) 
         	INTO _count 
        	FROM global.season_master;
        
 	        if _count =0 then
 	            insert into global.season_master (name,
 	                        season_type,
 	                        season_status,
 	                        year,
 	                        season_start_date,
 	                        season_end_date)
 	            values ('General_season',
 		                'General_season' ,
 	                    true ,
 	                    DATE_PART('year', current_date) ,
 	                    (current_date-365)::date ,
 	                    '2050-12-31'::date );
 	                    
 	        end if; 
 		end;
 	---- build partition
 	
 	
 		call global.build_list_partitions('product_time_attributes');
 		
 		select count(1) into _indx_cnt
 		from pg_catalog.pg_indexes pi2 where indexname ='productseason_validated_table_idx';
 		
 		if _indx_cnt =0 then
 		execute 'create index productseason_validated_table_idx on public.productseason_validated_table(product_code)';
 		end if;
 		 
 		/*for _product_code,_l0_name in 
 		select paf.product_code, paf.l0_name from 
 			 global.product_attributes_filter paf 
			where 
			1=1
 			and exists (select 'p' from public.productseason_validated_table a
 				where a.product_code::varchar =paf.product_code
				-- and feed_updated_date >= current_date
				)
-- 			and not exists 
-- 			(select 'p' from global.product_time_attributes b
-- 			where  b.product_code =paf.product_code
-- 			 )
 			 order by 2,1
 		Loop*/
 		insert into global.product_time_attributes 
 		(product_code,attribute_name,attribute_value, start_time, end_time, l0_name )
 		     select x.product_code, 
 						x.attribute_name, 
 						case when 
                         gsm.generic_column_datatype = 'varchar[]' then 
                         array(select jsonb_array_elements_text(x.attribute_value::jsonb))::varchar else x.attribute_value
                         end as attribute_value,
                         x.season_start_date,
 						x.season_end_date,
						x.l0_name
                         from (
                         select product_code ,season_start_date,
                         season_end_date,
                         l0_name,
                         j.key as attribute_name, 
                         j.value as attribute_value
                         from(
                         select 
                         t.l0_name ,
                         t.product_code,
                         t.season_start_date::date season_start_date,
                         t.season_end_date::date season_end_date,
                         to_jsonb(t) as j
                         from 
                         ( select
 					     a.*,
 					     b.l0_name
 					from
 						public.productseason_validated_table a 
 						join global.product_attributes_filter b
 						on a.product_code::varchar =b.product_code
 						) t
                         ) x, jsonb_each_text(j) as j
                         where value is not null
                         and key not in('product_code','season_start_date','season_end_date')
                         )x join global.productseason_generic_schema_mapping gsm
                         on x.attribute_name = gsm.generic_column_name  
                         and gsm.required_in_product
                      where 1=1
                      ON CONFLICT (product_code, start_time, attribute_name,l0_name)
 						do update
						set
						attribute_value = EXCLUDED.attribute_value;
                      
              --  commit ;
                --  raise notice '%',_product_code;
                  --    end loop;
                     
                    
                    
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