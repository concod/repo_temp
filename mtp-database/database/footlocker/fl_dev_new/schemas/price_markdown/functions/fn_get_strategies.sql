--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_get_strategies_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pg new price_markdown.fn_get_strategies_2
--rollback: SELECT 1
DROP FUNCTION if exists price_markdown.fn_get_strategies;
CREATE OR REPLACE FUNCTION price_markdown.fn_get_strategies(p_strategies integer[], p_start_date date, p_end_date date, p_product_h1_ids integer[], p_product_h2_ids integer[], p_product_h3_ids integer[], p_product_h4_ids integer[], p_product_h5_ids integer[], p_store_h1_ids integer[], p_store_h2_ids integer[], p_store_h3_ids integer[], p_store_h4_ids integer[], p_store_h5_ids integer[], p_store_h6_ids integer[], include_ending_rule_strategies boolean DEFAULT NULL::boolean, include_only_active boolean DEFAULT false)
 RETURNS integer[]
	LANGUAGE plpgsql
AS $function$
	declare
		strategy_ids integer[];
	begin
		raise notice '%',p_start_date;
		raise notice '%',p_end_date;
		select array_agg(distinct tsm.strategy_id) into strategy_ids
		from price_markdown.tb_strategy_master tsm
		inner join price_markdown.tb_strategy_sku_store_mapping tsssm
		using (strategy_id)
		inner join price_markdown.product_master pm
		on pm.product_id = tsssm.product_id
		inner join public.store_master sm
		on sm.store_h6_id = tsssm.store_h6_id
		where
			(p_strategies is null or array_length(p_strategies,1) is null or tsm.strategy_id = any(p_strategies))
			and tsm.start_date <= p_end_date and tsm.end_date >= p_start_date
			and (p_product_h5_ids is null or pm.product_id = any(p_product_h5_ids))
			and (p_product_h4_ids is null or pm.product_h4_id = any(p_product_h4_ids))
			and (p_product_h3_ids is null or pm.product_h3_id = any(p_product_h3_ids))
			and (p_product_h2_ids is null or pm.product_h2_id = any(p_product_h2_ids))
			and (p_product_h1_ids is null or pm.product_h1_id = any(p_product_h1_ids))
			and (p_store_h6_ids is null or sm.store_h6_id = any(p_store_h6_ids))
			and (p_store_h5_ids is null or sm.store_h5_id = any(p_store_h5_ids))
			and (p_store_h4_ids is null or sm.store_h4_id = any(p_store_h4_ids))
			and (p_store_h3_ids is null or sm.store_h3_id = any(p_store_h3_ids))
			and (p_store_h2_ids is null or sm.store_h2_id = any(p_store_h2_ids))
			and (p_store_h1_ids is null or sm.store_h1_id = any(p_store_h1_ids))
			and tsm.status = 2
			and (
				(include_only_active is true and (price_markdown.fn_check_is_active_strategy(strategy_id)) or tsm.start_date > date(timezone('US/Eastern',now())))
				or
				(include_only_active is false)
			)
			;
		if include_ending_rule_strategies is not null then
			with ending_rule_strategies as (
				select strategy_id from (
					SELECT
				        strategy_id,unnest(applicable_value) as end_rule
				    FROM price_markdown.tb_strategy_rule t1
				    INNER JOIN (
				        SELECT
				            rule_id,
				            rule_type
				        FROM price_markdown.tb_rule_master trm
				    ) t2 ON t1.constraint_id = t2.rule_id
				    WHERE strategy_id  = ANY(strategy_ids)
				    AND constraint_type  = 0
				    AND status = 0
				    AND rule_type = 44 -- Ending_Rule
				) s
				group by 1
			)
			select array_agg(distinct strategy_id) into strategy_ids
			from (select unnest(strategy_ids) strategy_id) strategies
			where (
				(include_ending_rule_strategies is true and strategy_id in (select strategy_id from ending_rule_strategies))
				or
				(
					include_ending_rule_strategies is false and
					strategy_id not in (select strategy_id from ending_rule_strategies)
				)

			);
		end if;

		return strategy_ids;
	END;

$function$
;