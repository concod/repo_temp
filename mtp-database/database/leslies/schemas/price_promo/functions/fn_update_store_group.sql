--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_update_store_group runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: fn_update_store_group

drop function if exists price_promo.fn_update_store_group;
CREATE OR REPLACE FUNCTION price_promo.fn_update_store_group(edit_sg_id integer, store_group_name text, store_group_description text, user_id integer, sg_sub_query text, store_ids integer[], selected_strategies integer[], selected_promos integer[], client_timezone text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
	declare
    current_store_group global.tb_store_group%ROWTYPE;
    strategy_record price_markdown.tb_strategy_master%ROWTYPE;
    return_sg_id integer := edit_sg_id;
    new_sg_id integer;
    new_sg_name varchar := store_group_name;
    base_name varchar := store_group_name;
    version_suffix text;
    existing_version integer;
    updated_sg_name varchar;
    p_strategy_id integer;
    p_promo_id integer;
    strategy_sg_ids integer[] DEFAULT ARRAY[]::integer[];
    sg_updated_stores integer[] DEFAULT ARRAY[]::integer[];
    _insert_sg_store_query text;
    _insert_sg_hierarchy_sub_query text;
    _insert_promo_store_sg_hierarchy_sub_query text;
    edit_strategy_result integer;
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    _product_ids int[];
   	_store_ids int[];
    hierarchy_key TEXT;
    cfg JSONB;
    case_level_name TEXT := 'Case ';
    case_value_name TEXT := 'Case ';
    join_condition TEXT := '';
    _store_hierarchies_config jsonb;
    begin
        select config_value::jsonb into _store_hierarchies_config
        from price_promo.tb_tool_configurations
        where module = 'store' and config_name = 'hierarchy_filters';

	    raise notice 'update store group started for the SG ID: %',edit_sg_id;
        start_time := clock_timestamp();
        drop table if exists tmp_store_ids_diff;
        create temp table tmp_store_ids_diff on commit drop as (
                select
                    tsi.store_id as tsi_store_id,
                    tps.store_id as tps_store_id
                from (select unnest(store_ids) as store_id) tsi
                full outer join (
                    select
                        distinct store_id
                    from global.tb_sg_store tps
                        where sg_id = edit_sg_id
                    ) tps on
                    tsi.store_id = tps.store_id
                where
                    tsi.store_id is null
                    or tps.store_id is null
            );
        end_time := clock_timestamp();
	    raise notice 'sg stores difference check done time taken %',end_time - start_time;
        -- Current edit store group id details
        select * into current_store_group from global.tb_store_group where sg_id = edit_sg_id;
        if exists (select 1 from tmp_store_ids_diff) then
            -- Check if the store group ID is present in tb_strategy_store_groups
			if array_length(selected_strategies,1) > 0 or array_length(selected_promos,1) > 0
				or exists (select 1 from price_markdown.tb_strategy_store_groups where store_group_id = edit_sg_id)
				or exists (select 1 from price_promo.tb_promo_store_groups where store_group_id = edit_sg_id) then
                start_time := clock_timestamp();
                if exists (select 1 from price_markdown.tb_strategy_store_groups where store_group_id = edit_sg_id and strategy_id not in (select unnest(selected_strategies)))
                    or exists (select 1 from price_markdown.tb_strategy_master where strategy_id = any(selected_strategies) and status = 3)
					or exists (select 1 from price_promo.tb_promo_store_groups where store_group_id = edit_sg_id and promo_id not in (select unnest(selected_promos))) then
                    -- Create the Versioned Name
                    raise notice 'store_group_name check same: %',store_group_name;
                    raise notice 'sg_name check same: %',current_store_group.sg_name;
                    if store_group_name = current_store_group.sg_name then
                        raise notice 'store_group_name and current sg name same: %',store_group_name;
                        if store_group_name ~ '_old(\d+)$' then
                            base_name := REGEXP_REPLACE(store_group_name, '_old(\d+)$', '');
                        end if;
                        select coalesce(max(substring(sg_name from '_old(\d+)$')::int), 0) into existing_version
                        from global.tb_store_group
                        where sg_name ~ ('^' || base_name || '_old(\d+)$')
                        and is_deleted = 0;
                        version_suffix := '_old' || (existing_version + 1);
                        updated_sg_name := base_name || version_suffix;
                        -- Update the current store group name to the versioned name
                        update global.tb_store_group
                        set sg_name = updated_sg_name, updated_by = user_id, updated_at = timezone(client_timezone, now())
                        where sg_id = edit_sg_id;
                    else
                        update global.tb_store_group
                        set updated_by = user_id, updated_at = timezone(client_timezone, now())
                        where sg_id = edit_sg_id;
                    end if;
                else
                    update global.tb_store_group
                    set is_deleted = 1, updated_by = user_id, updated_at = timezone(client_timezone, now())
                    where sg_id = edit_sg_id;
                end if;
                -- Insert basic Store Group Info.
                insert into global.tb_store_group (sg_name, description, created_by, created_at, stores_count, updated_by, updated_at)
                values (new_sg_name, store_group_description, current_store_group.created_by, current_store_group.created_at, array_length(store_ids,1), user_id, timezone(client_timezone, now())) returning sg_id into new_sg_id;
				raise notice 'New Store Group ID, strategy/promo use: %', new_sg_id;

                -- 1. Create partition first
                call global.pc_create_partition_for_pgs_or_sgs('tb_sg_store', new_sg_id);
				raise notice 'sg partition table create done';

               -- store ids insert query
                _insert_sg_store_query := format('insert into global.tb_sg_store (sg_id, store_id)
                                            select %s as sg_id,
                                                cast(dd1.store_id as INTEGER)
                                            from ( select unnest(ARRAY[%s]::INTEGER[]) store_id ) dd1',
                                            new_sg_id,array_to_string(store_ids, ','));
               -- hierarchy combination sub query
                _insert_sg_hierarchy_sub_query := 'insert into global.tb_sg_hierarchy (sg_id, hierarchy_level, hierarchy_value)
                                                select ' || new_sg_id || ' as sg_id,
                                                    dd.hierarchy_level,
                                                    dd.hierarchy_value
                                                from
			                                    ( ' || sg_sub_query || ' )dd';
                execute _insert_sg_store_query;
                execute _insert_sg_hierarchy_sub_query;
               	select array(select distinct store_id from global.tb_sg_store where sg_id = new_sg_id) into sg_updated_stores;
                raise notice 'startegy/promo insert into store tables done for sg id : %', new_sg_id;
                return_sg_id := new_sg_id;
                end_time := clock_timestamp();
                raise notice 'time taken to create version sg: %',end_time - start_time;
				-- updating effected strategies
				if array_length(selected_strategies,1) > 0 then
                    start_time := clock_timestamp();
                    for p_strategy_id in select unnest(selected_strategies) as selected_strategies_id
                    loop
                        -- updating sg ids
                        select * into strategy_sg_ids from ( with strategy_sg_ids as
                                    ( select array_agg(store_group_id) as ids
                                    from price_markdown.tb_strategy_store_groups where strategy_id = p_strategy_id)
	                    select array_remove(array_append(ids, new_sg_id), edit_sg_id) as ssg_ids from strategy_sg_ids) as a;
	                    raise notice 'updated strategy sg ids: %', strategy_sg_ids;
	                    raise notice 'strategy edit started for strategy id: %', p_strategy_id;
	                    select * into strategy_record from price_markdown.tb_strategy_master where strategy_id = p_strategy_id;

	                    -- If the sg edit causes allow_only_with_inv flag conflict then skipping the effected strategy edit.
	                    IF strategy_record.allow_only_with_inv THEN
						    _product_ids := ARRAY(
						        SELECT DISTINCT product_id 
						        FROM price_markdown.tb_strategy_sku_store_mapping 
						        WHERE strategy_id = p_strategy_id
						    );
						
						    _store_ids := ARRAY(
						        SELECT DISTINCT store_id 
						        FROM global.tb_sg_store 
						        WHERE sg_id = ANY(strategy_sg_ids)
						    );
						
						    IF NOT price_markdown.fn_check_inventory_availability(_product_ids, _store_ids) THEN
						        RAISE NOTICE 'Inventory is not greater than zero, skipping edit for strategy id: %', p_strategy_id;
						        CONTINUE;
						    END IF;
						END IF;

	                    edit_strategy_result = price_markdown.fn_v3_edit_strategy_step_1(
	                        p_strategy_id,
	                        array(select distinct product_id from price_markdown.tb_strategy_sku_store_mapping where strategy_id = p_strategy_id),
                            array(select distinct store_id from global.tb_sg_store where sg_id = any(strategy_sg_ids)),
	                        true,
	                        null::jsonb,
	                        null::jsonb,
	                        strategy_record.configured_by_sku_store_mapping,
	                        array(select distinct product_group_id from price_markdown.tb_strategy_product_groups where strategy_id = p_strategy_id),
                            strategy_sg_ids,
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
	                    -- updating promo & sg combination
						update price_promo.tb_promo_store_groups set store_group_id = new_sg_id, store_group_name = new_sg_name
						where promo_id = p_promo_id and store_group_id = edit_sg_id;
						raise notice 'updating promo & sg combination %',p_promo_id;
						-- deleting edit store group id and insert the hierarchies with new sg id
						delete from price_promo.promo_store_sg_hierarchy
						where  promo_id = p_promo_id and store_group_id = edit_sg_id;
						raise notice 'deleting edit store group id and insert the hierarchies with new sg id %',p_promo_id;

                        -- forming dynamic store hierarchies for _insert_promo_store_sg_hierarchy_sub_query
                        FOR hierarchy_key, cfg IN SELECT * FROM jsonb_each(_store_hierarchies_config)
                        LOOP
                            IF cfg ? 'id' AND cfg->>'id' IS NOT NULL THEN
                                case_level_name := case_level_name || format(
                                    'WHEN tsh.hierarchy_level = %s THEN %L ',
                                    cfg->>'id',
                                    COALESCE(cfg->>'label', hierarchy_key)
                                );
                                case_value_name := case_value_name || format(
                                    'WHEN tsh.hierarchy_level = %s THEN tsm.%I ',
                                    cfg->>'id',
                                    cfg->>'value_column'
                                );
                                join_condition := join_condition || format(
                                    '(tsh.hierarchy_level = %s AND tsh.hierarchy_value = tsm.%I) OR ',
                                    cfg->>'id',
                                    cfg->>'id_column'
                                );
                            END IF;
                        END LOOP;
                        -- Trim trailing ' OR '
                        join_condition := left(join_condition, length(join_condition) - 4);

						_insert_promo_store_sg_hierarchy_sub_query := format('INSERT INTO price_promo.promo_store_sg_hierarchy (
                            promo_id,
                            store_group_id,
                            store_group_name,
                            hierarchy_level_id,
                            hierarchy_level_name,
                            hierarchy_value_id,
                            hierarchy_value_name
                        )
                        SELECT DISTINCT
                            %1$s AS promo_id,
                            %2$s AS store_group_id,
                            tsg.sg_name AS store_group_name,
                            tsh.hierarchy_level AS hierarchy_level_id,
                            %3$s END AS hierarchy_level_name,
                            tsh.hierarchy_value AS hierarchy_value_id,
                            %4$s END AS hierarchy_value_name
                        FROM
                            global.tb_sg_hierarchy tsh
                        LEFT JOIN global.tb_store_group tsg ON tsh.sg_id = tsg.sg_id
                        LEFT JOIN
                            global.tb_store_master tsm
                        ON
                            %5$s
                        WHERE
                            tsh.sg_id = %2$s;', p_promo_id, new_sg_id, case_level_name, case_value_name, join_condition);
                        
                        execute _insert_promo_store_sg_hierarchy_sub_query;
                        raise notice '_insert_promo_store_sg_hierarchy_sub_query successfully run ';

			            drop table if exists tmp_delete_store_ids;
			            drop table if exists tmp_new_store_ids;
			            create temp table tmp_delete_store_ids on commit drop as (
				       			select ps.store_id
				       			from price_promo.promo_store as ps
				       			where ps.promo_id = p_promo_id
				       				and ps.store_id not in (select store_id from unnest(sg_updated_stores) store_id)
				        );
				        create temp table tmp_new_store_ids on commit drop as (
				       			select p_promo_id,
				       				st.store_id,
				       				tsm.store_name
				       			from (select unnest(sg_updated_stores) as store_id) st
				       			left join price_promo.promo_store as ps on ps.store_id = st.store_id
				       			join global.tb_store_master as tsm on tsm.store_id = st.store_id
				       			where ps.promo_id = p_promo_id
				       			and ps.store_id is null
				        );
				        raise notice 'promo_hierarchy insert hierarchy %',p_promo_id;
				        -- delete and insert the promo & store combination
				        delete from price_promo.promo_store
				        where promo_id = p_promo_id
				        and store_id in (select store_id from tmp_delete_store_ids);
				        insert into price_promo.promo_store (promo_id, store_id, store_name)
				        select * from tmp_new_store_ids;
				        raise notice 'delete and insert in promo store %',p_promo_id;
				        -- updating step count to 1, status to 0 and store count
                        update price_promo.promo_master
                        set step_count = case when price_promo.ps_rules.discount_level != -200 then 1 else price_promo.promo_master.step_count end,
                            status = 0,
                            stores_count = (select count(store_id) from unnest(sg_updated_stores) as store_id)
                        from price_promo.ps_rules
                        where price_promo.promo_master.promo_id = p_promo_id;
				       raise notice 'step_count update %',p_promo_id;
					end loop;
                    perform price_promo.fn_delete_promo_metrics_and_update_status(selected_promos);
                    end_time := clock_timestamp();
					raise notice 'time taken to update effected promos: %',end_time - start_time;
				end if;
                -- creating partition table and attaching to global.tb_sg_store
				start_time := clock_timestamp();
				
				execute 'INSERT INTO global.tb_sg_store_' || new_sg_id::text || ' SELECT * FROM global.tb_sg_store_default WHERE sg_id = ' || new_sg_id;
				raise notice 'insert into sg partition table done';
				delete from global.tb_sg_store_default where sg_id = new_sg_id;
				raise notice 'delete from tb_sg_store_default done';
                perform global.fn_refresh_materialized_view('global', 'mvw_sg_hierarchy_agg_data');
				end_time := clock_timestamp();
				raise notice 'time taken to re create partition table : %',end_time - start_time;
            else
            	raise notice 'sg not used in any strategy/promo updating';
            	update global.tb_store_group set sg_name = new_sg_name, description = store_group_description, stores_count = array_length(store_ids,1), updated_by = user_id, updated_at = timezone(client_timezone, now())
            	where sg_id = edit_sg_id;
                delete from global.tb_sg_store where sg_id = edit_sg_id;
				delete from global.tb_sg_hierarchy where sg_id = edit_sg_id;
               -- store ids insert query
                _insert_sg_store_query := format('insert into global.tb_sg_store (sg_id, store_id)
                                            select %s as sg_id,
                                                cast(dd1.store_id as INTEGER)
                                            from ( select unnest(ARRAY[%s]::INTEGER[]) store_id ) dd1',
                                            edit_sg_id,array_to_string(store_ids, ','));
               -- hierarchy combination sub query
                _insert_sg_hierarchy_sub_query := 'insert into global.tb_sg_hierarchy (sg_id, hierarchy_level, hierarchy_value)
                                                select ' || edit_sg_id || ' as sg_id,
                                                    dd.hierarchy_level,
                                                    dd.hierarchy_value
                                                from
			                                    ( ' || sg_sub_query || ' )dd';
                execute _insert_sg_store_query;
                execute _insert_sg_hierarchy_sub_query;
                raise notice 'insert into store tables for sg id : %', edit_sg_id;
            end if;
        else
        	-- in case of sg_name/description change
	        if current_store_group.sg_name != store_group_name
	        	or current_store_group.description != store_group_description then
                raise notice 'update store group name/description';
	            update global.tb_store_group set sg_name = store_group_name,
	            		description = store_group_description, updated_by = user_id, updated_at = timezone(client_timezone, now())
	            where sg_id = edit_sg_id;
	        end if;
	    raise notice 'nothing changed';
        end if;
        return return_sg_id;
    end;
$function$
;