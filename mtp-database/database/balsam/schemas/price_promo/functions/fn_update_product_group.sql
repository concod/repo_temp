--liquibase formatted sql
--changeset shrrayan.sheel@impactanalytics.co:fn_update_product_group_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: fn_update_product_group_1

DROP FUNCTION if exists price_promo.fn_update_product_group;


CREATE OR REPLACE FUNCTION price_promo.fn_update_product_group(edit_pg_id integer, product_group_name text, product_group_description text, user_id integer, pg_grouping_type integer, pg_sub_query text, get_product_ids_query text, pg_products_count integer, pg_hierarchy_selection jsonb, product_ids integer[], selected_strategies integer[], selected_promos integer[], client_timezone text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
	declare
    current_product_group global.tb_product_group%ROWTYPE;
    strategy_record price_markdown.tb_strategy_master%ROWTYPE;
	return_pg_id integer := edit_pg_id;
    new_pg_id integer;
    partition_query text;
    new_pg_name varchar := product_group_name;
    base_name varchar := product_group_name;
    version_suffix text;
    existing_version integer;
    updated_pg_name varchar;
    p_strategy_id integer;
    p_promo_id integer;
    strategy_pg_ids integer[] DEFAULT ARRAY[]::integer[];
    pg_updated_products integer[] DEFAULT ARRAY[]::integer[];
    _insert_pg_product_query text;
    _insert_pg_hierarchy_sub_query text;
    edit_strategy_result integer;
    existing_data jsonb;
    difference_check bool := false;
	start_time TIMESTAMP;
    end_time TIMESTAMP;
    _product_ids int[];
   	_store_ids int[];
	_insert_included_promo_pg_hierarchy_sub_query text;
	hierarchy_key TEXT;
    cfg JSONB;
	case_level_name TEXT := 'Case ';
    case_value_name TEXT := 'Case ';
    join_condition TEXT := '';
    _product_hierarchies_config jsonb;
    begin
		select config_value::jsonb into _product_hierarchies_config
        from price_promo.tb_tool_configurations
        where module = 'product' and config_name = 'hierarchy_filters';

	    raise notice 'update product group started for the PG ID: %', edit_pg_id;
	    if pg_grouping_type = 0 then
			start_time := clock_timestamp();
        	raise notice 'pg products difference check start';

			drop table if exists tmp_product_ids_diff;
	        create temp table tmp_product_ids_diff on commit drop as (
                select
                    tpi.product_id as tpi_product_id,
                    tpp.product_id as tpp_product_id
                from (select unnest(product_ids) as product_id) tpi
                full outer join (
                    select
                        distinct product_id
                    from global.tb_pg_product tpp
                        where pg_id = edit_pg_id
                    ) tpp on
                    tpi.product_id = tpp.product_id
                where
                    tpi.product_id is null
                    or tpp.product_id is null
            );

			if exists (select 1 from tmp_product_ids_diff) then
	    		difference_check := true;
	    	end if;

			end_time := clock_timestamp();
	    	raise notice 'pg products difference check done: %',difference_check;
			raise notice 'time taken for pg products difference check: %',end_time - start_time;

        else
        	raise notice 'pg hierarchy selection difference check start';
        	with current_pg_hierarchy as (
		        select hierarchy_level, array_agg(hierarchy_value order by hierarchy_value) as hierarchy_values
		        from global.tb_pg_hierarchy tph where pg_id = edit_pg_id  and is_temporary = 0
		        group by hierarchy_level
		    )
		    select jsonb_agg(jsonb_build_object('hierarchy_level', hierarchy_level, 'hierarchy_value', hierarchy_values)) into existing_data
		    from current_pg_hierarchy;
		    difference_check := (existing_data is distinct from pg_hierarchy_selection);
		    raise notice 'pg hierarchy selection difference done : %',difference_check;

        end if;

        -- Current edit product group id details
        select * into current_product_group from global.tb_product_group where pg_id = edit_pg_id;

        if difference_check then
            -- Check if the product group ID is present in tb_strategy_product_groups
			if array_length(selected_strategies,1) > 0 or array_length(selected_promos,1) > 0
				or exists (select 1 from price_markdown.tb_strategy_product_groups where product_group_id = edit_pg_id)
				or exists (select 1 from price_promo.included_promo_product_groups where product_group_id = edit_pg_id)
				or exists (select 1 from price_promo.excluded_product_groups where pg_id = edit_pg_id) then
				start_time := clock_timestamp();
				if exists (select 1 from price_markdown.tb_strategy_product_groups where product_group_id = edit_pg_id and strategy_id not in (select unnest(selected_strategies)))
					or exists (select 1 from price_promo.included_promo_product_groups where product_group_id = edit_pg_id and promo_id not in (select unnest(selected_promos)))
                    or exists (select 1 from price_markdown.tb_strategy_master where strategy_id = any(selected_strategies) and status = 3)
					or exists (select 1 from price_promo.excluded_product_groups where pg_id = edit_pg_id and promo_id not in (select unnest(selected_promos))) then
					-- Create the Versioned Name
					raise notice 'product_group_name check: %',product_group_name;
					if product_group_name = current_product_group.pg_name then
						raise notice 'product_group_name and current pg name same: %',product_group_name;
						if product_group_name ~ '_old(\d+)$' then
							base_name := REGEXP_REPLACE(product_group_name, '_old(\d+)$', '');
						end if;
						select coalesce(max(substring(pg_name from '_old(\d+)$')::int), 0) into existing_version
						from global.tb_product_group
						where pg_name ~ ('^' || base_name || '_old(\d+)$')
						and is_deleted = 0;
						version_suffix := '_old' || (existing_version + 1);
						updated_pg_name := base_name || version_suffix;
						raise notice 'updated product_group_name: %',updated_pg_name;
						-- Update the current product group name to the versioned name
						update global.tb_product_group
						set pg_name = updated_pg_name, updated_by = user_id, updated_at = timezone(client_timezone, now())
						where pg_id = edit_pg_id;
					else
						update global.tb_product_group
						set updated_by = user_id, updated_at = timezone(client_timezone, now())
						where pg_id = edit_pg_id;
					end if;
				else
					update global.tb_product_group
						set is_deleted = 1, updated_by = user_id, updated_at = timezone(client_timezone, now())
						where pg_id = edit_pg_id;
				end if;
                -- Insert new Product Group basic Info with updated pg_name.
                insert into global.tb_product_group (pg_name, description, created_by, created_at, pg_grouping_type, products_count, updated_by, updated_at)
                values (new_pg_name, product_group_description, current_product_group.created_by, current_product_group.created_at, pg_grouping_type, pg_products_count, user_id, timezone(client_timezone, now())) returning pg_id into new_pg_id;
				raise notice 'New Product Group ID, strategy/promo use: %', new_pg_id;
				-- product ids insert query
			    if pg_grouping_type = 0 then
			        _insert_pg_product_query := format('insert into global.tb_pg_product (pg_id, product_id)
												select %s as pg_id,
													cast(dd1.product_id as bigint)
												from ( select unnest(ARRAY[%s]::INTEGER[]) product_id ) dd1',
			      								new_pg_id,array_to_string(product_ids, ','));
			    else
			        _insert_pg_product_query := 'insert into global.tb_pg_product (pg_id, product_id)
										        select ' || new_pg_id || ' as pg_id,
										            dd1.product_id
										        from
										            ( ' || get_product_ids_query || ' )dd1';
			    end if;
               -- hierarchy combination sub query
                _insert_pg_hierarchy_sub_query := 'insert into global.tb_pg_hierarchy (pg_id, hierarchy_level, hierarchy_value, is_temporary)
			            select ' || new_pg_id || ' as pg_id,
			                dd.hierarchy_level,
			                dd.hierarchy_value,
			                dd.is_temporary
			            from
			                ( ' || pg_sub_query || ' )dd';
                execute _insert_pg_product_query;
                execute _insert_pg_hierarchy_sub_query;
               	select array(select distinct product_id from global.tb_pg_product where pg_id = new_pg_id) into pg_updated_products;
                raise notice 'startegy/promo insert into product tables done for pg id : %', new_pg_id;
				return_pg_id := new_pg_id;
				end_time := clock_timestamp();
				raise notice 'time taken to create version pg: %',end_time - start_time;

				-- updating effected strategies
				if array_length(selected_strategies,1) > 0 then
					start_time := clock_timestamp();
                    for p_strategy_id in select unnest(selected_strategies) as selected_strategies_id
                    loop
                        -- updating pg ids
                        select * into strategy_pg_ids from ( with strategy_pg_ids as
                                    ( select array_agg(product_group_id) as ids
                                    from price_markdown.tb_strategy_product_groups where strategy_id = p_strategy_id)
	                    select array_remove(array_append(ids, new_pg_id), edit_pg_id) as spg_ids from strategy_pg_ids) as a;
	                    raise notice 'updated strategy pg ids: %', strategy_pg_ids;
	                    raise notice 'strategy edit started for strategy id: %', p_strategy_id;
	                    select * into strategy_record from price_markdown.tb_strategy_master where strategy_id = p_strategy_id;

	                   	-- If the pg edit causes allow_only_with_inv flag conflict then skipping the effected strategy edit.
	                   	IF strategy_record.allow_only_with_inv THEN
					        _product_ids := ARRAY(
					            SELECT DISTINCT pm.product_id 
					            FROM global.tb_pg_product tpg
					            JOIN price_markdown.product_master pm ON pm.l5_cid = tpg.product_id
					            WHERE tpg.pg_id = ANY(strategy_pg_ids)
					              AND clearance_indicator = 0
					              AND pm.clearance_eligible = 1
					              AND pm.is_active = 1
					        );
					
					        _store_ids := ARRAY(
					            SELECT DISTINCT ss.store_id
					            FROM price_markdown.tb_strategy_sku_store_mapping ss
					            WHERE ss.strategy_id = p_strategy_id
					              AND ss.store_id IS NOT NULL
					        );
					
					        IF NOT price_markdown.fn_check_inventory_availability(_product_ids, _store_ids) THEN
					            RAISE NOTICE 'Inventory is not greater than zero, skipping edit for strategy id: %', p_strategy_id;
					            CONTINUE;
					        END IF;
					    END IF;

	                    edit_strategy_result = price_markdown.fn_v3_edit_strategy_step_1(
	                        p_strategy_id,
	                        array(
                                select distinct pm.product_id from global.tb_pg_product tpg
                                join price_markdown.product_master pm on pm.l5_cid = tpg.product_id
                                where tpg.pg_id = any(strategy_pg_ids)
                                and clearance_indicator=0
                                and pm.clearance_eligible = 1
                                and pm.is_active = 1
                            ),
	                        array(select distinct store_id from price_markdown.tb_strategy_sku_store_mapping where strategy_id = p_strategy_id),
	                        true,
	                        null::jsonb,
	                        null::jsonb,
	                        strategy_record.configured_by_sku_store_mapping,
	                        strategy_pg_ids,
	                        array(select distinct store_group_id from price_markdown.tb_strategy_store_groups where strategy_id = p_strategy_id),
							strategy_record.allow_only_with_inv,
							user_id
	                    );
	                   raise notice 'strategy edit done %',edit_strategy_result;
                    end loop;
					end_time := clock_timestamp();
					raise notice 'time taken to update effected strategies: %',end_time - start_time;
                end if;


				--  updating effected promos
                raise notice 'updating effected promos %',array_length(selected_promos,1);
				if array_length(selected_promos,1) > 0 then
					start_time := clock_timestamp();
					raise notice 'updating effected promos';
					for p_promo_id in select unnest(selected_promos) as selected_promos_id
                    loop
	                    raise notice 'updating effected promo_id %',p_promo_id;
	                    -- updating promo & pg combination
						update price_promo.included_promo_product_groups set product_group_id = new_pg_id, product_group_name = new_pg_name
						where promo_id = p_promo_id and product_group_id = edit_pg_id;

						-- updating promo & excluded pg combination
						update price_promo.excluded_product_groups set pg_id = new_pg_id, pg_name = new_pg_name
						where promo_id = p_promo_id and pg_id = edit_pg_id;

						raise notice 'updating promo & pg combination %',p_promo_id;
						-- deleting edit product group id and insert the hierarchies with new pg id
						delete from price_promo.included_promo_pg_hierarchy
						where  promo_id = p_promo_id and product_group_id = edit_pg_id;
						raise notice 'deleting edit product group id and insert the hierarchies with new pg id %',p_promo_id;

						-- forming dynamic store hierarchies for _insert_included_promo_pg_hierarchy_sub_query
                        FOR hierarchy_key, cfg IN SELECT * FROM jsonb_each(_product_hierarchies_config)
                        LOOP
							IF NOT (cfg ? 'id' AND cfg->>'id' IS NOT NULL) THEN
								CONTINUE;
							END IF;
                            
							case_level_name := case_level_name || format(
								'WHEN tph.hierarchy_level = %s THEN %L ',
								cfg->>'id',
								COALESCE(cfg->>'label', hierarchy_key)
							);
							
							case_value_name := case_value_name || format(
								'WHEN tph.hierarchy_level = %s THEN pm.%I ',
								cfg->>'id',
								cfg->>'value_column'
							);
							join_condition := join_condition || format(
								'(tph.hierarchy_level = %s AND tph.hierarchy_value = pm.%I) OR ',
								cfg->>'id',
								cfg->>'id_column'
							);

                        END LOOP;
                        -- Trim trailing ' OR '
                        join_condition := left(join_condition, length(join_condition) - 4);

						_insert_included_promo_pg_hierarchy_sub_query := format('INSERT INTO price_promo.included_promo_pg_hierarchy (
			                promo_id,
			                product_group_id,
			                product_group_name,
			                hierarchy_level_id,
			                hierarchy_level_name,
			                hierarchy_value_id,
			                hierarchy_value_name
			            )
			            SELECT DISTINCT
			                p_promo_id AS promo_id,
			                new_pg_id AS product_group_id,
			                tpg.pg_name AS product_group_name,
			                tph.hierarchy_level AS hierarchy_level_id,
			                %s END AS hierarchy_level_name,
			                tph.hierarchy_value AS hierarchy_value_id,
							%s END AS hierarchy_value_name
			                %s END AS hierarchy_value_name
			            FROM
			                global.tb_pg_hierarchy tph
			            LEFT JOIN global.tb_product_group tpg ON tph.pg_id = tpg.pg_id
			            LEFT JOIN
			                (select * from price_promo.product_master where product_id = any(pg_updated_products)) pm
			            ON
			                %s
			            WHERE
			                tph.pg_id = new_pg_id;', case_level_name, case_value_name, join_condition);

						execute _insert_included_promo_pg_hierarchy_sub_query;
						raise notice '_insert_promo_store_sg_hierarchy_sub_query successfully run ';

			            drop table if exists tmp_delete_product_ids;
			            drop table if exists tmp_new_product_ids;
			            create temp table tmp_delete_product_ids on commit drop as (
				       			select pp.product_id
				       			from price_promo.included_products as pp
				       			where pp.promo_id = p_promo_id
				       				and pp.product_id not in (select product_id from unnest(pg_updated_products) product_id)
				        );
				        create temp table tmp_new_product_ids on commit drop as (
				       			select p_promo_id,
				       				pt.product_id,
				       				pm.product_name
				       			from (select unnest(pg_updated_products) as product_id) pt
				       			left join price_promo.included_products as pp on pp.product_id = pt.product_id
				       			join price_promo.product_master as pm on pm.product_id = pt.product_id
				       			where pp.promo_id = p_promo_id
				       			and pp.product_id is null
				        );
				        raise notice 'promo_hierarchy insert hierarchy %',p_promo_id;

				        -- delete and insert the promo & product combination
				        delete from price_promo.included_products
				        where promo_id = p_promo_id
				        and product_id in (select product_id from tmp_delete_product_ids);

				        insert into price_promo.included_products (promo_id, product_id, product_name)
				        select * from tmp_new_product_ids;

				        raise notice 'delete and insert in included_products %',p_promo_id;

				       	perform price_promo.fn_save_promo_final_hierarchy(p_promo_id);
						perform price_promo.fn_save_promo_final_products(p_promo_id);


				        -- updating step count to 1, status to 0 and product count
						update price_promo.promo_master
                        set step_count = case when price_promo.ps_rules.discount_level != -200 then 1 else price_promo.promo_master.step_count end,
                            status = 0,
							products_count = (select count(product_id) from price_promo.promo_product where promo_id = p_promo_id)
                        from price_promo.ps_rules
                        where price_promo.promo_master.promo_id = p_promo_id;
				        raise notice 'step_count update %',p_promo_id;


					end loop;
					perform price_promo.fn_delete_promo_metrics_and_update_status(selected_promos);
					end_time := clock_timestamp();
					raise notice 'time taken to update effected promos: %',end_time - start_time;
				end if;


                perform price_markdown.fn_update_product_group_products_count(new_pg_id);
				-- creating partition table and attaching to global.tb_pg_product
				start_time := clock_timestamp();
				call global.pc_create_partition_for_pgs_or_sgs('tb_pg_product', new_pg_id);
				raise notice 'pg partition table create done';

				execute 'INSERT INTO global.tb_pg_product_' || new_pg_id::text || ' SELECT * FROM global.tb_pg_product_default WHERE pg_id = ' || new_pg_id;
				raise notice 'insert into pg partition table done';

				delete from global.tb_pg_product_default where pg_id = new_pg_id;
				raise notice 'delete from tb_pg_product_default done';

				perform global.fn_refresh_materialized_view('global', 'mvw_pg_hierarchy_agg_data');
				end_time := clock_timestamp();
				raise notice 'time taken to attach partition table and refresh materialized view: %',end_time - start_time;
            else
            	raise notice 'pg not used in any strategy/promo updating';
            	update global.tb_product_group set pg_name = new_pg_name, description = product_group_description, products_count = pg_products_count, updated_by = user_id, updated_at = timezone(client_timezone, now()) where pg_id = edit_pg_id;

                raise notice 'Product Group ID, pg not used in any strategy/promo: %', edit_pg_id;
				delete from global.tb_pg_hierarchy where pg_id = edit_pg_id;
				delete from global.tb_pg_product where pg_id = edit_pg_id;

                -- hierarchy combination sub query
                _insert_pg_hierarchy_sub_query := 'insert into global.tb_pg_hierarchy (pg_id, hierarchy_level, hierarchy_value, is_temporary)
			            select ' || edit_pg_id || ' as pg_id,
			                dd.hierarchy_level,
			                dd.hierarchy_value,
			                dd.is_temporary
			            from
			                ( ' || pg_sub_query || ' )dd';

			    -- product ids insert query
			    if pg_grouping_type = 0 then
			        _insert_pg_product_query := format('insert into global.tb_pg_product (pg_id, product_id)
												select %s as pg_id,
													cast(dd1.product_id as bigint)
												from ( select unnest(ARRAY[%s]::INTEGER[]) product_id ) dd1',
			      								edit_pg_id,array_to_string(product_ids, ','));
			    else
			        _insert_pg_product_query := 'insert into global.tb_pg_product (pg_id, product_id)
										        select ' || edit_pg_id || ' as pg_id,
										            dd1.product_id
										        from
										            ( ' || get_product_ids_query || ' )dd1';
			    end if;
                execute _insert_pg_product_query;
                execute _insert_pg_hierarchy_sub_query;

				perform price_markdown.fn_update_product_group_products_count(edit_pg_id);
                perform global.fn_refresh_materialized_view('global', 'mvw_pg_hierarchy_agg_data');
                raise notice 'insert into product tables and refresh materialized view done for pg id : %', edit_pg_id;
            end if;
        else
        	-- in case of pg_name/description change
	        if current_product_group.pg_name != product_group_name
	        	or current_product_group.description != product_group_description then
	            update global.tb_product_group set pg_name = product_group_name,
	            		description = product_group_description, updated_by = user_id, updated_at = timezone(client_timezone, now())
	            where pg_id = edit_pg_id;
	            raise notice 'update product group name/description';
	        end if;
	    raise notice 'nothing changed';
        end if;
        return return_pg_id;
    end;
$function$
;
