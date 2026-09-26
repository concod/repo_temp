--liquibase formatted sql
--changeset shubham.singh:constraints_store_list-2 runOnChange:true stripComments:false splitStatements:false context:MTP-76662 labels:MTP-76662
--comment: MTP-76662 added custom/constrain master filter
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.constraints_store_list(input refcursor, jsonb, jsonb, jsonb, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.constraints_store_list(input refcursor, jsonb, jsonb, jsonb, jsonb)
RETURNS refcursor
LANGUAGE plpgsql
AS $function$
DECLARE
    _query_pa TEXT;
    _query_sa TEXT;
    _query_combine_format TEXT;
    _query_table_filters TEXT;
    _client_columns TEXT;
    _query_l0_name TEXT := '';
    _ph_search TEXT := '';
    _sa_search TEXT := '';
    _overall_search TEXT := '';
    _dummy TEXT := '';
    _constraint_master_filters TEXT;

BEGIN
    -- Extract l0_name filter
    SELECT $2->>'l0_name' INTO _query_l0_name;
    IF LENGTH(_query_l0_name) > 0 THEN
        _query_l0_name := format('{"l0_name": %1$s}', _query_l0_name);
        _query_l0_name := inventory_smart.form_main_table_filters('ph_master', _query_l0_name::jsonb);
    ELSE
        _query_l0_name := '';
    END IF;
    
    -- Generate search and sort clauses
    SELECT * FROM inventory_smart.form_search_sort_clause($5, 'ph_master', 'inventory_smart') INTO _dummy, _ph_search, _overall_search, _dummy, _dummy, _dummy, _dummy;
    SELECT * FROM inventory_smart.form_search_sort_clause($5, 'store_attributes_filter', 'global') INTO _dummy, _sa_search, _dummy, _dummy, _dummy, _dummy, _dummy;
    
    -- Combine table filters
    _query_table_filters := _overall_search || REPLACE(global.form_table_query($5), 'WHERE', 'AND');
    _query_table_filters := REGEXP_REPLACE(
       _query_table_filters,
        'stores\.0\.(\w+)',
        '(stores->0->>''\1'')::int',
        'g'
    );
    RAISE NOTICE 'Table filters %', _query_table_filters;
    -- Prepare queries for product and store attributes
    _query_pa := 'SELECT *, article AS product_code FROM inventory_smart.ph_master ph ' || inventory_smart.form_main_table_filters('ph_master', $2);
    _query_sa := 'SELECT * FROM global.store_attributes_filter saf ' || global.form_main_table_filters('store_attributes_filter', $3);
    _constraint_master_filters :=  REPLACE(inventory_smart.form_main_table_filters('constraint_master', $4), 'WHERE', 'AND');

    -- Construct final query
    _query_combine_format := '
        WITH paf AS (' || _query_pa || _ph_search || '),
        saf AS (' || _query_sa || _sa_search || '),
        pmps_partition AS (
            SELECT * FROM global.product_mapping_product_store ' || _query_l0_name || '
        ),
        product_master_filters_data AS (
            SELECT 
                pmps_partition.product_code, pmps_partition.mapping_code, pmps_partition.store_code,
                paf.article_status_tag, paf.l0_name, paf.l1_name, paf.l2_name, paf.product_channel_name,
                paf.article, paf.store_pack_size, paf.product_description, paf.planning_ownership,
                paf.merchandise_category, paf.merchandise_brand, paf.metal_color, paf.metal_type,
                paf.sku_grade, paf.drop_ship_ind, paf.dotcom_exclusive,
                saf.store_name, saf.district, saf.dma_name, saf.shop_in_shop, saf.combo_store, saf.channel
            FROM pmps_partition  
            INNER JOIN saf USING(store_code)
            INNER JOIN paf USING (l0_name, product_code)
        ),
        constraint_master_partition AS (
            SELECT * FROM inventory_smart.constraint_master ' || _query_l0_name || _constraint_master_filters || '
        ),
        filtered_constraint_master_partition AS (
            SELECT 
                pmps.*, COALESCE(c.updated_by, c.created_by) AS user_code,
                TO_CHAR(COALESCE(c.updated_at, c.created_at) AT TIME ZONE ''EST'', ''YYYY-MM-DD HH24:MI:SS'') AS updated_at,
				jsonb_build_array(
					jsonb_build_object(
						''wos'', c.wos::TEXT,
						''min_store'', c.min_stock::TEXT,
						''max_store'', c.max_stock::TEXT,
						''min_store_sum'', c.min_stock::TEXT,
						''max_store_sum'', c.max_stock::TEXT
                	) 
				) AS stores
            FROM constraint_master_partition c
            JOIN product_master_filters_data pmps USING(product_code, store_code)
            WHERE c.mapping_code IS NOT NULL
        ),
        constraint_data AS (
            SELECT 
                pmps.product_code, pmps.mapping_code, pmps.store_code, pmps.district, pmps.product_channel_name,
                pmps.l0_name, pmps.l1_name, pmps.l2_name, pmps.article, pmps.product_description, pmps.article_status_tag,
                pmps.store_name, pmps.channel, pmps.planning_ownership, pmps.dma_name AS dma, pmps.combo_store AS combo_store_flag,
                pmps.shop_in_shop, pmps.store_pack_size, pmps.metal_color, pmps.metal_type, pmps.merchandise_brand,
                pmps.merchandise_category, pmps.sku_grade, pmps.drop_ship_ind, pmps.dotcom_exclusive, asg.grade AS store_grade,
                CASE 
                    WHEN asg.grade = ''AAA'' THEN 1 
					WHEN asg.grade = ''AA'' THEN 2
                    WHEN asg.grade = ''A'' THEN 3 
					WHEN asg.grade = ''B'' THEN 4
                    WHEN asg.grade = ''C'' THEN 5 
					WHEN asg.grade = ''D'' THEN 6
                    ELSE 11
                END AS store_grade_priority,
                pmps.stores, pmps.user_code, pmps.updated_at
            FROM filtered_constraint_master_partition pmps
            LEFT JOIN inventory_smart.article_store_grade asg USING (store_code, article)
            ORDER BY article ASC, product_code ASC, store_code ASC
        ),
        constraint_data_limit_and_query AS (
            SELECT * FROM constraint_data WHERE TRUE ' || _query_table_filters || '
        ),
        final AS (
            SELECT cd.*, name AS updated_by FROM constraint_data_limit_and_query cd
            LEFT JOIN global.user_master um USING (user_code)
        )
        SELECT * FROM final;
    ';
    
    -- Debugging purpose
    RAISE NOTICE '%', _query_combine_format;
    
    -- Execute and return result
    OPEN input FOR EXECUTE _query_combine_format;
    RETURN input;
END;
$function$
;
