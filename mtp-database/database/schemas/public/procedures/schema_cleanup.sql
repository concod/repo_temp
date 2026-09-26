--liquibase formatted sql
--changeset liquibase:schema_cleanup runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for schema_cleanup
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.schema_cleanup();
CREATE OR REPLACE PROCEDURE public.schema_cleanup()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE 
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.schema_cleanup';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
		_drop_stmt text;
		_std int;
		_et timestamptz;
		_sql text;
		_gurobi_table_exists bool;
		_cache_table_exists bool;
		_di_versioning_table_exists bool;
		_rcl_versioning_table_exists bool;
        _attribute_names text[];
        _attribute_names_old text[];
        _attribute_names_new text[];
		_schema_name text;
        -- Variable for partition creation
        v_partition_name text;
        _final_allocations_table_exists bool;
	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		FOR _drop_stmt IN select concat('DROP TABLE IF EXISTS ' || quote_ident(schemaname) || '.' || quote_ident(tablename) || ' cascade;') as drop_stmt from pg_tables where schemaname = 'public' LOOP
			EXECUTE _drop_stmt;
		END LOOP;

		--=========== create partitions for carfg table;
		SELECT EXISTS (
			SELECT 1
			FROM information_schema.tables
			WHERE table_schema  = 'inventory_smart'
			and table_name = 'create_allocation_result_flat_gurobi'
			  AND table_catalog = current_database()
    	) INTO _gurobi_table_exists;
    	if _gurobi_table_exists then
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
					_sql := 'CREATE TABLE IF NOT EXISTS inventory_smart."create_allocation_result_flat_gurobi_' || _std || '" PARTITION OF inventory_smart.create_allocation_result_flat_gurobi FOR VALUES FROM (''' || _st || ''') TO (''' || _et || ''');';
					raise notice '_sql: %', _sql;
					EXECUTE _sql;
            end loop;
        end if;

        --=========== create partitions for final_allocations_results table
        SELECT EXISTS (
			SELECT 1
			FROM information_schema.tables
			WHERE table_schema  = 'inventory_smart'
			and table_name = 'final_allocations_results'
			  AND table_catalog = current_database()
    	) INTO _final_allocations_table_exists;
        
        if _final_allocations_table_exists then
            -- Create partition for current month
            v_partition_name := 'final_allocations_results_' || to_char(date_trunc('month', CURRENT_DATE), 'YYYYMM');
            EXECUTE format(
                'CREATE TABLE IF NOT EXISTS inventory_smart.%I PARTITION OF inventory_smart.final_allocations_results FOR VALUES FROM (%L) TO (%L)',
                v_partition_name, 
                date_trunc('month', CURRENT_DATE), 
                date_trunc('month', CURRENT_DATE) + interval '1 month'
            );
            
            -- Create partition for next month
            v_partition_name := 'final_allocations_results_' || to_char(date_trunc('month', CURRENT_DATE) + interval '1 month', 'YYYYMM');
            EXECUTE format(
                'CREATE TABLE IF NOT EXISTS inventory_smart.%I PARTITION OF inventory_smart.final_allocations_results FOR VALUES FROM (%L) TO (%L)',
                v_partition_name, 
                date_trunc('month', CURRENT_DATE) + interval '1 month', 
                date_trunc('month', CURRENT_DATE) + interval '2 months'
            );
        end if; 
		

        --=========== drop cache_result tables for order batching        
		SELECT EXISTS (
			SELECT 1
			FROM information_schema.tables
			WHERE table_schema  = 'cache'
			and table_name = 'request_tracker'
			  AND table_catalog = current_database()
    	) INTO _cache_table_exists;
    	
        if _cache_table_exists then
			DELETE FROM cache.request_tracker;
			
			for _drop_stmt in select concat('DROP TABLE IF EXISTS ' || quote_ident(schemaname) || '.' || quote_ident(tablename) || ' cascade;') as drop_stmt from pg_tables where tablename ilike 'cache_result_%' and schemaname = 'cache' loop
				EXECUTE _drop_stmt;
			end loop;
			
			for _drop_stmt in select concat('DROP MATERIALIZED VIEW IF EXISTS "cache".' || quote_ident(matviewname) || ' cascade;') as drop_stmt from pg_matviews where schemaname = 'cache' and matviewname like 'cache_result_%' loop
				EXECUTE _drop_stmt;
			end loop;
        end if;
		
		--=========== drop di_versioning tables
		SELECT EXISTS (
			SELECT 1
			FROM information_schema.tables
			WHERE table_schema  = 'global'
			and table_name = 'versioning'
			  AND table_catalog = current_database()
    	) INTO _di_versioning_table_exists;
    	
        if _di_versioning_table_exists then
			update global.versioning t1 set deleted_at = now() from (
				select * from (
				select version_code, DENSE_RANK() OVER (
						PARTITION BY tbl_name 
						ORDER BY greatest(updated_at, created_at) DESC
					) AS latest_version_rank from global.versioning
					where updated_at is not null
					and deleted_at is null
				) x where latest_version_rank > 3
			) t2 where t1.version_code = t2.version_code;
        end if;

		--=========== drop rcl_versioning tables
		SELECT EXISTS (
			SELECT 1
			FROM information_schema.tables
			WHERE table_schema  = 'global'
			and table_name = 'rcl_versioning'
			  AND table_catalog = current_database()
    	) INTO _rcl_versioning_table_exists;
    	
        if _rcl_versioning_table_exists then
			update global.rcl_versioning t1 set deleted_at = now() from (
				select * from (
				select version_code, DENSE_RANK() OVER (
						PARTITION BY tbl_name 
						ORDER BY greatest(updated_at, created_at) DESC
					) AS latest_version_rank from global.rcl_versioning
					where 
					updated_at is not null
					and deleted_at is null
				) x where latest_version_rank > 3
			) t2 where t1.version_code = t2.version_code;
        end if;

        --=========== call build product profile attributes filter

        select array_agg(column_name order by column_name) into _attribute_names from information_schema.columns where table_schema = 'inventory_smart' and table_name = 'product_profile_attributes_filter';
        
		select schema_name into _schema_name from information_schema.schemata s where schema_name ilike 'inventory_smart%' limit 1;

		if _schema_name is not null then
	        if cardinality(_attribute_names) > 0 then 
	            select array_agg(attribute_name order by attribute_name) into _attribute_names_old from (
	                SELECT attribute_name FROM global.product_attributes_list
	                union all
	                SELECT attribute_name FROM global.store_attributes_list WHERE is_attribute = true
	                union 
	                select 'pp_code'
	            )b;
	            select array_agg(attribute_name order by attribute_name) into _attribute_names_new from (
	                SELECT attribute_name FROM inventory_smart.product_profile_attributes_list WHERE hierarchy_level='product'
	                union all
	                SELECT attribute_name FROM inventory_smart.product_profile_attributes_list WHERE hierarchy_level='store'
	                union 
	                select 'pp_code'
	                )b;
	            
	            if _attribute_names = _attribute_names_new or _attribute_names = _attribute_names_old then
	                raise notice 'No change in product profile attributes';
	            else
	                raise notice 'Product profile attributes have changed';
	                call inventory_smart.build_product_profile_attributes_filter(0);
	            end if;
	        else
	            raise notice 'Product profile attributes Initial';
	            call inventory_smart.build_product_profile_attributes_filter(0);
	        end if;
		end if;
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
