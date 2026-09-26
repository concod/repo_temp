--liquibase formatted sql
--changeset shreyansh.pandey:reporting_daily_allocation_product_list_fix runOnChange:true stripComments:false splitStatements:false context:MTP-135192 labels:MTP-135192
--comment: MTP-135192 replication from levi-lsa
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_daily_allocation_product_list(input refcursor, product_attributes jsonb, store_attributes jsonb, table_filters jsonb, _current_date character varying);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_daily_allocation_product_list(
    input refcursor,
    product_attributes jsonb,
    store_attributes jsonb,
    table_filters jsonb,
    _current_date character varying
) RETURNS refcursor
LANGUAGE plpgsql
AS $function$
DECLARE
    _query_pm TEXT := '';
    _pm_filter TEXT := '';
    _query_combine TEXT := '';
    _query_pa TEXT := '';
    _query_sa TEXT := '';
    _query_table_filters TEXT := '';
    _channel text := inventory_smart.get_channel_from_input(store_attributes);
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
    _cache_payload JSONB := jsonb_build_object('product_attributes', product_attributes, 'store_attributes', store_attributes, _current_date, '_current_date');
    _cache_table_id TEXT;
    _cache_schema TEXT := 'inventory_smart';
    _cache_sp TEXT := '.reporting_daily_allocation_product_list';
    _cache_key_pattern TEXT := '{schema_name}:{sp_name}:{request}';
    _cache_dependencies TEXT[] := ARRAY['inventory_smart.plan_master', 'inventory_smart.sku_po_available_units', 'inventory_smart.article_inventory_dashboard', 'inventory_smart.create_allocation_result_flat_gurobi', 'global.product_attributes_filter'];
