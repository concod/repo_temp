--liquibase formatted sql
--changeset mahesh.nv:reporting_daily_allocation_product_list runOnChange:true stripComments:false splitStatements:false context:MTP-91514 labels:MTP-91514
--comment: initial comment MTP-91514
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
    timezone TEXT;
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
    -- Query to get the timezone from tenant_attribute_master table
    SELECT attribute_value::json->'value'->>'time_zone'
    INTO timezone
    FROM global.tenant_attribute_master
    WHERE name = 'tenant_time_config'
    LIMIT 1;

    IF _current_date IS NOT NULL AND _current_date != '' THEN
        _pm_filter := format('WHERE (created_at AT TIME ZONE %L)::date = (%L AT TIME ZONE %L)::date AND status = 3 AND is_deleted = false', timezone, _current_date, timezone);
    ELSE
        _pm_filter := format('WHERE status = 3 AND is_deleted = false and (created_at::timestamptz AT TIME ZONE %L)::date = (now() at time zone %L)::date', timezone, timezone);
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
    WHERE (created_at AT TIME ZONE ''' || timezone || ''') :: date = (' || quote_literal(_current_date) || ') :: date
            AND status = 3
    AND is_deleted = false 
), product_details AS
(
    SELECT  DISTINCT article
    	,style
    	,size
	    ,color_name
        ,l0_name
        ,l1_name
        ,l2_name
        ,l3_id_name
        ,brand
    FROM global.product_attributes_filter
    ' || _query_pa || '
), store_details AS
(
    SELECT  DISTINCT store_code, s0_name
    FROM global.store_attributes_filter
' || _query_sa || '
), allocations AS
(
    SELECT  DISTINCT paf.l0_name
        ,paf.l1_name
        ,paf.l2_name
        ,paf.l3_id_name
        ,paf.brand
        ,paf.style
        ,paf.color_name
        ,paf.size
        ,saf.s0_name
        ,b.article
        ,b.retail_size_cd
        ,b.allocation_code
        ,b.description
       FROM inventory_smart.create_allocation_result_flat_gurobi b
    INNER JOIN product_details paf
    on b.article = paf.article and b.retail_size_cd = paf.size
    INNER JOIN store_details saf
    ON saf.store_code = b.store
    WHERE allocation_code IN ( SELECT plan_code FROM plan_master) 
    
) , allocations_article as (
		select distinct l0_name
		,l1_name
		,l2_name
		,l3_id_name
		,brand
		,style
		,color_name
		,s0_name
		,article
		,allocation_code
		,description
		from allocations
) , allocations_calc_base AS
(
    SELECT  p.*
        ,saf.s0_name
        ,greatest(0,allocated_total - greatest(0,MIN - updated_oh_oo_it)) AS wos_allocation
        ,least(allocated_total, greatest(0, MIN - updated_oh_oo_it)) AS min_allocation
    FROM inventory_smart.create_allocation_result_flat_gurobi p
    INNER JOIN product_details paf
    on p.article = paf.article and p.retail_size_cd = paf.size
    inner join store_details saf
    on p.store = saf.store_code
    WHERE allocation_code IN ( SELECT distinct plan_code FROM plan_master) 
) , allocations_aggregated AS
(
    SELECT article
        ,allocation_code
        ,s0_name
        ,SUM(COALESCE(allocated_total,0))	AS allocated_total
        ,COALESCE(AVG(inv_avai),0)	AS dc_available
        ,COALESCE(SUM(min_units_allocation),0)	AS min_units_allocation
        ,COALESCE(SUM(wos_units_allocation),0)	AS wos_units_allocation
    FROM
    (
        SELECT  allocation_code
        		,b.s0_name
        		,b.store
            ,paf.article
            ,COALESCE(SUM(allocated_total),0) AS allocated_total
            ,COALESCE(SUM(inv_avai),0)        AS inv_avai
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
    SELECT  article,
    	case when dc_code = 1 then ''PACSUN.COM'' else ''PACSUN STORES'' end as s0_name
        ,SUM(quantity) AS reserve_quantity
    FROM inventory_smart.dc_reserve_quantity
    WHERE product_code IN ( SELECT distinct product_code FROM allocations)
   AND (reservation_till_date AT TIME ZONE ''' || timezone || ''')::date = (' || quote_literal(_current_date) || ')::date
    GROUP BY  1,2
), flat_table AS
(
    SELECT  article
    ,allocation_code
    ,store                                      AS store_code
    ,s0_name
    ,js.key::varchar AS dc_code 
    ,UNNEST((TRANSLATE((js.value::jsonb->> ''packs_allocated'')::text,''[]'',''{}''))::text[]) pack_type_id
    ,UNNEST((TRANSLATE((js.value::jsonb->> ''packs_allocated_qty'')::text,''[]'',''{}''))::numeric[]) packs_allocated_qty
    ,UNNEST((TRANSLATE((js.value::jsonb->> ''packs_available_qty'')::text,''[]'',''{}''))::numeric[]) available_qty
    ,SUM(inv_avai) inv_avai
    FROM
    (SELECT  b.*
    FROM allocations_calc_base b
    ) foo , JSONB_EACH(pack_dc_allocation) js
    GROUP BY 
    	1, 2, 3, 4, 5, 6, 7,8
) , packs AS
(
    SELECT  *
    FROM
    (
        SELECT  
        	article
            ,allocation_code
            ,dc_code
            ,store_code
            ,s0_name
            ,pack_type_id
            ,size
            ,CASE WHEN pack_type is not null THEN pack_type else ''eaches'' END AS pack_type
            ,coalesce(units_in_pack,1)	AS units_in_pack
            ,inv_avai
            ,available_qty::integer * COALESCE(units_in_pack::integer,1)    AS available_qty
            ,packs_allocated_qty::integer * COALESCE(units_in_pack::integer,1)  AS allocated_qty
        FROM flat_table
        LEFT JOIN inventory_smart.dc_pack_configuration dpc 
        using (article, pack_type_id)
    ) a
    WHERE allocated_qty > 0 
), daily_inv AS
(   
         SELECT  aid.article
                ,aid.store_code
                ,saf.s0_name
                ,tot_inv                                                             AS str_inv
                , oh
                ,CASE WHEN fwos != 0 THEN tot_inv / fwos  ELSE 0 END AS daily_inv
            FROM inventory_smart.article_inventory_dashboard aid
            INNER JOIN store_details saf
            ON saf.store_code = aid.store_code
)
, wos_units AS
(
    select
    	article
    	,s0_name
        ,CASE WHEN SUM(allocated_total) != 0 THEN SUM(allocated_total*wos_units_allocated)/SUM(allocated_total)  ELSE 0 END AS wos_units_allocated
        ,sum(oh) as oh
    FROM
    (
        SELECT  
        	a.article
            ,a.store_code
            ,a.s0_name
            ,allocated_total
            ,CASE WHEN coalesce(daily_inv,0) != 0 THEN allocated_total/coalesce(daily_inv,0)  ELSE 0 END AS wos_units_allocated
            ,oh
        FROM
        (
            SELECT  
            	article
                ,store AS store_code
                ,s0_name
                ,SUM(COALESCE(allocated_total,0)) AS allocated_total
            FROM allocations_calc_base a
            GROUP BY  
            	1,2,3
        ) a
        LEFT JOIN
        (
            SELECT  
            	article
                ,store_code
                ,daily_inv
                ,oh
            FROM daily_inv
        ) b using(article, store_code)
    ) a
    GROUP BY  1,2
), final AS
(
    SELECT  
    	a.article
    	,a.l0_name
        ,a.l1_name
        ,a.l2_name
        ,a.l3_id_name
        ,a.brand
        ,a.style
        ,a.color_name
      	,b.s0_name
        ,a.allocation_code
        ,a.description 
        ,b.allocated_total AS total_units_allocated
        ,b.dc_available
        ,b.dc_available as in_stock_with_DC_available_to_allocate
        ,h.oh as store_in_stock
        ,COALESCE(ru.reserve_quantity,0) AS reserve_quantity
        -- formula check
        ,GREATEST(dc_available - allocated_total - COALESCE(ru.reserve_quantity, 0)) AS remaining_available_to_allocate
        ,COALESCE(NULLIF(b.wos_units_allocation, 0), 0) AS wos_units_allocation
        ,b.min_units_allocation AS min_units_allocation
    FROM allocations_article a
    INNER JOIN allocations_aggregated b using
    (article, s0_name, allocation_code)
    LEFT JOIN reserved_units ru
    using(article, s0_name)
    LEFT JOIN wos_units h
    using(article, s0_name)
    WHERE allocated_total > 0
)
SELECT  
	a.article
	,a.l0_name
    ,a.l1_name
    ,a.l2_name
    ,a.l3_id_name
    ,a.brand
    ,a.style
    ,a.color_name
    ,a.s0_name
    ,a.description
    ,a.total_units_allocated
    ,a.min_units_allocation
    ,a.wos_units_allocation
    ,ROUND(CAST(a.dc_available AS int),0) AS dc_available
    ,COALESCE(cast(a.in_stock_with_DC_available_to_allocate as int),0) as in_stock_with_DC_available_to_allocate
    ,COALESCE(cast(a.store_in_stock as int),0) as store_in_stock
    ,COALESCE(a.reserve_quantity,0) AS reserve_quantity
    ,ROUND(cast(COALESCE(a.remaining_available_to_allocate,0) AS int),0) AS remaining_available_to_allocate
    ,concat(a.article,''-'',a.s0_name,''-'',allocation_code) AS key
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
