--liquibase formatted sql
--changeset sreevathsa.sp@impactanalytics.co:sync_article_store_grade_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: sync_article_store_grade 
--rollback: SELECT 1
DROP PROCEDURE if exists public.sync_article_store_grade();

CREATE OR REPLACE PROCEDURE public.sync_article_store_grade(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
AS $procedure$
declare 
	_worker text;
	_rule_store_mapping_table text;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_article_store_grade';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin 
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	-- Choose the table based on _is_historic
	if _is_historic then
		_rule_store_mapping_table := 'public.rule_store_mapping';
		select
		    async_query into _worker
		from public.async_query('TRUNCATE inventory_smart.article_store_grade;');
		perform public.async_query_status(_worker, 'cleanup');
		raise notice 'Step1: %', (clock_timestamp() - _st);
	else
		_rule_store_mapping_table := 'public.rule_store_mapping_delta';
	end if;

	perform public.parellel_insert(
	    'WITH rows AS (
				insert into inventory_smart.article_store_grade 
				( 
				article,
				store_code,
				grade,
				ph_code
				)
				select
					a.article,
					a.store_code,
					coalesce(grade, ''-'') as grade,
					ph_code
				from
					(
					select
						distinct psa_name as store_code,
						article
					from
						' || _rule_store_mapping_table || ' {where}
					) a
				inner join
				(
					select
						b.store_code,
						b.store_tier as grade
					from
						global.store_attributes_filter b
				) b
					using(store_code)
				inner join
				(
					select
						distinct hierarchy_code as ph_code,
						path->>''article'' as article 
					from
						(
						select
							hierarchy_level as level
						from
							global.product_generic_schema_mapping
						where
							generic_column_name = ''article''
						) x
					join global.product_hierarchies_filter phf
						using(level)
					join ' || _rule_store_mapping_table || ' b
						on path->>''article'' = b.article
					where
						active = true
				) c
					using(article)
				on
					conflict (ph_code, store_code) do nothing RETURNING 1
           )
	        SELECT 
			  count(1) as cnt 
			FROM 
			  rows;',
	    50,
	    -- The following parameters are for parellel_insert: table, key, index, batch_size
	    CASE WHEN _is_historic THEN 'public.rule_store_mapping' ELSE 'public.rule_store_mapping_delta' END,
	    'psa_code',
	    CASE WHEN _is_historic THEN 'rule_store_mapping_delta_delta_psa_code_idx' ELSE 'rule_store_mapping_delta_delta_psa_code_idx' END,
	    5
	);
	raise notice 'Step2: %', (clock_timestamp() - _st);
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