--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_create_event_store_restrictions_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_promo.fn_create_event_store_restrictions_1

DROP FUNCTION if exists price_promo.fn_create_event_store_restrictions;
CREATE OR REPLACE FUNCTION price_promo.fn_create_event_store_restrictions(
    p_event_id int,
    p_event_store_restriction price_promo.store_restriction,
    p_user_id int
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
    declare
        _query text;
        hierarchy_l_id int;
        store_id int;
        store_ids int[];
        store_group_id int;
        store_details record;
        _store_hierarchies_config jsonb;
        _store_hierarchy_ids_config jsonb;
        _channel_hierarchy_key text;
        _channel_id_column text;
        _join_condition text;
        _join_parts text[];
        _level_name_cases text[];
        _value_name_cases text[];
        _hierarchy_key text;
    begin
        delete from price_promo.event_store_sg_hierarchy where event_id = p_event_id;

        SELECT config_value::jsonb INTO _store_hierarchies_config
        FROM price_promo.tb_tool_configurations
        WHERE module = 'store' AND config_name = 'hierarchy_filters';

        SELECT jsonb_object_agg(
                value->>'id',
                value || jsonb_build_object('key', key)
            ) INTO _store_hierarchy_ids_config
        FROM jsonb_each(_store_hierarchies_config)
        WHERE (value->>'id' IS NOT NULL AND value->>'id_column' != 'store_id');

        --Case 1 - Specific Stores - Specific Stores
        if p_event_store_restriction.store_restriction_level = 'specific_stores' then
            _query := format(
                'CREATE TABLE IF NOT EXISTS price_promo.included_event_stores_%1$s PARTITION OF price_promo.included_event_stores FOR VALUES IN (%1$s)',
                p_event_id
            );
            execute _query;

            EXECUTE format(
                'CREATE TEMP TABLE temp_store_details AS
                SELECT DISTINCT store_id
                FROM price_promo.fn_get_user_restricted_stores(%2$L) AS pm
                WHERE store_id = ANY(%1$L::INTEGER[])',
                p_event_store_restriction.stores,
                p_user_id
            );

            FOR hierarchy_l_id IN SELECT key FROM jsonb_each(_store_hierarchy_ids_config)
            LOOP
                IF COALESCE(trim(_store_hierarchy_ids_config->(hierarchy_l_id::text)->>'id_column'), '') = ''
                   OR COALESCE(trim(_store_hierarchy_ids_config->(hierarchy_l_id::text)->>'value_column'), '') = '' THEN
                    CONTINUE;
                END IF;
                _query := format(
                    'INSERT INTO price_promo.included_event_store_hierarchy
                    (event_id, hierarchy_level_id, hierarchy_level_name, hierarchy_value_id, hierarchy_value_name)
                    SELECT DISTINCT
                        %6$s AS event_id,
                        %1$s::int AS hierarchy_level_id,
                        %2$L AS hierarchy_level_name,
                        pm.%3$s AS hierarchy_value_id,
                        pm.%4$s AS hierarchy_value_name
                    FROM price_promo.fn_get_user_restricted_stores(%7$L) AS pm
                    WHERE pm.store_id IN (SELECT unnest(%5$L::int[])) AND pm.%3$s IS NOT NULL',
                    hierarchy_l_id,
                    _store_hierarchy_ids_config->(hierarchy_l_id::text)->>'label',
                    _store_hierarchy_ids_config->(hierarchy_l_id::text)->>'id_column',
                    _store_hierarchy_ids_config->(hierarchy_l_id::text)->>'value_column',
                    p_event_store_restriction.stores,
                    p_event_id,
                    p_user_id
                );
                execute _query;
            END LOOP;

            FOR store_details IN SELECT temp_store_details.store_id FROM temp_store_details
            LOOP
                EXECUTE format(
                    'INSERT INTO price_promo.included_event_stores_%s (event_id, store_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    p_event_id::TEXT
                ) USING p_event_id, store_details.store_id;
            END LOOP;

            EXECUTE 'DROP TABLE IF EXISTS temp_store_details';

        --Case 2 - Store Groups
        elsif p_event_store_restriction.store_restriction_level = 'store_group' then
        
            foreach store_group_id in array p_event_store_restriction.store_groups loop
                insert into price_promo.included_event_store_groups (event_id, store_group_id)
                values (p_event_id, store_group_id);
            end loop;

            _query := format(
                'CREATE TABLE IF NOT EXISTS price_promo.included_event_stores_%1$s PARTITION OF price_promo.included_event_stores FOR VALUES IN (%1$s)',
                p_event_id
            );
            execute _query;

            drop table if exists temp_store_details;
            EXECUTE format(
                'CREATE TEMP TABLE temp_store_details AS
                SELECT DISTINCT tss.store_id, pm.store_name
                FROM pricesmart.tb_sg_store tss
                INNER JOIN price_promo.fn_get_user_restricted_stores(%2$L) pm ON tss.store_id = pm.store_id
                WHERE sg_id = ANY(%1$L::INTEGER[])',
                p_event_store_restriction.store_groups,
                p_user_id
            );

            _join_parts := ARRAY[]::text[];
            _level_name_cases := ARRAY[]::text[];
            _value_name_cases := ARRAY[]::text[];
            FOR _hierarchy_key IN SELECT key FROM jsonb_each(_store_hierarchy_ids_config)
            LOOP
                _join_parts := array_append(_join_parts, format(
                    '(tsh.hierarchy_level = %s AND tsh.hierarchy_value = tsm.%s)',
                    _hierarchy_key,
                    _store_hierarchy_ids_config->_hierarchy_key->>'id_column'
                ));
                _level_name_cases := _level_name_cases || format(
                    'WHEN tsh.hierarchy_level = %s THEN %L',
                    _hierarchy_key,
                    _store_hierarchy_ids_config->_hierarchy_key->>'label'
                );
                _value_name_cases := _value_name_cases || format(
                    'WHEN tsh.hierarchy_level = %s THEN tsm.%s',
                    _hierarchy_key,
                    _store_hierarchy_ids_config->_hierarchy_key->>'value_column'
                );
            END LOOP;
            _join_condition := array_to_string(_join_parts, ' OR ');

            FOREACH store_group_id IN ARRAY p_event_store_restriction.store_groups
            LOOP
                _query := format(
                    'INSERT INTO price_promo.event_store_sg_hierarchy (
                        event_id, store_group_id, store_group_name,
                        hierarchy_level_id, hierarchy_level_name, hierarchy_value_id, hierarchy_value_name
                    )
                    SELECT DISTINCT
                        $1 AS event_id, $2 AS store_group_id, tsg.sg_name AS store_group_name,
                        tsh.hierarchy_level AS hierarchy_level_id,
                        CASE %s END AS hierarchy_level_name,
                        tsh.hierarchy_value AS hierarchy_value_id,
                        CASE %s END AS hierarchy_value_name
                    FROM pricesmart.tb_sg_hierarchy tsh
                    LEFT JOIN pricesmart.tb_store_group tsg ON tsh.sg_id = tsg.sg_id
                    LEFT JOIN price_promo.fn_get_user_restricted_stores($3) tsm ON %s
                    WHERE tsh.sg_id = $2',
                    array_to_string(_level_name_cases, ' '),
                    array_to_string(_value_name_cases, ' '),
                    _join_condition
                );
                EXECUTE _query USING p_event_id, store_group_id, p_user_id;
            END LOOP;

            FOR store_details IN SELECT temp_store_details.store_id FROM temp_store_details
            LOOP
                EXECUTE format(
                    'INSERT INTO price_promo.included_event_stores_%s (event_id, store_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    p_event_id::TEXT
                ) USING p_event_id, store_details.store_id;
            END LOOP;

            EXECUTE 'DROP TABLE IF EXISTS temp_store_details';

        --Case 3 - BNM stores (channel-based restriction)
        elsif p_event_store_restriction.store_restriction_level = 'bnm_stores' then

            SELECT key, value->>'id_column' INTO _channel_hierarchy_key, _channel_id_column
            FROM jsonb_each(_store_hierarchy_ids_config)
            WHERE value->>'id_column' = 's1_id'
            LIMIT 1;

            IF _channel_hierarchy_key IS NULL OR _channel_id_column IS NULL THEN
                RAISE EXCEPTION 'Store hierarchy_filters must define a level with id_column = s1_id for channel-based restrictions';
            END IF;

            _query := format(
                'CREATE TABLE IF NOT EXISTS price_promo.included_event_stores_%s PARTITION OF price_promo.included_event_stores FOR VALUES IN (%s)',
                p_event_id, p_event_id
            );
            execute _query;

            DROP TABLE IF EXISTS temp_store_details;
            _query := format(
                'CREATE TEMP TABLE temp_store_details AS
                SELECT DISTINCT store_id, store_name
                FROM price_promo.fn_get_user_restricted_stores(%L)
                WHERE %s = ANY(ARRAY[2]::int[])',
                p_user_id,
                quote_ident(_channel_id_column)
            );
            EXECUTE _query;

            SELECT array_agg(store_id) INTO store_ids FROM temp_store_details;

            FOR hierarchy_l_id IN SELECT key FROM jsonb_each(_store_hierarchy_ids_config)
            LOOP
                IF COALESCE(trim(_store_hierarchy_ids_config->(hierarchy_l_id::text)->>'id_column'), '') = ''
                   OR COALESCE(trim(_store_hierarchy_ids_config->(hierarchy_l_id::text)->>'value_column'), '') = '' THEN
                    CONTINUE;
                END IF;
                _query := format(
                    'INSERT INTO price_promo.included_event_store_hierarchy
                    (event_id, hierarchy_level_id, hierarchy_level_name, hierarchy_value_id, hierarchy_value_name)
                    SELECT DISTINCT %1$s AS event_id, %2$s::int AS hierarchy_level_id, %3$L AS hierarchy_level_name,
                        pm.%4$s AS hierarchy_value_id, pm.%5$s AS hierarchy_value_name
                    FROM price_promo.fn_get_user_restricted_stores(%6$L) AS pm
                    WHERE pm.store_id IN (SELECT unnest(%7$L::INTEGER[]))',
                    p_event_id, hierarchy_l_id,
                    _store_hierarchy_ids_config->(hierarchy_l_id::text)->>'label',
                    _store_hierarchy_ids_config->(hierarchy_l_id::text)->>'id_column',
                    _store_hierarchy_ids_config->(hierarchy_l_id::text)->>'value_column',
                    p_user_id, COALESCE(store_ids, ARRAY[]::int[])
                );
                execute _query;
            END LOOP;

            FOR store_details IN SELECT temp_store_details.store_id FROM temp_store_details
            LOOP
                EXECUTE format(
                    'INSERT INTO price_promo.included_event_stores_%s (event_id, store_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    p_event_id::TEXT
                ) USING p_event_id, store_details.store_id;
            END LOOP;
            EXECUTE 'DROP TABLE IF EXISTS temp_store_details';

        --Case 4 - Ecom stores (channel-based restriction)
        elsif p_event_store_restriction.store_restriction_level = 'ecom_stores' then

            SELECT key, value->>'id_column' INTO _channel_hierarchy_key, _channel_id_column
            FROM jsonb_each(_store_hierarchy_ids_config)
            WHERE value->>'id_column' = 's1_id'
            LIMIT 1;

            IF _channel_hierarchy_key IS NULL OR _channel_id_column IS NULL THEN
                RAISE EXCEPTION 'Store hierarchy_filters must define a level with id_column = s1_id for channel-based restrictions';
            END IF;

            _query := format(
                'CREATE TABLE IF NOT EXISTS price_promo.included_event_stores_%s PARTITION OF price_promo.included_event_stores FOR VALUES IN (%s)',
                p_event_id, p_event_id
            );
            execute _query;

            DROP TABLE IF EXISTS temp_store_details;
            _query := format(
                'CREATE TEMP TABLE temp_store_details AS
                SELECT DISTINCT store_id, store_name
                FROM price_promo.fn_get_user_restricted_stores(%L)
                WHERE %s = ANY(ARRAY[1]::int[])',
                p_user_id,
                quote_ident(_channel_id_column)
            );
            EXECUTE _query;

            SELECT array_agg(store_id) INTO store_ids FROM temp_store_details;

            FOR hierarchy_l_id IN SELECT key FROM jsonb_each(_store_hierarchy_ids_config)
            LOOP
                IF COALESCE(trim(_store_hierarchy_ids_config->(hierarchy_l_id::text)->>'id_column'), '') = ''
                   OR COALESCE(trim(_store_hierarchy_ids_config->(hierarchy_l_id::text)->>'value_column'), '') = '' THEN
                    CONTINUE;
                END IF;
                _query := format(
                    'INSERT INTO price_promo.included_event_store_hierarchy
                    (event_id, hierarchy_level_id, hierarchy_level_name, hierarchy_value_id, hierarchy_value_name)
                    SELECT DISTINCT %1$s AS event_id, %2$s::int AS hierarchy_level_id, %3$L AS hierarchy_level_name,
                        pm.%4$s AS hierarchy_value_id, pm.%5$s AS hierarchy_value_name
                    FROM price_promo.fn_get_user_restricted_stores(%6$L) AS pm
                    WHERE pm.store_id IN (SELECT unnest(%7$L::INTEGER[]))',
                    p_event_id, hierarchy_l_id,
                    _store_hierarchy_ids_config->(hierarchy_l_id::text)->>'label',
                    _store_hierarchy_ids_config->(hierarchy_l_id::text)->>'id_column',
                    _store_hierarchy_ids_config->(hierarchy_l_id::text)->>'value_column',
                    p_user_id, COALESCE(store_ids, ARRAY[]::int[])
                );
                execute _query;
            END LOOP;

            FOR store_details IN SELECT temp_store_details.store_id FROM temp_store_details
            LOOP
                EXECUTE format(
                    'INSERT INTO price_promo.included_event_stores_%s (event_id, store_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    p_event_id::TEXT
                ) USING p_event_id, store_details.store_id;
            END LOOP;
            EXECUTE 'DROP TABLE IF EXISTS temp_store_details';
        end if;
    end;
$function$
;