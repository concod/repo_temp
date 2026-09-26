-- liquibase formatted sql
-- changeset ashish@impactanalytics.co:sync_article_store_grade_fix_BQ_ref runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_article_store_grade
-- comment:  changeset for sync_article_store_grade
DROP PROCEDURE if exists public.sync_article_store_grade(bool);
CREATE OR REPLACE PROCEDURE public.sync_article_store_grade(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
AS $procedure$
declare 
	_worker text;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_article_store_grade';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin 
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	if _is_historic then
		select
		    async_query into _worker
		from public.async_query('TRUNCATE inventory_smart.article_store_grade;');
		perform public.async_query_status(_worker, 'cleanup');
		raise notice 'Step1: %', (clock_timestamp() - _st);
	end if;
	perform public.parellel_insert(
	    ' WITH rows AS (
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
					coalesce (grade,
					''-'') as grade,
					ph_code
				from
					(
					select
						distinct psa_name as store_code,
						article
					from
						public.rule_store_mapping  {where}) a
				inner join
				(
					select
						b.country,
						b.channel,
						b.store_code,
						b.q_str_grade as grade
					from
						global.store_attributes_filter b ) b
						using(store_code)
				inner join
				(
					select
						distinct hierarchy_code as ph_code,
						path->>''article'' as article ,
						path->>''l0_name'' as country,
						path->>''l1_name'' as channel
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
					join public.rule_store_mapping b
				on
						path->>''article'' = b.article
					where
						active = true
				) c
						using(article)
				on
					conflict (ph_code,
					store_code) do nothing RETURNING 1
           )
	        SELECT 
			  count(1) as cnt 
			FROM 
			  rows;',
	    50,
	    'public.rule_store_mapping',
	    'psa_code',
	    'rule_store_mapping_delta_psa_code_idx', 5
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
