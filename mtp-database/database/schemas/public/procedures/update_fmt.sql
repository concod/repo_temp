--liquibase formatted sql
--changeset arun.thamma@impactanalytics.co:update_fmt runOnChange:true stripComments:false splitStatements:false context:skip_level labels:update_index
--comment: update the index to include channel and year week as well on top of hierarchy code
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.update_fmt(IN tbl text, IN lvl integer, IN aggregation_lvl text, IN skip_level bool);
CREATE OR REPLACE PROCEDURE public.update_fmt(IN tbl text, IN lvl integer, IN aggregation_lvl text, IN skip_level bool)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.update_fmt';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
                _insert_query text;
                _delete_stmt text;
                _create_index_query text;
                _drop_index_query text;
                _hierarchies_code_table text;
                _schema text;
                _columns text;
        begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
                select string_agg('a.' || column_name || '::' || udt_name, ','), string_agg(column_name, ',') from information_schema.columns 
WHERE table_schema = 'global' AND table_name = $1 and column_name not in('hierarchy_code', 'level') 
 into _schema, _columns;

	            raise notice '_schema: %', _schema;
	            
	           if $4 = true then
	            	_hierarchies_code_table = 'product_hierarchy_codes_for_modelling';
	           else 
	            	_hierarchies_code_table = 'product_hierarchies_filter_flattened';
	           end if;
	            
                _insert_query := 'insert into global.' || $1 ||'(' || _columns || ',hierarchy_code, level) 
                  (select ' || _schema || ',b.hierarchy_code, b.level 
                 from public.' || $1 || '_validated as a
                 left join global.'|| _hierarchies_code_table || ' as b
                 on (a.' || replace($3, ',', ',a.') || ') = (b.' ||  replace($3, ',', ',b.') || ')
                                 where level ='|| $2 ||')';
                raise notice 'insert_query: %', _insert_query;
                if $1 = 'master_aggregate__product_code' then
                		_drop_index_query:= 'DROP INDEX if exists ' || $1 || '_product_code_idx;';
                		raise notice '_drop_index_query: %', _drop_index_query;
                        _create_index_query:= 'CREATE INDEX  if not exists ' || $1 || '_product_code_idx ON global.' || $1 ||' USING btree (product_code, channel, fiscal_year_week);';
                        raise notice '_create_index_query: %', _create_index_query;
                else
                		_drop_index_query:= 'DROP INDEX if exists ' || $1 || '_hierarchy_code_idx;';
                	    raise notice '_drop_index_query: %', _drop_index_query;
                        _create_index_query:= 'CREATE INDEX  if not exists ' || $1 || '_hierarchy_code_idx ON global.' || $1 ||' USING btree (hierarchy_code, channel, fiscal_year_week);';
                        raise notice '_create_index_query: %', _create_index_query;
                end if;
                _delete_stmt := 'delete from global.' || $1  || ' where fiscal_year_week >= (select min(fiscal_year_week) from public.' || $1 || '_validated) ' ;
                raise notice '_delete_stmt: %', _delete_stmt;
                execute _delete_stmt;
                execute _drop_index_query;
                execute _insert_query;
                execute _create_index_query;
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

