--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_fetch_pa_fa_info_based_on_pcds_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fn_fetch_pa_fa_info_based_on_pcds_1
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_fetch_pa_fa_info_based_on_pcds;
CREATE OR REPLACE FUNCTION price_markdown.fn_fetch_pa_fa_info_based_on_pcds(_pcd_ids integer[])
 RETURNS TABLE(pending_approval_count integer, pending_approval_pcd_ids integer[], final_approval_count integer, final_approval_pcd_ids integer[])
 LANGUAGE plpgsql
AS $function$
declare
	pending_approval_count_ integer := 0;
	pending_approval_pcd_ids_ integer[] := null;
	final_approval_count_ integer := 0;
	final_approval_pcd_ids_ integer[] := null;
	strategy_ids integer[];
begin
	-- Ftech pending_approval_count_.
	select array_agg(DISTINCT strategy_id) from price_markdown.tb_strategy_pcd where pcd_id = any(_pcd_ids) into strategy_ids;
	select
		count(*) , array_agg(distinct tam.pcd_id)
		into pending_approval_count_, pending_approval_pcd_ids_
	from
		price_markdown.tb_approval_metrics tam
	where
		tam.strategy_id = any(strategy_ids)
		and tam.pcd_id = any(_pcd_ids)
		and tam.status = 'Initially Approved';
	
	-- Ftech final_approval_count_.
	select 
		count(*) , array_agg(distinct tam.pcd_id)
		into final_approval_count_, final_approval_pcd_ids_
	from 
		price_markdown.tb_approval_metrics tam 
	where 
		tam.pcd_id = any(_pcd_ids)
		and tam.status = 'Finally Approved';

	return query(select pending_approval_count_ as pending_approval_count, pending_approval_pcd_ids_ as pending_approval_pcd_ids, final_approval_count_ as final_approval_count, final_approval_pcd_ids_ as final_approval_pcd_ids);
end;
$function$
;
