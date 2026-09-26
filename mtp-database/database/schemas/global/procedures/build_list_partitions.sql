--liquibase formatted sql
--changeset ashish@impactanalytics.co:adding_rcl_po_store_policy runOnChange:true stripComments:false splitStatements:false context:MTP-112857-adding_rcl_po_store_policy labels:DAT-1030
--comment: adding rcl po store policy
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
	rcl_constraint_master
	latest_inventory
	article_inventory_dashboard
	article_store_grade
    
    
  * if any modification done in same function/procedure please record the changes in below format
  * 
  * Updated_by       Updated_on      Purpose
  * ----------       -----------     --------
    Kailash Yadav    28-Mar-2023     added new tables  product_time_attributes, store_time_attributes
	Linu Nazil    19-Jan-2024        added new tables  rcl_constraint_master
    Linu Nazil    20-march-2025        added new tables  rcl_network_master
	kamalesh k    19-jun-2025        added new tables latest_inventory,article_inventory_dashboard,article_store_grade
  *  
  */
 	declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.build_list_partitions';
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
		_rule_id  varchar;
 	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 		if $1 = 'constraint_master_weekly' then
	 		for _query in with map as (
			  select 
				*, 
				case when fw_part then '' else 'CREATE TABLE IF NOT EXISTS inventory_smart.cmw_' || fiscal_year_week || ' PARTITION OF inventory_smart.constraint_master_weekly FOR VALUES IN (' || fiscal_year_week || ') PARTITION BY LIST (l0_name);' end as fw_query, 
				case when false then '' else 'CREATE TABLE IF NOT EXISTS inventory_smart.cmw_' || fiscal_year_week || '_' || md5(
				  lower(
					regexp_replace(l0_name, '\W+', '', 'g')
				  )
				) || ' PARTITION OF inventory_smart.cmw_' || fiscal_year_week || ' FOR VALUES IN (' || quote_literal(l0_name) || ') PARTITION BY LIST (l1_name); CREATE TABLE IF NOT EXISTS inventory_smart.cmw_' || fiscal_year_week || '_default PARTITION OF inventory_smart.cmw_' || fiscal_year_week || ' (CONSTRAINT cmw_' || fiscal_year_week || '_default_un UNIQUE (product_code, store_code)) DEFAULT;' end as l0_query, 
				case when l1_part then '' else 'CREATE TABLE IF NOT EXISTS inventory_smart.cmw_' || fiscal_year_week || '_' || md5(
				  lower(
					regexp_replace(l0_name, '\W+', '', 'g')
				  ) || '_' || lower(
					regexp_replace(l1_name, '\W+', '', 'g')
				  )
				) || ' PARTITION OF inventory_smart.cmw_' || fiscal_year_week || '_' || md5(
				  lower(
					regexp_replace(l0_name, '\W+', '', 'g')
				  )
				) || '( CONSTRAINT cmw_' || fiscal_year_week || '_' || md5(
				  lower(
					regexp_replace(l0_name, '\W+', '', 'g')
				  ) || '_' || lower(
					regexp_replace(l1_name, '\W+', '', 'g')
				  )
				) || '_uk UNIQUE (product_code, store_code) ) FOR VALUES IN (' || quote_literal(l1_name) || ');' end as l1_query 
			  from 
				(
				  select 
					l0_name, 
					l1_name, 
					fiscal_year_week, 
					EXISTS (
					  SELECT 
					  FROM 
						pg_catalog.pg_class c 
						JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace 
					  WHERE 
						n.nspname = 'inventory_smart' 
						AND c.relname = 'cmw_' || fw.fiscal_year_week
					) as fw_part, 
					EXISTS (
					  SELECT 
					  FROM 
						pg_catalog.pg_class c 
						JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace 
					  WHERE 
						n.nspname = 'inventory_smart' 
						AND c.relname = 'cmw_' || fw.fiscal_year_week || '_' || md5(
						  lower(
							regexp_replace(paf.l0_name, '\W+', '', 'g')
						  )
						)
					) as l0_part, 
					EXISTS (
					  SELECT 
					  FROM 
						pg_catalog.pg_class c 
						JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace 
					  WHERE 
						n.nspname = 'inventory_smart' 
						AND c.relname = 'cmw_' || fw.fiscal_year_week || '_' || md5(
						  lower(
							regexp_replace(paf.l0_name, '\W+', '', 'g')
						  ) || '_' || lower(
							regexp_replace(paf.l1_name, '\W+', '', 'g')
						  )
						)
					) as l1_part 
				  from 
					(
					  select 
						l0_name, 
						l1_name 
					  from 
						global.product_attributes_filter 
					  group by 
						1, 
						2
					  order by 1,2
					) paf cross 
					join (
					  select 
						fiscal_year_week 
					  from 
						global.fiscal_date_mapping 
					  where 
						date >= current_date  - interval '2 month' 
						and date <= current_date + interval '1 year' 
					  group by 
						1
					  order by 1
					) fw
				) map
			) 
			select 
			  fw_query as q 
			from 
			  map 
			where 
			  fw_query != '' 
			group by 
			  1 
			union all 
			select 
			  l0_query as q 
			from 
			  map 
			where 
			  l0_query != '' 
			group by 
			  1 
			union all 
			select 
			  l1_query as q 
			from 
			  map 
			where 
			  l1_query != '' 
			group by 
			  1
			loop 
				raise notice '_q: %', _query;
				execute _query;
		   end loop;
  		elsif $1 = 'dc_product_reserve_quantity' then
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
		elsif $1 = 'fwos_sku_store_table' then
	 		for _partition_statement,_partition_name in select 
				  partition_stmt, 
				  partition_name 
				from 
				  (
				    select 
				      distinct 'CREATE TABLE IF NOT EXISTS "inventory_smart".fwos_sku_store_table_' || lower(
				        regexp_replace(
				          pa.attribute_value, '\W+', '', 'g'
				        )
				      ) || ' PARTITION OF "inventory_smart".fwos_sku_store_table FOR VALUES IN (''' || replace(pa.attribute_value, '''', '''''')|| ''');' as partition_stmt, 
				      'fwos_sku_store_table_' || lower(
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
  		elsif $1 = 'constraint_validity_master' then
	 		for _partition_statement,_partition_name in select 
				  partition_stmt, 
				  partition_name 
				from 
				  (
				    select 
					'CREATE TABLE IF NOT EXISTS "inventory_smart".constraint_validity_master_default PARTITION OF "inventory_smart".constraint_validity_master(
						CONSTRAINT cvm_default_uk EXCLUDE USING gist (product_code WITH =, store_code WITH =, validity WITH &&)
					) DEFAULT ;' partition_stmt, 
					lower('constraint_master_default') partition_name, 
					1 rn 
					union all				      
					select 
					'CREATE TABLE IF NOT EXISTS "inventory_smart".cvm_' || lower(
						regexp_replace(
						pa.attribute_value, '\W+', '', 'g'
						)
					) || ' PARTITION OF "inventory_smart".constraint_validity_master(
							CONSTRAINT cvm_' || lower(
								regexp_replace(
								pa.attribute_value, '\W+', '', 'g'
								)
							) || '_uk EXCLUDE USING gist (l0_name WITH =, product_code WITH =, store_code WITH =, validity WITH &&)
						) FOR VALUES IN (''' || replace(pa.attribute_value, '''', '''''')|| ''');' as partition_stmt, 
					'cvm_' || lower(
						regexp_replace(
						pa.attribute_value, '\W+', '', 'g'
						)
					) as partition_name, 
					2 rn 
					from 
					global.product_attributes pa 
					where 
					pa.attribute_name = 'l0_name'
					group by pa.attribute_value
				  ) x 
				order by 
				  rn asc loop 
					 raise notice '%', _partition_statement ;	
					 execute _partition_statement ;
					 raise notice '%',_partition_statement ||' '||_partition_name;
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

		elsif $1 = 'product_attributes'	then
 		
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
		elsif $1 = 'store_attributes'	then
 		
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
				execute _partition_statement;
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
--					 execute 'insert into global.dynamic_ddl_for_replication (tablename, dynamic_def, created_by, hash_value)
--				     values(' || quote_literal(_partition_name) || ',' || quote_literal(_partition_statement) || ', current_user, md5(' || quote_literal(_partition_statement) || '))
--                     on conflict do nothing;';
				execute _partition_statement;
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
--					 execute 'insert into global.dynamic_ddl_for_replication (tablename, dynamic_def, created_by, hash_value)
--				     values(' || quote_literal(_partition_name) || ',' || quote_literal(_partition_statement) || ', current_user, md5(' || quote_literal(_partition_statement) || '))
--                     on conflict do nothing;';
				execute _partition_statement;
 			 end loop;	
        elsif $1 IN('product_time_attributes','dc_availability_report_flattened','priority_code_configuration') then
	  			_table_name := CASE WHEN $1 IN ('dc_availability_report_flattened','priority_code_configuration')
				  				THEN 'inventory_smart.'||$1 ELSE 'global.'||$1 END  ;			  
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
				      global.product_attributes pa 
				    where 
				      pa.attribute_name = 'l0_name'
				     group by pa.attribute_value 
				     order by  pa.attribute_value
				  ) x 
				  group by 1,2
				  order by 2
				  loop 
				  --raise notice '_partition_statement:%',_partition_statement;
