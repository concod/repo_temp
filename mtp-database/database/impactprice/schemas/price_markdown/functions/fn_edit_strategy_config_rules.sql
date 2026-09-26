--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_edit_strategy_config_rules_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: price_markdown.fn_edit_strategy_config_rules_1
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_edit_strategy_config_rules;

CREATE OR REPLACE FUNCTION price_markdown.fn_edit_strategy_config_rules(p_trigger_config_id integer, p_rules text, p_user_id integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
	DECLARE
	new_strategy_config_id integer;
	new_rules_data text;
	begin
        with rules_cte as(
            select
                strategy_config_rule_id,
                p_trigger_config_id as trigger_config_id,
                objective_type_id,
                constraint_type,
                constraint_id,
                min_value,
                max_value,
                applicable_value,
                target_value,
                rule_flexibility_type_id,
                priority,
                rule_name,
                (
                    case
                        when is_disabled = true then 1
                        else 0
                    end
                ) as status
            from
                jsonb_to_recordset(p_rules::jsonb) AS rules(
                    strategy_config_rule_id int,
                    objective_type_id int,
                    constraint_type int2,
                    constraint_id int4,
                    min_value float4,
                    max_value float4,
                    applicable_value _float4,
                    target_value float4,
                    rule_flexibility_type_id int2,
                    priority int2,
                    rule_name text,
                    is_disabled bool
                )
        ),
        insert_new_objectives_cte as (
            insert into price_markdown.tb_strategy_config_objective (
                trigger_config_id,
                objective_type_id,
                objective_value
            )
            select
                p_trigger_config_id as trigger_config_id,
                rc.objective_type_id,
                rc.target_value
            from rules_cte rc
            where constraint_type = 1
                and strategy_config_rule_id is null
            returning strategy_config_objective_id,objective_type_id
        ),
        insert_new_rules_cte as (
            insert into
                price_markdown.tb_strategy_config_rule (
                    trigger_config_id,
                    constraint_type,
                    constraint_id,
                    min_value,
                    max_value,
                    applicable_value,
                    rule_flexibility_type_id,
                    priority,
                    status
                )
            select
                rc.trigger_config_id,
                rc.constraint_type,
                coalesce(inoc.strategy_config_objective_id,rc.constraint_id),
                rc.min_value,
                rc.max_value,
                rc.applicable_value,
                rc.rule_flexibility_type_id,
                rc.priority,
                rc.status
            from
                rules_cte rc
            left join insert_new_objectives_cte inoc on rc.objective_type_id = inoc.objective_type_id
            where
                rc.strategy_config_rule_id is null
        ),
        update_rules_cte as (
            update
                price_markdown.tb_strategy_config_objective tsb
            set
                objective_value = rc.target_value
            from
                rules_cte rc
            where
                tsb.trigger_config_id = rc.trigger_config_id
                and tsb.strategy_config_objective_id = rc.constraint_id
                and (
                    objective_value != rc.target_value
                    or objective_value is null
                )
                and rc.constraint_type = 1
        )
        update
            price_markdown.tb_strategy_config_rule tsr
        set
            min_value = rc.min_value,
            max_value = rc.max_value,
            applicable_value = rc.applicable_value,
            rule_flexibility_type_id = rc.rule_flexibility_type_id,
            priority = coalesce(rc.priority,-1),
            status = rc.status
        from
            rules_cte rc
        where
            tsr.strategy_config_rule_id = rc.strategy_config_rule_id;

		return p_trigger_config_id;

	end;
$function$
;