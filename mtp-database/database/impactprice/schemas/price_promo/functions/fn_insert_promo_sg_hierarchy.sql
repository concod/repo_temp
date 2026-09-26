--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_insert_promo_sg_hierarchy runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_promo.fn_insert_promo_sg_hierarchy

DROP FUNCTION IF EXISTS price_promo.fn_insert_promo_sg_hierarchy;
CREATE OR REPLACE FUNCTION price_promo.fn_insert_promo_sg_hierarchy(
    p_promo_id int,
    p_store_group_ids int[]
)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    _store_hierarchies_config jsonb;
    _store_hierarchy_full_config jsonb;
    _join_parts text[];
    _level_name_cases text[];
    _value_name_cases text[];
    _join_condition text;
    _query text;
    _hierarchy_key text;
    
BEGIN
    SELECT config_value::jsonb INTO _store_hierarchies_config
    FROM price_promo.tb_tool_configurations
    WHERE module = 'store' AND config_name = 'hierarchy_filters';

    SELECT jsonb_object_agg(
            value->>'id',
            value || jsonb_build_object('key', key)
        ) INTO _store_hierarchy_full_config
    FROM jsonb_each(_store_hierarchies_config)
    WHERE value->>'id' IS NOT NULL;

    _join_parts := ARRAY[]::text[];
    _level_name_cases := ARRAY[]::text[];
    _value_name_cases := ARRAY[]::text[];
    FOR _hierarchy_key IN SELECT key FROM jsonb_each(_store_hierarchy_full_config)
    LOOP
        _join_parts := array_append(_join_parts, format(
            '(tsh.hierarchy_level = %s AND tsh.hierarchy_value = tsm.%s)',
            _hierarchy_key,
            _store_hierarchy_full_config->_hierarchy_key->>'id_column'
        ));
        _level_name_cases := _level_name_cases || format(
            'WHEN tsh.hierarchy_level = %s THEN %L',
            _hierarchy_key,
            _store_hierarchy_full_config->_hierarchy_key->>'label'
        );
        _value_name_cases := _value_name_cases || format(
            'WHEN tsh.hierarchy_level = %s THEN tsm.%s',
            _hierarchy_key,
            _store_hierarchy_full_config->_hierarchy_key->>'value_column'
        );
    END LOOP;
    _join_condition := array_to_string(_join_parts, ' OR ');

    _query := format(
        'INSERT INTO price_promo.promo_store_sg_hierarchy (
            promo_id,
            store_group_id,
            store_group_name,
            hierarchy_level_id,
            hierarchy_level_name,
            hierarchy_value_id,
            hierarchy_value_name
        )
        SELECT DISTINCT
            $1 AS promo_id,
            tsg.sg_id AS store_group_id,
            tsg.sg_name AS store_group_name,
            tsh.hierarchy_level AS hierarchy_level_id,
            CASE %s END AS hierarchy_level_name,
            tsh.hierarchy_value AS hierarchy_value_id,
            CASE %s END AS hierarchy_value_name
        FROM pricesmart.tb_sg_hierarchy tsh
        LEFT JOIN pricesmart.tb_store_group tsg ON tsh.sg_id = tsg.sg_id
        LEFT JOIN pricesmart.tb_store_master tsm ON %s
        WHERE tsh.sg_id = ANY($2::integer[])',
        array_to_string(_level_name_cases, ' '),
        array_to_string(_value_name_cases, ' '),
        _join_condition
    );
    EXECUTE _query USING p_promo_id, p_store_group_ids;
END;
$function$;
