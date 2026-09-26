
--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_edit_strategy_step_3_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added security definer



DROP FUNCTION if exists price_markdown.fn_edit_strategy_step_3;

CREATE OR REPLACE FUNCTION price_markdown.fn_edit_strategy_step_3(p_strategy_id integer, p_rules text, p_user_id integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
	DECLARE
	is_active_strategy bool := price_markdown.fn_check_is_active_strategy(p_strategy_id);
	new_strategy_id integer;
	new_rules_data text;
	begin

		if is_active_strategy then
			new_strategy_id := price_markdown.fn_copy_strategy(p_strategy_id,p_user_id,null::date,null::date);

			with new_rules_data_cte as (
				select
				strategy_rule_mapping.new_strategy_rule_id as strategy_rule_id,
				new_strategy_id as strategy_id,
				constraint_type,
				coalesce(new_constraint_id,constraint_id) as constraint_id,
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
				jsonb_to_recordset(p_rules::jsonb) as rules(
		            strategy_rule_id int,
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
				inner join
				(
					select
					old_strategy_rule.strategy_rule_id as old_strategy_rule_id,
					new_strategy_rule.strategy_rule_id as new_strategy_rule_id,
					new_strategy_rule.new_constraint_id as new_constraint_id
					from
					(
						select * from price_markdown.tb_strategy_rule tsr where strategy_id = p_strategy_id
					) old_strategy_rule
					inner join
					(
						select tsr.*,coalesce(objective_mapping.old_objective_id,tsr.constraint_id) as old_constraint_id,
						objective_mapping.new_objective_id as new_constraint_id
						from price_markdown.tb_strategy_rule tsr
						left join (
							select old_strategy_alias.strategy_objective_id as old_objective_id,
									new_strategy_alias.strategy_objective_id as new_objective_id
							from
							(
							select * from price_markdown.tb_strategy_objective  tsp
							where strategy_id = new_strategy_id
							) new_strategy_alias
							left join
							(
							select  * from price_markdown.tb_strategy_objective tsp
							where strategy_id = p_strategy_id
							) old_strategy_alias
							on new_strategy_alias.objective_type_id = old_strategy_alias.objective_type_id
						) objective_mapping on
						objective_mapping.new_objective_id =  tsr.constraint_id
						where strategy_id = new_strategy_id

					) new_strategy_rule
					on old_strategy_rule.constraint_id = new_strategy_rule.old_constraint_id
				) strategy_rule_mapping
				on rules.strategy_rule_id = strategy_rule_mapping.old_strategy_rule_id
			)
			select json_agg(to_json(new_rules_data_cte.*)) into new_rules_data
			from new_rules_data_cte;

			raise notice '%',new_rules_data;

			return price_markdown.fn_edit_strategy_step_3(
				new_strategy_id,
				new_rules_data,
				p_user_id
			);

		else
			call price_markdown.pc_clear_strategy_metrics(p_strategy_id);
			update price_markdown.tb_strategy_discount
			set is_locked = 0,
                approval_status = 'Not Approved'::price_markdown.strategy_approval_status_enum
			where strategy_id = p_strategy_id;
        
			with rules_cte as(
			    select
			        strategy_rule_id,
					p_strategy_id as strategy_id,
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
			            strategy_rule_id int,
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
			insert_new_rules_cte as (
			    insert into
			        price_markdown.tb_strategy_rule (
			            strategy_id,
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
			        rc.strategy_id,
			        rc.constraint_type,
			        rc.constraint_id,
			        rc.min_value,
			        rc.max_value,
			        rc.applicable_value,
			        rc.rule_flexibility_type_id,
			        rc.priority,
			        rc.status
			    from
			        rules_cte rc
			    where
			        rc.strategy_rule_id is null
			),
			update_rules_cte as (
			    update
			        price_markdown.tb_strategy_objective tsb
			    set
			        objective_value = rc.target_value
			    from
			        rules_cte rc
			    where
			        tsb.strategy_id = rc.strategy_id
			        and tsb.strategy_objective_id = rc.constraint_id
			        and (
			            objective_value != rc.target_value
			            or objective_value is null
			        )
			        and rc.constraint_type = 1
			)
			update
			    price_markdown.tb_strategy_rule tsr
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
			    tsr.strategy_rule_id = rc.strategy_rule_id;

			update
			    price_markdown.tb_strategy_master
			set
			    step_count = 2,
			    status = 0,
			    final_data_prepared = false,
			    updated_by = p_user_id
			where
			    strategy_id = p_strategy_id;
		end if;
		return p_strategy_id;

	end;
$function$
;
