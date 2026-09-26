--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:fn_v3_edit_strategy_step_7 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added ending rule insertion, fn_v3_edit_strategy_step_7

DROP FUNCTION if exists price_markdown.fn_v3_edit_strategy_step_2;


CREATE OR REPLACE FUNCTION price_markdown.fn_v3_edit_strategy_step_2(p_strategy_id integer, p_strategy_rules text, p_product_recommendation_level integer, p_store_recommendation_level integer, p_user_id integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
	DECLARE
		is_active_strategy bool := price_markdown.fn_check_is_active_strategy(p_strategy_id);
		new_strategy_id integer;
		current_strategy_record price_markdown.tb_strategy_master%ROWTYPE;
		new_rules_data text;
		ending_rule__priority int;
		_preferred_currency_type text;
	begin
		
		drop table if exists tb_temp_rules_and_objectives;
       	CREATE TEMP TABLE tb_temp_rules_and_objectives (
			strategy_id int4,
		    constraint_id int,
		    strategy_rule_id int,
		    constraint_type int2,
		    min_value float4,
		    max_value float4,
		    applicable_value _float4,
		    target_value float4,
		    rule_flexibility_type_id int2,
		    priority int2,
		    rule_name text,
		    status int2,
		    objective_type_id int
		);
		
		INSERT INTO tb_temp_rules_and_objectives (strategy_id, constraint_id, strategy_rule_id, constraint_type, min_value, max_value, 
		                             applicable_value, target_value, rule_flexibility_type_id, priority, 
		                             rule_name, status, objective_type_id)
		SELECT 
			p_strategy_id as strategy_id,
		    constraint_id, strategy_rule_id, constraint_type, 
			min_value, max_value, applicable_value, 
		    target_value, rule_flexibility_type_id, 
			priority, rule_name, (case when is_disabled = true then 1 else 0 end ) as status, 
		    objective_type_id
		FROM 
		    jsonb_to_recordset(p_strategy_rules::jsonb) AS objectives(
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
		        is_disabled bool,
		        objective_type_id int
		    );


		select * into current_strategy_record from price_markdown.tb_strategy_master where strategy_id = p_strategy_id;
		if is_active_strategy then
			new_strategy_id := price_markdown.fn_v3_copy_strategy(p_strategy_id, p_user_id, null::date, null::date);

			with new_rules_data_cte as (
				select
					strategy_rule_mapping.new_strategy_rule_id as strategy_rule_id,
					new_strategy_id as strategy_id,
					constraint_type,
					coalesce(new_constraint_id, constraint_id) as constraint_id,
					min_value,
					max_value,
					applicable_value,
					target_value,
					rule_flexibility_type_id,
					priority,
					rule_name,
					status,
					objective_type_id
				from
					tb_temp_rules_and_objectives rules
				left join
				(
					select
						old_strategy_rule.strategy_rule_id as old_strategy_rule_id,
						new_strategy_rule.strategy_rule_id as new_strategy_rule_id,
						new_strategy_rule.new_constraint_id as new_constraint_id
					from
						(select * from price_markdown.tb_strategy_rule tsr where strategy_id = p_strategy_id ) old_strategy_rule
					inner join
					(
						select 
							tsr.*,
							coalesce(objective_mapping.old_objective_id,tsr.constraint_id) as old_constraint_id,
							objective_mapping.new_objective_id as new_constraint_id
						from 
							price_markdown.tb_strategy_rule tsr
						left join (
									select 
										old_strategy_alias.strategy_objective_id as old_objective_id,
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
								) objective_mapping 
								on objective_mapping.new_objective_id =  tsr.constraint_id
								where strategy_id = new_strategy_id
					) new_strategy_rule
					on old_strategy_rule.constraint_id = new_strategy_rule.old_constraint_id
				) strategy_rule_mapping
				on rules.strategy_rule_id = strategy_rule_mapping.old_strategy_rule_id
			)
			select 
				json_agg(to_json(new_rules_data_cte.*)) into new_rules_data
			from 
				new_rules_data_cte;

			raise notice '%',new_rules_data;

			return price_markdown.fn_v3_edit_strategy_step_2(
				new_strategy_id,
				new_rules_data,
				p_product_recommendation_level,
				p_store_recommendation_level,
				p_user_id
			);
		else
			call price_markdown.pc_drop_artifacts_opt('materialized view', format('markdown_opt.mvm_%1$s_day_split', p_strategy_id));
			call price_markdown.pc_drop_artifacts_opt('materialized view', format('markdown_opt.mvm_%1$s_sim', p_strategy_id));
			raise notice 'materialized views dropped';

			perform price_markdown.fn_create_strategy_discount_partition_with_index(p_strategy_id,'tb_strategy_discount') ;
			perform price_markdown.fn_create_strategy_discount_partition_with_index(p_strategy_id,'tb_strategy_discount_ia') ;

			call price_markdown.pc_clear_strategy_metrics(p_strategy_id);


			if current_strategy_record.product_recommendation_level is null 
               or (current_strategy_record.product_recommendation_level != p_product_recommendation_level)
			   or current_strategy_record.store_recommendation_level is null 
               or (current_strategy_record.store_recommendation_level != p_store_recommendation_level)
			   or (current_strategy_record.step_count = 1)
			   then
					call price_markdown.pc_clear_strategy_discounts(p_strategy_id);

					with sku_map_copy_cte as(
					    select
					        product_id,
					        store_id,
					        include_from_date,
                            channel_info,
                            price,
                            "cost",
							currency_id,
							price_with_vat
					    from
					        price_markdown.tb_strategy_sku_store_mapping
					    where
					        strategy_id = p_strategy_id
					),
					sku_map_with_recommendations_cte as(
					    select
					        smcc.product_id,
					        smcc.store_id,
					        smcc.include_from_date,
					        prl.product_level_id as product_recommendation_level,
					        prl.product_level_value as product_recommendation_value,
				            srl.store_level_id as store_recommendation_level,
					        srl.store_level_value as store_recommendation_value,
                            case when p_store_recommendation_level in (-200, -100) then 'Omni'
                            else srl.channel_info
                            end as channel_info,
                            smcc.price,
                            smcc."cost",
							smcc.currency_id,
							smcc.price_with_vat
					    from
					        sku_map_copy_cte smcc
                        left join price_markdown.fn_get_products_recommendation_level(
                            p_strategy_id,
                            p_product_recommendation_level,
                            array(select distinct product_id from price_markdown.tb_strategy_sku_store_mapping where strategy_id = p_strategy_id)
                        ) prl on prl.product_id = smcc.product_id
                        left join price_markdown.fn_get_stores_recommendation_level(
                            p_strategy_id,
                            p_store_recommendation_level,
                            array(select distinct store_id from price_markdown.tb_strategy_sku_store_mapping where strategy_id = p_strategy_id)
                        ) srl on srl.store_id = smcc.store_id
					),
					delete_sku_mapping_cte as (
					    delete
					        from price_markdown.tb_strategy_sku_store_mapping tsssm
					    where
					        tsssm.strategy_id = p_strategy_id
					)
					insert into price_markdown.tb_strategy_sku_store_mapping
					    (
                            strategy_id,
                            product_id,
                            store_id,
                            include_from_date,
                            product_level_id,
                            store_level_id,
                            product_level_value,
                            store_level_value,
                            channel_info,
                            price,
                            "cost", 
							currency_id, 
							price_with_vat
                        )
					select
					    p_strategy_id as strategy_id,
					    smwrc.product_id,
					    smwrc.store_id,
					    smwrc.include_from_date,
					    smwrc.product_recommendation_level,
					    smwrc.store_recommendation_level,
					    smwrc.product_recommendation_value,
					    smwrc.store_recommendation_value,
                        smwrc.channel_info,
                        smwrc.price,
                        smwrc."cost",
						smwrc.currency_id,
						smwrc.price_with_vat
					from
					    sku_map_with_recommendations_cte smwrc;
			end if;

			update 
				price_markdown.tb_strategy_discount
			set 
				is_locked = 0,
            	approval_status = 'Not Approved'::price_markdown.strategy_approval_status_enum
			where 
				strategy_id = p_strategy_id;

			update 
				price_markdown.tb_strategy_master
			set 
				step_count = 2,
				final_data_prepared = false,
				status = 0,
				product_recommendation_level = p_product_recommendation_level,
				store_recommendation_level = p_store_recommendation_level,
				updated_by = p_user_id,
				updated_at = now()
			where 
				strategy_id = p_strategy_id;

			-- Delete objectives from rules.
            delete from
				price_markdown.tb_strategy_rule tsr
			where
			 	tsr.strategy_id = p_strategy_id;

			-- Delete objectives from tb_temp_rules_and_objectives.
			delete from
				price_markdown.tb_strategy_objective tsr
			where
			 	tsr.strategy_id = p_strategy_id;

			-- Insert objectives from tb_temp_rules_and_objectives.
			insert into price_markdown.tb_strategy_objective
				(strategy_id, objective_type_id, objective_value)
		    select
		        p_strategy_id as strategy_id,
		        rc.objective_type_id,
		        rc.target_value
		    from
		        tb_temp_rules_and_objectives rc
			where
				rc.constraint_type = 1;

			-- Insert Rules from tb_temp_rules_and_objectives, if it is already present else update.
			insert into price_markdown.tb_strategy_rule (
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
		        case
		            when rc.constraint_type = 1 then obj.strategy_objective_id
		            else rc.constraint_id
		        end as constraint_id,
		        rc.min_value,
		        rc.max_value,
		        rc.applicable_value,
		        rc.rule_flexibility_type_id,
		        rc.priority,
		        rc.status
		    from
		        tb_temp_rules_and_objectives rc
			left join
    			price_markdown.tb_strategy_objective obj on rc.strategy_id = obj.strategy_id and rc.objective_type_id = obj.objective_type_id;


            update 
				price_markdown.tb_strategy_rule tsr1
            set 
				priority = tsr2.row_num
            from
                (
                    select
                        row_number() over ( order by priority ) as row_num,
                        s.*
                    from
                        price_markdown.tb_strategy_rule s
                    where 
						strategy_id = p_strategy_id
                ) tsr2
            where 
				tsr1.strategy_rule_id = tsr2.strategy_rule_id;

			-- ending rule insertion from backend.
			select 
				(max(priority) + 1) into ending_rule__priority
			from 
				price_markdown.tb_strategy_rule tsr
			where 
				tsr.strategy_id = p_strategy_id;
			
			delete from price_markdown.tb_strategy_rule tsr where tsr.constraint_id = 3 and tsr.strategy_id = p_strategy_id;

			insert into price_markdown.tb_strategy_rule(strategy_id, constraint_type, constraint_id, applicable_value, rule_flexibility_type_id, priority, status)
			values(p_strategy_id, 0, 3,  array[99]::real[], 0, ending_rule__priority, 0);

			select  
				fn_get_strategy_preferred_currency_type into  _preferred_currency_type 
			from 
				price_markdown.fn_get_strategy_preferred_currency_type(p_strategy_id);

			update 
				price_markdown.tb_strategy_master
			set 
				preferred_currency_type = _preferred_currency_type
			where 
				strategy_id = p_strategy_id;
			return p_strategy_id;
		end if;
	end;
$function$
;
