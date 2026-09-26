--liquibase formatted sql
--changeset swapnil.bhange-1:sync_article_level_default_constraints_v1 runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:0001
--comment: creating SP sync_article_level_default_constraints
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_article_level_default_constraints();
DROP PROCEDURE IF EXISTS public.sync_article_level_default_constraints(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_article_level_default_constraints(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
AS $procedure$
declare _worker text;
_st TIMESTAMP := clock_timestamp();
begin if _is_historic
    then
select
    async_query into _worker
from public.async_query('DELETE FROM inventory_smart.article_level_default_constraints WHERE TRUE;');
perform public.async_query_status(_worker, 'cleanup');
raise notice 'Step1: %',
(clock_timestamp() - _st);
end if;
perform public.parellel_insert(
    ' WITH rows AS (
					INSERT INTO inventory_smart.article_level_default_constraints(
					article, 
					psa_name, 
					min, 
					max, 
					wos, 
					st)
					select 
					aldc.article, 
					aldc.psa_name, 
					aldc.min, 
					aldc.max, 
					aldc.wos, 
					aldc.st
					from public.article_level_default_constraints aldc 
           {where} RETURNING 1
)
        SELECT 
		  count(1) as cnt 
		FROM 
		  rows;',
    50,
    'public.article_level_default_constraints',
    'article',
    'const_article_idx',
    50
);
raise notice 'Step2: %',
(clock_timestamp() - _st);
end;
$procedure$
;

