--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:get_final_product_table stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.get_final_product_table

DROP FUNCTION IF EXISTS base_pricing_restaurant.get_final_product_table;


CREATE OR REPLACE FUNCTION base_pricing_restaurant.get_final_product_table()
 RETURNS TABLE(product_id bigint, result jsonb)
 LANGUAGE plpgsql
AS $function$
DECLARE
    non_editable_list TEXT;
    editable_list TEXT;
    final_sql TEXT;
BEGIN
    -- Build non-editable list
    SELECT string_agg(format('p.%s', c.column_name), ', ')
    INTO non_editable_list
    FROM information_schema.columns c
    WHERE c.table_schema = 'base_pricing_restaurant'
      AND c.table_name   = 'bp_product_attributes'
      AND c.column_name NOT IN (
            SELECT attribute_name 
            FROM base_pricing_restaurant.bp_product_attributes_editableontool
      );

    -- Build editable JSON list
    SELECT string_agg(
               format('(e.editable_json->>''%1$s'') AS %1$s', attribute_name)
           , ', ')
    INTO editable_list
    FROM base_pricing_restaurant.bp_product_attributes_editableontool;

    -- Final dynamic SQL
    final_sql := format(
        $f$
        WITH editable_expanded AS (
            SELECT
                pm.product_id,
                jsonb_object_agg(
                    elem->>'attribute_name',
                    elem->'attribute_value'->>'current'
                ) AS editable_json
            FROM base_pricing_restaurant.bp_product_attributes_mapping pm,
                 jsonb_array_elements(pm.attributes) elem
            WHERE elem->>'attribute_name' IN (
                SELECT attribute_name 
                FROM base_pricing_restaurant.bp_product_attributes_editableontool
            )
            GROUP BY pm.product_id
        )
        SELECT p.product_id, to_jsonb(t.*)
        FROM (
            SELECT
                p.product_id,
                %1$s,
                %2$s
            FROM base_pricing_restaurant.bp_product_attributes p
            LEFT JOIN editable_expanded e
                   ON e.product_id = p.product_id
        ) AS t;
        $f$,
        non_editable_list,
        editable_list
    );

    -- Return results from dynamic SQL
    RETURN QUERY EXECUTE final_sql;
END $function$
;
