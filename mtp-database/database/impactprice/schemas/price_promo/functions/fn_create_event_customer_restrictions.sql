--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_create_event_customer_restrictions_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_promo.fn_create_event_customer_restrictions_1

DROP FUNCTION if exists price_promo.fn_create_event_customer_restrictions;
CREATE OR REPLACE FUNCTION price_promo.fn_create_event_customer_restrictions(
    p_event_id int,
    p_event_customer_restriction price_promo.customer_restriction
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
        _customer_hierarchy_ids_config jsonb;
        _customer_hierarchies_config jsonb;
        _hierarchy_key text;
        _join_condition text[];
        _jsonb_to_record_declaration text[];
    begin

        delete from price_promo.tb_event_customers where event_id = p_event_id;
        delete from price_promo.tb_event_customer_hierarchy where event_id = p_event_id;

        -- Handle all_customers case - populate all customers and skip hierarchy logic
        if p_event_customer_restriction.customer_restriction_level = 'all_customers' then
            raise notice 'customer_restriction_level is all_customers - inserting all customers';
            
            insert into price_promo.tb_event_customers (event_id, customer_id)
            select 
                p_event_id as event_id,
                customer_id
            from pricesmart.customer_master;
            
            return;
        end if;

        select config_value::jsonb into _customer_hierarchies_config
        from price_promo.tb_tool_configurations
        where module = 'customer' and config_name = 'hierarchy_filters';

        select jsonb_object_agg(
            value->>'id',
            value || jsonb_build_object('key',key)
            ) into _customer_hierarchy_ids_config
        from jsonb_each(_customer_hierarchies_config)
        where (value->>'id' is not null); 

        raise notice 'inside customer restrictions';
        raise notice '%', p_event_customer_restriction.customer_restriction_level;

        --Case - Hierarchy similar to  whole_category customer_restriction_level from products
        -- if p_event_customer_restriction.customer_restriction_level = 'whole_category' then


        for hierarchy_l_id in select key from jsonb_each(_customer_hierarchy_ids_config) loop
            _hierarchy_key = _customer_hierarchy_ids_config[hierarchy_l_id]->>'key';
            if p_event_customer_restriction.hierarchy_data->>_hierarchy_key is null then
                continue;
            end if;


            _join_condition = array_append(
                _join_condition,
                format(
                    '
                        cm.%2$s = ANY(td.%1$s)
                    ',
                    _hierarchy_key,
                    _customer_hierarchy_ids_config[hierarchy_l_id]->>'id_column'
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
            CREATE TEMP TABLE temp_customer_details AS
                with temp_hierarchy_data_cte as(
                    select 
                        *
                    from 
                        jsonb_to_record(%1$L) as td(
                            %3$s
                        )
                )
                SELECT DISTINCT
                    cm.customer_id
                FROM pricesmart.customer_master cm
                inner join temp_hierarchy_data_cte td
                on %2$s
            ',
            p_event_customer_restriction.hierarchy_data,
            array_to_string(_join_condition, ' and '),
            array_to_string(_jsonb_to_record_declaration, ',')

        );
        raise notice 'temp customer details query: %', _query;
        execute _query;

        CREATE TEMP TABLE temp_event_customer_hierarchy (
            event_id INTEGER,
            hierarchy_level_id INT,
            hierarchy_level_name TEXT,
            hierarchy_value_id BIGINT,
            hierarchy_value_name TEXT
        );
    
        raise notice 'hierarchy_data: %', p_event_customer_restriction.hierarchy_data;
        FOR hierarchy_l_id IN  SELECT key from jsonb_each(_customer_hierarchy_ids_config) LOOP
            if COALESCE(jsonb_array_length(
                p_event_customer_restriction.hierarchy_data[_customer_hierarchy_ids_config[hierarchy_l_id]->>'key']
            ), 0) = 0 then
                continue;
            end if;

            _query = format('
                INSERT INTO temp_event_customer_hierarchy (
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
                pricesmart.customer_master cm 
                ON 
                val::bigint = cm.%6$s
                ',
                p_event_id,
                hierarchy_l_id,
                _customer_hierarchy_ids_config[hierarchy_l_id]->>'label',
                _customer_hierarchy_ids_config[hierarchy_l_id]->>'value_column',
                p_event_customer_restriction.hierarchy_data[_customer_hierarchy_ids_config[hierarchy_l_id]->>'key'],
                _customer_hierarchy_ids_config[hierarchy_l_id]->>'id_column'
            );
            raise notice 'event customer hierarchy query: %', _query;
            execute _query;
        END LOOP;
    
        -- Insert data from the temporary table into the promo_customer_hierarchy table
        INSERT INTO price_promo.tb_event_customer_hierarchy(
            event_id, hierarchy_level_id, hierarchy_level_name, hierarchy_value_id, hierarchy_value_name
        )
        SELECT
            tech.event_id, tech.hierarchy_level_id, tech.hierarchy_level_name, tech.hierarchy_value_id,
            tech.hierarchy_value_name
        FROM temp_event_customer_hierarchy tech;
    
        raise notice 'data inserted into customer hierarchy table successfully';

        insert into price_promo.tb_event_customers (event_id, customer_id)
        select 
            p_event_id as event_id,
            customer_id
        from temp_customer_details;

        -- Drop the temp_customer_details table
        EXECUTE 'DROP TABLE IF EXISTS temp_event_customer_hierarchy';
        EXECUTE 'DROP TABLE IF EXISTS temp_customer_details';

end;
$function$
;