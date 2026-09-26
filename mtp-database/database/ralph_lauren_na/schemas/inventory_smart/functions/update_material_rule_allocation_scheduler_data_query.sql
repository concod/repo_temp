--liquibase formatted sql
--changeset liquibase:update_material_rule_allocation_scheduler_update_query runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_material_rule_allocation_scheduler_update_query
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.update_material_rule_allocation_scheduler_data_query(jsonb, jsonb, jsonb, int, int);
CREATE OR REPLACE FUNCTION inventory_smart.update_material_rule_allocation_scheduler_data_query(
    product_attribute_query jsonb, 
    store_attribute_query jsonb, 
    meta_query jsonb, 
    input_values jsonb, 
    logged_in_user_id int
)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
    _query_ph text := '';
    _channel_and_prefix_condition text := '';
    _channel text[] := inventory_smart.get_channel_from_input_new(store_attribute_query);
    data_query text := '';
    scheduler_code int;
    is_scheduler_mapping boolean := false;
    _ph_scheduler_mapping_query text := '';
    _query_table_filters text := '';
BEGIN
    IF cardinality(_channel) = 0 THEN
        RAISE EXCEPTION 'No channel passed';
    ELSE
        _channel_and_prefix_condition = FORMAT('AND ph.channel IN (%L)', array_to_string(_channel, ''',''', ''));
    END IF;
    _query_ph := inventory_smart.form_main_table_filters('ph_master', product_attribute_query);
    
    RAISE NOTICE '%', input_values;
    IF input_values ? 'is_scheduler_mapping' THEN
        is_scheduler_mapping := input_values->>'is_scheduler_mapping';
    ELSE
        RAISE EXCEPTION 'Key "is_scheduler_mapping" not found in input JSON';
    END IF;
    IF input_values ? 'scheduler_code' THEN
        scheduler_code := input_values->>'scheduler_code';
    ELSIF NOT is_scheduler_mapping THEN
        scheduler_code := -1;
    ELSE
        RAISE EXCEPTION 'Key "scheduler_code" not found in input JSON';
    END IF;
    IF NOT is_scheduler_mapping THEN
        _ph_scheduler_mapping_query := 'INNER JOIN 
                (
                    select article, channel from inventory_smart.ph_scheduler_mapping where is_active
                    UNION ALL
                    select article, channel from inventory_smart.ph_scheduler_store_mapping where is_active
                )psm 
                ON psm.article = x.article AND psm.channel = x.channel';
    END IF;
    _query_table_filters := global.form_table_query(meta_query);
    data_query := FORMAT('
		SELECT *, %L AS scheduler_code, %L AS created_by, %L AS updated_by FROM (
            SELECT x.ph_code, x.article, x.channel, x.l0_name
            FROM (
                SELECT ph.*
                FROM inventory_smart.ph_master ph
                %s
                %s
            ) AS x
            %s
        ) foo
        %s
		GROUP BY ph_code, article, channel, l0_name
    ', scheduler_code, logged_in_user_id, logged_in_user_id, _query_ph, _channel_and_prefix_condition, _ph_scheduler_mapping_query,  _query_table_filters);
    RETURN data_query;
END;
$function$;