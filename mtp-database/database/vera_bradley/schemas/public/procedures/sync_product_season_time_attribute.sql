--liquibase formatted sql
--changeset laaraib.ahmad@impactanalytics.co:sync_product_season_time_attribute_updated runOnChange:true stripComments:false splitStatements:false context:Intial commit labels: changed the table from productseason_validated_table to productseason_validated_status_table
--comment: added the SP to update the product_time_attributes table : sync_product_season_time_attribute , changed the column in on conflict command,changed the table from productseason_validated_table to productseason_validated_status_table
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_product_season_time_attribute();
CREATE OR REPLACE PROCEDURE public.sync_product_season_time_attribute()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
 	declare 
 		_product_code varchar;
		_l0_name varchar;
         _count int;
        	_indx_cnt int;
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
 		public.productseason_validated_status_table a
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
 		from pg_catalog.pg_indexes pi2 where indexname ='productseason_validated_status_table_idx';
 		
 		if _indx_cnt =0 then
 		execute 'create index productseason_validated_status_table_idx on public.productseason_validated_status_table(product_code)';
 		end if;
 	
 		for _product_code,_l0_name in 
 		select paf.product_code, paf.l0_name from 
 			 global.product_attributes_filter paf 
			where 
			 exists (select 'p' from public.productseason_validated_status_table a
 				where a.product_code =paf.product_code 
 					)
 			and not exists 
 			(select 'p' from global.product_time_attributes b
 			where  b.product_code =paf.product_code
 			 )
 			 order by 2,1
 		Loop
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
						_l0_name
                         from (
                         select product_code ,season_start_date,
                         season_end_date,
                         j.key as attribute_name, 
                         j.value as attribute_value
                         from(
                         select 
                         t.product_code,
                         t.season_start_date::date season_start_date,
                         t.season_end_date::date season_end_date,
                         to_jsonb(t) as j
                         from 
                         ( select
 					      sm.season_code,                  
 						 a.*
 					from
 						public.productseason_validated_status_table a left join 
 						global.season_master sm 
 						 on  a.season_start_date =sm.season_start_date
 						 and a.season_end_date =sm.season_end_date
 						) t
                         ) x, jsonb_each_text(j) as j
                         where value is not null
                         and key not in('product_code','season_start_date','season_end_date')
                         )x join global.productseason_status_generic_schema_mapping gsm
                         on x.attribute_name = gsm.generic_column_name  
                      where 1=1
                       and product_code =_product_code  ON CONFLICT (product_code, start_time, attribute_name,l0_name)
 						do update
						set
						attribute_value = EXCLUDED.attribute_value;
                      
               -- commit ;
                      end loop;
                     
                    
                    
                end
 $procedure$
;
