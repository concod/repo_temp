--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:fn_fetch_inventory_and_inventory_cost_and_total_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: fn_fetch_inventory_and_inventory_cost_and_total_1
--rollback: SELECT 1

DROP FUNCTION IF EXISTS price_markdown.fn_fetch_inventory_and_inventory_cost_and_total;
CREATE OR REPLACE FUNCTION price_markdown.fn_fetch_inventory_and_inventory_cost_and_total(_strategy_id integer[] DEFAULT NULL::integer[], _pcd_ids integer[] DEFAULT NULL::integer[])
 RETURNS TABLE(ia_inventory integer, fa_inventory integer, ia_inventory_cost integer, fa_inventory_cost integer, total_inventory integer, total_inventory_cost integer)
 LANGUAGE plpgsql
AS $function$
declare
	ia_inventory_ integer := 0;
	fa_inventory_ integer := 0;
	ia_inventory_cost_ integer := 0;
	fa_inventory_cost_ integer := 0;
	total_inventory_ integer := 0;
	total_inventory_cost_ integer := 0;
	where_condition1 text := '';
	temp_query text;
begin
	if array_length(_pcd_ids, 1) > 0  or array_length(_strategy_id, 1) > 0 then
		if array_length(_strategy_id, 1) > 0 then
			where_condition1 := format(' tam.strategy_id = any(array[%1$s]) ',array_to_string(_strategy_id, ','));
		else
			where_condition1 := format(' tam.pcd_id = any(array[%1$s]) ',array_to_string(_pcd_ids, ','));
		end if;


		-- Fetch Initially Approved inventory and inventory_cost.
		temp_query = format('	with filters_cte as(
									select
										strategy_id,
										product_level_id,
										channel_info,
										min(pcd_id) as min_pcd
									from
										price_markdown.tb_approval_metrics tam
									where
										%1$s
										and tam.status = ''Initially Approved''
									group by
										tam.strategy_id,
										tam.product_level_id,
										tam.channel_info
								)
								select
									coalesce(sum(tam.fin_inventory),0) as fin_inventory,
									coalesce(sum(tam.fin_inventory_cost),0) as fin_inventory_cost
								from
									price_markdown.tb_approval_metrics tam
								inner join
									filters_cte fc on fc.min_pcd = tam.pcd_id and fc.product_level_id = tam.product_level_id and fc.channel_info = tam.channel_info
								where
									%1$s
									and tam.status = ''Initially Approved''
							', where_condition1);
		raise notice ' query 1 ----- %', temp_query;
		execute temp_query into ia_inventory_ , ia_inventory_cost_;


		-- Fetch Finally Approved inventory and inventory_cost.
		temp_query = format('	with filters_cte as(
									select
										strategy_id,
										product_level_id,
										channel_info,
										min(pcd_id) as min_pcd
									from
										price_markdown.tb_approval_metrics tam
									where
										%1$s
										and tam.status = ''Finally Approved''
									group by
										tam.strategy_id,
										tam.product_level_id,
										tam.channel_info
								)
								select
									coalesce(sum(tam.fin_inventory),0) as fin_inventory,
									coalesce(sum(tam.fin_inventory_cost),0) as fin_inventory_cost
								from
									price_markdown.tb_approval_metrics tam
								inner join
									filters_cte fc on fc.min_pcd = tam.pcd_id and fc.product_level_id = tam.product_level_id and fc.channel_info = tam.channel_info
								where
									%1$s
									and tam.status = ''Finally Approved''
							', where_condition1);
		raise notice ' query 2 ----- %', temp_query;
		execute temp_query into fa_inventory_ , fa_inventory_cost_;


		-- Fetch total inventory and inventory_cost.
		temp_query = format('	with filters_cte as(
									select
										strategy_id,
										product_level_id,
										channel_info,
										min(pcd_id) as min_pcd
									from
										price_markdown.tb_approval_metrics tam
									where
										%1$s
									group by
										tam.strategy_id,
										tam.product_level_id,
										tam.channel_info
								)
								select
									coalesce(sum(tam.fin_inventory),0) as fin_inventory,
									coalesce(sum(tam.fin_inventory_cost),0) as fin_inventory_cost
								from
									price_markdown.tb_approval_metrics tam
								inner join
									filters_cte fc on fc.min_pcd = tam.pcd_id and fc.product_level_id = tam.product_level_id and fc.channel_info = tam.channel_info
								where
									%1$s
							', where_condition1);
		raise notice ' query 3 ----- %', temp_query;
		execute temp_query into total_inventory_ , total_inventory_cost_;
	end if;

	return query(select ia_inventory_ as ia_inventory, fa_inventory_ as fa_inventory, ia_inventory_cost_ as ia_inventory_cost, fa_inventory_cost_ as fa_inventory_cost, total_inventory_ as total_inventory, total_inventory_cost_ as total_inventory_cost);
end;
$function$
;
