--liquibase formatted sql
--changeset hemantkumar.bajaj@impactanalytics.co:sync_article_store_grade runOnChange:true stripComments:false splitStatements:false context:sync_article_store_grade labels:first commit
--comment: sync_article_store_grade
--rollback: SELECT 1



DROP PROCEDURE IF EXISTS public.sync_article_store_grade();

CREATE OR REPLACE PROCEDURE public.sync_article_store_grade()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_article_store_grade';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		delete from
		  inventory_smart.article_store_grade
		where
		  true;
		INSERT INTO inventory_smart.article_store_grade (
		  article, store_code, grade, ph_code,priority
		 
		)
		SELECT
		  article,
		  x.store_code,
		  grade,
		  hierarchy_code as ph_code ,
priority
		FROM
		  public.article_store_grade x
		  join (
		    select
		      hierarchy_code,
		      path->>'article' as article
		    from
		      (
		        select
		          hierarchy_level as level
		        from
		          global.product_generic_schema_mapping
		        where
		          generic_column_name = 'article'
		      ) x
		      join global.product_hierarchies_filter phf using(level)
		      where active = true
		  ) y using(article)
		 join global.store_master sm using(store_code) ;
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
