--liquibase formatted sql
--changeset ashish@impactanalytics.co:calculate_updated_table_gbq_updates runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:new_sp
--comment: initial changeset for calculate_updated_table_gbq cold updates
--comment: force stack for calculate_updated_table_gbq cold updates
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cache.calculate_updated_table_gbq(_table_name character varying, _table_type character varying);
DROP FUNCTION IF EXISTS cache.calculate_updated_table_gbq(_table_name character varying, _table_type character varying, _force_stack boolean);
DROP FUNCTION IF EXISTS cache.calculate_updated_table_gbq(_table_name character varying, _table_type character varying, _force_stack boolean, _max_stack_merge int);
DROP FUNCTION if exists "cache".calculate_updated_table_gbq(varchar, varchar, bool);
DROP FUNCTION if exists  "cache".calculate_updated_table_gbq(varchar, varchar, bool, int4);
CREATE OR REPLACE FUNCTION cache.calculate_updated_table_gbq(_table_name character varying, _table_type character varying, _force_stack boolean DEFAULT false, _max_stack_merge integer DEFAULT 2)
 RETURNS jsonb
 LANGUAGE plpgsql
 PARALLEL SAFE
AS $function$
	declare
	/* Function/Procedure name: cache.calculate_updated_table_gbq
	 * Created by: Ashish Gupta
	 * Created at: 12-Sep-2023
	 * No of input parameter: 3
	 * Purpose: 
	 */
		_r record;
		_sql text := '';
		_prev_sql text;
		_view_sql text := '';
		_versions jsonb := '{}'::jsonb;
		_validate_update_codes int[];
		_queue_update_codes int[] := array[]::int[];
		_final_queue_update_codes int[] := array[]::int[];
		_update_codes int[] := array[]::int[];
		_stack int := 1;
		_push_in_queue bool := false;
		_updates_cover_in_stack int := 0;
		_updates_allowed_in_stack int := 10;
		_stack_map jsonb := '{}'::jsonb;
		_max_stack_to_push int;
	begin
		if _force_stack then
			select count(1) into _updates_allowed_in_stack from cache.update_tracker where table_name = _table_name and table_type = _table_type and not is_deleted;
		end if;
		for _r in select
			dense_rank() over (
			order by created_at, update_code asc) as "version",
			concat('* EXCEPT(', string_agg(original_col, ', '), ')', ', ', concat('CASE WHEN (',
				con,
				') THEN STRUCT(',
				string_agg(col, ', '),
				') ELSE STRUCT(',
				string_agg(original_col, ', '),
				') END AS mc'))
			as cols,
			string_agg('mc.' || original_col || ' as ' || original_col, ', ') as original_cols,
			status,
			update_code
		from
			(
			select
				update_code,
				created_at,
				status,
				con,
				col as original_col,
				concat('CAST ((',
					case
						when lower("datatype") ~* 'float|int|bool' then val
						else concat('''', val, '''')
					end,
					') AS ',
					"datatype",
					') AS ', col) as col
			from
				(select *,
				cache.form_filters_gbq(table_name,
					table_type,
					filters) as con
				from cache.update_tracker where table_name = _table_name
				and table_type = _table_type
				and not is_deleted) ut
			join cache.update_details ud
					using(update_code)
			join (select * from cache.updateable_tables_schema
			where table_name = _table_name
				and table_type = _table_type) uts 
			using(col)
			) x
		group by
			update_code, created_at, status, con
		order by 1 asc loop
			_prev_sql := _sql; -- in case overlimit stack previous query
			if _r."version" = 1 then
				_sql := 'SELECT * EXCEPT(mc), ' || _r.original_cols || ' FROM (SELECT ' || _r.cols || ' FROM `' || _table_name || '_v0`) x';
			else
				_sql := 'SELECT * EXCEPT(mc), ' || _r.original_cols || ' FROM (SELECT ' || _r.cols || ' FROM (' || _sql || ') v' || (_r."version" - 1) || ') x';
			end if;
		     
			_update_codes := array_append(_update_codes, _r.update_code);
			
			-- 256000 is gbq limit and 1024000 is gbq script limit
			-- 16 is gbq nested view limit
			-- Detect a stack
		--145959
		
		--raise notice 'array_length(_update_codes, 1)%',array_length(_update_codes,1);
		--raise notice '_updates_cover_in_stack%',_updates_cover_in_stack;
		--raise notice '_updates_allowed_in_stack%',_updates_allowed_in_stack;
		--raise notice '_sql%',_sql;
		
		
			if length(_sql) >= 128000 or (array_length(_update_codes, 1) - _updates_cover_in_stack) = _updates_allowed_in_stack then
				-- handel if first update only out of stack
			
				if _prev_sql = '' then
					-- raise notice '_prev_sql %', _prev_sql ;
					_prev_sql := _sql;
				end if;
			--  raise notice '_update_codes%',_r.update_code;
			 -- raise notice 'length(_sql) %',length(_sql);
			 --if _update_codes >=20 then take previous sql else take the current sql
			-- if (array_length(_update_codes, 1) - _updates_cover_in_stack) = _updates_allowed_in_stack then 
			 --	_view_sql = _view_sql || 'CREATE OR REPLACE VIEW `' || _table_name || '_updated_stack' || _stack || '` AS ' || _prev_sql || '; ';
			-- else 
			 	_view_sql = _view_sql || 'CREATE OR REPLACE VIEW `' || _table_name || '_updated_stack' || _stack || '` AS ' || _sql || '; ';
			--end if ;
			 -- raise notice '_view_sql %',_view_sql;
				_sql := 'SELECT * EXCEPT(mc), ' || _r.original_cols || ' FROM (SELECT ' || _r.cols || ' FROM `' || _table_name || '_updated_stack' || _stack || '`) x';
				 --raise notice '_sql %',_sql;
				_stack_map := _stack_map || jsonb_build_object(_stack, _update_codes);
				_stack := _stack + 1;
				_updates_cover_in_stack := array_length(_update_codes, 1);
				_final_queue_update_codes := _update_codes;
			end if;
			if _r."status"::int = 0 then
				_validate_update_codes := array_append(_validate_update_codes, _r.update_code);
			end if;
			if _r."status"::int = 2 then
				_queue_update_codes := array_append(_queue_update_codes, _r.update_code);
			end if;
			-- if stack exists and last stack update ids not in existing queue then again push in queue
			if _stack > 1 then
				_push_in_queue := not(_final_queue_update_codes <@ _queue_update_codes);
			end if;
			if _stack > 10 then
				RAISE EXCEPTION 'Stack overlimit: %', _stack;
			end if;
		end loop;
		-- handle very first time view creation
		if _sql = '' then
			_sql := 'SELECT * FROM `' || _table_name || '_v0`';
		end if;
		_max_stack_to_push := least(_max_stack_merge, (_stack-1));
	--raise notice '_stack_map: %', _stack_map;
--		_final_queue_update_codes := ;
		select array_agg(uc::int) into _final_queue_update_codes from jsonb_array_elements_text((_stack_map->>concat(_max_stack_to_push))::jsonb) as uc;
		_view_sql := _view_sql || 'CREATE OR REPLACE VIEW `' || _table_name || '_updated` AS ' || _sql || ';';
		_versions := _versions || jsonb_build_object('latest', jsonb_build_object('sql', _view_sql, 'validate_update_codes', _validate_update_codes, 'queue_update_codes', _final_queue_update_codes, 'stack_level', (_stack-1), 'push_in_queue', _push_in_queue, 'max_stack_to_push', _max_stack_to_push));
		return _versions;
	END
$function$
;
