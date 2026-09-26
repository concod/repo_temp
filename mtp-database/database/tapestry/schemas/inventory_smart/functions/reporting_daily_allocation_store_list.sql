--liquibase formatted sql
--changeset tarun.tyagi:reporting_daily_allocation_store_list runOnChange:true stripComments:false splitStatements:false context:MTP-63210 labels:MTP-63210
--comment: updated instock logic in the store list query based on MTP-63210 query updates
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_daily_allocation_store_list(input refcursor, product_attributes jsonb, store_attributes jsonb, table_filters jsonb, _current_date character varying);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_daily_allocation_store_list(
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
    _query_pa TEXT := '';
    _query_sa TEXT := '';
    _query_combine TEXT := '';
    _pm_filter text := '';
    _query_table_filters TEXT := '';
    _channel text := inventory_smart.get_channel_from_input(store_attributes);
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
    _cache_payload JSONB := jsonb_build_object('store_attributes', store_attributes, '_current_date', _current_date);
    _cache_table_id TEXT;
    _cache_schema TEXT := 'inventory_smart';
    _cache_sp TEXT := '.details_metric';
    _cache_key_pattern TEXT := '{schema_name}:{sp_name}:{request}';
    _cache_dependencies TEXT[] := ARRAY['inventory_smart.plan_master', 'global.store_attributes_filter', 'inventory_smart.article_inventory_dashboard', 'inventory_smart.create_allocation_result_flat_gurobi'];
BEGIN
    raise notice '%', store_attributes->>'channel';
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
    FROM inventory_smart.plan_master
    WHERE (created_at AT TIME ZONE ''Pacific/Auckland'')::date = (' || quote_literal(_current_date) || ')::date
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
SELECT  store_code
    ,store_name
FROM global.store_attributes_filter
' || _query_sa || '
), allocations AS
(
    SELECT  DISTINCT 
    	saf.store_code
    	,saf.store_name
        ,b.allocation_code
    FROM inventory_smart.create_allocation_result_flat_gurobi b
    INNER JOIN store_details saf
    ON saf.store_code = b.store
    WHERE allocation_code IN ( SELECT plan_code FROM plan_master) 
), allocations_calc_base AS
(
    SELECT  p.*
    	,paf.product_code
        ,greatest(0,allocated_total - greatest(0,MIN - (updated_oh_oo_it))) AS wos_allocation
        ,least(allocated_total,greatest(0,MIN - (updated_oh_oo_it))) AS min_allocation
    FROM inventory_smart.create_allocation_result_flat_gurobi p
    INNER JOIN product_details paf
    on p.article = paf.article and p.retail_size_cd = paf.size
    WHERE allocation_code IN ( SELECT distinct plan_code FROM plan_master) 
), daily_inv AS
(
    SELECT  
    	paf.product_code
    	,paf.article
        ,fwos.store_code
        ,tot_str_inv AS str_inv
        ,CASE WHEN wos_oh_oo_it != 0 THEN tot_str_inv / wos_oh_oo_it  ELSE 0 END AS daily_inv
    FROM inventory_smart.fwos_sku_store_table fwos
    LEFT JOIN "global".product_attributes_filter paf 
    using (product_code)
), wos_units AS
(
    SELECT 
    	store_code
        ,CASE WHEN SUM(allocated_total) != 0 THEN SUM(allocated_total*wos_units_allocated)/SUM(allocated_total)  ELSE 0 END AS wos_units_allocated
    FROM
    (
    SELECT  
    	product_code
    	,a.article
        ,a.store_code
        ,allocated_total
        ,CASE WHEN coalesce(daily_inv,0) != 0 THEN allocated_total/coalesce(daily_inv,0)  ELSE 0 END AS wos_units_allocated
        FROM
        (
            SELECT  article 
            	,product_code
                ,store                            AS store_code
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
	)a
	GROUP BY  1
), allocations_aggregated AS
(
    SELECT  
    	store_code
        ,allocation_code
        ,SUM(COALESCE(allocated_total,0))	AS allocated_total
        ,COALESCE(SUM(inv_avai),0)	AS dc_available
        ,COALESCE(SUM(min_units_allocation),0)	AS min_units_allocation
        ,COALESCE(SUM(wos_units_allocation),0)	AS wos_units_allocation
        ,COALESCE(SUM(oh),0) AS oh
        ,COALESCE(SUM(oo),0) AS oo
        ,COALESCE(SUM(it),0) AS it
    FROM
    (
        SELECT  
        	allocation_code
        	,store_code
            ,COALESCE(SUM(allocated_total),0)	AS allocated_total
            ,COALESCE(AVG(inv_avai),0)	AS inv_avai
            ,SUM(wos_allocation)	AS wos_units_allocation
            ,SUM(min_allocation)	AS min_units_allocation
            ,SUM(oh) as oh
            ,SUM(oo) as oo
            ,SUM(it) as it
        FROM allocations_calc_base b
        INNER JOIN product_details paf
        on b.article = paf.article and b.retail_size_cd = paf.size
        INNER JOIN store_details saf
        ON saf.store_code = b.store
        GROUP BY  1,2
    ) b
    WHERE allocation_code IN ( SELECT plan_code FROM plan_master)
    GROUP BY  1,2
) 
, final AS
(
    SELECT  
    	a.store_code
    	,a.store_name
        ,a.allocation_code
        ,b.allocated_total AS total_units_allocated
        ,b.dc_available
        ,coalesce(NULLIF(h.wos_units_allocated, 0)
        		,NULLIF(b.wos_units_allocation, 0)
        		,0) AS wos_units_allocation
        ,b.allocated_total - coalesce(NULLIF(h.wos_units_allocated, 0)
        							,NULLIF(b.wos_units_allocation, 0)
        							,0) as min_units_allocation
        ,b.oh
        ,b.oo
        ,b.it
    FROM allocations a
    INNER JOIN allocations_aggregated b using
    (store_code, allocation_code)
    LEFT JOIN wos_units h
    ON a.store_code = h.store_code
    WHERE allocated_total > 0
)
SELECT  
	aa.store_code
    ,aa.store_name
    ,SUM(aa.total_units_allocated) AS total_units_allocated
    ,SUM(aa.min_units_allocation) AS min_units_allocation
    ,SUM(aa.wos_units_allocation) as wos_units_allocation
    ,SUM(aa.oh) AS oh
    ,SUM(aa.it) AS it
    ,SUM(aa.oo) AS oo
    ,aa.store_code AS key
FROM plan_master pm
INNER JOIN final aa
ON pm.plan_code = aa.allocation_code
GROUP BY  
	1,2
';
    
    RAISE NOTICE 'query combine --> %', _query_combine;

    OPEN input FOR EXECUTE _query_combine;
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.reporting_daily_allocation_store_list', 'Before returning function value',_query_combine,jsonb_build_object('store attributes',$3,'table_filters',$3,'_current_date',$4)) ;		

    RETURN input;
END
$function$;
