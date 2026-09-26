--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_create_event_product_restrictions_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_promo.fn_create_event_product_restrictions_1

DROP FUNCTION if exists price_promo.fn_create_event_product_restrictions;
CREATE OR REPLACE FUNCTION price_promo.fn_create_event_product_restrictions(
    p_event_id int,
    p_event_product_restriction price_promo.product_restriction,
    p_user_id int
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
    declare
        _query text;
        hierarchy_l_id int;
        pg_id int;
        hierarchy_field text;
        debug_rec RECORD;
        product_detail record;
        _product_hierarchy_ids_config jsonb;
        _product_hierarchies_config jsonb;
        _hierarchy_key text;
        _join_condition text[];
        _jsonb_to_record_declaration text[];
    begin
        delete from price_promo.included_event_products where event_id = p_event_id;
        delete from price_promo.included_event_product_hierarchy where event_id = p_event_id;
        delete from price_promo.included_event_product_groups where event_id = p_event_id;


        select config_value::jsonb into _product_hierarchies_config
        from price_promo.tb_tool_configurations
        where module = 'product' and config_name = 'hierarchy_filters';

        select jsonb_object_agg(
            value->>'id',
            value || jsonb_build_object('key',key)
            ) into _product_hierarchy_ids_config
        from jsonb_each(_product_hierarchies_config)
        where (value->>'id' is not null and value->>'id_column' != 'product_id'); 

        raise notice 'inside product restrictions';
        raise notice '%', p_event_product_restriction.product_restriction_level;
        if p_event_product_restriction.product_restriction_level = 'specific_products' then

            _query := format('CREATE TABLE IF NOT EXISTS price_promo.included_event_products_%1$s 
                                PARTITION OF price_promo.included_event_products FOR VALUES IN (%1$s)', 
                            p_event_id);
            raise notice 'partition create query : %', _query;
            EXECUTE _query;

            -- Create a temporary table to store unique product IDs and names
            EXECUTE format('
                CREATE TEMP TABLE temp_product_details AS
                SELECT DISTINCT
                    product_id,
                    product_name
                FROM price_promo.fn_get_user_restricted_products(%2$L) as pm
                WHERE product_id = ANY(%1$L::INTEGER[])',
                p_event_product_restriction.products,
                p_user_id
            );
            
            FOR hierarchy_l_id IN select key from jsonb_each(_product_hierarchy_ids_config)
            LOOP
                _query = format(' 
                    insert into price_promo.included_event_product_hierarchy
                    (event_id, hierarchy_level_id, hierarchy_level_name, hierarchy_value_id, hierarchy_value_name)
                    select 
                        distinct
                        %6$s as event_id,
                        %1$s::int as hierarchy_level_id,
                        ''%2$s'' as hierarchy_level_name,
                        pm.%3$s as hierarchy_value_id,
                        pm.%4$s as hierarchy_value_name
                    from price_promo.fn_get_user_restricted_products(%7$L) as pm
                    where pm.product_id in (select unnest(%5$L::int[])) and pm.%3$s is not null
                    ',
                    hierarchy_l_id,
                    _product_hierarchy_ids_config[hierarchy_l_id]->>'label',
                    _product_hierarchy_ids_config[hierarchy_l_id]->>'id_column',
                    _product_hierarchy_ids_config[hierarchy_l_id]->>'value_column',
                    p_event_product_restriction.products,
                    p_event_id,
                    p_user_id
                );

                raise notice 'included event product hierarchy query: %', _query;
                execute _query;

            END LOOP;

            -- Loop over each product_id and product_name in the temporary table
            FOR product_detail IN
                SELECT product_id
                FROM temp_product_details
            LOOP
                -- Insert data into promo_product, routing to the correct partition
                EXECUTE format('
                    INSERT INTO price_promo.included_event_products_%s (event_id, product_id)
                    VALUES ($1, $2)
                    ON CONFLICT DO NOTHING',
                    p_event_id::TEXT
                )
                USING p_event_id, product_detail.product_id;
            END LOOP;
        
            -- Drop the temp_product_details table
            EXECUTE 'DROP TABLE IF EXISTS temp_product_details';

        --Case 2 - Hierarchy
        elsif p_event_product_restriction.product_restriction_level = 'whole_category' then


            for hierarchy_l_id in select key from jsonb_each(_product_hierarchy_ids_config) loop
                _hierarchy_key = _product_hierarchy_ids_config[hierarchy_l_id]->>'key';
                if p_event_product_restriction.hierarchy_data->>_hierarchy_key is null then
                    continue;
                end if;

                _join_condition = array_append(
                    _join_condition,
                    format(
                        '
                            pm.%2$s = ANY(td.%1$s)
                        ',
                        _hierarchy_key,
                        _product_hierarchy_ids_config[hierarchy_l_id]->>'id_column'
                    )
                );

                _jsonb_to_record_declaration = array_append(
                    _jsonb_to_record_declaration,
                    format(
                        '
                            %1$s int[]
                        ',
                        _hierarchy_key
                    )
                );

            end loop;

            _query = format('
                CREATE TEMP TABLE temp_product_details AS
                    with temp_hierarchy_data_cte as(
                        select 
                            *
                        from 
                            jsonb_to_record(%1$L) as td(
                                %3$s
                            )
                    )
                    SELECT DISTINCT
                        pm.product_id
                    FROM price_promo.fn_get_user_restricted_products(%4$L) as pm
                    inner join temp_hierarchy_data_cte td
                    on %2$s
                ',
                p_event_product_restriction.hierarchy_data,
                array_to_string(_join_condition, ' and '),
                array_to_string(_jsonb_to_record_declaration, ','),
                p_user_id

            );
            raise notice 'temp product details query: %', _query;
            execute _query;

            CREATE TEMP TABLE temp_event_product_hierarchy (
                event_id INTEGER,
                hierarchy_level_id INT,
                hierarchy_level_name TEXT,
                hierarchy_value_id BIGINT,
                hierarchy_value_name TEXT
            );
        
            raise notice 'hierarchy_data: %', p_event_product_restriction.hierarchy_data;
            FOR hierarchy_l_id IN  SELECT key from jsonb_each(_product_hierarchy_ids_config) LOOP
                if not (jsonb_array_length(
                    p_event_product_restriction.hierarchy_data[_product_hierarchy_ids_config[hierarchy_l_id]->>'key']
                ) > 0) then
                    continue;
                end if;

                _query = format('
                    INSERT INTO temp_event_product_hierarchy (
                        event_id, hierarchy_level_id, hierarchy_level_name, hierarchy_value_id, hierarchy_value_name
                    )
                    SELECT DISTINCT
                        %1$s AS event_id,
                        %2$s AS hierarchy_level_id,
                        ''%3$s'' AS hierarchy_level_name,
                        val::bigint AS hierarchy_value_id,
                        %4$s::text as hierarchy_value_name
                    FROM jsonb_array_elements_text(%5$L) AS vals(val)
                    LEFT JOIN 
                    price_promo.fn_get_user_restricted_products(%7$L) as pm 
                    ON 
                    val::bigint = pm.%6$s
                    where pm.is_active = 1
                    ',
                    p_event_id,
                    hierarchy_l_id,
                    _product_hierarchy_ids_config[hierarchy_l_id]->>'label',
                    _product_hierarchy_ids_config[hierarchy_l_id]->>'value_column',
                    p_event_product_restriction.hierarchy_data[_product_hierarchy_ids_config[hierarchy_l_id]->>'key'],
                    _product_hierarchy_ids_config[hierarchy_l_id]->>'id_column',
                    p_user_id
                );
                raise notice 'event product hierarchy query: %', _query;
                execute _query;
            END LOOP;
        
            -- Insert data from the temporary table into the promo_product_hierarchy table
            INSERT INTO price_promo.included_event_product_hierarchy(
                event_id, hierarchy_level_id, hierarchy_level_name, hierarchy_value_id, hierarchy_value_name
            )
            SELECT
                tpph.event_id, tpph.hierarchy_level_id, tpph.hierarchy_level_name, tpph.hierarchy_value_id,
                tpph.hierarchy_value_name
            FROM temp_event_product_hierarchy tpph;
        
            raise notice 'data inserted into product hierarchy table successfully';

            _query := format('CREATE TABLE IF NOT EXISTS price_promo.included_event_products_%1$s 
                                PARTITION OF price_promo.included_event_products FOR VALUES IN (%1$s)', 
                            p_event_id);
            raise notice 'partition create query : %', _query;
            EXECUTE _query;

            insert into price_promo.included_event_products (event_id, product_id)
            select 
                p_event_id as event_id,
                product_id
            from temp_product_details;

            -- Drop the temp_product_details table
            EXECUTE 'DROP TABLE IF EXISTS temp_event_product_hierarchy';
            EXECUTE 'DROP TABLE IF EXISTS temp_product_details';

        --Case 3 - Product Groups
        elsif p_event_product_restriction.product_restriction_level = 'product_group' then
            foreach pg_id in array p_event_product_restriction.product_groups loop
                insert into price_promo.included_event_product_groups (event_id, product_group_id)
                values (p_event_id, pg_id);
            end loop;
        end if;
end;
$function$

;