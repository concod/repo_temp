--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_generate_execution_metadata_product_group_data_5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: lifecycle indicator logic change w.r.t PG - clearing temp variables

DROP FUNCTION if exists price_promo.fn_generate_execution_metadata_product_group_data;

CREATE OR REPLACE FUNCTION price_promo.fn_generate_execution_metadata_product_group_data(p_promo_ids integer[])
RETURNS integer[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
    query text;
    in_query text;
    ex_query text;
    p_id int;
    inclusion_type int;
    exclusion_type int;
    in_pg_code text;
    ex_pg_code text;
    hierarchy_levels int[];

    insert_arr text[];
    select_arr text[];
    where_arr text[];
    group_by_arr text[];
    action_val text;

    promo_pg_id int;
    promo_pg_type int;
    combination_id int;

    insert_id_list int[];
    temp_id_list int[];
begin
--  truncate price_promo.so5_integration_product_group_details;

    if array_length(p_promo_ids, 1) > 0 then
        foreach p_id in array p_promo_ids loop
            insert_arr = array[]::text[];
            select_arr = array[]::text[];
	        where_arr = array[]::text[];
	        group_by_arr = array[]::text[];

            temp_id_list = array[]::integer[];
            in_pg_code = format('INC%1$s', p_id);
            ex_pg_code = format('EXC%1$s', p_id);
            raise notice 'Inc PG - %     Exc PG - %', in_pg_code, ex_pg_code;

            in_query = format('select product_selection_type, exclusion_selection_type, case when last_exmd_synced_time is null then ''ADD'' else ''MOD'' end as action from price_promo.promo_master pm where promo_id = %1$s', p_id);
            raise notice 'Q0 - %', in_query;
            execute in_query into inclusion_type, exclusion_type, action_val;
            raise notice ' % -- %', inclusion_type, exclusion_type;

            in_query = null::text;
            raise notice 'INCLUSION DATA.....!!!!';

            -- sitewide inc
            if inclusion_type = 1 then
                raise notice 'Sitewide inclusion for promo %', p_id;
--                in_query = format('
--                            insert into price_promo.so5_integration_product_group_details
--                                (product_group_id, name, action, is_excluded, promo_id)
--                            select ''40569'' as product_group_id, ''40569'' as name, %2$L as action, false as is_excluded, %1$s
--                        ', p_id, action_val);
--                raise notice 'IN Q1 - %', in_query;
--              execute in_query;

            -- hierarchy inclusion selection
            elsif inclusion_type = 2 then
                raise notice 'Hierarchy selection inclusion for promo %', p_id;
                select array_agg(distinct hierarchy_level_id) into hierarchy_levels from price_promo.included_product_hierarchy where promo_id = p_id;
                raise notice 'hierarchy levels - % ',hierarchy_levels;

                if 2 = any(hierarchy_levels::integer[]) then
                    insert_arr = array_append(insert_arr, 'department');
                    select_arr = array_append(select_arr, 'l2_id as department');
                    where_arr = array_append(where_arr, 'l2_cid in (select unnest(hierarchy_ids) from h_cte where hierarchy_level_id = 2)');
                    group_by_arr = array_append(group_by_arr, 'l2_id');
                end if;

                if 3 = any(hierarchy_levels::integer[]) then
                    insert_arr = array_append(insert_arr, 'class');
                    select_arr = array_append(select_arr, 'l3_id as class');
                    where_arr = array_append(where_arr, 'l3_cid in (select unnest(hierarchy_ids) from h_cte where hierarchy_level_id = 3)');
                    group_by_arr = array_append(group_by_arr, 'l3_id');
                end if;

                if -1 = any(hierarchy_levels::integer[]) then
                    insert_arr = array_append(insert_arr, 'mfg');
                    select_arr = array_append(select_arr, 'mfg_no as mfg');
                    where_arr = array_append(where_arr, 'brand_cid in (select unnest(hierarchy_ids) from h_cte where hierarchy_level_id = -1)');
                    group_by_arr = array_append(group_by_arr, 'mfg_no');
                end if;

                in_query = format('
                            insert into price_promo.so5_integration_product_group_details
                                (product_group_id, name, %5$s, action, is_excluded, promo_id)
                            with h_cte as (
                                select promo_id, hierarchy_level_id, array_agg(hierarchy_value_id) as hierarchy_ids
                                from price_promo.included_product_hierarchy
                                where promo_id = %1$s
                                group by 1,2
                            )
                            select %7$L as product_group_id, %7$L as name, %2$s, %6$L as action, false as is_excluded, %1$s
                            from price_promo.tb_product_hierarchy_combination A
                            where
                                %3$s
                            group by %4$s
                        ', p_id, array_to_string(select_arr, ', '), array_to_string(where_arr, ' and '), array_to_string(group_by_arr, ', '), array_to_string(insert_arr, ', '), action_val, in_pg_code);
                raise notice 'IN Q2 - %', in_query;
--              execute in_query;

            -- Whole category Product group inclusion
            elsif inclusion_type = 3 then
                raise notice 'PG selection inclusion for promo %', p_id;

               	in_query = format('
                            drop table if exists unique_product_group_hierarchy_combination_%1$s;
                            drop table if exists unique_pg_products_%1$s;
                            create temp table unique_product_group_hierarchy_combination_%1$s (promo_id int, department varchar, class varchar, mfg varchar);
                            create temp table unique_pg_products_%1$s (promo_id int, department varchar, svs varchar);
                        ', p_id);
                raise notice 'Temp table query - %', in_query;
                execute in_query;

               	for promo_pg_id, promo_pg_type in (select pg_id, pg_grouping_type from pricesmart.tb_product_group where pg_id in (select product_group_id from price_promo.included_promo_product_groups where promo_id = p_id)) loop
                    raise notice 'Saving values for pg - %   with type % ', promo_pg_id, promo_pg_type;

                    -- Whole category PG in exclusion
                    if promo_pg_type = 1 then

                        raise notice 'Hierarchy selection inclusion for promo %', p_id;
		                select array_agg(distinct hierarchy_level) into hierarchy_levels from pricesmart.tb_pg_hierarchy tph where pg_id = promo_pg_id and is_temporary = 0;
		                raise notice 'hierarchy levels - % ',hierarchy_levels;


                    	insert_arr = array[]::text[];
	                    select_arr = array[]::text[];
	                    where_arr = array[]::text[];
	                    group_by_arr = array[]::text[];

	                    if 2 = any(hierarchy_levels::integer[]) then
	                        raise notice 'department';
	                        insert_arr = array_append(insert_arr, 'department');
	                        select_arr = array_append(select_arr, 'l2_id as department');
	                        where_arr = array_append(where_arr, 'l2_cid in (select unnest(hierarchy_ids) from h_cte where hierarchy_level_id = 2)');
	                        group_by_arr = array_append(group_by_arr, 'l2_id');
	                    end if;

	                    if 3 = any(hierarchy_levels::integer[]) then
	                        raise notice 'class';
	                        insert_arr = array['department', 'class']::text[];
	                        select_arr = array['l2_id as department', 'l3_id as class']::text[];
	                        where_arr = array_append(where_arr, 'l3_cid in (select unnest(hierarchy_ids) from h_cte where hierarchy_level_id = 3)');
	                        group_by_arr = array['l2_id', 'l3_id']::text[];
	                    end if;

	                    if (-1 = any(hierarchy_levels::integer[])) or (-2 = any(hierarchy_levels::integer[])) then
	                        raise notice 'brand/mfg';
	                        if -1 = any(hierarchy_levels::integer[]) AND (2 = ANY(hierarchy_levels::integer[]) OR 3 = ANY(hierarchy_levels::integer[])) then  -- check if dept or class is already present. if present then append the values else overwrite the values
	                            insert_arr = array_append(insert_arr, 'mfg');
	                            select_arr = array_append(select_arr, 'mfg_no as mfg');
	                            where_arr = array_append(where_arr, 'brand_cid in (select unnest(hierarchy_ids) from h_cte where hierarchy_level_id = -1)');
	                            group_by_arr = array_append(group_by_arr, 'mfg_no');
	                        elsif -1 = any(hierarchy_levels::integer[]) then
	                            insert_arr = array['department', 'mfg']::text[];
	                            select_arr = array['l2_id as department', 'mfg_no as mfg']::text[];
	                            where_arr = array_append(where_arr, 'brand_cid in (select unnest(hierarchy_ids) from h_cte where hierarchy_level_id = -1)');
	                            group_by_arr = array['l2_id', 'mfg_no']::text[];
							elsif -2 = any(hierarchy_levels::integer[]) AND (2 = ANY(hierarchy_levels::integer[]) OR 3 = ANY(hierarchy_levels::integer[])) then
								raise notice 'life cycle with dept/class in inc';
							else  -- hierarchy level = -2 (life cycle indicator)
								insert_arr = array['department']::text[];
	                            select_arr = array['l2_id as department']::text[];
--	                            where_arr = array_append(where_arr, 'brand_cid in (select unnest(hierarchy_ids) from h_cte where hierarchy_level_id = -2)');
	                            group_by_arr = array['l2_id']::text[];
	                        end if;
	                    end if;

	                    -- if the select_arr is still empty, then it means that the PG was created with a different hierarchy level. So fetch all the dept values for those hierarchies
	                    raise notice 'select arr - %      count - %', array_to_string(select_arr, ', '), array_length(select_arr, 1);
	                    if array_length(select_arr, 1) is null then
	                        raise notice 'others';
	                        if 4 = any(hierarchy_levels::integer[]) then
	                            raise notice 'subclass';
	                            insert_arr = insert_arr || array['department', 'class']::text[];
	                            select_arr = select_arr || array['l2_id as department', 'l3_id as class']::text[];
	                            where_arr = array_append(where_arr, 'l4_cid in (select unnest(hierarchy_ids) from h_cte where hierarchy_level_id = 4)');
	                            group_by_arr = group_by_arr ||  array['l2_id', 'l3_id']::text[];
	                        else
	                            raise notice 'div / group';
	                            insert_arr = array_append(insert_arr, 'department');
	                            select_arr = array_append(select_arr, 'l2_id as department');
	                            group_by_arr = array_append(group_by_arr, 'l2_id');

	                             if 0 = any(hierarchy_levels::integer[]) then
	                                where_arr = array_append(where_arr, 'l0_cid in (select unnest(hierarchy_ids) from h_cte where hierarchy_level_id = 0)');
	                             end if;
	                             if 1 = any(hierarchy_levels::integer[]) then
	                                where_arr = array_append(where_arr, 'l1_cid in (select unnest(hierarchy_ids) from h_cte where hierarchy_level_id = 1)');
	                             end if;
	                        end if;
	                    end if;

	                    in_query = format('
	                                insert into unique_product_group_hierarchy_combination_%1$s (promo_id, %5$s)
	                                with h_cte as (
	                                    select %1$s as promo_id, hierarchy_level as hierarchy_level_id, array_agg(hierarchy_value) as hierarchy_ids
	                                    from pricesmart.tb_pg_hierarchy
	                                    where pg_id = %6$s and is_temporary = 0
	                                    group by 1,2
	                                )
	                                select %1$s as promo_id, %2$s
	                                from price_promo.tb_product_hierarchy_combination A
	                                where
	                                    %3$s
	                                group by %4$s
	                            ', p_id, array_to_string(select_arr, ', '), array_to_string(where_arr, ' and '), array_to_string(group_by_arr, ', '), array_to_string(insert_arr, ', '), promo_pg_id);

	                    raise notice 'IN Sub Q3 W- %', in_query;
	                    execute in_query;

                    -- Specific product PG in inclusion
                    else
                        raise notice 'Specific product PG in inclusion - %', promo_pg_id;
                        in_query = format('
                                    insert into unique_pg_products_%1$s
                                        (promo_id, department, svs)
                                    select
                                        %1$s as promo_id, B.l2_id as department, B.l5_id as svs
                                    from
                                        pricesmart.tb_pg_product_%2$s A,
                                        price_promo.product_master B
                                    where
                                        A.product_id = B.product_id
                                    group by
                                        B.l2_id, B.l5_id
                                ', p_id, promo_pg_id);
                        raise notice 'IN Sub Q3 S- %', in_query;
                        execute in_query;
                    end if;
                end loop;

                in_query = format('
                            insert into price_promo.so5_integration_product_group_details
                                (product_group_id, name, department, class, mfg, svs, action, is_excluded, promo_id)
                            select
                                %1$L, %1$L, department, class, mfg, svs, %2$L, true as is_excluded, %3$s
                            from (
                                select department, class, mfg, null as svs from unique_product_group_hierarchy_combination_%3$s
                                union
                                select department, null as class, null as mfg, svs from unique_pg_products_%3$s
                            ) C
                            group by
                                department, class, mfg, svs
                        ', in_pg_code, action_val, p_id);
                raise notice 'IN Q3 - %', in_query;

            -- Specific products inclusion
            elsif inclusion_type in (4,5,6) then
                raise notice 'Specific products inclusion for promo %', p_id;
                in_query = format('
                            insert into price_promo.so5_integration_product_group_details
                                (product_group_id, name, department, svs, action, is_excluded, promo_id)
                            select
                                %2$L as product_group_id, %2$L as name, B.l2_id as department, B.l5_id as svs, %3$L as action, false as is_excluded, %1$s
                            from
                                price_promo.included_products_%1$s A,
                                price_promo.product_master B
                            where
                                A.product_id = B.product_id
                            group by
                                B.l2_id, B.l5_id
                        ', p_id, in_pg_code, action_val);
                raise notice 'IN Q4 - %', in_query;
--              execute in_query;

            end if;


           raise notice 'inquery ---  %', in_query;

            -- Ensure in_query is a valid insert query
            if in_query is not null or in_query <> '' then
            	raise notice 'inside if';
	            query = format('
	                WITH ins AS (
	                    %s
	                    RETURNING id
	                )
	                SELECT array_agg(id) AS inserted_ids FROM ins', in_query);

	               raise notice 'query -  %', query;
	            -- Execute the query into temp_id_list
	            EXECUTE query INTO temp_id_list;

	            -- Append the result of temp_id_list to insert_id_list
	            insert_id_list := insert_id_list || temp_id_list;

	            -- Output notice for debugging
	            RAISE NOTICE 'temp id list - %', array_to_string(temp_id_list, ', ');
	            RAISE NOTICE 'insert id list - %', array_to_string(insert_id_list, ', ');
            else
           		raise notice 'Site inclusion not inserting into table';
            end if;

--            query = format('
--                    WITH ins AS (
--                        %s
--                        RETURNING id
--                    )
--                    SELECT array_agg(id) AS inserted_ids FROM ins', in_query);
--
--             raise notice 'query -  %', query;
--              -- Execute the query into temp_id_list
--              EXECUTE query INTO temp_id_list;
--
--              -- Append the result of temp_id_list to insert_id_list
--              insert_id_list := insert_id_list || temp_id_list;
--
--              -- Output notice for debugging
--              RAISE NOTICE 'temp id list - %', array_to_string(temp_id_list, ', ');
--              RAISE NOTICE 'insert id list - %', array_to_string(insert_id_list, ', ');


            raise notice 'EXCLUSION DATA.....!!!!';

            ex_query = format('select case when count(*) = 0 then ''ADD'' else ''MOD'' end as action from price_promo.so5_integration_product_group_details where promo_id = %1$s and product_group_id = %2$L', p_id, ex_pg_code);
            raise notice 'Q0 - %', ex_query;
            execute ex_query into action_val;
            raise notice 'action val for exclusion - %', action_val;

            ex_query = NULL::TEXT;
            insert_arr = array[]::text[];
            select_arr = array[]::text[];
            where_arr = array[]::text[];
            group_by_arr = array[]::text[];

            -- No exclusion added
            if exclusion_type is null then
                raise notice 'No Exclusion added';

            -- hierarchy exclusion
            elsif exclusion_type = 1 then
                raise notice 'Hierarchy selection exclusion for promo %', p_id;
                select array_agg(distinct hierarchy_level_id) into hierarchy_levels from price_promo.excluded_hierarchy_combination where promo_id = p_id;
                raise notice 'hierarchy levels - % ',hierarchy_levels;

                raise notice 'Before insert_arr - %', insert_arr;

                if 2 = any(hierarchy_levels::integer[]) then
                    insert_arr = array_append(insert_arr, 'department');
                    select_arr = array_append(select_arr, 'l2_id as department');
                    where_arr = array_append(where_arr, 'l2_cid in (select unnest(hierarchy_ids) from h_cte where hierarchy_level_id = 2)');
                    group_by_arr = array_append(group_by_arr, 'l2_id');
                end if;

                if 3 = any(hierarchy_levels::integer[]) then
                    insert_arr = array_append(insert_arr, 'class');
                    select_arr = array_append(select_arr, 'l3_id as class');
                    where_arr = array_append(where_arr, 'l3_cid in (select unnest(hierarchy_ids) from h_cte where hierarchy_level_id = 3)');
                    group_by_arr = array_append(group_by_arr, 'l3_id');
                end if;

                if -1 = any(hierarchy_levels::integer[]) then
                    insert_arr = array_append(insert_arr, 'mfg');
                    select_arr = array_append(select_arr, 'mfg_no as mfg');
                    where_arr = array_append(where_arr, 'brand_cid in (select unnest(hierarchy_ids) from h_cte where hierarchy_level_id = -1)');
                    group_by_arr = array_append(group_by_arr, 'mfg_no');
                end if;

                raise notice 'After insert_arr - %', insert_arr;

                ex_query = format('
                            insert into price_promo.so5_integration_product_group_details
                                (product_group_id, name, %5$s, action, is_excluded, promo_id)
                            with h_cte as (
                                select promo_id, hierarchy_level_id, array_agg(hierarchy_cid) as hierarchy_ids
                                from price_promo.excluded_hierarchy_combination
                                where promo_id = %1$s
                                group by 1,2
                            )
                            select %7$L as product_group_id, %7$L as name, %2$s, %6$L as action, true as is_excluded, %1$s
                            from price_promo.tb_product_hierarchy_combination A
                            where
                                %3$s
                            group by %4$s
                        ', p_id, array_to_string(select_arr, ', '), array_to_string(where_arr, ' and '), array_to_string(group_by_arr, ', '), array_to_string(insert_arr, ', '), action_val, ex_pg_code);
                raise notice 'EX Q1 - %', ex_query;
--              execute ex_query;

            -- Copy Paste products exclusion
            elsif exclusion_type = 2 then
                raise notice 'Specific products/Copy Paste Products Exclusion for promo %', p_id;
                ex_query = format('
                            insert into price_promo.so5_integration_product_group_details
                                (product_group_id, name, department, svs, action, is_excluded, promo_id)
                            select
                                %2$L as product_group_id, %2$L as name, B.l2_id as department, B.l5_id as svs, %3$L as action, true as is_excluded, %1$s
                            from
                                price_promo.excluded_products_%1$s A,
                                price_promo.product_master B
                            where
                                A.product_cid = B.product_id
                            group by
                                B.l2_id, B.l5_id
                        ', p_id, ex_pg_code, action_val);
                raise notice 'EX Q2 - %', ex_query;
--              execute ex_query;

            -- Product Group exclusion
            elsif exclusion_type = 3 then
                raise notice 'Product Group selection exclusion for promo %', p_id;

                ex_query = format('
                            drop table if exists unique_product_group_hierarchy_combination_%1$s;
                            drop table if exists unique_pg_products_%1$s;
                            create temp table unique_product_group_hierarchy_combination_%1$s (promo_id int, department varchar, class varchar, mfg varchar);
                            create temp table unique_pg_products_%1$s (promo_id int, department varchar, svs varchar);
                        ', p_id);
                raise notice 'Temp table query - %', ex_query;
                execute ex_query;

                for promo_pg_id, promo_pg_type in (select pg_id, pg_grouping_type from pricesmart.tb_product_group where pg_id in (select pg_id from price_promo.excluded_product_groups epg where promo_id = p_id)) loop
                    raise notice 'Saving values for pg - %   with type % ', promo_pg_id, promo_pg_type;

                    -- Whole category PG in exclusion
                    if promo_pg_type = 1 then
                        raise notice 'Whole category PG in exclusion - %', promo_pg_id;
                        select array_agg(distinct hierarchy_level) into hierarchy_levels from pricesmart.tb_pg_hierarchy tph where pg_id = promo_pg_id and is_temporary = 0;
                        raise notice 'hierarchy levels - % ',hierarchy_levels;

                        insert_arr = array[]::text[];
                        select_arr = array[]::text[];
                        where_arr = array[]::text[];
                        group_by_arr = array[]::text[];

                        if 2 = any(hierarchy_levels::integer[]) then
                            raise notice 'department';
                            insert_arr = array_append(insert_arr, 'department');
                            select_arr = array_append(select_arr, 'l2_id as department');
                            where_arr = array_append(where_arr, 'l2_cid in (select unnest(hierarchy_ids) from h_cte where hierarchy_level_id = 2)');
                            group_by_arr = array_append(group_by_arr, 'l2_id');
                        end if;

                        if 3 = any(hierarchy_levels::integer[]) then
                            raise notice 'class';
                            insert_arr = array['department', 'class']::text[];
                            select_arr = array['l2_id as department', 'l3_id as class']::text[];
                            where_arr = array_append(where_arr, 'l3_cid in (select unnest(hierarchy_ids) from h_cte where hierarchy_level_id = 3)');
                            group_by_arr = array['l2_id', 'l3_id']::text[];
                        end if;

						if -1 = any(hierarchy_levels::integer[]) AND (2 = ANY(hierarchy_levels::integer[]) OR 3 = ANY(hierarchy_levels::integer[])) then  -- check if dept or class is already present. if present then append the values else overwrite the values
                            insert_arr = array_append(insert_arr, 'mfg');
                            select_arr = array_append(select_arr, 'mfg_no as mfg');
                            where_arr = array_append(where_arr, 'brand_cid in (select unnest(hierarchy_ids) from h_cte where hierarchy_level_id = -1)');
                            group_by_arr = array_append(group_by_arr, 'mfg_no');
                        elsif -1 = any(hierarchy_levels::integer[]) then
                            insert_arr = array['department', 'mfg']::text[];
                            select_arr = array['l2_id as department', 'mfg_no as mfg']::text[];
                            where_arr = array_append(where_arr, 'brand_cid in (select unnest(hierarchy_ids) from h_cte where hierarchy_level_id = -1)');
                            group_by_arr = array['l2_id', 'mfg_no']::text[];
						elsif -2 = any(hierarchy_levels::integer[]) AND (2 = ANY(hierarchy_levels::integer[]) OR 3 = ANY(hierarchy_levels::integer[])) then
							raise notice 'life cycle with dept/class in inc';
						else  -- hierarchy level = -2 (life cycle indicator)
							insert_arr = array['department']::text[];
                            select_arr = array['l2_id as department']::text[];
--                            where_arr = array_append(where_arr, 'brand_cid in (select unnest(hierarchy_ids) from h_cte where hierarchy_level_id = -2)');
                            group_by_arr = array['l2_id']::text[];
                        end if;


                        -- if the select_arr is still empty, then it means that the PG was created with a different hierarchy level. So fetch all the dept values for those hierarchies
                        raise notice 'select arr - %      count - %', array_to_string(select_arr, ', '), array_length(select_arr, 1);
                        if array_length(select_arr, 1) is null then
                            raise notice 'others';
                            if 4 = any(hierarchy_levels::integer[]) then
                                raise notice 'subclass';
                                insert_arr = insert_arr || array['department', 'class']::text[];
                                select_arr = select_arr || array['l2_id as department', 'l3_id as class']::text[];
                                where_arr = array_append(where_arr, 'l4_cid in (select unnest(hierarchy_ids) from h_cte where hierarchy_level_id = 4)');
                                group_by_arr = group_by_arr ||  array['l2_id', 'l3_id']::text[];
                            else
                                raise notice 'div / group';
                                insert_arr = array_append(insert_arr, 'department');
                                select_arr = array_append(select_arr, 'l2_id as department');
                                group_by_arr = array_append(group_by_arr, 'l2_id');

                                 if 0 = any(hierarchy_levels::integer[]) then
                                    where_arr = array_append(where_arr, 'l0_cid in (select unnest(hierarchy_ids) from h_cte where hierarchy_level_id = 0)');
                                 end if;
                                 if 1 = any(hierarchy_levels::integer[]) then
                                    where_arr = array_append(where_arr, 'l1_cid in (select unnest(hierarchy_ids) from h_cte where hierarchy_level_id = 1)');
                                 end if;
                            end if;
                        end if;

                        ex_query = format('
                                    insert into unique_product_group_hierarchy_combination_%1$s (promo_id, %5$s)
                                    with h_cte as (
                                        select %1$s as promo_id, hierarchy_level as hierarchy_level_id, array_agg(hierarchy_value) as hierarchy_ids
                                        from pricesmart.tb_pg_hierarchy
                                        where pg_id = %6$s and is_temporary = 0
                                        group by 1,2
                                    )
                                    select %1$s as promo_id, %2$s
                                    from price_promo.tb_product_hierarchy_combination A
                                    where
                                        %3$s
                                    group by %4$s
                                ', p_id, array_to_string(select_arr, ', '), array_to_string(where_arr, ' and '), array_to_string(group_by_arr, ', '), array_to_string(insert_arr, ', '), promo_pg_id);

                        raise notice 'EX Sub Q3 W- %', ex_query;
                        execute ex_query;


                    -- Specific product PG in exclusion
                    else
                        raise notice 'Specific product PG in exclusion - %', promo_pg_id;
                        ex_query = format('
                                    insert into unique_pg_products_%1$s
                                        (promo_id, department, svs)
                                    select
                                        %1$s as promo_id, B.l2_id as department, B.l5_id as svs
                                    from
                                        pricesmart.tb_pg_product_%2$s A,
                                        price_promo.product_master B
                                    where
                                        A.product_id = B.product_id
                                    group by
                                        B.l2_id, B.l5_id
                                ', p_id, promo_pg_id);
                        raise notice 'EX Sub Q3 S- %', ex_query;
                        execute ex_query;

                    end if;
                end loop;
                raise notice 'PG loop done';

                ex_query = format('
                            insert into price_promo.so5_integration_product_group_details
                                (product_group_id, name, department, class, mfg, svs, action, is_excluded, promo_id)
                            select
                                %1$L, %1$L, department, class, mfg, svs, %2$L, true as is_excluded, %3$s
                            from (
                                select department, class, mfg, null as svs from unique_product_group_hierarchy_combination_%3$s
                                union
                                select department, null as class, null as mfg, svs from unique_pg_products_%3$s
                            ) C
                            group by
                                department, class, mfg, svs
                        ', ex_pg_code, action_val, p_id);
                raise notice 'EX Q3 - %', ex_query;
--              execute ex_query;


            -- Excel Upload Exclusion
            elsif exclusion_type = 4 then
                raise notice 'Excel Upload exclusion for promo %', p_id;

                ex_query = format('
                            drop table if exists unique_product_group_hierarchy_combination_%1$s;
                            drop table if exists unique_pg_products_%1$s;
                            create temp table unique_product_group_hierarchy_combination_%1$s (promo_id int, department varchar, class varchar, mfg varchar);
                            create temp table unique_pg_products_%1$s (promo_id int, department varchar, svs varchar);
                        ', p_id);
                raise notice 'Temp table query - %', ex_query;
                execute ex_query;

                for combination_id in (select distinct combination_identifier from price_promo.excluded_hierarchy_combination where promo_id = p_id) loop
                    select array_agg(distinct hierarchy_level_id) into hierarchy_levels from price_promo.excluded_hierarchy_combination where promo_id = p_id and combination_identifier = combination_id;
                    raise notice 'hierarchy levels - % ',hierarchy_levels;

                    if 5 = any(hierarchy_levels::integer[]) then
                        ex_query = format('
                            insert into unique_pg_products_%1$s
                                (promo_id, department, svs)
                            select
                                %1$s, B.l2_id as department, B.l5_id as svs
                            from
                                price_promo.excluded_hierarchy_combination A,
                                price_promo.product_master B
                            where
                                A.hierarchy_cid = B.product_id and
                                A.hierarchy_level_id = 5 and
                                A.combination_identifier = %2$s
                            group by
                                B.l2_id, B.l5_id
                        ', p_id, combination_id);
                        raise notice 'EX Q4- S%', ex_query;
                        execute ex_query;

                    else
                        insert_arr = array[]::text[];
                        select_arr = array[]::text[];
                        where_arr = array[]::text[];
                        group_by_arr = array[]::text[];

                        if 2 = any(hierarchy_levels::integer[]) then
                            raise notice 'department';
                            insert_arr = array_append(insert_arr, 'department');
                            select_arr = array_append(select_arr, 'l2_id as department');
                            where_arr = array_append(where_arr, 'l2_cid in (select unnest(hierarchy_ids) from h_cte where hierarchy_level_id = 2)');
                            group_by_arr = array_append(group_by_arr, 'l2_id');
                        end if;

                        if 3 = any(hierarchy_levels::integer[]) then
                            raise notice 'class';
                            insert_arr = array['department', 'class']::text[];
                            select_arr = array['l2_id as department', 'l3_id as class']::text[];
                            where_arr = array_append(where_arr, 'l3_cid in (select unnest(hierarchy_ids) from h_cte where hierarchy_level_id = 3)');
                            group_by_arr = array['l2_id', 'l3_id']::text[];
                        end if;

                        if -1 = any(hierarchy_levels::integer[]) then
                            raise notice 'brand/mfg';
                            if 2 = ANY(hierarchy_levels::integer[]) OR 3 = ANY(hierarchy_levels::integer[]) then  -- check if dept or class is already present. if present then append the values else overwrite the values
                                insert_arr = array_append(insert_arr, 'mfg');
                                select_arr = array_append(select_arr, 'mfg_no as mfg');
                                where_arr = array_append(where_arr, 'brand_cid in (select unnest(hierarchy_ids) from h_cte where hierarchy_level_id = -1)');
                                group_by_arr = array_append(group_by_arr, 'mfg_no');
                            else
                                insert_arr = array['department', 'mfg']::text[];
                                select_arr = array['l2_id as department', 'mfg_no as mfg']::text[];
                                where_arr = array_append(where_arr, 'brand_cid in (select unnest(hierarchy_ids) from h_cte where hierarchy_level_id = -1)');
                                group_by_arr = array['l2_id', 'mfg_no']::text[];
                            end if;
                        end if;

                        -- if the select_arr is still empty, then it means that the PG was created with a different hierarchy level. So fetch all the dept values for those hierarchies
                        raise notice 'select arr - %      count - %', array_to_string(select_arr, ', '), array_length(select_arr, 1);
                        if array_length(select_arr, 1) is null then
                            raise notice 'others';
                            if 4 = any(hierarchy_levels::integer[]) then
                                raise notice 'subclass';
                                insert_arr = insert_arr || array['department', 'class']::text[];
                                select_arr = select_arr || array['l2_id as department', 'l3_id as class']::text[];
                                where_arr = array_append(where_arr, 'l4_cid in (select unnest(hierarchy_ids) from h_cte where hierarchy_level_id = 4)');
                                group_by_arr = group_by_arr ||  array['l2_id', 'l3_id']::text[];
                            else
                                raise notice 'div / group';
                                insert_arr = array_append(insert_arr, 'department');
                                select_arr = array_append(select_arr, 'l2_id as department');
                                group_by_arr = array_append(group_by_arr, 'l2_id');

                                 if 0 = any(hierarchy_levels::integer[]) then
                                    where_arr = array_append(where_arr, 'l0_cid in (select unnest(hierarchy_ids) from h_cte where hierarchy_level_id = 0)');
                                 end if;
                                 if 1 = any(hierarchy_levels::integer[]) then
                                    where_arr = array_append(where_arr, 'l1_cid in (select unnest(hierarchy_ids) from h_cte where hierarchy_level_id = 1)');
                                 end if;
                            end if;
                        end if;

                        ex_query = format('
                                    insert into unique_product_group_hierarchy_combination_%1$s (promo_id, %5$s)
                                    with h_cte as (
                                        select promo_id, hierarchy_level_id, array_agg(hierarchy_cid) as hierarchy_ids
                                        from price_promo.excluded_hierarchy_combination
                                        where promo_id = %1$s
                                        group by 1,2
                                    )
                                    select %1$s as promo_id, %2$s
                                    from price_promo.tb_product_hierarchy_combination A
                                    where
                                        %3$s
                                    group by %4$s
                                ', p_id, array_to_string(select_arr, ', '), array_to_string(where_arr, ' and '), array_to_string(group_by_arr, ', '), array_to_string(insert_arr, ', '), action_val, ex_pg_code);
                        raise notice 'EX Q4 - W%', ex_query;
                        execute ex_query;
                    end if;
                end loop;

                ex_query = format('
                            insert into price_promo.so5_integration_product_group_details
                                (product_group_id, name, department, class, mfg, svs, action, is_excluded, promo_id)
                            select
                                %1$L, %1$L, department, class, mfg, svs, %2$L, true as is_excluded, %3$s
                            from (
                                select department, class, mfg, null as svs from unique_product_group_hierarchy_combination_%3$s
                                union
                                select department, null as class, null as mfg, svs from unique_pg_products_%3$s
                            ) C
                            group by
                                department, class, mfg, svs
                        ', ex_pg_code, action_val, p_id);
                raise notice 'EX Q4 - %', ex_query;
--              execute ex_query;

            end if;


            raise notice 'ex_query ---  %', ex_query;
            IF ex_query is not null or ex_query <> '' THEN
            -- Ensure in_query is a valid insert query
            query = format(
                'WITH ins AS (
                    %s
                    RETURNING id
                )
                SELECT array_agg(id) AS inserted_ids FROM ins',
                ex_query
            );

            raise notice 'query ---  %', query;

            -- Execute the query into temp_id_list
            EXECUTE query INTO temp_id_list;

            -- Append the result of temp_id_list to insert_id_list
            insert_id_list := insert_id_list || temp_id_list;

            -- Output notice for debugging
            RAISE NOTICE 'temp id list - %', array_to_string(temp_id_list, ', ');
            RAISE NOTICE 'insert id list - %', array_to_string(insert_id_list, ', ');

            ELSE
            raise notice 'NO Exclusion Data';
            END IF;


        end loop;
    else
        raise notice 'No Promos passed to function';
    end if;

    return insert_id_list;

end;
$function$
;
