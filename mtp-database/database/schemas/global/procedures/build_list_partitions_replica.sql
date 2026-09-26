--liquibase formatted sql
--changeset kamalesh.k@impactanalytics.co:build_list_partitions_replica runOnChange:true stripComments:false splitStatements:false context:MTP-39571 labels:DAT-1030
--comment: initial commit for build_list_partitions_replica sp
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS global.build_list_partitions_replica();

CREATE OR REPLACE PROCEDURE global.build_list_partitions_replica()
LANGUAGE 'plpgsql'
SECURITY DEFINER 
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.build_list_partitions_replica';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
        _partition_statement text;
        _partition_name text;
        v_from_date date;
        v_to_date date;	
        v_part_name text; 
        _sub_partition_stmt text;
        _sub_partition_name text;
        _table_name text ;
        _partition_avail_cnt int;
        _query text;
        _attr text;
       	_std int;
		_et timestamptz;
		_st_date date;
		_et_date date;
		_sub_partition_name1 text;
		_sub_partition_stmt1 text;
		_sub_partition_name2 text;
		_sub_partition_stmt2 text;
		_sub_partition_name3 text;
		_sub_partition_stmt3 text;
		_attr_value text;
		_partition_name_l0name text;
		_rcl_code varchar;
 	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 		--if  $1 = 'product_attributes'	then
 		
	 		for _attr in SELECT 
	 		  generic_column_name 
	 		from 
	 		  global.product_generic_schema_mapping 
	 		where 
	 		  required_in_product 
	 		  and is_attribute loop
	 			_partition_statement := 'CREATE TABLE IF NOT EXISTS "global".product_attributes_' || _attr || ' PARTITION OF "global".product_attributes FOR VALUES IN (''' || _attr || ''');';
				_partition_name := '"global".product_attributes_' || _attr || '"' ;
--				execute 'insert into global.dynamic_ddl_for_replication (tablename, dynamic_def, created_by, hash_value)
--			    values(' || quote_literal(_partition_name) || ',' || quote_literal(_partition_statement) || ', current_user, md5(' || quote_literal(_partition_statement) || '))
--                on conflict do nothing;';
	 			execute _partition_statement;
	 		end loop;
		--elsif $1 = 'store_attributes'	then
 		
	 		for _attr in SELECT 
	 		  generic_column_name 
	 		from 
	 		  global.store_generic_schema_mapping 
	 		where 
	 		  required_in_product 
	 		  and is_attribute loop
	 			_partition_statement := 'CREATE TABLE IF NOT EXISTS "global".store_attributes_' || _attr || ' PARTITION OF "global".store_attributes FOR VALUES IN (''' || _attr || ''');';
				_partition_name := '"global".store_attributes_' || _attr || '"' ;
--				execute 'insert into global.dynamic_ddl_for_replication (tablename, dynamic_def, created_by, hash_value)
--			    values(' || quote_literal(_partition_name) || ',' || quote_literal(_partition_statement) || ', current_user, md5(' || quote_literal(_partition_statement) || '))
--                on conflict do nothing;';
	 			 -- execute _partition_statement;
	 		end loop;	
		
 		--elsif $1 = 'product_mapping_product_store' then
	 		for _partition_statement,_partition_name in select 
				  partition_stmt, 
				  partition_name 
				from 
				  (
				    select 
				      'CREATE TABLE IF NOT EXISTS "global".product_mapping_product_store_default PARTITION OF "global".product_mapping_product_store DEFAULT ;' partition_stmt, 
				      lower('product_mapping_product_store_default') partition_name, 
				      1 rn 
				    union all 
				    select 
				      distinct 'CREATE TABLE IF NOT EXISTS "global".product_mapping_product_store_' || lower(
				        regexp_replace(
				          pa.attribute_value, '\W+', '', 'g'
				        )
				      ) || ' PARTITION OF "global".product_mapping_product_store FOR VALUES IN (''' || replace(pa.attribute_value, '''', '''''')|| ''');' as partition_stmt, 
				      'product_mapping_product_store_' || lower(
				        regexp_replace(
				          pa.attribute_value, '\W+', '', 'g'
				        )
				      ) as partition_name, 
				      2 rn 
				    from 
				      public.meta_data_table pa
				  ) x 
				order by 
				  rn asc loop 
