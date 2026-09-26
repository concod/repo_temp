--liquibase formatted sql
--changeset abhishek.sagar@impactanalytics.co:sync_article_store_grade_figs runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:figs_sync_article_store_grade
--comment: initial changeset for sync_article_store_grade
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_article_store_grade(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_article_store_grade(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
AS $procedure$
declare
        _worker text;
        _hl int;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_article_store_grade';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
    begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
        select
           hierarchy_level into _hl
         from
           global.product_generic_schema_mapping
         where
           generic_column_name = 'article';
         if _is_historic then
            select async_query into _worker from public.async_query('delete from
              inventory_smart.article_store_grade
            where
              true;');
            perform public.async_query_status(_worker, 'cleanup');
            -- raise notice 'Step1: %', (clock_timestamp() - _st);
            -- perform global.create_drop_index_list_ingestion('inventory_smart', 'article_store_grade', true);
            -- raise notice 'Step2: %', (clock_timestamp() - _st);
            perform public.parellel_insert('WITH rows AS (
                INSERT INTO inventory_smart.article_store_grade (
                  article, store_code, grade, ph_code
                )
                SELECT
                  article,
                  store_code,
                  grade,
                  hierarchy_code as ph_code
                FROM
                  (
                    select
                      article,
                      store_code,
                      grade
                    from
                      public.article_store_grade {where}
                  ) x
                  join global.product_hierarchies_filter_flattened phf using(article)
                where
                  level = ' || _hl || '
                  and active RETURNING 1
            )
            SELECT
              count(1) as cnt
            FROM
              rows;', 50, 'public.article_store_grade', 'store_code', 'asg_store_idx');
            raise notice 'Step2: %', (clock_timestamp() - _st);
        else
            INSERT INTO inventory_smart.article_store_grade (
              article, store_code, grade, ph_code
            )
            SELECT
              article,
              store_code,
              grade,
              hierarchy_code as ph_code
            FROM
              (
                select
                  article,
                  store_code,
                  grade
                from
                  public.article_store_grade
              ) x
              join global.product_hierarchies_filter_flattened phf using(article)
            where
              level = _hl
              and active
            on conflict(ph_code, store_code) do update set grade = excluded.grade;
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



