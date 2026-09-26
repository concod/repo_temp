--liquibase formatted sql
--changeset liquibase:set_all runOnChange:true stripComments:false splitStatements:false context:MTP-47934 labels:MTP-47934 threshold
--comment: MTP-47934 threshold
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.update_auto_allocation_type_data(jsonb, jsonb, jsonb, jsonb, int4);

CREATE OR REPLACE FUNCTION inventory_smart.update_auto_allocation_type_data(product_attribute_query jsonb, store_attribute_query jsonb, meta_query jsonb, input_values jsonb, logged_in_user_id integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query_ph text := '';
    _channel_and_prefix_condition text := '';
    _channel text[] := inventory_smart.get_channel_from_input_new(store_attribute_query);
    data_query text := '';
    approval_type text;
    threshold float8;
    approval_type_query text := '';
   threshold_query text := '';
    _query_table_filters text := '';
BEGIN
    IF cardinality(_channel) = 0 THEN
        RAISE EXCEPTION 'No channel passed';
    ELSE
        _channel_and_prefix_condition = FORMAT('AND ph.channel IN (%L)', array_to_string(_channel, ''',''', ''));
    END IF;

    _query_ph := inventory_smart.form_main_table_filters('ph_master', product_attribute_query);
    
    RAISE NOTICE '%', input_values;

    IF input_values ? 'approval_type' THEN
        approval_type := input_values->>'approval_type';
        approval_type_query := FORMAT(',  %L AS approval_type', approval_type);
    END IF;
   

    IF input_values ? 'threshold' THEN
        threshold := (input_values->>'threshold');
        threshold_query := FORMAT(',  %L AS threshold', threshold);
    END IF;
   
    --IF approval_type IS NULL AND threshold IS NULL THEN
      --  RETURN '';
--    END IF;

    _query_table_filters := global.form_table_query(meta_query);

    data_query := FORMAT('
        SELECT *,  %L AS created_by, %L AS updated_by %s %s FROM (
            SELECT x.ph_code, x.article, x.channel, x.l0_name
            FROM (
                SELECT ph.*
                FROM inventory_smart.ph_master ph
                %s -- Main table filters
                %s -- Channel condition
            ) AS x
            LEFT JOIN inventory_smart.ph_auto_alloc_rule_mapping paarm ON paarm.article = x.article AND paarm.channel = x.channel
        ) foo
        %s -- Additional table filters
        GROUP BY ph_code, article, channel, l0_name
    ', logged_in_user_id, logged_in_user_id, approval_type_query, threshold_query, _query_ph, _channel_and_prefix_condition,
       _query_table_filters);
	raise notice '%', data_query;
    RETURN data_query;
END;
$function$
;