--liquibase formatted sql
--changeset raja.duraisamy:style_order_summary_victoria_secret_34 runOnChange:true stripComments:false splitStatements:false context:MTP-125486_2 labels:style_order_summary_vs_test_update6
--comment: Updated to filter by Projected Receipt Date (expected_receipt_date) instead of Order Placement Date for month and fiscal_week filters
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_style_order_detailed_channel_summary(refcursor, jsonb, jsonb, text, text, text, text);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_style_order_detailed_channel_summary(input refcursor, product_filter jsonb, meta jsonb, order_group_id text, styles text, months text, fiscal_weeks text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_order_detailed_summary_sql TEXT := '';
    v_order_filter text := '';
    v_choice_filter text := '';
    v_time_filter text := '';
    v_meta_cls text := '';
    v_where text := '';
    search_json jsonb:= '{}'; 
    limit_json jsonb := '{}';
    sort_json jsonb := '{}';
    v_sort_cls text := '';
    v_limit_cls text := '';
    v_product_filter_sql text := '';
    v_size_sort jsonb := NULL;
    v_order_direction text := '';
    v_product_filter_for_pa jsonb;
    v_dc_filter_cls text := '';
BEGIN
    -- Pop global DC filter from product filter: product_attribute_query can contain
    -- dimension "linked_store_codes" (e.g. DC codes). Use only product dimensions for
    -- product_attributes_filter; apply DC filter separately in WHERE.
    v_product_filter_for_pa := product_filter - 'linked_store_codes';
    
    -- Generate product attribute filter SQL
    v_product_filter_sql := inventory_smart.form_main_table_filters('product_attributes_filter', v_product_filter_for_pa);
    v_product_filter_sql := REPLACE(v_product_filter_sql, 'article', 'display_article');
    
    -- Build DC filter clause if linked_store_codes exists in product_filter
    IF product_filter ? 'linked_store_codes' AND jsonb_typeof(product_filter->'linked_store_codes') = 'array'
       AND jsonb_array_length(product_filter->'linked_store_codes') > 0
       AND jsonb_array_length((product_filter->'linked_store_codes')->0->'values') > 0 THEN
        SELECT ' AND oor.loc_code = ANY(ARRAY[' || string_agg(quote_literal(elem::text), ',') || ']::text[]) '
          INTO v_dc_filter_cls
          FROM jsonb_array_elements_text((product_filter->'linked_store_codes')->0->'values') AS elem;
    END IF;

    v_where := 'JOIN (SELECT distinct on (l4_name) * FROM global.product_attributes_filter ' || COALESCE(NULLIF(TRIM(v_product_filter_sql), ''), ' WHERE 1=1') || ' and ordering = ''Y'') paf ON paf.l4_name = oor.product_code';

    -- Generate Order filter
    IF order_group_id IS NOT NULL THEN
        v_order_filter := 'oor.order_group_id = ''' || order_group_id || '''';
    ELSE
        v_order_filter := '0=1'; -- No order filter applied if the value is null
    END IF;

    -- Generate Choice filter dynamically
    IF styles IS NOT NULL THEN
        v_choice_filter := 'paf.l4_name IN (' || styles || ')';
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
        v_time_filter := '1=1'; -- No time filter applied if both arrays are empty
    END IF;

    IF meta IS NOT NULL AND jsonb_typeof(meta) = 'object' AND meta <> '{}'::jsonb THEN
        -- Check if size is in sort array and remove it
        IF meta->'sort' IS NOT NULL AND jsonb_array_length(meta->'sort') > 0 THEN
            FOR i IN 0..jsonb_array_length(meta->'sort')-1 LOOP
                IF (meta->'sort'->i->>'column') = 'size' THEN
                    v_size_sort := meta->'sort'->i;
                    -- Remove size from sort array
                    meta := jsonb_set(
                        meta,
                        '{sort}',
                        (meta->'sort') - i
                    );
                    EXIT;
                END IF;
            END LOOP;
        END IF;
    END IF;
    -- Handle size sorting
    IF v_size_sort IS NOT NULL AND v_size_sort->>'order' = 'desc' THEN
        v_order_direction := 'DESC';
    ELSE
        v_order_direction := 'ASC';
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
        v_meta_cls := REPLACE(v_meta_cls, 'loc_code', 'oor.loc_code');
         v_meta_cls := REPLACE(v_meta_cls, 'size', 'paf.size');
         v_meta_cls := REPLACE(v_meta_cls, 'order_status', 'order_gen_type');
         v_meta_cls := REPLACE(v_meta_cls, 'article', 'oor.display_article');
    END IF;

    -- Build the main query
    v_order_detailed_summary_sql := '
WITH shipment_modes AS (
    SELECT 
        oclt.loc_code,
        oclt.article,
        JSON_AGG(
            JSON_BUILD_OBJECT(
                ''shipment_mode'', oclt.mode_shipment,
                ''lead_time'', oclt.lead_time,
                ''default_mode'', oclt.default_mode
            )
        ) AS shipment_modes
    FROM 
        inventory_smart.oms_constraints_lead_time oclt
    GROUP BY 
        oclt.loc_code, 
        oclt.article
)
select
    paf.l4_name,
    paf.style_name,
    oor.loc_code,
    dc.name as dc_name,
    SUM(COALESCE(ootb.otb, 0)) AS otb,
    SUM(oor.elt_projected_store_inv) as elt_projected_store_inv,
    SUM(oor.elt_projected_bop) as elt_projected_bop,
    SUM(oor.elt_projected_store_inv + oor.elt_projected_bop) AS total_inv,
    SUM(COALESCE(opm.oo + opm.it, 0)) as oo_it,
    sum(oor.elt_projected_safety_stock) as elt_projected_safety_stock,
    SUM(oor.roq_constrained) as roq_constrained,
    SUM(oor.unit_cost * oor.order_quantity) as order_cost,
    sum(oor.unit_cost) as unit_cost,
    sum(oor.order_quantity) as order_quantity,
    SUM(oor.raw_roq) as raw_roq,
    SUM(oor.roq_unconstrained) as roq_unconstrained,
    AVG(oor.order_to_po_processing_time) as order_to_po_processing_time,
    AVG(oor.lead_time) as lead_time,
    oor.editable_expected_receipt_date,
    oor.order_placement_date,
    MAX(sm.shipment_modes::TEXT)::JSON AS shipment_modes,
    oor.order_status_id,
    oor.expected_receipt_date,
    oor.order_reason,
    MAX(oor.lead_time) as lead_time,
    MAX(oor.mode_shipment) as mode_shipment,
    CONCAT(oor.loc_code, ''-'', oor.expected_receipt_date) as loc_projected_recommend_date,
    string_agg(distinct oor.order_gen_type, '','') as order_gen_type,
    JSON_AGG(
        JSON_BUILD_OBJECT(
            ''id'', oor.id,
            ''loc_code'', oor.loc_code,
            ''order_group_id'', oor.order_group_id,
            
            -- ''l1_name'', paf.l1_name,
            -- ''l2_name'', paf.l2_name,
            -- ''l3_name'', paf.l3_name,

            ''l4_name'', paf.l4_name,
            ''style_name'',paf.style_name,

			-- ''range_usa'', paf.range_usa,
			-- ''range_eu_uk'', paf.range_eu_uk,
            -- ''range_au_nz'', paf.range_au_nz,
            -- ''range_asia'', paf.range_asia,
			-- ''range_africa'', paf.range_africa,

           ''size'', paf.size,
            ''elt_projected_bop'', oor.elt_projected_bop,
            ''elt_projected_store_inv'', oor.elt_projected_store_inv,
            ''total_inv'', oor.elt_projected_store_inv + oor.elt_projected_bop,
            ''oo_it'', COALESCE(opm.oo + opm.it, 0),
            ''elt_projected_safety_stock'', oor.elt_projected_safety_stock,
            ''order_placement_date'', oor.order_placement_date,
            ''unit_cost'', oor.unit_cost,
            ''order_quantity'', oor.order_quantity,
            ''order_cost'', oor.order_quantity * oor.unit_cost,
            ''raw_roq'', oor.raw_roq,
            ''ia_shipment_order_quantity'', oor.ia_shipment_order_quantity,
            ''roq_unconstrained'', oor.roq_unconstrained,
            ''roq_constrained'', oor.roq_constrained,
            ''order_to_po_processing_time'', oor.order_to_po_processing_time,
            ''lead_time'', oor.lead_time,
            ''expected_receipt_date'', oor.expected_receipt_date,
            ''editable_expected_receipt_date'', oor.editable_expected_receipt_date,
            ''order_type'', oor.order_type,
            ''min_order_quantity'', oor.min_order_quantity_style,
            ''max_order_quantity'', oor.max_order_quantity_style,
            ''order_multiple'', oor.order_multiple,
            ''order_reason'', oor.order_reason,
            ''order_gen_type'', oor.order_gen_type,
            ''effective_lead_time'',oor.effective_lead_time,
            ''ship_mode'',oor.mode_shipment,
            ''otb'', COALESCE(ootb.otb, 0),
            ''updated_at'',oor.updated_at,
            ''updated_by'',u.updated_by,
            ''loc_projected_recommend_date'', CONCAT(oor.loc_code, ''-'', oor.expected_receipt_date)
        ) ORDER BY ast.order ' || v_order_direction || '
    ) AS status_obj
        FROM
        inventory_smart.oms_orders_recommended oor
    LEFT JOIN
        global.fiscal_date_mapping fdm ON fdm.calendar_date = oor.expected_receipt_date
    LEFT JOIN global.user_master u on u.user_code = oor.updated_by
    LEFT JOIN ( SELECT l4_name, size, MIN("order") AS "order"  FROM inventory_smart.article_status_tag
        GROUP BY l4_name, size ) ast ON ast.size = oor.size and ast.l4_name = oor.product_code
    LEFT JOIN 
        shipment_modes sm ON sm.loc_code = oor.loc_code AND sm.article = oor.article 
    LEFT JOIN
        inventory_smart.oms_kpi ok ON ok.product_code = oor.product_code and ok.loc_code = oor.loc_code
    LEFT JOIN
        inventory_smart.oms_otb ootb ON ootb.product_code = oor.product_code AND ootb.loc_code = oor.loc_code AND ootb.channel = oor.channel AND ootb.fiscal_year_week = oor.fiscal_year_week
    LEFT JOIN
        inventory_smart.oms_po_master opm ON opm.product_code = oor.product_code and opm.loc_code = oor.loc_code and opm.fiscal_year_week = fdm.fiscal_year_week
    INNER JOIN 
        global.distribution_centres dc ON dc.linked_store_code = oor.loc_code
            ' || v_where || ' AND ' || v_order_filter || ' AND ' || v_choice_filter ||'
            ' || COALESCE('AND ' || v_time_filter, '') ||'
            ' || v_dc_filter_cls || '
            ' || v_meta_cls || '
    GROUP BY 
        paf.l4_name,
        paf.style_name,
        oor.loc_code,
        dc.name,
        oor.editable_expected_receipt_date,
        oor.expected_receipt_date,
        oor.order_placement_date,
        oor.order_reason,
        oor.order_status_id
        '|| v_sort_cls ||' '|| v_limit_cls ||'';

    RAISE NOTICE 'v_order_detailed_summary_sql: %', v_order_detailed_summary_sql;

    -- Open the cursor for the constructed query
    OPEN input FOR EXECUTE v_order_detailed_summary_sql;
    RETURN input;
END
$function$
;
