--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_edit_strategy_step_2_4 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added security definer
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_edit_strategy_step_2;
CREATE OR REPLACE FUNCTION price_markdown.fn_edit_strategy_step_2(p_strategy_id integer, p_objectives text, p_product_recommendation_level integer, p_store_recommendation_level integer, p_user_id integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
	DECLARE
	is_active_strategy bool := price_markdown.fn_check_is_active_strategy(p_strategy_id);
	new_strategy_id integer;
	current_strategy_record price_markdown.tb_strategy_master%ROWTYPE;

	begin

		select * into current_strategy_record from price_markdown.tb_strategy_master where strategy_id = p_strategy_id;

		if is_active_strategy then
			new_strategy_id := price_markdown.fn_copy_strategy(p_strategy_id,p_user_id,null::date,null::date);
			return price_markdown.fn_edit_strategy_step_2(
				new_strategy_id,
				p_objectives,
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


			if current_strategy_record.product_recommendation_level is null or
				(current_strategy_record.product_recommendation_level != p_product_recommendation_level)
				or
				current_strategy_record.store_recommendation_level is null or
				(current_strategy_record.store_recommendation_level != p_store_recommendation_level)
				then
					call price_markdown.pc_clear_strategy_discounts(p_strategy_id);

					with sku_map_copy_cte as(
					    select
					        product_id,
					        store_id,
					        include_from_date,
                            channel_info,
                            price,
                            "cost"
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
                            case when p_store_recommendation_level in (-200,-100) then 'Omni'
                            else srl.channel_info
                            end as channel_info,
                            smcc.price,
                            smcc."cost"
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
                            "cost"
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
                        smwrc."cost"
					from
					    sku_map_with_recommendations_cte smwrc;
			end if;

			update price_markdown.tb_strategy_discount
			set is_locked = 0,
                approval_status = 'Not Approved'::price_markdown.strategy_approval_status_enum
			where strategy_id = p_strategy_id;

			update price_markdown.tb_strategy_master
			set step_count = 1,
			final_data_prepared = false,
			status = 0,
			product_recommendation_level = p_product_recommendation_level,
			store_recommendation_level = p_store_recommendation_level,
			updated_by = p_user_id
			where strategy_id = p_strategy_id;

			insert into price_markdown.tb_strategy_objective
            	(strategy_id,objective_type_id,objective_value)
            select
                p_strategy_id as strategy_id,
                objective_type_id,
                case when is_edited = true then objective_value else null end as objective_value
                from
                jsonb_to_recordset(p_objectives::jsonb) as objectives(objective_type_id int2,objective_value float4, is_edited bool)
            on conflict(strategy_id,objective_type_id)
            do
            update set objective_value = excluded.objective_value;


           	-- if any objective is delete in step 2, if the same objective is presnt in rules, should be deleted.
            delete from
				price_markdown.tb_strategy_rule tsr
			where
			 	tsr.strategy_id = p_strategy_id
			 	and tsr.constraint_id in (	select
										    	strategy_objective_id
										    from
											    jsonb_to_recordset(p_objectives::jsonb) as objectives(strategy_objective_id int2,objective_value float4, is_edited bool)
											 where
											 	is_edited = true and objective_value is null
				 						 );

            update
                price_markdown.tb_strategy_rule tsr1
            set priority = tsr2.row_num
            from
                (
                    select
                        row_number() over ( order by priority ) as row_num,
                        s.*
                    from
                        price_markdown.tb_strategy_rule s
                    where strategy_id = p_strategy_id
                ) tsr2
            where tsr1.strategy_rule_id = tsr2.strategy_rule_id;


           	return p_strategy_id;
		end if;

	end;
$function$
;
