--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_fetch_pending_initial_approval_info_based_on_pcds_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fn_fetch_pending_initial_approval_info_based_on_pcds_1
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_fetch_pending_initial_approval_info_based_on_pcds;
CREATE OR REPLACE FUNCTION price_markdown.fn_fetch_pending_initial_approval_info_based_on_pcds(_pcd_ids integer[])
 RETURNS TABLE(pending_initial_approval_count integer, pending_initial_approval_strategy_ids integer[])
 LANGUAGE plpgsql
AS $function$
declare
	pending_initial_approval_count_ integer := 0;
	pending_initial_approval_strategy_ids_ integer[];
	strategy_ids integer[];
begin
	select array_agg(DISTINCT strategy_id) from price_markdown.tb_strategy_pcd where pcd_id = any(_pcd_ids) into strategy_ids;
	-- Ftech pending_initial_approval, pending_initial_approval_strategy_ids.
	select
		count(distinct tsd.strategy_id), array_agg(distinct tsd.strategy_id)
		into pending_initial_approval_count_, pending_initial_approval_strategy_ids_
	from
		price_markdown.tb_strategy_discount tsd
	where
		tsd.strategy_id = any(strategy_ids)
		and tsd.pcd_id = any(_pcd_ids)
		and tsd.approval_status = 'Not Approved';
	return query(select pending_initial_approval_count_ as pending_initial_approval_count, pending_initial_approval_strategy_ids_ as pending_initial_approval_strategy_ids);
end;
$function$
;
