--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:fn_v3_edit_strategy_step_9 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: fn_v3_edit_strategy_step_9

DROP FUNCTION if exists price_markdown.fn_v3_edit_strategy_step_2;

CREATE OR REPLACE FUNCTION price_markdown.fn_v3_edit_strategy_step_2(p_strategy_id integer, p_strategy_rules text, p_product_recommendation_level integer[], p_store_recommendation_level integer[], p_markdown_setting boolean, p_user_id integer)
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
		v_level int;
		v_level_name text;
		v_is_metadata_only bool := false;
		v_existing_rule_count int;
		v_incoming_rule_count int;
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

		-- Metadata-only check: when an active strategy has no structural
		-- changes (reco levels and rules unchanged), skip version creation
		-- and apply only the metadata update (e.g. markdown setting toggle).
		if is_active_strategy
		   and current_strategy_record.product_recommendation_level = p_product_recommendation_level
		   and current_strategy_record.store_recommendation_level = p_store_recommendation_level
		then
			select count(*) into v_existing_rule_count
			from price_markdown.tb_strategy_rule
			where strategy_id = p_strategy_id
			  and constraint_id != 3;

			select count(*) into v_incoming_rule_count
			from tb_temp_rules_and_objectives;

			if v_existing_rule_count = v_incoming_rule_count then
				v_is_metadata_only := true;
			end if;
		end if;

		if is_active_strategy and v_is_metadata_only then
			update price_markdown.tb_strategy_master
			set is_hard_markdown = p_markdown_setting,
				updated_by = p_user_id,
				updated_at = now()
			where strategy_id = p_strategy_id;

			return p_strategy_id;

		elseif is_active_strategy then
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
				p_markdown_setting,
				p_user_id
			);
		else
			call price_markdown.pc_drop_artifacts_opt('materialized view', format('markdown_opt.mvm_%1$s_day_split', p_strategy_id));
			call price_markdown.pc_drop_artifacts_opt('materialized view', format('markdown_opt.mvm_%1$s_sim', p_strategy_id));
			raise notice 'materialized views dropped';

			perform price_markdown.fn_create_strategy_discount_partition_with_index(p_strategy_id,'tb_strategy_discount') ;
			perform price_markdown.fn_create_strategy_discount_partition_with_index(p_strategy_id,'tb_strategy_discount_ia') ;

			-- NEW: create tb_strategy_discount_level partition for this strategy
			execute format(
				'CREATE TABLE IF NOT EXISTS price_markdown.tb_strategy_discount_level_%1$s PARTITION OF price_markdown.tb_strategy_discount_level FOR VALUES IN (%1$s)',
				p_strategy_id
			);
			execute format(
				'CREATE UNIQUE INDEX IF NOT EXISTS tb_strategy_discount_level_%1$s_strategy_id_product_level_id__key ON price_markdown.tb_strategy_discount_level_%1$s USING btree(strategy_id, product_level_id, store_level_id)',
				p_strategy_id
			);

			call price_markdown.pc_clear_strategy_metrics(p_strategy_id);


			if current_strategy_record.product_recommendation_level is null
               or (current_strategy_record.product_recommendation_level != p_product_recommendation_level)
			   or current_strategy_record.store_recommendation_level is null
               or (current_strategy_record.store_recommendation_level != p_store_recommendation_level)
			   or (current_strategy_record.step_count = 1)
			   then
					call price_markdown.pc_clear_strategy_discounts(p_strategy_id);

					-- ============================================================
					-- Multi-level reco details population
					-- ============================================================

					-- Step A: Collect per-level product data into a temp table
					drop table if exists tb_temp_product_levels;
					create temp table tb_temp_product_levels (
						reco_level int,
						reco_level_name text,
						product_id bigint,
						natural_level_id bigint,
						natural_level_value text
					);

					foreach v_level in array p_product_recommendation_level loop
						select name into v_level_name
						from price_markdown.tb_view_by_config
						where category = 'product_level' and value = v_level;

						insert into tb_temp_product_levels (reco_level, reco_level_name, product_id, natural_level_id, natural_level_value)
						select
							v_level,
							v_level_name,
							prl.product_id,
							prl.product_level_id,
							prl.product_level_value
						from price_markdown.fn_get_products_recommendation_level(
							p_strategy_id,
							v_level,
							array(select distinct product_id from price_markdown.tb_strategy_sku_store_mapping where strategy_id = p_strategy_id)
						) prl;
					end loop;

					-- Step B: Collect per-level store data into a temp table
					drop table if exists tb_temp_store_levels;
					create temp table tb_temp_store_levels (
						reco_level int,
						reco_level_name text,
						store_id int,
						natural_level_id int,
						natural_level_value text,
						channel_info varchar
					);

					foreach v_level in array p_store_recommendation_level loop
						select name into v_level_name
						from price_markdown.tb_view_by_config
						where category = 'store_level' and value = v_level;

						insert into tb_temp_store_levels (reco_level, reco_level_name, store_id, natural_level_id, natural_level_value, channel_info)
						select
							v_level,
							v_level_name,
							srl.store_id,
							srl.store_level_id,
							srl.store_level_value,
							srl.channel_info
						from price_markdown.fn_get_stores_recommendation_level(
							p_strategy_id,
							v_level,
							array(select distinct store_id from price_markdown.tb_strategy_sku_store_mapping where strategy_id = p_strategy_id)
						) srl;
					end loop;

					-- Step C: Build unique product level combinations with JSONB values
					drop table if exists tb_temp_product_reco;
					create temp table tb_temp_product_reco as
					with pivoted as (
						select
							tpl.product_id,
							jsonb_object_agg(
								tpl.reco_level_name || '_cid', tpl.natural_level_id::text
							) || jsonb_object_agg(
								tpl.reco_level_name || '_cuq', tpl.natural_level_value
							) as level_value_jsonb,
							array_agg(tpl.natural_level_id order by tpl.reco_level) as natural_id_combo
						from tb_temp_product_levels tpl
						group by tpl.product_id
					)
					select
						product_id,
						level_value_jsonb,
						natural_id_combo
					from pivoted;

					-- Step D: Build unique store level combinations similarly
					drop table if exists tb_temp_store_reco;
					create temp table tb_temp_store_reco as
					with pivoted as (
						select
							tsl.store_id,
							jsonb_object_agg(
								tsl.reco_level_name || '_id', tsl.natural_level_id::text
							) || jsonb_object_agg(
								tsl.reco_level_name || '_name', tsl.natural_level_value
							) as level_value_jsonb,
							array_agg(tsl.natural_level_id order by tsl.reco_level) as natural_id_combo,
							(array_agg(tsl.channel_info order by tsl.reco_level desc))[1] as channel_info
						from tb_temp_store_levels tsl
						group by tsl.store_id
					)
					select
						store_id,
						level_value_jsonb,
						natural_id_combo,
						channel_info
					from pivoted;

					-- Step E: Populate tb_strategy_product_reco_details
					--         INSERT distinct JSONB values, let DB auto-generate product_level_id
					--         Build small mapping: natural_id_combo → surrogate product_level_id
					delete from price_markdown.tb_strategy_product_reco_details where strategy_id = p_strategy_id;

					drop table if exists tb_temp_product_surrogate_map;
					create temp table tb_temp_product_surrogate_map as
					with distinct_product_combos as (
						select distinct level_value_jsonb, natural_id_combo
						from tb_temp_product_reco
					),
					inserted as (
						insert into price_markdown.tb_strategy_product_reco_details (product_level_value, strategy_id)
						select level_value_jsonb, p_strategy_id
						from distinct_product_combos
						returning product_level_id, product_level_value
					)
					select
						dpc.natural_id_combo,
						i.product_level_id as surrogate_product_level_id
					from inserted i
					inner join distinct_product_combos dpc on dpc.level_value_jsonb = i.product_level_value;

					-- Step F: Populate tb_strategy_store_reco_details
					--         INSERT distinct JSONB values, let DB auto-generate store_level_id
					--         Build small mapping: natural_id_combo → surrogate store_level_id
					delete from price_markdown.tb_strategy_store_reco_details where strategy_id = p_strategy_id;

					drop table if exists tb_temp_store_surrogate_map;
					create temp table tb_temp_store_surrogate_map as
					with distinct_store_combos as (
						select distinct level_value_jsonb, natural_id_combo
						from tb_temp_store_reco
					),
					inserted as (
						insert into price_markdown.tb_strategy_store_reco_details (store_level_value, strategy_id)
						select level_value_jsonb, p_strategy_id
						from distinct_store_combos
						returning store_level_id, store_level_value
					)
					select
						dsc.natural_id_combo,
						i.store_level_id as surrogate_store_level_id
					from inserted i
					inner join distinct_store_combos dsc on dsc.level_value_jsonb = i.store_level_value;

					-- Step G: Rebuild tb_strategy_sku_store_mapping with DB-generated surrogate IDs
					--         JOIN per-product temp → small surrogate map on natural_id_combo (int[] comparison)
					--         instead of expensive per-row JSONB equality
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
					sku_map_with_surrogates as (
					    select
					        smcc.product_id,
					        smcc.store_id,
					        smcc.include_from_date,
					        psm.surrogate_product_level_id as product_level_id,
					        ssm.surrogate_store_level_id as store_level_id,
                            case when -200 = any(p_store_recommendation_level) or -100 = any(p_store_recommendation_level)
                                then 'Omni'
                                else tsr.channel_info
                            end as channel_info,
                            smcc.price,
                            smcc."cost",
						smcc.currency_id,
						smcc.price_with_vat
					    from
					        sku_map_copy_cte smcc
                        left join tb_temp_product_reco tpr on tpr.product_id = smcc.product_id
                        left join tb_temp_store_reco tsr on tsr.store_id = smcc.store_id
                        left join tb_temp_product_surrogate_map psm on psm.natural_id_combo = tpr.natural_id_combo
                        left join tb_temp_store_surrogate_map ssm on ssm.natural_id_combo = tsr.natural_id_combo
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
					    smws.product_id,
					    smws.store_id,
					    smws.include_from_date,
					    smws.product_level_id,
					    smws.store_level_id,
					    null as product_level_value,
					    null as store_level_value,
                        smws.channel_info,
                        smws.price,
                        smws."cost",
					smws.currency_id,
					smws.price_with_vat
					from
					    sku_map_with_surrogates smws;

					-- NEW: Populate tb_strategy_discount_level with initial rows
					-- One row per distinct (product_level_id, store_level_id) combo
					execute format(
						'DELETE FROM price_markdown.tb_strategy_discount_level_%1$s WHERE strategy_id = %1$s',
						p_strategy_id
					);
					execute format(
						'INSERT INTO price_markdown.tb_strategy_discount_level_%1$s
						 (strategy_id, product_level_id, store_level_id, currency_id, channel_info, created_by)
						 SELECT DISTINCT
						     %1$s,
						     product_level_id,
						     store_level_id,
						     currency_id,
						     channel_info,
						     %2$s
						 FROM price_markdown.tb_strategy_sku_store_mapping
						 WHERE strategy_id = %1$s',
						p_strategy_id, p_user_id
					);

					-- Clean up temp tables
					drop table if exists tb_temp_product_levels;
					drop table if exists tb_temp_store_levels;
					drop table if exists tb_temp_product_reco;
					drop table if exists tb_temp_store_reco;
					drop table if exists tb_temp_product_surrogate_map;
					drop table if exists tb_temp_store_surrogate_map;
			end if;

			-- OLD: reset is_locked/approval_status on old tb_strategy_discount (mark for future removal)
			update
				price_markdown.tb_strategy_discount
			set
				is_locked = 0,
            	approval_status = 'Not Approved'::price_markdown.strategy_approval_status_enum
			where
				strategy_id = p_strategy_id;

			-- NEW: reset is_locked/approval_status in tb_strategy_discount_level pcd_data JSONB
			execute format(
				'UPDATE price_markdown.tb_strategy_discount_level_%1$s
				 SET pcd_data = (
				     SELECT jsonb_object_agg(
				         e.key,
				         e.value || jsonb_build_object(''is_locked'', 0, ''approval_status'', ''Not Approved'')
				     )
				     FROM jsonb_each(pcd_data) e
				 )
				 WHERE strategy_id = %1$s AND pcd_data IS NOT NULL',
				p_strategy_id
			);

			update
				price_markdown.tb_strategy_master
			set
				step_count = 2,
				final_data_prepared = false,
				status = 0,
				product_recommendation_level = p_product_recommendation_level,
				store_recommendation_level = p_store_recommendation_level,
				is_hard_markdown = p_markdown_setting,
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

			return p_strategy_id;
		end if;
	end;
$function$
;