--				 	 execute 'insert into global.dynamic_ddl_for_replication (tablename, dynamic_def, created_by, hash_value)
--				     values(' || quote_literal(_partition_name_l0name) || ',' || quote_literal(_partition_statement) || ', current_user, md5(' || quote_literal(_partition_statement) || '))
--                     on conflict do nothing;';
					execute _partition_statement;
				end loop ;
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
						_partition_statement = 'CREATE TABLE IF NOT EXISTS ' || _partition_name || ' PARTITION OF ' || _table_name || ' FOR VALUES from ('''||v_from_date ||''') to ('''||v_to_date ||''') ;';
--						execute 'insert into global.dynamic_ddl_for_replication (tablename, dynamic_def, created_by, hash_value)
--			        	values(' || quote_literal(_partition_name) || ',' || quote_literal(_partition_statement) || ', current_user, md5(' || quote_literal(_partition_statement) || '))
--                  	  on conflict do nothing;';
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
--	 					 execute 'insert into global.dynamic_ddl_for_replication (tablename, dynamic_def, created_by, hash_value)
--					     values(' || quote_literal(_partition_name) || ',' || quote_literal(_partition_statement) || ', current_user, md5(' || quote_literal(_partition_statement) || '))
--                     on conflict do nothing;';
						execute _partition_statement;
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

		elsif $1 = 'create_allocation_result_flat_gurobi_past_finalized' then
        
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
                (SELECT MIN(created_at::date) FROM inventory_smart.create_allocation_result_flat_gurobi WHERE created_at < current_date - interval '3 months'),
                (SELECT MAX(created_at::date) FROM inventory_smart.create_allocation_result_flat_gurobi WHERE created_at < current_date - interval '3 months'),
                interval '1 day'
            ) AS s(day) loop
            
             _partition_statement := 'CREATE TABLE IF NOT EXISTS inventory_smart."gurobi_past_' || _std || '" PARTITION OF inventory_smart.create_allocation_result_flat_gurobi_past_finalized FOR VALUES FROM (''' || _st || ''') TO (''' || _et || ''');';
            
            raise notice '_partition_statement: %', _partition_statement;
            execute _partition_statement;
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
				_partition_name := 'global."mtp_audit_log_' || _std || '"' ;
--				execute 'insert into global.dynamic_ddl_for_replication (tablename, dynamic_def, created_by, hash_value)
--			    values(' || quote_literal(_partition_name) || ',' || quote_literal(_partition_statement) || ', current_user, md5(' || quote_literal(_partition_statement) || '))
--                on conflict do nothing;';
				execute _partition_statement;
			end loop;	
		 elsif $1 like '%assort_master_plan%' then
		 	for _partition_statement,_partition_name,_attr_value
				in 
				select 
				'create table IF NOT EXISTS  '||$1||'_'|| lower(regexp_replace(case when length(x.value)>5 then x.value else x.value end, '\W+', '', 'g'))||' PARTITION OF '||$1||' for values in (''' || x.value|| ''')  partition by list  (l1_name)' partition_stmt,
				 $1||'_'|| lower(regexp_replace(case when length(x.value)>5 then x.value else x.value end, '\W+', '', 'g')) partition_name ,
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
					'create table IF NOT EXISTS  '||_partition_name||'_'|| lower(regexp_replace(case when length(x.value)>5 then x.value else x.value end, '\W+', '', 'g'))||' PARTITION OF '||_partition_name||' for values in (''' || x.value|| ''')  partition by list  (channel)' partition_stmt,
					_partition_name||'_'|| lower(regexp_replace(case when length(x.value)>5 then x.value else x.value end, '\W+', '', 'g')) partition_name 
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
							'create table IF NOT EXISTS  '||_sub_partition_name1||'_'|| lower(regexp_replace(case when length(x.value)>5 then x.value else x.value end, '\W+', '', 'g'))||' PARTITION OF '||_sub_partition_name1||' for values in (''' || x.value|| ''')  partition by range  (start_date)' partition_stmt,
							_sub_partition_name1||'_'|| lower(regexp_replace(case when length(x.value)>5 then x.value else x.value end, '\W+', '', 'g')) partition_name 
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

        elsif $1 like '%product_life_cycle%' then
	 		for _partition_statement,_partition_name in select 
				  partition_stmt, 
				  partition_name 
				from 
				  (
				    select 
				      distinct 'CREATE TABLE IF NOT EXISTS "inventory_smart".product_life_cycle_' || lower(
				        regexp_replace(
				          pa.attribute_value, '\W+', '', 'g'
				        )
				      ) || ' PARTITION OF "inventory_smart".product_life_cycle FOR VALUES IN (''' || replace(pa.attribute_value, '''', '''''')|| ''');' as partition_stmt, 
				      'product_life_cycle_' || lower(
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
					 raise notice '%', _partition_statement;
					 execute _partition_statement;
					 raise notice '%',_partition_statement ||' '||_partition_name;
 			 end loop;
		elsif $1 like 'rcl_constraint_master:%' then
			_rcl_code := split_part($1, ':', 2);
	 		for _partition_statement,_partition_name in select 
				  partition_stmt, 
				  partition_name 
				from 
				  (
					select 
				      distinct 'CREATE TABLE IF NOT EXISTS "inventory_smart".rcl_constraint_master_rule_' || _rcl_code || ' PARTITION OF "inventory_smart".rcl_constraint_master_rule(
						CONSTRAINT rcl_constraint_master_rule_' || _rcl_code || '_uk EXCLUDE USING hash (md5((rcl_dimension)::text) WITH =)
				      ) FOR VALUES IN (' || _rcl_code || ');' as partition_stmt, 
				      'rcl_constraint_master_rule_' || _rcl_code as partition_name, 
				      1 rn 
				      union all
					select 
				      distinct 'CREATE TABLE IF NOT EXISTS "inventory_smart".rcl_constraint_master_' || _rcl_code || ' PARTITION OF "inventory_smart".rcl_constraint_master(
						CONSTRAINT rcl_constraint_master_' || _rcl_code || '_uk EXCLUDE USING gist (rcl_code WITH =, rule_code WITH =, psa_code with =, validity WITH &&)
					) FOR VALUES IN (' || _rcl_code || ');' as partition_stmt,
				      'rcl_constraint_master_' || _rcl_code as partition_name, 
				      2 rn 
				      union all
					select 
					  distinct 'CREATE TABLE IF NOT EXISTS "inventory_smart".rcl_constraint_master_exceptions_' || _rcl_code || ' PARTITION OF "inventory_smart".rcl_constraint_master_exceptions(
						CONSTRAINT rcl_constraint_master_exceptions_' || _rcl_code || '_uk EXCLUDE USING gist (rcl_code WITH =, rule_code WITH =, store_code WITH =, validity WITH &&)
					) FOR VALUES IN (' || _rcl_code || ');' as partition_stmt, 
					  'rcl_constraint_master_exceptions_' || _rcl_code as partition_name, 
					  3 rn 
				  ) x 
				order by 
				  rn asc loop 
					 raise notice '%', _partition_statement || ' ' || _partition_name;
					 execute _partition_statement ;
 			 end loop;	
		elsif $1 like 'rcl_product_mapping_product_store:%' then
			_rcl_code := split_part($1, ':', 2);
	 		for _partition_statement,_partition_name in select 
				  partition_stmt, 
				  partition_name 
				from 
				  (
					select 
				      distinct 'CREATE TABLE IF NOT EXISTS "global".rcl_product_mapping_product_store_rule_' || _rcl_code || ' PARTITION OF "global".rcl_product_mapping_product_store_rule FOR VALUES IN (' || _rcl_code || ');' as partition_stmt, 
				      'rcl_product_mapping_product_store_rule_' || _rcl_code as partition_name, 
				      1 rn 
				      union all
					select 
				      distinct 'CREATE TABLE IF NOT EXISTS "global".rcl_product_mapping_product_store_' || _rcl_code || ' PARTITION OF "global".rcl_product_mapping_product_store FOR VALUES IN (' || _rcl_code || ');' as partition_stmt, 
				      'rcl_product_mapping_product_store_' || _rcl_code as partition_name, 
				      2 rn 
				      union all
					select 
					  distinct 'CREATE TABLE IF NOT EXISTS "global".rcl_product_mapping_product_store_exceptions_' || _rcl_code || ' PARTITION OF "global".rcl_product_mapping_product_store_exceptions FOR VALUES IN (' || _rcl_code || ');' as partition_stmt, 
					  'rcl_product_mapping_product_store_exceptions_' || _rcl_code as partition_name, 
					  3 rn 
				  ) x 
				order by 
				  rn asc loop 
