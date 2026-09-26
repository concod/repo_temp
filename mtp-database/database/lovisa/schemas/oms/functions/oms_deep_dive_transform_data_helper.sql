--liquibase formatted sql
--changeset mssprakash.yashwanth:oms_deep_dive_transform_data_helper1 runOnChange:true stripComments:false splitStatements:false context:MTP-58684 labels:oms_deep_dive_transform_data_helper
--comment: extracted DC filter from product filter
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.oms_deep_dive_transform_data_helper(jsonb, text, text, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.oms_deep_dive_transform_data_helper(product_filter jsonb, start_date text, end_date text, store_filter jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(product_code character varying, vendor_code character varying, loc_code character varying)
 LANGUAGE plpgsql
AS $function$
DECLARE
    where_paf_condition TEXT := '';
    where_saf_condition text := '';
    transform_query text := '';
    v_product_filter_for_pa jsonb;
    v_dc_filter_cls text := '';
BEGIN
    -- Pop global DC filter from product filter: product_attribute_query can contain
    -- dimension "linked_store_codes" (e.g. DC codes). Use only product dimensions for
    -- product_attributes_filter; apply DC filter separately in WHERE.
    v_product_filter_for_pa := product_filter - 'linked_store_codes';
    
    -- Generate the WHERE conditions from the product_filter JSONB
    where_paf_condition := inventory_smart.form_main_table_filters('ph_master', v_product_filter_for_pa);
    -- Lovisa uses l4_name as article; align filters accordingly
    where_paf_condition = REPLACE(where_paf_condition,'article','l4_name');
    where_saf_condition := inventory_smart.form_main_table_filters('ph_master', store_filter);
    
    -- Build DC filter clause if linked_store_codes exists in product_filter
    IF product_filter ? 'linked_store_codes' AND jsonb_typeof(product_filter->'linked_store_codes') = 'array'
       AND jsonb_array_length(product_filter->'linked_store_codes') > 0
       AND jsonb_array_length((product_filter->'linked_store_codes')->0->'values') > 0 THEN
        SELECT ' AND oor.loc_code = ANY(ARRAY[' || string_agg(quote_literal(elem::text), ',') || ']::text[]) '
          INTO v_dc_filter_cls
          FROM jsonb_array_elements_text((product_filter->'linked_store_codes')->0->'values') AS elem;
    END IF;
   
    IF where_saf_condition IS NULL OR where_saf_condition = '' THEN
        where_saf_condition := 'WHERE 1=1';
    END if;
   
    RAISE NOTICE 'Where PAF Condition: %', where_paf_condition;
    RAISE NOTICE 'Where SAF Condition: %', where_saf_condition;

    -- Construct the dynamic SQL query
    transform_query := '
    with filtered_product_data as (
        select distinct on (l4_name) l4_name, size, article
        from global.product_attributes_filter
        ' || where_paf_condition || '
    ),
	filtered_store_data as (
		select store_name, store_code
		from global.store_attributes_filter 
		' || where_saf_condition || '
		and active = True and special_classification = ''WHS''
	)
	SELECT DISTINCT oor.product_code, oor.vendor_code, oor.loc_code
    	FROM inventory_smart.oms_orders_recommended oor
    	INNER JOIN filtered_product_data ON oor.product_code = filtered_product_data.l4_name
		INNER JOIN filtered_store_data ON oor.loc_code = filtered_store_data.store_code
		WHERE 1=1
		' || v_dc_filter_cls || '
    	--WHERE oor.fiscal_year_week BETWEEN ''' || start_date || ''' AND ''' || end_date || ''';
    	';
    RAISE NOTICE 'Transform Query: %', transform_query;

    -- Execute the dynamic SQL query and return the results
    RETURN QUERY EXECUTE transform_query;
END;
$function$
;