BEGIN
 SET LOCAL cursor_tuple_fraction = 1.0;
    IF _current_date IS NOT NULL AND _current_date != '' THEN
        _pm_filter := format('WHERE (created_at AT TIME ZONE ''UTC'')::date = (%L AT TIME ZONE ''UTC'')::date AND status = 3 AND is_deleted = false', _current_date);
    ELSE
        _pm_filter := 'WHERE status = 3 AND is_deleted = false and (created_at::timestamptz AT TIME ZONE ''UTC'')::date = (now() at time zone ''UTC'')::date';
    END IF;

    _query_pa := global.form_main_table_filters('product_attributes_filter', product_attributes);
    _query_sa := global.form_main_table_filters('store_attributes_filter', store_attributes);
    _query_table_filters := global.form_table_query(table_filters);

    IF _query_pa = '' THEN
        _query_pa := 'WHERE TRUE';
    END IF;
	IF _query_sa = '' THEN
        _query_sa := 'WHERE TRUE';
    END IF;
    
    RAISE NOTICE 'Product filter table --> %', _query_pa;
    RAISE NOTICE 'Store filter table --> %', _query_sa;
    RAISE NOTICE 'Query filter table --> %', _query_table_filters;
    
    _query_combine := '
      WITH plan_master AS (
        SELECT
          plan_code,
          name AS allocated_plan_name
        FROM
          inventory_smart.plan_master
        WHERE
          (created_at AT TIME ZONE ''UTC'')::DATE = (''' || _current_date || '''::DATE)
          AND status = 3
          AND is_deleted = FALSE
      ),
      product_details AS (
        SELECT * FROM (
          SELECT *, row_number() over(PARTITION BY article ORDER BY l7_name) AS rnk
          FROM (
            SELECT DISTINCT
              article,
              display_article,
              l7_code,
              l7_name,
              l0_name,
              l1_name,
              article_description,
              trim(color_name) AS color
            FROM
              GLOBAL.product_attributes_filter
            ' || _query_pa || '
          ) a
        ) b
        WHERE rnk=1
      ),
      store_details AS (
        SELECT DISTINCT
          store_code
        FROM
          GLOBAL.store_attributes_filter
        WHERE
          TRUE
      ),
      allocations_filtered AS (
        SELECT
          carfg.*,
          pm.allocated_plan_name
        FROM
          inventory_smart.create_allocation_result_flat_gurobi carfg
          JOIN plan_master pm ON pm.plan_code = carfg.allocation_code
        WHERE
          EXISTS (
            SELECT 1
            FROM product_details pd
            WHERE pd.article = carfg.article
          )
          AND EXISTS (
            SELECT 1
            FROM store_details sd
            WHERE sd.store_code = carfg.store
          )
      ),
      allocations_base AS (
        SELECT
          allocation_code,
          allocated_plan_name,
          a.article,
          store AS store_code,
          dpc."size" AS retail_size_cd,
          SUM(a.units_allocated * COALESCE(dpc.units_in_pack,1)) AS allocated_quantity,
          SUM(a.dc_available * COALESCE(dpc.units_in_pack,1)) AS dc_available
        FROM (
          SELECT DISTINCT
            article,
            store,
            allocation_code,
            allocated_plan_name,
            jsonb_object_keys(pack_dc_allocation) AS dc_code,
            jsonb_array_elements_text(pack_dc_allocation -> jsonb_object_keys(pack_dc_allocation) -> ''packs_allocated'')::text AS packs_allocated,
            jsonb_array_elements_text(pack_dc_allocation -> jsonb_object_keys(pack_dc_allocation) -> ''packs_allocated_qty'')::FLOAT8 AS units_allocated,
            jsonb_array_elements_text(pack_dc_allocation -> jsonb_object_keys(pack_dc_allocation) -> ''packs_available_qty'')::FLOAT8 AS dc_available
          FROM
            allocations_filtered
        ) a
        LEFT JOIN inventory_smart.dc_pack_configuration dpc
          ON a.packs_allocated = dpc.pack_type_id
          AND a.article = dpc.article
        GROUP BY 1, 2, 3, 4, 5
      ),
      allocation_constraints AS (
        SELECT
          allocation_code,
          allocated_plan_name,
          article,
          store AS store_code,
          retail_size_cd,
          MAX(MIN) AS MIN,
          MAX(wos) AS wos,
          MAX(updated_oh_oo_it) AS updated_oh_oo_it
        FROM
          allocations_filtered
        GROUP BY 1, 2, 3, 4, 5
      ),
      final_base AS (
        SELECT
          allocation_code,
          allocated_plan_name,
          article,
          SUM(allocated_quantity) allocated_quantity,
          SUM(dc_available) AS dc_available,
          SUM(remaining_available_to_allocate) AS remaining_available_to_allocate,
          SUM(MIN) MIN,
          AVG(wos) wos,
          SUM(wos_allocation) wos_allocation,
          SUM(min_allocation) min_allocation
        FROM (
          SELECT
            allocation_code,
            allocated_plan_name,
            article,
            retail_size_cd,
            SUM(allocated_quantity) allocated_quantity,
            AVG(dc_available) AS dc_available,
            AVG(dc_available) - SUM(allocated_quantity) AS remaining_available_to_allocate,
            SUM(MIN) MIN,
            AVG(wos) wos,
            SUM(wos_allocation) wos_allocation,
            SUM(min_allocation) min_allocation
          FROM (
            SELECT 
              allocation_code,
              allocated_plan_name,
              article,
              store_code,
              retail_size_cd,
              allocated_quantity,
              dc_available,
              MIN,
              wos,
              greatest(0, allocated_quantity - greatest(0, MIN - updated_oh_oo_it)) AS wos_allocation,
              least(allocated_quantity, greatest(0, MIN - updated_oh_oo_it)) AS min_allocation
            FROM
              allocations_base ab
            LEFT JOIN allocation_constraints ac 
              USING(allocation_code, allocated_plan_name, article, store_code, retail_size_cd)
          ) a
          GROUP BY 1, 2, 3, 4
        ) b
        GROUP BY 1, 2, 3
      )
      SELECT
        a.allocated_plan_name,
        b.l7_code,
        b.l7_name,
        b.color,
        b.article,
        b.display_article,
        b.article_description,
        concat(a.article, ''-'', a.allocation_code) AS key,
        COALESCE(SUM(a.allocated_quantity), 0) total_units_allocated,
        COALESCE(SUM(a.min_allocation), 0) min_units_allocation,
        COALESCE(SUM(a.wos_allocation), 0) wos_units_allocation,
        COALESCE(AVG(a.MIN), 0) AS mins,
        round(CAST(SUM(a.dc_available) AS INT), 0) AS dc_available,
        round(CAST(COALESCE(AVG(a.wos), 0) AS numeric), 2) AS wos,
        round(CAST(COALESCE(MAX(aid.actual_wos), 0) AS numeric), 2) AS actual_wos,
        round(CAST(COALESCE(SUM(a.remaining_available_to_allocate), 0) AS INT), 0) AS remaining_available_to_allocate
      FROM
        final_base a
        JOIN product_details b USING(article)
        LEFT JOIN (
          SELECT
            article,
            AVG(wos_oh_it_oo) actual_wos
          FROM
            inventory_smart.article_inventory_dashboard aid
          GROUP BY 1
        ) aid USING(article)
      GROUP BY 1, 2, 3, 4, 5, 6, 7, 8
    ';
    RAISE NOTICE 'query combine --> %', _query_combine;
    perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.reporting_daily_allocation_product_list', 'Before returning function value',_query_combine,jsonb_build_object('product attribute',$2,'store attributes',$3,'table_filters',$4,'_current_date',$5)) ;		

    OPEN input FOR EXECUTE _query_combine;
    RETURN input;
END
$function$;