--					 execute 'insert into global.dynamic_ddl_for_replication (tablename, dynamic_def, created_by, hash_value)
--				     values(' || quote_literal(_partition_name) || ',' || quote_literal(_partition_statement) || ', current_user, md5(' || quote_literal(_partition_statement) || '))
--                     on conflict do nothing;';
				execute _partition_statement;
 			 end loop;
		elsif $1 like 'rcl_dc_store_policy:%' then
			_rcl_code := split_part($1, ':', 2);
	 		for _partition_statement,_partition_name in select 
				  partition_stmt, 
				  partition_name 
				from 
				  (
					select 
				      distinct 'CREATE TABLE IF NOT EXISTS "inventory_smart".rcl_dc_store_policy_rule_' || _rcl_code || ' PARTITION OF "inventory_smart".rcl_dc_store_policy_rule FOR VALUES IN (' || _rcl_code || ');' as partition_stmt, 
				      'rcl_dc_store_policy_rule_' || _rcl_code as partition_name, 
				      1 rn 
				      union all
					select 
				      distinct 'CREATE TABLE IF NOT EXISTS "inventory_smart".rcl_dc_store_policy_' || _rcl_code || ' PARTITION OF "inventory_smart".rcl_dc_store_policy FOR VALUES IN (' || _rcl_code || ');' as partition_stmt, 
				      'rcl_dc_store_policy_' || _rcl_code as partition_name, 
				      2 rn 
					  union all
					select 
				      distinct 'CREATE TABLE IF NOT EXISTS "inventory_smart".rcl_dc_store_policy_store_level_' || _rcl_code || ' PARTITION OF "inventory_smart".rcl_dc_store_policy_store_level FOR VALUES IN (' || _rcl_code || ');' as partition_stmt, 
				      'rcl_dc_store_policy_store_level_' || _rcl_code as partition_name, 
				      3 rn 
				  ) x  	
				order by 
				  rn asc loop 
					 raise notice '%', _partition_statement || ' ' || _partition_name;
					 execute _partition_statement ;
 			 end loop;
		elsif $1 like 'rcl_po_store_policy:%' then
			_rcl_code := split_part($1, ':', 2);
	 		for _partition_statement,_partition_name in select
				  partition_stmt,
				  partition_name
				from
				  (
					select
				      distinct 'CREATE TABLE IF NOT EXISTS "inventory_smart".rcl_po_store_policy_rule_' || _rcl_code || ' PARTITION OF "inventory_smart".rcl_po_store_policy_rule FOR VALUES IN (' || _rcl_code || ');' as partition_stmt,
				      'rcl_po_store_policy_rule_' || _rcl_code as partition_name,
				      1 rn
				      union all
					select
				      distinct 'CREATE TABLE IF NOT EXISTS "inventory_smart".rcl_po_store_policy_' || _rcl_code || ' PARTITION OF "inventory_smart".rcl_po_store_policy FOR VALUES IN (' || _rcl_code || ');' as partition_stmt,
				      'rcl_po_store_policy_' || _rcl_code as partition_name,
				      2 rn
					  union all
					select
				      distinct 'CREATE TABLE IF NOT EXISTS "inventory_smart".rcl_po_store_policy_store_level_' || _rcl_code || ' PARTITION OF "inventory_smart".rcl_po_store_policy_store_level FOR VALUES IN (' || _rcl_code || ');' as partition_stmt,
				      'rcl_po_store_policy_store_level_' || _rcl_code as partition_name,
				      3 rn
				  ) x
				order by
				  rn asc loop
					 raise notice '%', _partition_statement || ' ' || _partition_name;
					 execute _partition_statement ;
 			 end loop;
		elsif $1 like 'rcl_oms_constraint_master:%' then
			_rcl_code := split_part($1, ':', 2);
	 		for _partition_statement,_partition_name in select 
				  partition_stmt, 
				  partition_name 
				from 
				  (
					select 
				      distinct 'CREATE TABLE IF NOT EXISTS "inventory_smart".rcl_oms_constraint_master_rule_' || _rcl_code || ' PARTITION OF "inventory_smart".rcl_oms_constraint_master_rule(
						CONSTRAINT rcl_oms_constraint_master_rule_' || _rcl_code || '_uk EXCLUDE USING hash (md5((rcl_dimension)::text) WITH =)
				      ) FOR VALUES IN (' || _rcl_code || ');' as partition_stmt, 
				      'rcl_oms_constraint_master_rule_' || _rcl_code as partition_name, 
				      1 rn 
				      union all
					select 
				      distinct 'CREATE TABLE IF NOT EXISTS "inventory_smart".rcl_oms_constraint_master_' || _rcl_code || ' PARTITION OF "inventory_smart".rcl_oms_constraint_master(
						CONSTRAINT rcl_oms_constraint_master_' || _rcl_code || '_uk EXCLUDE USING gist (rcl_code WITH =, rule_code WITH =, validity WITH &&)
					) FOR VALUES IN (' || _rcl_code || ');' as partition_stmt,
				      'rcl_constraint_master_' || _rcl_code as partition_name, 
				      2 rn 
				  ) x 
				order by 
				  rn asc loop 
					 raise notice '%', _partition_statement || ' ' || _partition_name;
					 execute _partition_statement ;
 			 end loop;	
        elsif $1 like 'rcl_network_master:%' then
			_rcl_code := split_part($1, ':', 2);
	 		for _partition_statement,_partition_name in select 
				  partition_stmt, 
				  partition_name 
				from 
				  (
					select 
				      distinct 'CREATE TABLE IF NOT EXISTS "inventory_smart".rcl_network_rule_' || _rcl_code || ' PARTITION OF "inventory_smart".rcl_network_rule(
						CONSTRAINT rcl_network_rule_' || _rcl_code || '_uk EXCLUDE USING hash (md5((rcl_dimension)::text) WITH =)
				      ) FOR VALUES IN (' || _rcl_code || ');' as partition_stmt, 
				      'rcl_network_rule_' || _rcl_code as partition_name, 
				      1 rn 
				      union all
					select 
				      distinct 'CREATE TABLE IF NOT EXISTS "inventory_smart".rcl_network_master_' || _rcl_code || ' PARTITION OF "inventory_smart".rcl_network_master(
						CONSTRAINT rcl_network_master_' || _rcl_code || '_uk EXCLUDE USING gist (rcl_code WITH =, rule_code WITH =, validity WITH &&)
					) FOR VALUES IN (' || _rcl_code || ');' as partition_stmt,
				      'rcl_network_master_' || _rcl_code as partition_name, 
				      2 rn 
				  ) x 
				order by 
				  rn asc loop 
					 raise notice '%', _partition_statement || ' ' || _partition_name;
					 execute _partition_statement ;
 			 end loop; 
			 elsif $1 in ('latest_inventory','article_inventory_dashboard','article_store_grade')  then
			  FOR _query IN 
		        WITH map AS (
		            SELECT 
		                l0_name, 
		                l1_name,
		                EXISTS (
		                    SELECT 1 FROM pg_catalog.pg_class c 
		                    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace 
		                    WHERE n.nspname = 'inventory_smart' 
		                    AND c.relname = $1 ||'_' || md5(lower(regexp_replace(paf.l0_name, '\W+', '', 'g')))
		                ) AS l0_part,
		                                EXISTS (
                    SELECT 1 FROM pg_catalog.pg_class c 
                    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace 
                    WHERE n.nspname = 'inventory_smart' 
                    AND c.relname = $1 ||'_' || 
                        md5(lower(regexp_replace(paf.l0_name, '\W+', '', 'g')) || '_' || lower(regexp_replace(paf.l1_name, '\W+', '', 'g')))
                    
						
                ) AS l1_part
		            FROM (
		                SELECT l0_name, l1_name 
		                FROM global.product_attributes_filter 
		                GROUP BY 1, 2
		                ORDER BY 1, 2
		            ) paf
		        )
		        SELECT 
		            CASE WHEN NOT l0_part THEN 
		                'CREATE TABLE IF NOT EXISTS inventory_smart.'|| $1 ||'_'|| 
		                md5(lower(regexp_replace(l0_name, '\W+', '', 'g'))) || 
		                ' PARTITION OF inventory_smart.'|| $1 ||' FOR VALUES IN (' || 
		                quote_literal(l0_name) || ') PARTITION BY LIST (l1_name);' 
		            ELSE '' END AS query
		        FROM map
		        WHERE NOT l0_part
		        GROUP BY 1
		        UNION ALL
		                SELECT 
            CASE WHEN NOT l1_part THEN 
                'CREATE TABLE IF NOT EXISTS inventory_smart.'|| $1 ||'_'|| 
                md5(lower(regexp_replace(l0_name, '\W+', '', 'g')) || '_' || lower(regexp_replace(l1_name, '\W+', '', 'g'))) || 
                ' PARTITION OF inventory_smart.'|| $1 ||'_'|| 
                md5(lower(regexp_replace(l0_name, '\W+', '', 'g'))) || ' FOR VALUES IN (' || quote_literal(l1_name) || ');'
            ELSE '' END AS query
		        FROM map
		        WHERE NOT l1_part
		        GROUP BY 1
		    LOOP
		        RAISE NOTICE '_query: %', _query;
		        IF _query <> '' THEN
		            EXECUTE _query;
		        END IF;
		    END LOOP;
		elsif $1 like 'store_mapping:%' then
			_rule_id := split_part($1, ':', 2);
	 		for _partition_statement,_partition_name in select 
				  partition_stmt, 
				  partition_name 
				from 
				  (
					select 
				      distinct 'CREATE TABLE IF NOT EXISTS "inventory_smart".store_mapping_' || _rule_id || ' PARTITION OF "inventory_smart".store_mapping
						FOR VALUES IN (' || _rule_id || ');' as partition_stmt, 
				      'store_mapping_' || _rule_id as partition_name, 
				      1 rn 
				  ) x 
				order by 
				  rn asc loop 
					 raise notice '%', _partition_statement || ' ' || _partition_name;
					 execute _partition_statement ;
 		end loop;	
