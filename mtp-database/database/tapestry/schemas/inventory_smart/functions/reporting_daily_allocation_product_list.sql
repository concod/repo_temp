--liquibase formatted sql
--changeset mahesh.nv:reporting_daily_allocation_product_list runOnChange:true stripComments:false splitStatements:false context:MTP-64612 labels:MTP-64612
--comment: initial comment MTP-64612
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
    IF _current_date IS NOT NULL AND _current_date != '' THEN
        _pm_filter := format('WHERE (created_at AT TIME ZONE ''Pacific/Auckland'')::date = (%L AT TIME ZONE ''Pacific/Auckland'')::date AND status = 3 AND is_deleted = false', _current_date);
    ELSE
        _pm_filter := 'WHERE status = 3 AND is_deleted = false and (created_at::timestamptz AT TIME ZONE ''Pacific/Auckland'')::date = (now() at time zone ''Pacific/Auckland'')::date';
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
WITH plan_master AS
(
    SELECT  plan_code
        ,name AS allocated_plan_name
    FROM inventory_smart.plan_master
    WHERE (created_at AT TIME ZONE ''Pacific/Auckland'') :: date = (' || quote_literal(_current_date) || ') :: date
            AND status = 3
    AND is_deleted = false 
), product_details AS
(
    SELECT  DISTINCT article
    	,product_code
	    ,size
        ,l0_name
        ,l1_name
        ,l2_name
        ,l3_name
        ,l4_name
    FROM global.product_attributes_filter
    ' || _query_pa || '
), store_details AS
(
    SELECT  DISTINCT store_code
    FROM global.store_attributes_filter
' || _query_sa || '
), allocations AS
(
    SELECT  DISTINCT paf.l0_name
    	,paf.product_code
        ,paf.l1_name
        ,paf.l2_name
        ,paf.l3_name
        ,paf.l4_name
        ,paf.size
        ,b.article
        ,b.retail_size_cd
        ,b.allocation_code
       FROM inventory_smart.create_allocation_result_flat_gurobi b
    INNER JOIN product_details paf
    on b.article = paf.article and b.retail_size_cd = paf.size
    INNER JOIN store_details saf
    ON saf.store_code = b.store
    WHERE allocation_code IN ( SELECT plan_code FROM plan_master) 
) , allocations_calc_base AS
(
    SELECT  p.*
    	,paf.product_code
        ,greatest(0,allocated_total - greatest(0,MIN - (updated_oh_oo_it))) AS wos_allocation
        ,least(allocated_total,greatest(0,MIN - (updated_oh_oo_it))) AS min_allocation
    FROM inventory_smart.create_allocation_result_flat_gurobi p
    INNER JOIN product_details paf
    on p.article = paf.article and p.retail_size_cd = paf.size
    WHERE allocation_code IN ( SELECT distinct plan_code FROM plan_master) 
) , allocations_aggregated AS
(
    SELECT  
    	product_code
    	,article
        ,allocation_code
        ,SUM(COALESCE(allocated_total,0))	AS allocated_total
        ,COALESCE(SUM(inv_avai),0)	AS dc_available
        ,COALESCE(SUM(min_units_allocation),0)	AS min_units_allocation
        ,COALESCE(SUM(wos_units_allocation),0)	AS wos_units_allocation
    FROM
    (
        SELECT  allocation_code
        	,paf.product_code
            ,paf.article
            ,retail_size_cd
            ,COALESCE(SUM(allocated_total),0) AS allocated_total
            ,COALESCE(AVG(inv_avai),0)        AS inv_avai
            ,SUM(wos_allocation)              AS wos_units_allocation
            ,SUM(min_allocation)              AS min_units_allocation
        FROM allocations_calc_base b
        INNER JOIN product_details paf
        on b.article = paf.article and b.retail_size_cd = paf.size
        INNER JOIN store_details saf
        ON saf.store_code = b.store
        GROUP BY  1,2,3,4
    ) b
    WHERE allocation_code IN ( SELECT plan_code FROM plan_master)
    GROUP BY  1,2,3
) , reserved_units AS
(
    SELECT  article 
    	,product_code
        ,SUM(quantity) AS reserve_quantity
    FROM inventory_smart.dc_reserve_quantity
    WHERE product_code IN ( SELECT distinct product_code FROM allocations)
   AND (reservation_till_date AT TIME ZONE ''Pacific/Auckland'')::date = (' || quote_literal(_current_date) || ')::date
    GROUP BY  1,2
), flat_table AS
(
    SELECT  article
    ,allocation_code
    ,store                                      AS store_code
    ,js.key::varchar dc_code 
    ,UNNEST((TRANSLATE((js.value::jsonb->> ''packs_allocated'')::text,''[]'',''{}''))::text[]) pack_type_id
    ,UNNEST((TRANSLATE((js.value::jsonb->> ''packs_allocated_qty'')::text,''[]'',''{}''))::numeric[]) packs_allocated_qty
    ,UNNEST((TRANSLATE((js.value::jsonb->> ''packs_available_qty'')::text,''[]'',''{}''))::numeric[]) available_qty
    ,SUM(inv_avai) inv_avai
    FROM
    (SELECT  b.*
    FROM allocations_calc_base b
    ) foo , JSONB_EACH(pack_dc_allocation) js
    GROUP BY 
    	1, 2, 3, 4, 5, 6, 7
) , packs AS
(
    SELECT  *
    FROM
    (
        SELECT  
        	paf.product_code
        	,article
            ,allocation_code
            ,dc_code
            ,store_code
            ,pack_type_id
            ,size
            ,CASE WHEN pack_type is not null THEN pack_type else ''eaches'' END AS pack_type
            ,coalesce(units_in_pack,1)	AS units_in_pack
            ,inv_avai
            ,available_qty::integer * COALESCE(units_in_pack::integer,1)	AS available_qty
            ,packs_allocated_qty::integer * COALESCE(units_in_pack::integer,1)	AS allocated_qty
        FROM flat_table
        LEFT JOIN inventory_smart.dc_pack_configuration dpc 
        using (article, pack_type_id)
        left join product_details paf
        using (article, size)
    ) a
    WHERE allocated_qty > 0 
), daily_inv AS
(
    SELECT  
    	product_code
    	,paf.article
        ,store_code
        ,tot_str_inv	AS str_inv
        ,wos_oh_oo_it
        ,CASE WHEN wos_oh_oo_it != 0 THEN tot_str_inv / wos_oh_oo_it  ELSE 0 END AS daily_inv
    from inventory_smart.fwos_sku_store_table fwos
    left join "global".product_attributes_filter paf 
    using (product_code)
)
, wos_units AS
(
    select
    	product_code
    	,article
        ,CASE WHEN SUM(allocated_total) != 0 THEN SUM(allocated_total*wos_units_allocated)/SUM(allocated_total)  ELSE 0 END AS wos_units_allocated
    FROM
    (
        SELECT  
        	a.product_code
        	,a.article
            ,a.store_code
            ,allocated_total
            ,CASE WHEN coalesce(daily_inv,0) != 0 THEN allocated_total/coalesce(daily_inv,0)  ELSE 0 END AS wos_units_allocated
        FROM
        (
            SELECT  
            	product_code
            	,article
                ,store AS store_code
                ,SUM(COALESCE(allocated_total,0)) AS allocated_total
            FROM allocations_calc_base a
            GROUP BY  
            	1,2,3
        ) a
        LEFT JOIN
        (
            SELECT  
            	product_code
                ,store_code
                ,daily_inv
            FROM daily_inv
        ) b using(product_code, store_code)
    ) a
    GROUP BY  1,2
), final AS
(
    SELECT  
    	a.product_code
    	,a.article
    	,a.l0_name
        ,a.l1_name
        ,a.l2_name
        ,a.size
        ,a.allocation_code
        ,b.allocated_total AS total_units_allocated
        ,b.dc_available
        ,COALESCE(ru.reserve_quantity,0) AS reserve_quantity
        -- formula check
        ,GREATEST(dc_available - allocated_total - COALESCE(ru.reserve_quantity,0)) AS remaining_available_to_allocate
        ,coalesce(NULLIF(h.wos_units_allocated, 0)
        		,NULLIF(b.wos_units_allocation, 0)
        		,0) AS wos_units_allocation
        ,b.allocated_total - coalesce(NULLIF(h.wos_units_allocated, 0)
        							,NULLIF(b.wos_units_allocation, 0)
        							,0) as min_units_allocation
    FROM allocations a
    INNER JOIN allocations_aggregated b using
    (product_code,article, allocation_code)
    LEFT JOIN reserved_units ru
    ON a.product_code = ru.product_code
    LEFT JOIN wos_units h
    ON a.product_code = h.product_code
    WHERE allocated_total > 0
)
SELECT  
	a.product_code
	,a.article
	,a.l0_name
    ,a.l1_name
    ,a.l2_name
    ,a.size
    ,a.total_units_allocated
    ,a.min_units_allocation
    ,a.wos_units_allocation
    ,ROUND(CAST(a.dc_available AS int),0) AS dc_available
    ,COALESCE(a.reserve_quantity,0) AS reserve_quantity
    ,ROUND(cast(COALESCE(a.remaining_available_to_allocate,0) AS int),0) AS remaining_available_to_allocate
    ,concat(a.product_code,''-'',a.article,''-'',allocation_code) AS key
FROM plan_master pm
INNER JOIN final a
ON pm.plan_code = a.allocation_code
    ';
    RAISE NOTICE 'query combine --> %', _query_combine;
    perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.reporting_daily_allocation_product_list', 'Before returning function value',_query_combine,jsonb_build_object('product attribute',$2,'store attributes',$3,'table_filters',$4,'_current_date',$5)) ;		
    OPEN input FOR EXECUTE _query_combine;
    RETURN input;
END
$function$;