--					 execute 'insert into global.dynamic_ddl_for_replication (tablename, dynamic_def, created_by, hash_value)
--				     values(' || quote_literal(_partition_name) || ',' || quote_literal(_partition_statement) || ', current_user, md5(' || quote_literal(_partition_statement) || '))
--                     on conflict do nothing;';
	 			 -- execute _partition_statement;
 			 end loop;
       -- elsif $1 = 'product_attributes_filter' then
	 		for _partition_statement,_partition_name in select 
				  partition_stmt, 
				  partition_name 
				from 
				  (
				    select 
				      'CREATE TABLE IF NOT EXISTS "global".product_attributes_filter_default PARTITION OF "global".product_attributes_filter DEFAULT ;' partition_stmt, 
				      lower('product_attributes_filter_default') partition_name, 
				      1 rn 
				    union all 
				    select 
				      distinct 'CREATE TABLE IF NOT EXISTS "global".product_attributes_filter_' || lower(
				        regexp_replace(
				          pa.attribute_value, '\W+', '', 'g'
				        )
				      ) || ' PARTITION OF "global".product_attributes_filter FOR VALUES IN (''' || replace(pa.attribute_value, '''', '''''')|| ''');' as partition_stmt, 
				      'product_attributes_filter_' || lower(
				        regexp_replace(
				          pa.attribute_value, '\W+', '', 'g'
				        )
				      ) as partition_name, 
				      2 rn 
				    from 
				      public.meta_data_table pa
				  ) x 
				order by 
				  rn asc loop 
--					 execute 'insert into global.dynamic_ddl_for_replication (tablename, dynamic_def, created_by, hash_value)
--				     values(' || quote_literal(_partition_name) || ',' || quote_literal(_partition_statement) || ', current_user, md5(' || quote_literal(_partition_statement) || '))
--                     on conflict do nothing;';
	 			 -- execute _partition_statement;
 			 end loop;	
       -- elsif $1 = 'product_time_attributes' then
	  			_table_name := '"global".product_time_attributes';
	  			raise notice '_table_name%',_table_name;
			for _partition_statement,_partition_name_l0name in
	  			select 
				  partition_stmt, 
				  partition_name 
				from 
				  ( 
				    select 
				      distinct 'CREATE TABLE IF NOT EXISTS '||_table_name||'_' || lower(
				        regexp_replace(
				          pa.attribute_value, '\W+', '', 'g'
				        )
				      )   ||' PARTITION OF '||_table_name||' FOR VALUES IN (''' || replace(pa.attribute_value, '''', '''''')|| ''') ;' as partition_stmt, 
				      	_table_name||'_' || lower(
				        regexp_replace(
				          pa.attribute_value, '\W+', '', 'g'
				        )
				      ) as partition_name,
				      pa.attribute_value
				    from 
				      public.meta_data_table pa
				  ) x 
				  group by 1,2
				  order by 2
				  loop 
