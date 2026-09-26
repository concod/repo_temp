--liquibase formatted sql
--changeset arun.thamma@impactanalytics.co:create_fmt runOnChange:true stripComments:false splitStatements:false context:skip_level labels:update_index
--comment: update the index to include channel and year week as well on top of hierarchy code
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.create_fmt(IN tbl text, IN lvl integer, IN aggregation_lvl text, in skip_level bool);
CREATE OR REPLACE PROCEDURE public.create_fmt(IN tbl text, IN lvl integer, IN aggregation_lvl text, in skip_level bool)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.create_fmt';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
  		_query text;
  		_drop_stmt text;
  		_index_query text;
  		_hierarchies_code_table text;
  	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		if $4 = true then
			_hierarchies_code_table = 'product_hierarchy_codes_for_modelling';
		else 
	    	_hierarchies_code_table = 'product_hierarchies_filter_flattened';
		end if;
  		_query := 'create table global.' || $1 ||'
                  as  (
                  select a.*,b.hierarchy_code,b.level
                  from public.' || $1 || '_validated as a
                  left join global.'|| _hierarchies_code_table || ' as b
                  on (a.' || replace($3, ',', ',a.') || ') = (b.' ||  replace($3, ',', ',b.') || ')
                                  where level ='|| $2 ||')';
  		raise notice '%', _query;
  		if $1 = 'master_aggregate__product_code' then
  			_index_query:= 'CREATE INDEX  if not exists ' || $1 || '_product_code_idx ON global.' || $1 ||' USING btree (product_code, channel, fiscal_year_week);';
  		else
  			_index_query:= 'CREATE INDEX  if not exists ' || $1 || '_hierarchy_code_idx ON global.' || $1 ||' USING btree (hierarchy_code, channel, fiscal_year_week);';
  		end if;
  		_drop_stmt := 'drop table if exists global.' || $1  ;
  		execute _drop_stmt ;
  		execute _query;
  		execute _index_query;
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

