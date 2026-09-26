--liquibase formatted sql
--changeset shrrayan.sheel@impactanalytics.co:fn_create_kit_offer_units_product_hierarchy_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_promo.fn_create_kit_offer_units_product_hierarchy_1

DROP FUNCTION if exists price_promo.fn_create_kit_offer_units_product_hierarchy;
CREATE OR REPLACE FUNCTION price_promo.fn_create_kit_offer_units_product_hierarchy(p_kit_offer_units_id integer, p_kit_offer_unit jsonb)
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
        product_selection_type text;
        _product_hierarchy_ids_config jsonb;
        _product_hierarchies_config jsonb;
        _hierarchy_key text;
        _join_condition text[];
        _jsonb_to_record_declaration text[];
        product_selection_config_json jsonb;
		kit_offer_unit_product_ids int[];
    begin


        select config_value::jsonb into _product_hierarchies_config
        from price_promo.tb_tool_configurations
        where module = 'product' and config_name = 'hierarchy_filters';

        select jsonb_object_agg(
            value->>'id',
            value || jsonb_build_object('key',key)
            ) into _product_hierarchy_ids_config
        from jsonb_each(_product_hierarchies_config)
        where (value->>'id' is not null and value->>'id_column' != 'product_id'); 

        raise notice 'inside product selection';
        raise notice '%', p_kit_offer_unit ->> 'product_selection_type';
        product_selection_type := p_kit_offer_unit ->> 'product_selection_type'::text;

        SELECT json_object_agg(id, to_jsonb(row)) INTO product_selection_config_json
        FROM (
            SELECT * FROM price_promo.product_selection_type_config
        ) AS row;

        if product_selection_config_json -> product_selection_type ->> 'product_selection_type' = 'specific_products' then

            _query := format('CREATE TABLE IF NOT EXISTS price_promo.tb_kit_offer_unit_products_%1$s 
                                PARTITION OF price_promo.tb_kit_offer_unit_products FOR VALUES IN (%1$s)', 
                            p_kit_offer_units_id);
            raise notice 'partition create query : %', _query;
            EXECUTE _query;
			
			raise notice 'product_ids: %', p_kit_offer_unit -> 'product_ids';
			SELECT array_agg(value::int)
			    FROM jsonb_array_elements_text(p_kit_offer_unit -> 'product_ids') into kit_offer_unit_product_ids;
            -- Create a temporary table to store unique product IDs and names
            EXECUTE '
                CREATE TEMP TABLE temp_product_details AS
                SELECT DISTINCT
                    product_id,
                    product_name
                FROM price_promo.product_master pm
                WHERE product_id = ANY($1::INTEGER[])'
            USING kit_offer_unit_product_ids;
            
            FOR hierarchy_l_id IN select key from jsonb_each(_product_hierarchy_ids_config)
            LOOP
                _query = format(' 
                    insert into price_promo.tb_kit_offer_unit_products_hierarchy
                    (kit_offer_units_id, hierarchy_level_id, hierarchy_level_name, hierarchy_value_id, hierarchy_value_name)
                    select 
                        distinct
                        %6$s as kit_offer_units_id,
                        %1$s::int as hierarchy_level_id,
                        ''%2$s'' as hierarchy_level_name,
                        pm.%3$s as hierarchy_value_id,
                        pm.%4$s as hierarchy_value_name
                    from price_promo.product_master pm
                    where pm.product_id in (select unnest(%5$L::int[]))
                    and pm.%3$s is not null
                    ',
                    hierarchy_l_id,
                    _product_hierarchy_ids_config[hierarchy_l_id]->>'label',
                    _product_hierarchy_ids_config[hierarchy_l_id]->>'id_column',
                    _product_hierarchy_ids_config[hierarchy_l_id]->>'value_column',
                    kit_offer_unit_product_ids,
                    p_kit_offer_units_id
                );

                raise notice 'tb_kit_offer_unit_products_hierarchy query: %', _query;
                execute _query;

            END LOOP;
			
			raise notice 'insert into tb_kit_offer_unit_products_partition';
            -- Bulk insert in tb_kit_offer_unit_products_ table
            EXECUTE format(
                'INSERT INTO price_promo.tb_kit_offer_unit_products_%s (kit_offer_units_id, product_id)
                SELECT $1, product_id FROM temp_product_details
                ON CONFLICT DO NOTHING',
                p_kit_offer_units_id::TEXT
            )
            USING p_kit_offer_units_id;
        
            -- Drop the temp_product_details table
            EXECUTE 'DROP TABLE IF EXISTS temp_product_details';

        --Case 2 - Hierarchy
        elsif product_selection_config_json -> product_selection_type ->> 'product_selection_type' = 'whole_category' then


            for hierarchy_l_id in select key from jsonb_each(_product_hierarchy_ids_config) loop
                _hierarchy_key = _product_hierarchy_ids_config[hierarchy_l_id]->>'key';
                if p_kit_offer_unit->'product_hierarchy'->>_hierarchy_key is null then
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
                    FROM price_promo.product_master pm
                    inner join temp_hierarchy_data_cte td
                    on %2$s
                ',
				p_kit_offer_unit->'product_hierarchy',
                array_to_string(_join_condition, ' and '),
                array_to_string(_jsonb_to_record_declaration, ',')

            );
            raise notice 'temp product details query: %', _query;
            execute _query;

            CREATE TEMP TABLE temp_tb_kit_offer_unit_products_hierarchy (
                kit_offer_units_id INTEGER,
                hierarchy_level_id INT,
                hierarchy_level_name TEXT,
                hierarchy_value_id BIGINT,
                hierarchy_value_name TEXT
            );
        
            raise notice 'hierarchy_data: %',  p_kit_offer_unit -> 'product_hierarchy';
            FOR hierarchy_l_id IN  SELECT key from jsonb_each(_product_hierarchy_ids_config) LOOP
                if not (jsonb_array_length(
					(p_kit_offer_unit -> 'product_hierarchy') -> (_product_hierarchy_ids_config[hierarchy_l_id]->>'key')
                ) > 0) then
                    continue;
                end if;

                _query = format('
                    INSERT INTO temp_tb_kit_offer_unit_products_hierarchy (
                        kit_offer_units_id, hierarchy_level_id, hierarchy_level_name, hierarchy_value_id, hierarchy_value_name
                    )
                    SELECT DISTINCT
                        %1$s AS kit_offer_units_id,
                        %2$s AS hierarchy_level_id,
                        ''%3$s'' AS hierarchy_level_name,
                        val::bigint AS hierarchy_value_id,
                        %4$s::text as hierarchy_value_name
                    FROM jsonb_array_elements_text(%5$L) AS vals(val)
                    LEFT JOIN 
                    price_promo.product_master pm 
                    ON 
                    val::bigint = pm.%6$s
                    where pm.is_active = 1
                    and val::bigint is not null
                    ',
                    p_kit_offer_units_id,
                    hierarchy_l_id,
                    _product_hierarchy_ids_config[hierarchy_l_id]->>'label',
                    _product_hierarchy_ids_config[hierarchy_l_id]->>'value_column',
					(p_kit_offer_unit -> 'product_hierarchy') -> (_product_hierarchy_ids_config[hierarchy_l_id]->>'key'),
                    _product_hierarchy_ids_config[hierarchy_l_id]->>'id_column'
                );
                raise notice 'event product hierarchy query: %', _query;
                execute _query;
            END LOOP;
        
            -- Insert data from the temporary table into the promo_product_hierarchy table
            INSERT INTO price_promo.tb_kit_offer_unit_products_hierarchy(
                kit_offer_units_id, hierarchy_level_id, hierarchy_level_name, hierarchy_value_id, hierarchy_value_name
            )
            SELECT
                tpph.kit_offer_units_id, tpph.hierarchy_level_id, tpph.hierarchy_level_name, tpph.hierarchy_value_id,
                tpph.hierarchy_value_name
            FROM temp_tb_kit_offer_unit_products_hierarchy tpph;
        
            raise notice 'data inserted into product hierarchy table successfully';

            _query := format('CREATE TABLE IF NOT EXISTS price_promo.tb_kit_offer_unit_products_%1$s 
                                PARTITION OF price_promo.tb_kit_offer_unit_products FOR VALUES IN (%1$s)', 
                            p_kit_offer_units_id);
            raise notice 'partition create query : %', _query;
            EXECUTE _query;

            insert into price_promo.tb_kit_offer_unit_products (kit_offer_units_id, product_id)
            select 
                p_kit_offer_units_id as kit_offer_units_id,
                product_id
            from temp_product_details;

            -- Drop the temp_product_details table
            EXECUTE 'DROP TABLE IF EXISTS temp_tb_kit_offer_unit_products_hierarchy';
            EXECUTE 'DROP TABLE IF EXISTS temp_product_details';

        end if;
end;
$function$
;
