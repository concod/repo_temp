--liquibase formatted sql
--changeset vivek.subramanya@impactanalytics.co:build_list_partitions_RL runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:build_list_partitions_RL
--comment: build_list_partitions RL
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS global.build_list_partitions(IN input text);
CREATE OR REPLACE PROCEDURE global.build_list_partitions(IN input text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
/*
  * Function/Procedure name: global.build_list_partitions
  * Created by: Kailash Yadav
  * Created at: 02-Oct-2022
  * No of input parameter: 0
  * Parameter Description : 
  * Purpose: This SP been created to create list partition on dc_product_reserve_quantity. This SP can be extended as per need basis.
  * Calling Statement:   
  *  call 	select global.build_list_partitions('dc_product_reserve_quantity')	;
 
  * Tables for which this SP can be use:
  
    dc_product_reserve_quantity
    constraint_master
    product_mapping_product_store
    product_attributes_filter
    product_time_attributes
    store_time_attributes
    
    
  * if any modification done in same function/procedure please record the changes in below format
  * 
  * Updated_by       Updated_on      Purpose
  * ----------       -----------     --------
    Kailash Yadav    28-Mar-2023     added new tables  product_time_attributes, store_time_attributes
  *  
  */
 	declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.build_list_partitions';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
        _partition_statement text;
        _partition_name text;
       	 _partition_name_l0name text;
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
		_row_num integer:=0;
 	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 		if $1 = 'dc_product_reserve_quantity' then
	 		for _partition_statement,_partition_name in select 
				  partition_stmt, 
				  partition_name 
				from 
				  (
				    select 
				      'CREATE TABLE IF NOT EXISTS "inventory_smart".dc_product_reserve_quantity_default PARTITION OF "inventory_smart".dc_product_reserve_quantity DEFAULT ;' partition_stmt, 
				      lower(
				        'dc_product_reserve_quantity_default'
				      ) partition_name, 
				      1 rn 
				    union all 
				    select 
				      distinct 'CREATE TABLE ' || lower(
				        replace(
				          '"inventory_smart".dc_product_reserve_quantity_' || sa.attribute_value, 
				          ' ', '_'
				        )
				      )|| ' PARTITION OF "inventory_smart".dc_product_reserve_quantity FOR VALUES IN (''' || lower(
				        replace(sa.attribute_value, ' ', '_')
				      )|| ''');' as partition_stmt, 
				      lower(
				        replace(
				          '"inventory_smart".dc_product_reserve_quantity_' || sa.attribute_value, 
				          ' ', '_'
				        )
				      ) as partition_name, 
				      2 rn 
				    from 
				      global.store_attributes sa 
				    where 
				      sa.attribute_name = 'channel'
				  ) x 
				order by 
				  rn asc loop 
	 				 raise notice '%', _partition_statement ;	
	 				 execute _partition_statement ;
	 				 raise notice '%',_partition_statement || ' ' ||_partition_name;
 			 end loop;	 
  		elsif $1 = 'constraint_master' then
	 		for _partition_statement,_partition_name in select 
				  partition_stmt, 
				  partition_name 
				from 
				  (
				    select 
				      'CREATE TABLE IF NOT EXISTS "inventory_smart".constraint_master_default PARTITION OF "inventory_smart".constraint_master DEFAULT ;' partition_stmt, 
				      lower('constraint_master_default') partition_name, 
				      1 rn 
				    union all 
				    select 
				      distinct 'CREATE TABLE IF NOT EXISTS "inventory_smart".constraint_master_' || lower(
				        regexp_replace(
				          pa.attribute_value, '\W+', '', 'g'
				        )
				      ) || ' PARTITION OF "inventory_smart".constraint_master FOR VALUES IN (''' || replace(pa.attribute_value, '''', '''''')|| ''');' as partition_stmt, 
				      'constraint_master_' || lower(
				        regexp_replace(
				          pa.attribute_value, '\W+', '', 'g'
				        )
				      ) as partition_name, 
				      2 rn 
				    from 
				      global.product_attributes pa 
				    where 
				      pa.attribute_name = 'l0_name'
				  ) x 
				order by 
				  rn asc loop 
					 raise notice '%', _partition_statement ;	
					 execute _partition_statement ;
					 raise notice '%',_partition_statement ||' '||_partition_name;
 			 end loop;	

		elsif $1 = 'product_attributes'	then
 		
	 		for _attr in SELECT 
	 		  generic_column_name 
	 		from 
	 		  global.product_generic_schema_mapping 
	 		where 
	 		  required_in_product 
	 		  and is_attribute loop
	 			execute 'CREATE TABLE IF NOT EXISTS "global".product_attributes_' || _attr || ' PARTITION OF "global".product_attributes FOR VALUES IN (''' || _attr || ''');';
	 		end loop;	 
		elsif $1 = 'product_profile_mapping' then
 	 		for _partition_statement,_partition_name in select 
 				  partition_stmt, 
 				  partition_name 
 				from 
 				  (
 				    select 
 				      'CREATE TABLE IF NOT EXISTS "inventory_smart".product_profile_mapping_default PARTITION OF "inventory_smart".product_profile_mapping DEFAULT ;' partition_stmt, 
 				      lower('product_profile_mapping_default') partition_name, 
 				      1 rn 
 				    union all 
 				    select 
 				      distinct 'CREATE TABLE IF NOT EXISTS "inventory_smart".product_profile_mapping_' || lower(
 				        regexp_replace(
 				          pa.attribute_value, '\W+', '', 'g'
 				        )
 				      ) || ' PARTITION OF "inventory_smart".product_profile_mapping FOR VALUES IN (''' || replace(pa.attribute_value, '''', '''''')|| ''');' as partition_stmt, 
 				      'product_profile_mapping_' || lower(
 				        regexp_replace(
 				          pa.attribute_value, '\W+', '', 'g'
 				        )
 				      ) as partition_name, 
 				      2 rn 
 				    from 
 				      global.product_attributes pa 
 				    where 
 				      pa.attribute_name = 'l0_name'
 				  ) x 
 				order by 
 				  rn asc loop 
 					 raise notice '%', _partition_statement ;	
 					 execute _partition_statement ;
 					 raise notice '%',_partition_statement ||' '||_partition_name;
  			 end loop;		
  				 
 		elsif $1 = 'product_mapping_product_store' then
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
				      global.product_attributes pa 
				    where 
				      pa.attribute_name = 'l0_name'
				  ) x 
				order by 
				  rn asc loop 
					 raise notice '%', _partition_statement ;	
					 execute _partition_statement ;
					 raise notice '%',_partition_statement ||' '||_partition_name;
 			 end loop;		
             
        elsif $1 = 'product_attributes_filter' then
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
				      global.product_attributes pa 
				    where 
				      pa.attribute_name = 'l0_name'
				  ) x 
				order by 
				  rn asc loop 
					 raise notice '%', _partition_statement ;	
					 execute _partition_statement ;
					 raise notice '%',_partition_statement ||' '||_partition_name;
 			 end loop;	     
        elsif $1 = 'product_time_attributes' then
	  			_table_name := '"global".'||$1 ;
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
				          substr(pa.attribute_value,1,5), '\W+', '', 'g'
				        )
				      ) || ' PARTITION OF '||_table_name||' FOR VALUES IN (''' || replace(pa.attribute_value, '''', '''''')|| ''') partition by range (start_time);' as partition_stmt, 
				      	_table_name||'_' || lower(
				        regexp_replace(
				          substr(pa.attribute_value,1,5), '\W+', '', 'g'
				        )
				      ) as partition_name
				    from 
				      global.product_attributes pa 
				    where 
				      pa.attribute_name = 'l0_name'
				  ) x 
				  loop 
				 
	  				raise notice '%',_partition_statement;
	  				execute _partition_statement;
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
					select coalesce ('2010-01-01'::date ,current_date) season_start_date,  coalesce('2050-12-01'::date ,current_date ) season_end_date
					) x
					) y
					) z
					) p 
				loop
					_partition_name := _partition_name_l0name||'_'||v_part_name;
					raise notice '%',$1||'_'||v_part_name;
					--raise notice  '%',_table_name;
					SELECT
						   count(1) into _partition_avail_cnt
						FROM pg_inherits
						    JOIN pg_class parent            ON pg_inherits.inhparent = parent.oid
						    JOIN pg_class child             ON pg_inherits.inhrelid   = child.oid
						    JOIN pg_namespace nmsp_parent   ON nmsp_parent.oid  = parent.relnamespace
						    JOIN pg_namespace nmsp_child    ON nmsp_child.oid   = child.relnamespace
						WHERE nmsp_parent.nspname||'.'||parent.relname = 'global.'||$1
						and $1||'_'||v_part_name= child.relname; 
					
					
					if _partition_avail_cnt =0 then
						 
					_partition_statement = 'CREATE TABLE if not exists  '||_partition_name||' PARTITION OF '||_partition_name_l0name||' FOR VALUES from ('''||v_from_date ||''') to ('''||v_to_date ||''') ;';
					raise notice '_partition_stmt%',_partition_statement;
					execute _partition_statement;
					end if;
				 --query:=	
				
				end loop;
			end loop ;
                     
        elsif $1 = 'YXZ' then
	  			_table_name := '"global".'||$1 ;
	  			raise notice '_table_name%',_table_name;
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
					select coalesce ('2010-01-01'::date ,current_date) season_start_date,  coalesce('2050-12-01'::date ,current_date ) season_end_date
					) x
					) y
					) z
					) p 
				loop
					_partition_name := _table_name||'_'||v_part_name;
					raise notice '%',$1||'_'||v_part_name;
					--raise notice  '%',_table_name;
					SELECT
						   count(1) into _partition_avail_cnt
						FROM pg_inherits
						    JOIN pg_class parent            ON pg_inherits.inhparent = parent.oid
						    JOIN pg_class child             ON pg_inherits.inhrelid   = child.oid
						    JOIN pg_namespace nmsp_parent   ON nmsp_parent.oid  = parent.relnamespace
						    JOIN pg_namespace nmsp_child    ON nmsp_child.oid   = child.relnamespace
						WHERE nmsp_parent.nspname||'.'||parent.relname = 'global.'||$1
						and $1||'_'||v_part_name= child.relname; 
					
					
					if _partition_avail_cnt =0 then
						 
					_partition_statement = 'CREATE TABLE '||_partition_name||' PARTITION OF '||_table_name||' FOR VALUES from ('''||v_from_date ||''') to ('''||v_to_date ||''') partition by list  (attribute_name);';
					raise notice '_partition_stmt%',_partition_statement;
					execute _partition_statement;
					end if;
				 --query:=	
				 for _sub_partition_stmt ,_sub_partition_name	in
				 	(select partition_stmt,partition_name from 
					(select partition_stmt,partition_name,rn  from 
						(
						select 'CREATE TABLE '||_partition_name||'_default PARTITION OF '||_partition_name||' DEFAULT ;' partition_stmt,_partition_name||'_default' partition_name ,  1 rn
						union all
						select distinct 'CREATE TABLE '||
						lower(replace(''||_partition_name||'_'||pgsm.generic_column_name,' ', '_' )  )||
						' PARTITION OF  '||_partition_name||' FOR VALUES IN ('''||pgsm.generic_column_name ||''');' as partition_stmt, 
													lower(replace('"global".'||_partition_name||'_'||pgsm.generic_column_name,' ', '_' )  )
													as  partition_name, 2 rn   
													from global.productseason_generic_schema_mapping pgsm   
													where required_in_product 
						) x
						order by 3 ) y
						where 1=1 
						and not exists (SELECT
						    'p'
						FROM pg_inherits
						    JOIN pg_class parent            ON pg_inherits.inhparent = parent.oid
						    JOIN pg_class child             ON pg_inherits.inhrelid   = child.oid
						    JOIN pg_namespace nmsp_parent   ON nmsp_parent.oid  = parent.relnamespace
						    JOIN pg_namespace nmsp_child    ON nmsp_child.oid   = child.relnamespace
						WHERE parent.relname = $1||'_'||v_part_name
						and --(
							replace(replace (y.partition_name,'"',''),'global.','')= child.relname 
							--or 
							--replace(replace (y.partition_name,'"',''),'global.','')||'_default'= child.relname)
						 ) )
						 loop 
							 
							
							 raise notice '_sub_partition_stmt%',_sub_partition_stmt;
							execute _sub_partition_stmt;	
						 end loop;	 
				end loop;
                
            elsif $1 = 'store_time_attributes' then
	  			_table_name := '"global".'||$1 ;
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
					raise notice '%',$1||'_'||v_part_name;
					raise notice  '%',_table_name;
					SELECT
						   count(1) into _partition_avail_cnt
						FROM pg_inherits
						    JOIN pg_class parent            ON pg_inherits.inhparent = parent.oid
						    JOIN pg_class child             ON pg_inherits.inhrelid   = child.oid
						    JOIN pg_namespace nmsp_parent   ON nmsp_parent.oid  = parent.relnamespace
						    JOIN pg_namespace nmsp_child    ON nmsp_child.oid   = child.relnamespace
						WHERE nmsp_parent.nspname||'.'||parent.relname = 'global.'||$1
						and $1||'_'||v_part_name= child.relname; 
					
					
					if _partition_avail_cnt =0 then
						 
					_partition_statement = 'CREATE TABLE '||_partition_name||' PARTITION OF '||_table_name||' FOR VALUES from ('''||v_from_date ||''') to ('''||v_to_date ||''') ;';
					raise notice '_partition_stmt%',_partition_statement;
					execute _partition_statement;
					end if;
				end loop;   
			elsif $1 = 'aggregation_mapping_aggregation_store' then
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
	 				      global.product_attributes pa 
	 				    where 
	 				      pa.attribute_name = 'l0_name'
	 				  ) x 
	 				order by 
	 				  rn asc loop 
	 					 raise notice '%', _partition_statement ;	
	 					 execute _partition_statement ;
	 					 raise notice '%',_partition_statement ||' '||_partition_name;
	  			 end loop;
			elsif $1 = 'instock_report' then
	 	 		for _partition_statement,_partition_name in select 
					  partition_stmt, 
					  partition_name 
					from 
					  (
						select 
						  distinct 'CREATE TABLE IF NOT EXISTS "inventory_smart".instock_report_' || from_fiscal_year_week || ' PARTITION OF "inventory_smart".instock_report FOR values from(' || from_fiscal_year_week || ') TO (' || to_fiscal_year_week || ');' as partition_stmt, 
						  'instock_report_' || from_fiscal_year_week as partition_name, 
						  2 rn 
						from 
						  (
							select 
							  distinct fiscal_year_week from_fiscal_year_week, 
							  fiscal_year_week + 1 to_fiscal_year_week 
							from 
							  global.fiscal_date_mapping fdm 
							where 
							  fdm."date" > '31-Jan-2020' 
							order by 
							  1 
							limit 
							  520
						  ) x
					  ) x 
					order by 
					  rn asc loop 
	 					 raise notice '%', _partition_statement ;	
	 					 execute _partition_statement ;
	 					 raise notice '%', _partition_statement || ' ' || _partition_name;
	  			 end loop;
			elsif $1 = 'forecast_report' then
	 	 		for _partition_statement,_partition_name in select 
					  partition_stmt, 
					  partition_name 
					from 
					  (
						select 
						  distinct 'CREATE TABLE IF NOT EXISTS "inventory_smart".forecast_report_' || from_fiscal_year_week || ' PARTITION OF "inventory_smart".forecast_report FOR values from(' || from_fiscal_year_week || ') TO (' || to_fiscal_year_week || ');' as partition_stmt, 
						  'forecast_report_' || from_fiscal_year_week as partition_name, 
						  2 rn 
						from 
						  (
							select 
							  distinct fiscal_year_week from_fiscal_year_week, 
							  fiscal_year_week + 1 to_fiscal_year_week 
							from 
							  global.fiscal_date_mapping fdm 
							where 
							  fdm."date" > '31-Jan-2020' 
							order by 
							  1 
							limit 
							  520
						  ) x
					  ) x 
					order by 
					  rn asc loop 
	 					 raise notice '%', _partition_statement ;	
	 					 execute _partition_statement ;
	 					 raise notice '%', _partition_statement || ' ' || _partition_name;
	  			 end loop;
			elsif $1 = 'lost_sales' then
	 	 		for _partition_statement,_partition_name in select 
					  partition_stmt, 
					  partition_name 
					from 
					  (
						select 
						  distinct 'CREATE TABLE IF NOT EXISTS "inventory_smart".lost_sales_' || from_fiscal_year_week || ' PARTITION OF "inventory_smart".lost_sales FOR values from(' || from_fiscal_year_week || ') TO (' || to_fiscal_year_week || ');' as partition_stmt, 
						  'lost_sales_' || from_fiscal_year_week as partition_name, 
						  2 rn 
						from 
						  (
							select 
							  distinct fiscal_year_week from_fiscal_year_week, 
							  fiscal_year_week + 1 to_fiscal_year_week 
							from 
							  global.fiscal_date_mapping fdm 
							where 
							  fdm."date" > '31-Jan-2020' 
							order by 
							  1 
							limit 
							  520
						  ) x
					  ) x 
					order by 
					  rn asc loop 
	 					 raise notice '%', _partition_statement ;	
	 					 execute _partition_statement ;
	 					 raise notice '%', _partition_statement || ' ' || _partition_name;
	  			 end loop;
			elsif $1 = 'model_stock_deep_dive' then
	 	 		for _partition_statement,_partition_name in select 
					  partition_stmt, 
					  partition_name 
					from 
					  (
						select 
						  distinct 'CREATE TABLE IF NOT EXISTS "inventory_smart".model_stock_deep_dive_' || from_fiscal_year_week || ' PARTITION OF "inventory_smart".model_stock_deep_dive FOR values from(' || from_fiscal_year_week || ') TO (' || to_fiscal_year_week || ');' as partition_stmt, 
						  'model_stock_deep_dive_' || from_fiscal_year_week as partition_name, 
						  2 rn 
						from 
						  (
							select 
							  distinct fiscal_year_week from_fiscal_year_week, 
							  fiscal_year_week + 1 to_fiscal_year_week 
							from 
							  global.fiscal_date_mapping fdm 
							where 
							  fdm."date" > '31-Jan-2020' 
							order by 
							  1 
							limit 
							  520
						  ) x
					  ) x 
					order by 
					  rn asc loop 
	 					 raise notice '%', _partition_statement ;	
	 					 execute _partition_statement ;
	 					 raise notice '%', _partition_statement || ' ' || _partition_name;
	  			 end loop;
	  		elsif $1 = 'create_allocation_result_flat_gurobi' then
	  			for _std, _st, _et in SELECT 
			  replace(
			    (s.day :: date):: varchar, 
			    '-', 
			    ''
			  ):: int4 as start_time_date, 
			  timezone('utc', s.day) as start_time, 
			  timezone(
			    'utc', 
			    (s.day + interval '1 day')
			  ) as end_time 
			FROM 
			  generate_series(
			    current_date,
			    current_date + interval '1 year', 
			    interval '1 day'
			  ) AS s(day) loop
				_partition_statement := 'CREATE TABLE IF NOT EXISTS inventory_smart."create_allocation_result_flat_gurobi_' || _std || '" PARTITION OF inventory_smart.create_allocation_result_flat_gurobi FOR VALUES FROM (''' || _st || ''') TO (''' || _et || ''');';
				raise notice '_partition_statement: %', _partition_statement;
				execute _partition_statement;
			end loop;	
        elsif $1 = 'model_stock_deep_dive' then
	 	 		for _partition_statement,_partition_name in select 
					  partition_stmt, 
					  partition_name 
					from 
					  (
						select 
						  distinct 'CREATE TABLE IF NOT EXISTS "inventory_smart".model_stock_deep_dive_' || from_fiscal_year_week || ' PARTITION OF "inventory_smart".model_stock_deep_dive FOR values from(' || from_fiscal_year_week || ') TO (' || to_fiscal_year_week || ');' as partition_stmt, 
						  'model_stock_deep_dive_' || from_fiscal_year_week as partition_name, 
						  2 rn 
						from 
						  (
							select 
							  distinct fiscal_year_week from_fiscal_year_week, 
							  fiscal_year_week + 1 to_fiscal_year_week 
							from 
							  global.fiscal_date_mapping fdm 
							where 
							  fdm."date" > '31-Jan-2020' 
							order by 
							  1 
							limit 
							  520
						  ) x
					  ) x 
					order by 
					  rn asc loop 
	 					 raise notice '%', _partition_statement ;	
	 					 execute _partition_statement ;
	 					 raise notice '%', _partition_statement || ' ' || _partition_name;
	  		end loop;
                 
	  	elsif $1 = 'mtp_audit_log' then
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
				raise notice '_partition_statement: %', _partition_statement;
				execute _partition_statement;
			end loop;	
			
		 elsif $1 like '%assort_master_plan%' then
		 
		 	for _partition_statement,_partition_name,_attr_value
				in 
				select 
				'create table IF NOT EXISTS  '||$1||'_'|| lower(regexp_replace(case when length(x.value)>5 then substr(x.value,1,5) else x.value end, '\W+', '', 'g'))||' PARTITION OF '||$1||' for values in (''' || x.value|| ''')  partition by list  (l1_name)' partition_stmt,
				 $1||'_'|| lower(regexp_replace(case when length(x.value)>5 then substr(x.value,1,5) else x.value end, '\W+', '', 'g')) partition_name ,
				 x.value 
				from 
				(
				select 
				distinct attribute_value::text as value  from global.product_attributes pa 
				where pa.attribute_name ='l0_name')
				x order by 2
				loop 
				raise notice '_partition_name%',_partition_statement; 
					execute _partition_statement;
	
				---l1_name sub partition
					for _sub_partition_stmt1,_sub_partition_name1
					in 
					select 
					'create table IF NOT EXISTS  '||_partition_name||'_'|| lower(regexp_replace(case when length(x.value)>5 then substr(x.value,1,5) else x.value end, '\W+', '', 'g'))||' PARTITION OF '||_partition_name||' for values in (''' || x.value|| ''')  partition by list  (channel)' partition_stmt,
					_partition_name||'_'|| lower(regexp_replace(case when length(x.value)>5 then substr(x.value,1,5) else x.value end, '\W+', '', 'g')) partition_name 
					 	from 
						(
						select distinct path->>'l1_name' as value  from global.product_hierarchies_filter phf where level = 2
						and path->>'l0_name'= _attr_value) x order by 2
						loop 
							raise notice '_sub_partition_name1%',_sub_partition_stmt1; 
							execute _sub_partition_stmt1;
						---channel sub partition
							for _sub_partition_stmt2,_sub_partition_name2
							in 
							select 
							'create table IF NOT EXISTS  '||_sub_partition_name1||'_'|| lower(regexp_replace(case when length(x.value)>5 then substr(x.value,1,5) else x.value end, '\W+', '', 'g'))||' PARTITION OF '||_sub_partition_name1||' for values in (''' || x.value|| ''')  partition by range  (start_date)' partition_stmt,
							_sub_partition_name1||'_'|| lower(regexp_replace(case when length(x.value)>5 then substr(x.value,1,5) else x.value end, '\W+', '', 'g')) partition_name 
							 				        from 
								(
								select distinct attribute_value as value from global.store_attributes sa where attribute_name ='channel') x 
								order by 2
								loop 
									raise notice '_sub_partition_name2%',_sub_partition_stmt2; 
									execute _sub_partition_stmt2;
							     -- raise notice '_sub_partition_name2%',_sub_partition_stmt2; 
			     
							for _std, _st_date, _et_date in 
							select replace(
							    extract(year from (s.day :: date))::text||extract( month from (s.day :: date))::text, 
							    '-', 
							    ''
							  ):: int4 as start_time_date, 
							   s.day::date as start_time, 
							     (s.day::date + interval '1 month')::date
							  as end_time ,
							  s.day
									FROM 
									  generate_series(
									    '2020-01-01'::date ,
									    current_date + interval '1 year', 
									    interval '1 month'
									  ) AS s(day) order by 1
					  		loop
								_sub_partition_name3 := 'CREATE TABLE IF NOT EXISTS '||_sub_partition_name2 || _std || ' PARTITION OF '||_sub_partition_name2 ||' FOR VALUES FROM (''' || _st_date || ''') TO (''' || _et_date || ''');';
								raise notice '_sub_partition_name3: %', _sub_partition_name3;
								
								execute _sub_partition_name3;
						
							
					 end loop;	
					end loop;	
					end loop;
				end loop;
        elsif $1 = 'excess_units' then
	  			for _std in SELECT 
			 distinct fiscal_year_week
			FROM 
			 global.fiscal_date_mapping
			 where date >= current_date
			 and date < current_date + 365
			 order by fiscal_year_week
			  loop
				_partition_statement := 'CREATE TABLE IF NOT EXISTS inventory_smart."excess_units_' || _std || '" PARTITION OF inventory_smart.excess_units FOR VALUES IN (''' || _std || ''');';
				raise notice '_partition_statement: %', _partition_statement;
				execute _partition_statement;
			end loop;
		
		elsif $1 = 'loss_units' then
	  			for _std in SELECT 
			 distinct fiscal_year_week
			FROM 
			 global.fiscal_date_mapping
			 where date >= current_date
			 and date < current_date + 365
			 order by fiscal_year_week
			  loop
				_partition_statement := 'CREATE TABLE IF NOT EXISTS inventory_smart."loss_units_' || _std || '" PARTITION OF inventory_smart.loss_units FOR VALUES IN (''' || _std || ''');';
				raise notice '_partition_statement: %', _partition_statement;
				execute _partition_statement;
			end loop;

		elsif $1 = 'excess_units_sku_store_level' then
	  			for _std in SELECT 
			 distinct fiscal_year_week
			FROM 
			 global.fiscal_date_mapping
			 where date >= current_date
			 and date < current_date + 365
			 order by fiscal_year_week
			  loop
				_partition_statement := 'CREATE TABLE IF NOT EXISTS inventory_smart."excess_units_sku_store_level_' || _std || '" PARTITION OF inventory_smart.excess_units_sku_store_level FOR VALUES IN (''' || _std || ''');';
				raise notice '_partition_statement: %', _partition_statement;
				execute _partition_statement;
			end loop;

		elsif $1 = 'loss_units_sku_store_level' then
	  			for _std in SELECT 
			 distinct fiscal_year_week
			FROM 
			 global.fiscal_date_mapping
			 where date >= current_date
			 and date < current_date + 365
			 order by fiscal_year_week
			  loop
				_partition_statement := 'CREATE TABLE IF NOT EXISTS inventory_smart."loss_units_sku_store_level_' || _std || '" PARTITION OF inventory_smart.loss_units_sku_store_level FOR VALUES IN (''' || _std || ''');';
				raise notice '_partition_statement: %', _partition_statement;
				execute _partition_statement;
			end loop;

        elsif $1 like '%product_life_cycle%' then
		 
		 	for _partition_statement,_partition_name,_attr_value
				in 
				select 
				'create table IF NOT EXISTS  '||$1||'_'|| lower(regexp_replace(case when length(x.value)>5 then substr(x.value,1,5) else x.value end, '\W+', '', 'g'))||' PARTITION OF '||$1||' for values in (''' || x.value|| ''')  partition by list  (l1_name)' partition_stmt,
				 $1||'_'|| lower(regexp_replace(case when length(x.value)>5 then substr(x.value,1,5) else x.value end, '\W+', '', 'g')) partition_name ,
				 x.value 
				from 
				(
				select 
				distinct attribute_value::text as value  from global.product_attributes pa 
				where pa.attribute_name ='l0_name')
				x order by 2
				loop 
				raise notice '_partition_name%',_partition_statement; 
					execute _partition_statement;    
			end loop;

			end if;
            
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
