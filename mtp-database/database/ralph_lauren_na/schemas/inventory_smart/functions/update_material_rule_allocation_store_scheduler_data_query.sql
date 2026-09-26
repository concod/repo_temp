--liquibase formatted sql
--changeset liquibase:update_material_rule_allupdate_material_rule_allocation_store_scheduler_data_queryocation_scheduler_update_query runOnChange:true stripComments:false splitStatements:false context:MTP-62944 labels:MTP-62944
--comment: MTP-62944 unmapping fixed
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.update_material_rule_allocation_store_scheduler_data_query(jsonb, jsonb, integer, text, jsonb, jsonb, jsonb, integer);
CREATE OR REPLACE FUNCTION inventory_smart.update_material_rule_allocation_store_scheduler_data_query(
    product_attribute_query jsonb,
    store_attribute_query jsonb, 
    application_code integer,
    client_columns text,
    meta_query jsonb,
    product_rule_attribute_query jsonb,
    input_values jsonb, 
    logged_in_user_id integer
)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
    _query_ph text := '';
    _query_store text := '';
    data_query text := '';
    scheduler_code int;
    is_scheduler_mapping boolean := false;
    _ph_scheduler_mapping_query text := '';
    _query_table_filters text := '';
    temp_refcursor refcursor := '';
    _product_rule_query text := '';
BEGIN
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
        _ph_scheduler_mapping_query := 'INNER JOIN inventory_smart.ph_scheduler_store_mapping pssm ON pssm.article = ps.article AND pssm.channel = ps.channel AND pssm.store_code = ps.store_code AND pssm.is_active = true';
    END IF;
    temp_refcursor := 'cursor_' || to_char(current_timestamp, 'YYYYMMDDHH24MISSUS');
    _product_rule_query := inventory_smart.product_rule(temp_refcursor, 
                                                        product_attribute_query, 
                                                        store_attribute_query, 
                                                        application_code, 
                                                        client_columns, 
                                                        meta_query, 
                                                        product_rule_attribute_query);
    _query_store := global.form_main_table_filters('store_attributes_query', store_attribute_query);
    _query_table_filters := global.form_table_query(meta_query);
    data_query := FORMAT('
		with ph_base as (
            select bs.*, unnest(product_codes) as product_code from (
                %s -- _product_rule_query
            ) bs
        ),
        product_store as (
            select ph.*, pmps.store_code, saf.store_name from ph_base ph
            inner join "global".product_mapping_product_store pmps using (product_code) 
            inner join "global".store_attributes_filter saf 
            using(store_code, channel)
            %s -- store filter
            AND saf.active
        ),
        filtered_data as (
            select ps.* from product_store ps
            %s -- inner join inventory_smart.ph_scheduler_store_mapping
            %s -- meta filter
        )
        select ph_code, article, channel, store_code, l0_name, %L AS scheduler_code, %L AS created_by, %L AS updated_by, true as is_active from filtered_data
        group by ph_code, article, channel, store_code, l0_name
    ', _product_rule_query, _query_store, _ph_scheduler_mapping_query, _query_table_filters, scheduler_code, logged_in_user_id, logged_in_user_id);
    RETURN data_query;
END;
$function$;
