--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:build_list_partitions_chg1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: initial changeset for build_list_partitions
--rollback: SELECT 1

Drop procedure if exists item_smart.build_list_partitions(IN input text);
CREATE OR REPLACE PROCEDURE item_smart.build_list_partitions(IN input text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

 	declare
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
		_st timestamptz;
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
	    _week_code varchar;
        _month_code varchar;
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
				 
	  				raise notice '%',_partition_statement;
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
					 raise notice '%', _partition_statement || ' ' || _partition_name;
					 execute _partition_statement ;
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
				  ) x  	
				order by 
				  rn asc loop 
					 raise notice '%', _partition_statement || ' ' || _partition_name;
					 execute _partition_statement ;
 			 end loop;
 			 
 		 elsif $1 like '%w2d_contribution_sku%' then
		 	for _partition_statement,_partition_name
				in 
				select 
				'create table IF NOT EXISTS  '||$1||'_'|| lower(regexp_replace(case when length(x.value)>5 then x.value else x.value end, '\W+', '', 'g'))||' PARTITION OF '||$1||' for values in (''' || x.value|| ''')  partition by list  (dept)' partition_stmt,
				 $1||'_'|| lower(regexp_replace(case when length(x.value)>5 then x.value else x.value end, '\W+', '', 'g')) partition_name ,
				 x.value 
				from 
				(
				select 
				distinct wm.dept as value  from "item_smart".wp_master_test wm  ) x
--				where wm.dept  ='l0_name')
				 order by 2
				loop 
				raise notice '_partition_name%',_partition_statement; 
					execute _partition_statement;
					for _sub_partition_stmt1,_sub_partition_name1
					in 
					select 
					'create table IF NOT EXISTS  '||_partition_name||'_'|| lower(regexp_replace(case when length(x.value)>5 then x.value else x.value end, '\W+', '', 'g'))||' PARTITION OF '||_partition_name||' for values in (''' || x.value|| ''')  partition by list  (channel)' partition_stmt,
					_partition_name||'_'|| lower(regexp_replace(case when length(x.value)>5 then x.value else x.value end, '\W+', '', 'g')) partition_name 
					 	from 
						(
						select distinct(wm.channel) as value  from "item_smart".wp_master_test wm ) x order by 2
						loop 
							raise notice '_sub_partition_name1%',_sub_partition_stmt1; 
							execute _sub_partition_stmt1;
			     
							for _week_code in 
										SELECT 
                                       TO_CHAR(week_start, 'IYYYIW') AS _week_code
                                       FROM generate_series(
                                       '2020-01-01'::date, 
                                       '2040-01-01'::date, 
                                       '1 week'::interval ) AS week_start order by 1
					  		loop
								_sub_partition_name3 := 'CREATE TABLE IF NOT EXISTS '||_sub_partition_name1 || _week_code || ' PARTITION OF '||_sub_partition_name1 ||' FOR VALUES IN (''' || _week_code || ''') ;';
								raise notice '_sub_partition_name3: %', _sub_partition_name3;
								execute _sub_partition_name3;
					end loop;
				end loop;
			end loop;
		
 		 elsif $1 like '%alerts%' then
		 	for _partition_statement,_partition_name
				in 
				select 
				'create table IF NOT EXISTS  '||$1||'_'|| lower(regexp_replace(case when length(x.value)>5 then x.value else x.value end, '\W+', '', 'g'))||' PARTITION OF '||$1||' for values in (''' || x.value|| ''')  partition by list  (channel)' partition_stmt,
				 $1||'_'|| lower(regexp_replace(case when length(x.value)>5 then x.value else x.value end, '\W+', '', 'g')) partition_name ,
				 x.value 
				from 
				(
				select 
				distinct wm.dept as value  from "item_smart".wp_master_mv wm  ) x
--				where wm.dept  ='l0_name')
				 order by 2
				loop 
				raise notice '_partition_name%',_partition_statement; 
					execute _partition_statement;
					for _sub_partition_stmt1,_sub_partition_name1
					in 
					select 
					'create table IF NOT EXISTS  '||_partition_name||'_'|| lower(regexp_replace(case when length(x.value)>5 then x.value else x.value end, '\W+', '', 'g'))||' PARTITION OF '||_partition_name||' for values in (''' || x.value|| ''')  partition by list  (month)' partition_stmt,
					_partition_name||'_'|| lower(regexp_replace(case when length(x.value)>5 then x.value else x.value end, '\W+', '', 'g')) partition_name 
					 	from 
						(
						select distinct(wm.channel) as value  from "item_smart".wp_master_mv wm ) x order by 2
						loop 
							raise notice '_sub_partition_name1%',_sub_partition_stmt1; 
							execute _sub_partition_stmt1;
			     
							for _month_code in 
                                     select distinct wm.fiscal_year_month as value from "item_smart".wp_master_mv wm order by 1  
					  		loop
								_sub_partition_name3 := 'CREATE TABLE IF NOT EXISTS '||_sub_partition_name1 || '_' || _month_code || ' PARTITION OF '||_sub_partition_name1 ||' FOR VALUES IN (''' || _month_code || ''') ;';
								raise notice '_sub_partition_name3: %', _sub_partition_name3;
								execute _sub_partition_name3;
					end loop;
				end loop;
			end loop;	


 		 elsif $1 like '%_master%' then
		 	for _partition_statement,_partition_name
				in 
				select 
				'create table IF NOT EXISTS  '||$1||'_'|| lower(regexp_replace(case when length(x.value)>5 then x.value else x.value end, '\W+', '', 'g'))||' PARTITION OF '||$1||' for values in (''' || x.value|| ''')  partition by list  (channel)' partition_stmt,
				 $1||'_'|| lower(regexp_replace(case when length(x.value)>5 then x.value else x.value end, '\W+', '', 'g')) partition_name ,
				 x.value 
				from 
				(
				select 
				distinct wm.dept as value  from "item_smart".wp_master_mv wm  ) x
--				where wm.dept  ='l0_name')
				 order by 2
				loop 
				raise notice '_partition_name%',_partition_statement; 
					execute _partition_statement;
					for _sub_partition_stmt1,_sub_partition_name1
					in 
					select 
					'create table IF NOT EXISTS  '||_partition_name||'_'|| lower(regexp_replace(case when length(x.value)>5 then x.value else x.value end, '\W+', '', 'g'))||' PARTITION OF '||_partition_name||' for values in (''' || x.value|| ''')  partition by list  (current_week)' partition_stmt,
					_partition_name||'_'|| lower(regexp_replace(case when length(x.value)>5 then x.value else x.value end, '\W+', '', 'g')) partition_name 
					 	from 
						(
						select distinct(wm.channel) as value  from "item_smart".wp_master_mv wm ) x order by 2
						loop 
							raise notice '_sub_partition_name1%',_sub_partition_stmt1; 
							execute _sub_partition_stmt1;
			     
							for _week_code in 
                                SELECT DISTINCT wm.current_week AS value FROM "item_smart".wp_master_mv wm WHERE wm.current_week BETWEEN 202301 AND 202659 ORDER BY 1
					  		loop
								_sub_partition_name3 := 'CREATE TABLE IF NOT EXISTS '||_sub_partition_name1 || '_' || _week_code || ' PARTITION OF '||_sub_partition_name1 ||' FOR VALUES IN (''' || _week_code || ''') ;';
								raise notice '_sub_partition_name3: %', _sub_partition_name3;
								execute _sub_partition_name3;
					end loop;
				end loop;
			end loop;


	elsif $1 like '%itemfact_sku_week%' then
    for _partition_statement, _partition_name
        in 
        select 
            'create table IF NOT EXISTS  ' || $1 || '_' || lower(regexp_replace(x.value, '\W+', '', 'g')) || 
            ' PARTITION OF ' || $1 || ' for values in (''' || x.value || ''') partition by list (current_week)' partition_stmt,
            $1 || '_' || lower(regexp_replace(x.value, '\W+', '', 'g')) partition_name,
            x.value 
        from 
        (
            select distinct wm.dept as value from "item_smart".wp_master_mv wm
        ) x
        order by 2
    loop 
        raise notice '_partition_name: %', _partition_statement; 
        execute _partition_statement;

        for _week_code in 
            select distinct wm.current_week as value from "item_smart".wp_master_mv wm order by 1 
        loop
            _sub_partition_name3 := 'CREATE TABLE IF NOT EXISTS ' || _partition_name || '_' || _week_code || 
                                    ' PARTITION OF ' || _partition_name || 
                                    ' FOR VALUES IN (''' || _week_code || ''');';
            raise notice '_sub_partition_name3: %', _sub_partition_name3;
            execute _sub_partition_name3;
        end loop;
    end loop;
	


elsif $1 like '%itemfact_sku%' then
    for _partition_statement, _partition_name
        in 
        select 
            'create table IF NOT EXISTS ' || $1 || '_' || lower(regexp_replace(x.value, '\W+', '', 'g')) || 
            ' PARTITION OF ' || $1 || ' FOR VALUES IN (''' || x.value || ''');' partition_stmt,
            $1 || '_' || lower(regexp_replace(x.value, '\W+', '', 'g')) partition_name
        from 
        (
            select distinct wm.dept as value from "item_smart".wp_master_mv wm
        ) x
        order by 2
    loop 
        raise notice '_partition_name: %', _partition_statement; 
        execute _partition_statement;
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
					 raise notice '%', _partition_statement || ' ' || _partition_name;
					 execute _partition_statement ;
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
					 raise notice '%', _partition_statement || ' ' || _partition_name;
					 execute _partition_statement ;
 			 end loop;
*/
		end if;
 	end
$procedure$
;
