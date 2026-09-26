--liquibase formatted sql
--changeset shreyansh.pandey:aggregated_calculations_getting_doubled_fix runOnChange:true stripComments:false splitStatements:false context:aggregated_calculations_getting_doubled_fix labels:aggregated_calculations_getting_doubled_fix
--comment: MTP-135192 | replication from levi-lsa
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_store_daily_allocation_aggregated_data(input refcursor, product_attributes jsonb, store_attributes jsonb, _current_date character varying);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_store_daily_allocation_aggregated_data(
    input refcursor,
    product_attributes jsonb,
    store_attributes jsonb,
    _current_date character varying
    ) RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query_pm TEXT := '';
    _query_pa TEXT := '';
    _query_sa TEXT := '';
    _query_store_details TEXT := '';
    _query_reserve_units TEXT := '';
    _query_allocations TEXT := '';
    _query_product_details TEXT := '';
    _pm_filter TEXT := '';
    _query_combine TEXT := '';
    _channel text := inventory_smart.get_channel_from_input(store_attributes);
BEGIN
    RAISE NOTICE '%', store_attributes->>'channel';
    product_attributes := product_attributes || jsonb_build_object('channel', _channel);
    IF _current_date IS NOT NULL AND _current_date != '' THEN
        _pm_filter := format('WHERE (created_at AT TIME ZONE ''UTC'')::date = %L::date AND status = 3 AND is_deleted = false', _current_date);
    ELSE
        _pm_filter := 'WHERE status = 3 AND is_deleted = false and (created_at::timestamptz AT TIME ZONE ''UTC'')::date = now()::date';
    END IF;
   	
   	_query_sa := global.form_main_table_filters('store_attributes_filter', store_attributes);
    _query_pa := global.form_main_table_filters('product_attributes_filter', product_attributes);
   	IF _query_pa = '' THEN
        _query_pa := 'WHERE TRUE';
    END IF;
	IF _query_sa = '' THEN
        _query_sa := 'WHERE TRUE';
    END IF;
	RAISE NOTICE 'query pa --> %', _query_pa;
	RAISE NOTICE 'query sa --> %', _query_sa;

	_query_combine := '
		WITH plan_master AS (
		    SELECT
		        plan_code,
		        name AS allocated_plan_name
		    FROM
		        inventory_smart.plan_master
		    WHERE
		        (created_at AT TIME zone ''UTC'')::date = (' || quote_literal(_current_date) || ')::date
		        AND status = 3
		        AND is_deleted = FALSE
		),
		product_details AS (
		    SELECT *
		    FROM (
		        SELECT *, row_number() OVER (PARTITION BY article ORDER BY l7_name) AS rnk
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
		    WHERE rnk = 1
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
		        SUM(a.units_allocated * COALESCE(dpc.units_in_pack, 1)) AS allocated_quantity,
		        SUM(a.dc_available * COALESCE(dpc.units_in_pack, 1)) AS dc_available
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
		    GROUP BY 1,2,3,4,5
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
		        MAX(updated_oh_oo_it) AS updated_oh_oo_it,
		        MAX(oh) AS oh,
		        MAX(it) AS it,
		        MAX(oo) AS oo,
		        MAX("max") AS max_stock
		    FROM
		        allocations_filtered
		    GROUP BY 1,2,3,4,5
		),
		final_base AS (
		    SELECT
		        allocation_code,
		        allocated_plan_name,
		        article,
		        retail_size_cd,
		        SUM(allocated_quantity) AS allocated_quantity,
		        AVG(dc_available) AS dc_available,
		        AVG(dc_available) - SUM(allocated_quantity) AS remaining_available_to_allocate,
		        SUM(MIN) AS MIN,
		        AVG(wos) AS wos,
		        SUM(wos_allocation) AS wos_allocation,
		        SUM(min_allocation) AS min_allocation,
		        SUM(oh) AS oh,
		        SUM(it) AS it,
		        SUM(oo) AS oo,
		        SUM(total_inventory) AS total_inventory,
		        SUM(max_stock) AS max_stock
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
		            max_stock,
		            wos,
		            oh,
		            it,
		            oo,
		            oh + it + oo AS total_inventory,
		            greatest(0, allocated_quantity - greatest(0, MIN - updated_oh_oo_it)) AS wos_allocation,
		            least(allocated_quantity, greatest(0, MIN - updated_oh_oo_it)) AS min_allocation
		        FROM
		            allocations_base ab
		        LEFT JOIN allocation_constraints ac
		            USING (allocation_code, allocated_plan_name, article, store_code, retail_size_cd)
		    ) a
		    GROUP BY 1,2,3,4
		)
		SELECT
		    COUNT(DISTINCT aa.allocation_code) AS number_of_allocation,
		    COUNT(DISTINCT aa.article) AS number_of_styles,
		    SUM(aa.allocated_quantity) AS total_units_allocated,
		    SUM(aa.min_allocation) AS min_units_allocation,
		    SUM(aa.wos_allocation) AS wos_units_allocation,
		    SUM(aa.dc_available) AS dc_available,
		    SUM(aa.min) AS min,
		    AVG(aa.wos) AS wos,
		    SUM(aa.max_stock) AS max,
		    SUM(aa.oh) AS oh,
		    SUM(aa.it) AS it,
		    SUM(aa.oo) AS oo,
		    SUM(aa.total_inventory) AS total_inventory
		FROM final_base aa;
	';
    
    RAISE NOTICE 'query combine --> %', _query_combine;

    OPEN input FOR EXECUTE _query_combine;
    RETURN input;
END
$function$
;
