--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:build_product_attributes_filter runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-50282
--comment:  initial changeset for build_product_attributes_filter
--rollback: SELECT 1
DROP procedure IF EXISTS global.build_product_attributes_filter(IN _product_code character varying);
CREATE OR REPLACE PROCEDURE global.build_product_attributes_filter(IN _product_code character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.build_product_attributes_filter';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
 		_attr varchar;
 		_attr_dt varchar;
 		_tsql text;
 		_sql text := 'CREATE TEMP TABLE pa AS SELECT * FROM global.product_master pm';
 		_counter int := 0;
 		_final_cols_list text;
 		_final_cols_list_excluded text;
 		_sync_sql text;
 		_product_code_con text;
 		_change text;
 	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		set work_mem = '10GB';
	 	/* Cleanup random dependencies */
		delete from "cache".request_tracker;
		drop VIEW if exists "cache".ada_visual_predictions_lookup;
		create table if not exists global.product_generic_schema_mapping_last_backup as 
		select 
		  x.generic_column_name, 
		  x.generic_column_datatype, 
		  x.is_null_allowed 
		from 
		  (
		    select 
		      column_name as generic_column_name, 
		      case when udt_name like '\_%' then concat(
		        replace(udt_name, '_', ''), 
		        '[]'
		      ) else udt_name end as generic_column_datatype, 
		      is_nullable :: bool as is_null_allowed 
		    from 
		      information_schema."columns" c 
		    where 
		      table_name = 'product_attributes_filter' 
		      and table_schema = 'global'
		  ) x 
		  join (
		    select 
		      * 
		    from 
		      global.product_generic_schema_mapping 
		    where 
		      required_in_product 
		      and is_attribute
		  ) y using(generic_column_name);
		
		/* Get required cols list */
		select 
		  string_agg(generic_column_name, ', '), 
		  string_agg(
		    concat(
		      'excluded.', generic_column_name
		    ), 
		    ', '
		  ) into _final_cols_list, 
		  _final_cols_list_excluded 
		from 
		  (
		    select 
		      generic_column_name --      
		    from 
		      global.product_generic_schema_mapping 
		    where 
		      required_in_product 
		    union 
		    select 
		      column_name as generic_column_name 
		    from 
		      information_schema."columns" c 
		    where 
		      table_name = 'product_master' 
		      and table_schema = 'global'
		  ) x;
	
		/* Apply Schema changes except new not null constraints */
		for _change in select 
		  changes 
		from 
		  (
		    select 
		      coalesce(
		        y.generic_column_name, t.generic_column_name
		      ) as generic_column_name, 
		      case when (
		        y.generic_column_name, y.generic_column_datatype
		      ) = (
		        t.generic_column_name, t.generic_column_datatype
		      ) then 'no_change' when y.generic_column_name is null then 'ALTER TABLE "global".product_attributes_filter ADD ' || t.generic_column_name || ' ' || t.generic_column_datatype || ' NULL;' when t.generic_column_name is null then 'ALTER TABLE "global".product_attributes_filter DROP COLUMN ' || y.generic_column_name || ';' when y.generic_column_name = t.generic_column_name 
		      and y.generic_column_datatype != t.generic_column_datatype then 'ALTER TABLE "global".product_attributes_filter ALTER COLUMN ' || t.generic_column_name || ' TYPE ' || t.generic_column_datatype || ' USING ' || t.generic_column_name || '::' || t.generic_column_datatype || ';' end as changes 
		    from 
		      global.product_generic_schema_mapping_last_backup y full 
		      outer join (
		        select 
		          generic_column_name, 
		          generic_column_datatype, 
		          is_null_allowed 
		        from 
		          global.product_generic_schema_mapping 
		        where 
		          required_in_product 
		          and is_attribute
		      ) t on y.generic_column_name = t.generic_column_name 
		    union 
		    select 
		      coalesce(
		        y.generic_column_name, t.generic_column_name
		      ) as generic_column_name, 
		      case 
--            when y.is_null_allowed != t.is_null_allowed and t.is_null_allowed = false then 'ALTER TABLE "global".product_attributes_filter ALTER COLUMN ' || t.generic_column_name || ' SET NOT NULL;'
		      when y.is_null_allowed != t.is_null_allowed 
		      and t.is_null_allowed = true then 'ALTER TABLE "global".product_attributes_filter ALTER COLUMN ' || t.generic_column_name || ' DROP NOT NULL;' end as changes 
		    from 
		      global.product_generic_schema_mapping_last_backup y full 
		      outer join (
		        select 
		          generic_column_name, 
		          generic_column_datatype, 
		          is_null_allowed 
		        from 
		          global.product_generic_schema_mapping 
		        where 
		          required_in_product 
		          and is_attribute
		      ) t on y.generic_column_name = t.generic_column_name
		  ) x 
		where 
		  changes is not null 
		  and changes != 'no_change' loop
			raise notice '_change: %', _change;
			execute _change;
		end loop;

		/* Build know dependencies */
		CREATE VIEW "cache".ada_visual_predictions_lookup AS
		select
			1 as common,
			fw.*,
			paf.*
		from
			(
			select
				fiscal_year_week
			from
				global.fiscal_date_mapping fdm
			where
				date >= now()
				and date <= now() + '1 year'::interval
			group by
				1) fw
		cross join global.product_attributes_filter paf;

		/* Handel product specific call */
		if _product_code != '' then
			_product_code_con := ' WHERE product_code = ''' || _product_code || ''' ';
			raise notice '_product_code_con: %', _product_code_con;
		end if;

		/* Build temp data to insert */
		for _attr, _attr_dt in select 
 		  generic_column_name, 
 		  generic_column_datatype 
 		from 
 		  global.product_generic_schema_mapping pgsm 
 		where 
 		  required_in_product 
 		  and is_attribute
 		 loop
 			_tsql := '(select product_code, attribute_value::' || _attr_dt || ' AS ' || _attr || '
 			from global.product_attributes 
 			where attribute_name = ''' || _attr || ''') X' || _counter || ' ';
 			_sql := _sql || ' LEFT JOIN ' || _tsql || 'USING(product_code)';
 			_counter := _counter+1;
 		end loop;
 		if _product_code_con is not null then
 			_sql := _sql || _product_code_con;
 		end if;
 		raise notice '_sql: %', _sql;
 		drop table if exists pa;
 		execute _sql;
 		CREATE INDEX pa_product_code_idx ON pa (product_code, l0_name);
 	
 		/* Ingestion */
 		call global.build_list_partitions('product_attributes_filter');
 		_sync_sql := 'insert into global.product_attributes_filter (' || _final_cols_list || ') 
 		select 
 		  ' || _final_cols_list || ' 
 		from 
 		  pa on conflict(product_code, l1_name) do 
 		update 
 		set 
 		  (' || _final_cols_list || ') = (' || _final_cols_list_excluded || ');
 		';
 		raise notice '_sync_sql: %', _sync_sql;
 		execute _sync_sql;
 	
 		/* Cleanup for old l0_names */
		delete
		from
			global.product_attributes_filter paf
		where
			not exists(
			select
				'p'
			from
				global.product_attributes pa
			where
				attribute_name = 'l0_name'
				and paf.product_code = pa.product_code
				and paf.l0_name = pa.attribute_value);

		/* Apply all not null constraints */
		for _change in 
		  	select 
		      'ALTER TABLE "global".product_attributes_filter ALTER COLUMN ' || generic_column_name || ' SET NOT NULL;' as changes 
		    from
		      global.product_generic_schema_mapping
	        where required_in_product and is_attribute and is_null_allowed = false loop
			raise notice '_change: %', _change;
			execute _change;
		end loop;

		/* Put schema as backup */
		truncate global.product_generic_schema_mapping_last_backup;
		insert into global.product_generic_schema_mapping_last_backup(generic_column_name, generic_column_datatype, is_null_allowed)
		select
			generic_column_name,
			generic_column_datatype,
			is_null_allowed
		from
			global.product_generic_schema_mapping
		where required_in_product and is_attribute;
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

