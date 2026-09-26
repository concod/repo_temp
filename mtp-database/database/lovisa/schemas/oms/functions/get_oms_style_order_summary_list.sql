--liquibase formatted sql
--changeset charan.reddy:get_oms_style_order_summary_list_update_v26 runOnChange:true stripComments:false splitStatements:false context:MTP-91440 labels:style_order_summary_vs_test_update7
--comment: Added coalesce for oo_it
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_style_order_summary_list(refcursor, jsonb, jsonb, text, text, text);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_style_order_summary_list(input refcursor, product_filter jsonb, meta jsonb, styles text, months text, fiscal_weeks text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_choice_filter text := '';
    v_time_filter text := '';
    v_meta_cls text := '';
    v_query text := '';
    v_where text := '';
    v_pa_query text := '';
    v_limit_cls text := '';
    v_search_cls text := '';
    v_sort_cls text := '';
    limit_json jsonb := '{}';
    search_json jsonb:= '{}'; 
    sort_json jsonb := '{}';
    default_sort text := ' ORDER BY editable_expected_receipt_date ASC';
    v_product_filter_for_pa jsonb;
    v_dc_filter_cls text := '';
BEGIN
    -- Pop global DC filter from product filter: product_attribute_query can contain
    -- dimension "linked_store_codes" (e.g. DC codes). Use only product dimensions for
    -- product_attributes_filter; apply DC filter separately in WHERE.
    v_product_filter_for_pa := product_filter - 'linked_store_codes';
    
    -- Form product attributes filter query
    v_pa_query := global.form_main_table_filters('product_attributes_filter', v_product_filter_for_pa);
	v_pa_query := REPLACE(v_pa_query,'article','l4_name');
    RAISE NOTICE 'v_pa_query: %', v_pa_query;
    
    -- Build DC filter clause if linked_store_codes exists in product_filter
    IF product_filter ? 'linked_store_codes' AND jsonb_typeof(product_filter->'linked_store_codes') = 'array'
       AND jsonb_array_length(product_filter->'linked_store_codes') > 0
       AND jsonb_array_length((product_filter->'linked_store_codes')->0->'values') > 0 THEN
        SELECT ' AND oor.loc_code = ANY(ARRAY[' || string_agg(quote_literal(elem::text), ',') || ']::text[]) '
          INTO v_dc_filter_cls
          FROM jsonb_array_elements_text((product_filter->'linked_store_codes')->0->'values') AS elem;
    END IF;

    -- Product attributes filter will be applied in the paf_filtered CTE

    -- Generate Choice filter dynamically
    IF styles IS NOT NULL AND styles <> '' AND styles <> '[]' THEN
        v_choice_filter := 'oor.article IN (' || styles || ')';
    ELSE
        v_choice_filter := '0=1'; -- No Choice filter applied if the array is empty
    END IF;

    -- Generate month and fiscal month filter
    IF (months IS NOT NULL AND months <> '') OR (fiscal_weeks IS NOT NULL AND fiscal_weeks <> '') THEN
        v_time_filter := '(';
        IF months IS NOT NULL AND months <> '' THEN
            v_time_filter := v_time_filter || 'oor.month IN (' || upper(months) || ')';
        END IF;
        IF fiscal_weeks IS NOT NULL AND fiscal_weeks <> '' THEN
            IF months IS NOT NULL AND months <> '' THEN
                v_time_filter := v_time_filter || ' OR ';
            END IF;
            v_time_filter := v_time_filter || 'oor.fiscal_year_week IN (' || fiscal_weeks || ')';
        END IF;
        v_time_filter := v_time_filter || ')';
    ELSE
        v_time_filter := '0=1'; -- No time filter applied if both arrays are empty
    END IF;

    search_json = meta;
     if meta <> '{}' and  meta -> 'limit' is not null then
        -- Extract the 'limit' object
        limit_json := meta -> 'limit';
        search_json := search_json - 'limit';
        v_limit_cls := global.form_table_query(jsonb_build_object('limit', limit_json)) ;
      end if;
     
     if meta <> '{}' and meta -> 'sort' is not null then 
     -- Extract the 'sort' object
        sort_json := meta -> 'sort';
        search_json := search_json - 'sort';
        v_sort_cls := global.form_table_query(jsonb_build_object('sort', sort_json)) ;
     end if;

    -- Generate meta conditions dynamically if provided
    IF meta <> '{}' THEN
        v_meta_cls := global.form_table_query(search_json);
         v_meta_cls := REPLACE(v_meta_cls, 'article', 'paf.article');
    END IF;

    -- Build the optimized query with CTEs
    v_query := 
    'WITH oor_filtered AS (
        SELECT 
            oor.*
        FROM 
            inventory_smart.oms_orders_recommended oor
        WHERE 
            ' || v_choice_filter || '
            ' || COALESCE('AND ' || v_time_filter, '') || '
            ' || v_dc_filter_cls || '
    ),
    paf_filtered AS (
        SELECT DISTINCT on (paf.l4_name)
            paf.style_name,
            paf.l1_name,
            paf.l2_name,
            paf.l3_name,
            paf.l4_name,
            paf.range_usa,
            paf.range_eu_uk,
            paf.range_au_nz,
            paf.range_asia,
            paf.range_africa
        FROM 
            global.product_attributes_filter paf
        ' || v_pa_query || ' and ordering = ''Y''
    )
    SELECT
        paf.style_name,
        oor.article,
        oor.order_type,
        oor.order_group_id,
        oor.order_placement_date,
      
        paf.l1_name,
        paf.l2_name,
        paf.l3_name,
        paf.l4_name,
        paf.range_usa,
        paf.range_eu_uk,
        paf.range_au_nz,
        paf.range_asia,
        paf.range_africa,
        max(um_created.name) as created_by,
        max(oor.created_at) as created_at,
        max(um.name) as updated_by,
        max(oor.updated_at) as updated_at,
        SUM(COALESCE(ootb.otb, 0)) AS otb,
		SUM(ootb.mfp_units) as mfp_units,

        SUM(oor.elt_projected_bop) AS elt_projected_bop,
        SUM(oor.elt_projected_store_inv) as elt_projected_store_inv,
		SUM(oor.elt_projected_bop + oor.elt_projected_store_inv) as total_inventory,
       
        SUM(COALESCE(opm.oo + opm.it, 0)) AS oo_it,
        SUM(oor.elt_projected_safety_stock) AS elt_projected_safety_stock,
        SUM(oor.order_quantity) AS order_quantity,
        SUM(oor.unit_cost * oor.order_quantity) AS order_cost,
        COALESCE(
            ROUND(
                SUM(oor.unit_cost * oor.order_quantity)::numeric
                /
                NULLIF(SUM(oor.order_quantity)::numeric, 0),
                2
            ),
            0
        ) AS landed_cost,
        SUM(oor.raw_roq) AS raw_roq,
        SUM(oor.roq_constrained) as roq_constrained,
        SUM(oor.roq_unconstrained) as roq_unconstrained,
		
		SUM(oor.min_order_quantity_style) as min_order_quantity_style,
		SUM(oor.ia_shipment_order_quantity) as ia_shipment_order_quantity,

        MIN(oor.order_placement_recom_date) as order_placement_recom_date,
        MIN(oor.editable_expected_receipt_date) as editable_expected_receipt_date,
        oor.order_status_id,
        ''View Order Info'' AS order_info,
        STRING_AGG(DISTINCT oor.order_gen_type, '','') AS order_gen_type
    FROM
        oor_filtered oor
    INNER JOIN
        paf_filtered paf ON paf.l4_name = oor.product_code
    LEFT JOIN
        global.fiscal_date_mapping fdm ON fdm.calendar_date = oor.expected_receipt_date
    LEFT JOIN
        inventory_smart.oms_otb ootb ON ootb.product_code = oor.product_code and ootb.loc_code = oor.loc_code and ootb.fiscal_year_week = oor.fiscal_year_week
    LEFT JOIN
        inventory_smart.oms_po_master opm ON opm.product_code = oor.product_code and opm.loc_code = oor.loc_code and opm.fiscal_year_week = fdm.fiscal_year_week
    LEFT join
    	global.user_master um on um.user_code=oor.updated_by
    left join
        global.user_master um_created on um_created.user_code=oor.created_by
    ' || v_meta_cls || '
    GROUP BY
        paf.style_name,
        oor.article,
        oor.order_type,
        oor.order_group_id,
        oor.order_placement_date,
        paf.l1_name,
        paf.l2_name,
        paf.l3_name,
        paf.l4_name,
        paf.range_usa,
        paf.range_eu_uk,
        paf.range_au_nz,
        paf.range_asia,
        paf.range_africa,
        oor.order_status_id
        '|| COALESCE(NULLIF(v_sort_cls, ''), default_sort) ||' '|| v_limit_cls ||'';

    -- Log the query for debugging
    RAISE NOTICE 'Executing query: %', v_query;

    -- Execute the query and open the refcursor
    OPEN input FOR EXECUTE v_query;

    -- Return the refcursor
    RETURN input;
END;
$function$
;
