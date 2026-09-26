--liquibase formatted sql
--changeset liquibase:calculate_updated_table runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for calculate_updated_table
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cache.calculate_updated_table(_table_name character varying, _table_type character varying);
CREATE OR REPLACE FUNCTION cache.calculate_updated_table(_table_name character varying, _table_type character varying)
 RETURNS text
 LANGUAGE plpgsql
 PARALLEL SAFE
AS $function$
	declare
	/*
	 * Function/Procedure name: cache.apply_cold_update
	 * Created by: Ashish Gupta
	 * Created at: 22-Nov-2022
	 * No of input parameter: 5
	 * Purpose: 
	 */
		_r record;
		_sql text;
		_cols varchar[];
		_ver varchar;
	begin
		if _table_type = 'pg' then
			select
				array_agg(col)
			into
				_cols
			from
				"cache".updateable_tables_schema
			where
				table_name = _table_name
				and table_type = _table_type;
			_sql := 'SELECT ' || array_to_string(_cols, ', ') || ' FROM ' || _table_name || ' WHERE NOT is_deleted';
			for _r in select
					update_code,
					max(update_seq) as update_seq,
					max(created_at) as updated_at,
					max(created_by) as updated_by,
					string_agg(con, ', ') as cols
				from
					(
					select
						ut.update_code,
						ud.update_seq,
						ut.created_at,
						ut.created_by,
						case when col = main_col then concat(
						  'case when ', 
						  cache.form_filters(_table_name, _table_type, filters), 
						  ' then ', 
						  (
						    case when val is null then 'null' else (
						      case when lower("datatype") ~* 'float|int' then val else concat('''', val, '''') end
						    ) end
						  ), 
						  '::', 
						  "datatype", 
						  ' else ', 
						  col, 
						  ' end as ', 
						  col
						) else main_col end as con
					from
						(
						select
							*,
							unnest(_cols) as main_col
						from
							"cache".update_tracker
						where
							is_deleted = false
							and table_name = _table_name
							and table_type = _table_type
				      ) ut
					left join "cache".update_details ud on
						ut.update_code = ud.update_code
						and ut.main_col = ud.col
					left join "cache".updateable_tables_schema uts 
						using(table_name, table_type, col)
				  ) x
				group by
					update_code
				order by
					update_seq asc loop
					_ver := _table_name || '_v' || _r.update_seq;
					_sql := 'SELECT * FROM (SELECT ' || _r.cols || ' FROM (' || _sql || ')X ) Y WHERE NOT is_deleted';
					execute 'create or replace view ' || _ver || ' as ' || _sql;
					_sql := 'select * from ' || _ver;
				end loop;
				raise notice '_sql: %', _sql;
				execute 'drop view if exists ' || _table_name || '_latest;';
				execute 'create or replace view ' || _table_name || '_latest as ' || _sql || ';';
				return _sql;
		elseif _table_type = 'gbq' then
			_sql := 'SELECT * FROM `' || _table_name || '`';
			for _r in select
				update_code,
				max(update_seq) as update_seq,
				max(created_at) as updated_at,
				max(created_by) as updated_by,
				concat('* except(', string_agg(col, ', '), '), ', string_agg(con, ', ')) as cols
			from
				(
				select
					ut.update_code,
					ud.update_seq,
					ut.created_at,
					ut.created_by,
					col,
					concat(
					  'case when ', 
					  filters, 
					  ' then ', 
					  (
					    case
							when val is null then 'null' 
							when lower("datatype") ~* 'float|int' then val
							else concat('CAST(''', val, ''' as ', "datatype", ')') end
					  ),
					  ' else ', 
					  col, 
					  ' end as ', 
					  col
					)
					as con
				from
					(
					select
						*
					from
						"cache".update_tracker
					where
						is_deleted = false
						and table_name = _table_name
						and table_type = _table_type
			      ) ut
				left join "cache".update_details ud on
					ut.update_code = ud.update_code
				left join "cache".updateable_tables_schema uts 
					using(table_name, table_type, col)
			  ) x
			group by
				update_code
			order by
				update_seq asc loop
				_sql := 'SELECT ' || _r.cols || ' FROM (' || _sql || ') v_' || _r.update_code || '_' || _r.update_seq;
			end loop;
			_sql := 'CREATE OR REPLACE VIEW `' || _table_name || '_latest` AS ' || _sql;
			raise notice '_sql: %', _sql;
			return _sql;
		end if;
	END
$function$
;