/*
		elsif $1 like 'rcl_product_status:%' then
			_rcl_code := split_part($1, ':', 2);
	 		for _partition_statement,_partition_name in select 
				  partition_stmt, 
				  partition_name 
				from 
				  (
					select 
					  distinct 'CREATE TABLE IF NOT EXISTS "global".rcl_product_status_' || _rcl_code || ' PARTITION OF "global".rcl_product_status(
						CONSTRAINT rcl_product_status_' || _rcl_code || '_uk EXCLUDE USING gist (rcl_code WITH =, md5(rcl_dimention::text) WITH =,  validity WITH &&)
				      ) FOR VALUES IN (' || _rcl_code || ');' as partition_stmt, 
				      'rcl_product_status_' || _rcl_code as partition_name, 
				      2 rn 
				      union all
					select 
					  distinct 'CREATE TABLE IF NOT EXISTS "global".rcl_product_status_exceptions_' || _rcl_code || ' PARTITION OF "global".rcl_product_status_exceptions(
						CONSTRAINT rcl_product_status_exceptions_' || _rcl_code || '_uk EXCLUDE USING gist (rcl_code WITH =, product_code WITH =, validity WITH &&)
					) FOR VALUES IN (' || _rcl_code || ');' as partition_stmt, 
					  'rcl_product_status_exceptions_' || _rcl_code as partition_name, 
					  3 rn 
				  ) x 
				order by 
				  rn asc loop 
					 execute 'insert into global.dynamic_ddl_for_replication (tablename, dynamic_def, created_by, hash_value)
				     values(' || quote_literal(_partition_name) || ',' || quote_literal(_partition_statement) || ', current_user, md5(' || quote_literal(_partition_statement) || '))
                     on conflict do nothing;';
	 			 -- execute _partition_statement;
 			 end loop;	
		elsif $1 like 'rcl_store_status:%' then
			_rcl_code := split_part($1, ':', 2);
	 		for _partition_statement,_partition_name in select 
				  partition_stmt, 
				  partition_name 
				from 
				  (
					select 
					  distinct 'CREATE TABLE IF NOT EXISTS "global".rcl_store_status_' || _rcl_code || ' PARTITION OF "global".rcl_store_status(
						CONSTRAINT rcl_store_status_' || _rcl_code || '_uk EXCLUDE USING gist (rcl_code WITH =, md5(rcl_dimention::text) WITH =,  validity WITH &&)
				      ) FOR VALUES IN (' || _rcl_code || ');' as partition_stmt, 
				      'rcl_store_status_' || _rcl_code as partition_name, 
				      2 rn 
				      union all
					select 
					  distinct 'CREATE TABLE IF NOT EXISTS "global".rcl_store_status_exceptions_' || _rcl_code || ' PARTITION OF "global".rcl_store_status_exceptions(
						CONSTRAINT rcl_store_status_exceptions_' || _rcl_code || '_uk EXCLUDE USING gist (rcl_code WITH =, store_code WITH =, validity WITH &&)
					) FOR VALUES IN (' || _rcl_code || ');' as partition_stmt, 
					  'rcl_store_status_exceptions_' || _rcl_code as partition_name, 
					  3 rn 
				  ) x 
				order by 
				  rn asc loop 
					 execute 'insert into global.dynamic_ddl_for_replication (tablename, dynamic_def, created_by, hash_value)
				     values(' || quote_literal(_partition_name) || ',' || quote_literal(_partition_statement) || ', current_user, md5(' || quote_literal(_partition_statement) || '))
                     on conflict do nothing;';
	 			 -- execute _partition_statement;
 			 end loop;
*/
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