--				 	 execute 'insert into global.dynamic_ddl_for_replication (tablename, dynamic_def, created_by, hash_value)
--				     values(' || quote_literal(_partition_name_l0name) || ',' || quote_literal(_partition_statement) || ', current_user, md5(' || quote_literal(_partition_statement) || '))
--                     on conflict do nothing;';
	 			 -- execute _partition_statement;
				end loop ;
            --elsif $1 = 'store_time_attributes' then
	  			_table_name := '"global".store_time_attributes' ;
				for v_part_name, v_from_date, v_to_date in 
					select  
						extract(year from months_list::date)||''||extract(month from months_list::date)::text  as part_name,
						date_trunc('month', months_list::date)::date as from_date, 
						(date_trunc('month', months_list::date + interval '1 month'))::date as to_date
						from (
						select  season_start_date + (interval '1' month * generate_series(0,month_count::int)) months_list
						from
						(
						select extract(year from diff) * 12 + extract(month from diff) + 12 as month_count,
						season_start_date
						from (
						select   age( season_end_date, season_start_date) as diff 
						,
						season_start_date
						from (
						select '2000-01-01'::date season_start_date,  '2050-12-01'::date season_end_date 
						) x
						) y
						) z
						) p
					order by 2
				loop
					_partition_name := _table_name||'_'||v_part_name;
					raise notice '%',_table_name ||'_'||v_part_name;
					raise notice  '%',_table_name;
					SELECT
						   count(1) into _partition_avail_cnt
						FROM pg_inherits
						    JOIN pg_class parent            ON pg_inherits.inhparent = parent.oid
						    JOIN pg_class child             ON pg_inherits.inhrelid   = child.oid
						    JOIN pg_namespace nmsp_parent   ON nmsp_parent.oid  = parent.relnamespace
						    JOIN pg_namespace nmsp_child    ON nmsp_child.oid   = child.relnamespace
						WHERE nmsp_parent.nspname||'.'||parent.relname = 'global.store_time_attributes'
						and 'store_time_attributes_'||v_part_name= child.relname; 
					
					
					if _partition_avail_cnt =0 then
						 
					_partition_statement = 'CREATE TABLE IF NOT EXISTS ' || _partition_name || ' PARTITION OF ' || _table_name || ' FOR VALUES from ('''||v_from_date ||''') to ('''||v_to_date ||''') ;';
--					execute 'insert into global.dynamic_ddl_for_replication (tablename, dynamic_def, created_by, hash_value)
--			        values(' || quote_literal(_partition_name) || ',' || quote_literal(_partition_statement) || ', current_user, md5(' || quote_literal(_partition_statement) || '))
--                    on conflict do nothing;';
	 			 -- execute _partition_statement;
					end if;
				end loop;  

		--elsif $1 = 'aggregation_mapping_aggregation_store' then
	 	 		for _partition_statement,_partition_name in select 
	 				  partition_stmt, 
	 				  partition_name 
	 				from 
	 				  (
	 				    select 
	 				      'CREATE TABLE IF NOT EXISTS "global".aggregation_mapping_aggregation_store_default PARTITION OF "global".aggregation_mapping_aggregation_store DEFAULT ;' partition_stmt, 
	 				      lower('aggregation_mapping_aggregation_store_default') partition_name, 
	 				      1 rn 
	 				    union all 
	 				    select 
	 				      distinct 'CREATE TABLE IF NOT EXISTS "global".aggregation_mapping_aggregation_store_' || lower(
	 				        regexp_replace(
	 				          pa.attribute_value, '\W+', '', 'g'
	 				        )
	 				      ) || ' PARTITION OF "global".aggregation_mapping_aggregation_store FOR VALUES IN (''' || replace(pa.attribute_value, '''', '''''')|| ''');' as partition_stmt, 
	 				      'aggregation_mapping_aggregation_store_' || lower(
	 				        regexp_replace(
	 				          pa.attribute_value, '\W+', '', 'g'
	 				        )
	 				      ) as partition_name, 
	 				      2 rn 
	 				    from 
	 				      public.meta_data_table pa 
						   
	 				  ) x 
	 				order by 
	 				  rn asc loop 
--	 					 execute 'insert into global.dynamic_ddl_for_replication (tablename, dynamic_def, created_by, hash_value)
--					     values(' || quote_literal(_partition_name) || ',' || quote_literal(_partition_statement) || ', current_user, md5(' || quote_literal(_partition_statement) || '))
--                     on conflict do nothing;';
	 			 -- execute _partition_statement;
	  			 end loop;
				
	  	--elsif $1 = 'mtp_audit_log' then
	  		for _std, _st, _et in SELECT 
			  replace(
			    (s.day :: date):: varchar, 
			    '-', 
			    ''
			  ):: int4 as start_time_date, 
				s.day as start_time, 
			    (s.day + interval '1 day') as end_time 
			FROM 
			  generate_series(
			    current_date,
			    current_date + interval '5 days', 
			    interval '1 day'
			  ) AS s(day) loop
				_partition_statement := 'CREATE TABLE IF NOT EXISTS global."mtp_audit_log_' || _std || '" PARTITION OF global.mtp_audit_log FOR VALUES FROM (''' || _st || ''') TO (''' || _et || ''');';
				_partition_name := 'global."mtp_audit_log_' || _std || '"' ;
--				execute 'insert into global.dynamic_ddl_for_replication (tablename, dynamic_def, created_by, hash_value)
--			    values(' || quote_literal(_partition_name) || ',' || quote_literal(_partition_statement) || ', current_user, md5(' || quote_literal(_partition_statement) || '))
--                on conflict do nothing;';
--
				raise notice '_partition_statement: %',_partition_statement ;
	 			 -- execute _partition_statement;
			end loop;		 
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end
$procedure$;
