--liquibase formatted sql
--changeset aman_lakkoju:release_po_changes runOnChange:true stripComments:false splitStatements:false context:MTP-99706 labels:MTP-99706
--comment: release_po_changes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_daily_allocation_product_list(input refcursor, product_attributes jsonb, store_attributes jsonb, table_filters jsonb, _current_date character varying);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_daily_allocation_product_list(input refcursor, product_attributes jsonb, store_attributes jsonb, table_filters jsonb, _current_date character varying)
 RETURNS refcursor
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
        _pm_filter := format('WHERE created_at  >= %L AT TIME ZONE ''America/New_York'' and  created_at  <= %L AT TIME ZONE ''America/New_York'' + interval ''1 DAY''', _current_date, _current_date);
    ELSE
		_pm_filter := format('WHERE created_at  >= %L AT TIME ZONE ''America/New_York'' and  created_at  <= %L AT TIME ZONE ''America/New_York'' + interval ''1 DAY''', now(), now());
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
        WITH plan_master AS materialized
        (
            SELECT  plan_code
                ,name AS allocated_plan_name
            FROM inventory_smart.plan_master
            WHERE (created_at AT TIME ZONE ''America/New_York'') :: date = (' || quote_literal(_current_date) || ') :: date
            AND status = 3
            AND is_deleted = false 
        ), product_details AS materialized
        (
            SELECT article
                ,style
                ,style_description
                ,l0_name
                ,l1_name
                ,l2_id
                ,l3_id
                ,l4_id
            FROM global.product_attributes_filter
            ' || _query_pa || '
            group by 1, 2, 3, 4, 5, 6, 7, 8
        ), store_details AS materialized
        (
            SELECT store_code
            FROM global.store_attributes_filter
            ' || _query_sa || '
        ), allocations AS materialized
        (
            SELECT  paf.l0_name
                ,paf.l1_name
                ,paf.style
                ,b.article
                ,b.allocation_code
                ,paf.style_description
                ,CASE WHEN inventory_source = ''dc'' THEN ''B''
                        WHEN inventory_source = ''po'' THEN ''L''
                        WHEN inventory_source = ''ns'' THEN ''S''  ELSE '''' END AS po_type
                ,STRING_AGG( 
                
DISTINCT CASE 
    WHEN b.inventory_source = ''dc'' THEN 
        paf.l0_name || paf.l2_id || paf.l3_id || paf.l4_id || ''B'' ||
        TO_CHAR(
            (
                b.created_at AT TIME ZONE ''America/New_York''
                + CASE 
                    WHEN b.allocation_code LIKE ''%105%'' 
                    THEN (COALESCE((regexp_match(b.allocation_code, ''_(\d+)$''))[1]::int, 0) * INTERVAL ''1 second'')
                    ELSE INTERVAL ''0 second''
                  END
            ),
            ''MMDDYYHHMISS''
        )

    WHEN b.inventory_source = ''po'' THEN 
        paf.l0_name || paf.l2_id || paf.l3_id || ''L'' ||
        TO_CHAR(
            (
                b.created_at AT TIME ZONE ''America/New_York''
                + CASE 
                    WHEN b.allocation_code LIKE ''%105%'' 
                    THEN (COALESCE((regexp_match(b.allocation_code, ''_(\d+)$''))[1]::int, 0) * INTERVAL ''1 second'')
                    ELSE INTERVAL ''0 second''
                  END
            ),
            ''MMDDYYHHMISS''
        ) || ''_'' || rid.id

    WHEN b.inventory_source = ''ns'' THEN 
        paf.l0_name || b.store || ''S'' ||
        TO_CHAR(
            (
                b.created_at AT TIME ZONE ''America/New_York''
                + CASE 
                    WHEN b.allocation_code LIKE ''%105%'' 
                    THEN (COALESCE((regexp_match(b.allocation_code, ''_(\d+)$''))[1]::int, 0) * INTERVAL ''1 second'')
                    ELSE INTERVAL ''0 second''
                  END
            ),
            ''MMDDYYHHMISS''
        )

    ELSE 
        paf.l0_name || paf.l2_id || paf.l3_id || paf.l4_id || ''B'' ||
        TO_CHAR(
            (
                b.created_at AT TIME ZONE ''America/New_York''
                + CASE 
                    WHEN b.allocation_code LIKE ''%105%'' 
                    THEN (COALESCE((regexp_match(b.allocation_code, ''_(\d+)$''))[1]::int, 0) * INTERVAL ''1 second'')
                    ELSE INTERVAL ''0 second''
                  END
            ),
            ''MMDDYYHHMISS''
        )
END, '', '' ) AS released_po            
            
            FROM inventory_smart.create_allocation_result_flat_gurobi b
            INNER JOIN product_details paf using
            (article
            )
            left join (
            		 select po.po_code, po.article, lpi.id
            		 FROM product_details
					left join (
						select
						distinct case when article like ''%USA-Brick%'' then ''USA'' else  ''CAN'' end as country,
						po_code,
						article
						from inventory_smart.po_master where article like ''%Brick%'') po  using(article)
						LEFT JOIN inventory_smart.launch_po_identifier lpi
   						ON po.po_code = lpi.omnia_bulk_po_number and po.country = lpi.country
                    group by 1,2,3
            	) rid on b.inventory_source = ''po'' and b.article = rid.article and replace(b.dc_codes[1], '''''''' , '''') = rid.po_code
            ' || _pm_filter || '
            and exists ( SELECT 1 FROM plan_master where plan_code = allocation_code )
            and exists (select 1 from store_details saf where saf.store_code = b.store)
            GROUP BY  1
                    ,2
                    ,3
                    ,4
                    ,5
                    ,6
                    ,7
        ) , allocations_calc_base AS materialized
        (
            SELECT  p.*
                ,greatest(0,allocated_total - greatest(0,MIN - (updated_oh_oo_it))) AS wos_allocation
                ,least(allocated_total,greatest(0,MIN - (updated_oh_oo_it)))        AS min_allocation
            FROM inventory_smart.create_allocation_result_flat_gurobi p
            ' || _pm_filter || '
            and exists ( SELECT 1 FROM plan_master where plan_code = allocation_code )
            and exists (select 1 from product_details paf where paf.article = p.article)
        ) , allocations_aggregated AS materialized
        (
            SELECT  b.article
                ,b.allocation_code
                ,SUM(COALESCE(allocated_total,0))      AS allocated_total
                ,COALESCE(SUM(inv_avai),0)             AS dc_available
                ,COALESCE(SUM(min_units_allocation),0) AS min_units_allocation
                ,COALESCE(SUM(wos_units_allocation),0) AS wos_units_allocation
            FROM
            (
                SELECT  allocation_code
                    ,article
                    ,retail_size_cd
                    ,COALESCE(SUM(allocated_total),0) AS allocated_total
                    ,COALESCE(AVG(inv_avai),0)        AS inv_avai
                    ,SUM(wos_allocation)              AS wos_units_allocation
                    ,SUM(min_allocation)              AS min_units_allocation
                FROM allocations_calc_base b
                where exists (select 1 from store_details saf where saf.store_code = b.store)
                GROUP BY  1
                        ,2
                        ,3
            ) b
            GROUP BY  1
                    ,2
        ) , reserved_units AS materialized
        (
            SELECT  article
                ,SUM(reserve_quantity) AS reserve_quantity
            FROM inventory_smart.dc_pack_reserve_quantity_derived_table dprqd
            WHERE exists (select 1 from allocations a where dprqd.article = a.article)
            AND (date AT TIME ZONE ''America/New_York'')::date = (' || quote_literal(_current_date) || ')::date
            GROUP BY  article
        ), flat_table AS materialized
        (
            SELECT
            foo.article,
            foo.allocation_code,
            foo.store AS store_code,
            js.key::varchar AS dc_code,
            packs.pack_type_id,
            packs.packs_allocated_qty,
            packs.available_qty
            ,SUM(oh_oo_intransit) oh_oo_intransit
            ,SUM(inv_avai) inv_avai
        FROM allocations_calc_base foo
        CROSS JOIN LATERAL jsonb_each(foo.pack_dc_allocation) js
        CROSS JOIN LATERAL (
            SELECT 
                jsonb_array_elements_text(js.value->''packs_allocated'')::text AS pack_type_id,
                jsonb_array_elements_text(js.value->''packs_allocated_qty'')::numeric AS packs_allocated_qty,
                jsonb_array_elements_text(js.value->''packs_available_qty'')::numeric AS available_qty
        ) packs
        group by 1, 2, 3, 4, 5, 6, 7
        ) , packs AS materialized
        (
            SELECT  *
            FROM
            (
                SELECT  article
                    ,allocation_code
                    ,dc_code
                    ,store_code
                    ,pack_type_id
                    ,size
                    ,CASE WHEN pack_type is not null THEN pack_type
                            WHEN array_length(string_to_array(pack_type_id,''_''),1) > 2 THEN ''eaches''  ELSE ''packs'' END AS pack_type
                    ,coalesce(units_in_pack,1)                                                                       AS units_in_pack
                    ,inv_avai
                    ,available_qty::integer * COALESCE(units_in_pack::integer,1)                                     AS available_qty
                    ,packs_allocated_qty::integer * COALESCE(units_in_pack::integer,1)                               AS allocated_qty
                FROM flat_table
                LEFT JOIN inventory_smart.dc_pack_configuration dpc USING
                (article, pack_type_id
                )
            ) a
            WHERE allocated_qty > 0 
        ), final_inv AS materialized
        (
            SELECT  article
                ,allocation_code
                ,dc_code
                ,pack_type
            --size, 
                ,AVG(inv_avai) AS available_qty
            FROM packs p
            GROUP BY  1
                    ,2
                    ,3
                    ,4
        ), final_inv_2 AS materialized
        (
            SELECT  article
                ,allocation_code
                ,SUM(ata_eaches) AS ata_eaches
                ,SUM(ata_packs)  AS ata_packs
            FROM
            (
                SELECT  article
                    ,allocation_code
                    ,dc_code
                --pack_type_id, 
                    ,pack_type
                --size, 
                    ,CASE WHEN pack_type = ''eaches'' THEN available_qty  ELSE 0 END AS ata_eaches
                    ,CASE WHEN pack_type = ''packs'' THEN available_qty  ELSE 0 END  AS ata_packs
                FROM final_inv
            )x
            GROUP BY  1
                    ,2
        ), daily_inv AS materialized
        (
            SELECT  aid.article
                ,aid.store_code
                ,total_inv                                                             AS str_inv
                ,CASE WHEN wos_oh_oo_it != 0 THEN total_inv / wos_oh_oo_it  ELSE 0 END AS daily_inv
                ,in_stock_count
                ,total_count
                ,in_stock_dc_ata_count
                ,in_stock_dc_ata_total_count
            FROM inventory_smart.article_inventory_dashboard aid
        ), wos_units AS materialized
        (
            SELECT  article
                ,CASE WHEN SUM(allocated_total) != 0 THEN SUM(allocated_total*wos_units_allocated)/SUM(allocated_total)  ELSE 0 END AS wos_units_allocated
            FROM
            (
                SELECT  a.article
                    ,a.store_code
                    ,allocated_total
                    ,CASE WHEN coalesce(daily_inv,0) != 0 THEN allocated_total/coalesce(daily_inv,0)  ELSE 0 END AS wos_units_allocated
                FROM
                (
                    SELECT  article
                        ,store                            AS store_code
                        ,SUM(COALESCE(allocated_total,0)) AS allocated_total
                    FROM allocations_calc_base
                    GROUP BY  1
                            ,2
                ) a
                LEFT JOIN
                daily_inv b using(article, store_code)
            ) a
            GROUP BY  1
        ), store_inv AS materialized
        (
            SELECT  article
                ,ROUND(cast(case WHEN SUM(total_count) != 0 THEN cast(SUM(in_stock_count) AS float)/ cast(SUM(total_count) AS float) else 0 end AS numeric) * 100,2) AS in_stock
                ,ROUND(cast(case WHEN SUM(in_stock_dc_ata_total_count) != 0 THEN cast(SUM(in_stock_dc_ata_count) AS float)/ cast(SUM(in_stock_dc_ata_total_count) AS float) else 0 end AS numeric) * 100,2) AS store_in_stock_dc_ata
            FROM
            (
                SELECT  article
                    ,SUM(in_stock_count) in_stock_count
                    ,SUM(total_count) total_count
                    ,SUM(in_stock_dc_ata_count) in_stock_dc_ata_count
                    ,SUM(in_stock_dc_ata_total_count) in_stock_dc_ata_total_count
                FROM daily_inv
                GROUP BY  1
            ) a
            GROUP BY  1
) ,  priority_by_style_allocation AS materialized
        (
    		SELECT allocation_code, style, MIN(order_priority) AS priority
			FROM inventory_smart.create_allocation_result_flat_gurobi 
            ' || _pm_filter || '
            and exists ( SELECT 1 FROM plan_master where plan_code = allocation_code)
			GROUP BY 1, 2
        ) , final AS materialized
        (
            SELECT  a.l0_name
                ,a.l1_name
                ,a.style
                ,a.article
                ,a.allocation_code
                ,a.style_description
                ,a.po_type
                ,a.released_po
                ,b.allocated_total                                                          AS total_units_allocated
                ,b.dc_available
                ,COALESCE(ru.reserve_quantity,0)                                            AS reserve_quantity
                ,b.min_units_allocation
                ,COALESCE(f.ata_eaches,0)                                                   AS ata_eaches
                ,COALESCE(f.ata_packs,0)                                                    AS ata_packs
                ,COALESCE(g.store_in_stock_dc_ata,0)                                        AS in_stock_ata
                ,COALESCE(g.in_stock,0)                                                     AS in_stock
            -- formula check
                ,GREATEST(dc_available - allocated_total - COALESCE(ru.reserve_quantity,0)) AS remaining_available_to_allocate
                ,coalesce(h.wos_units_allocated,0)                                          AS wos_units_allocation
,COALESCE(p.priority, 9999) AS priority
            FROM allocations a
            INNER JOIN allocations_aggregated b using
            (article, allocation_code
            )
            LEFT JOIN reserved_units ru
            ON a.article = ru.article
            LEFT JOIN final_inv_2 f
            ON a.article = f.article AND a.allocation_code = f.allocation_code
            LEFT JOIN store_inv g
            ON a.article = g.article
            LEFT JOIN wos_units h
            ON a.article = h.article
LEFT JOIN priority_by_style_allocation p 
			ON a.allocation_code = p.allocation_code AND a.style = p.style
            WHERE allocated_total > 0
        )
        SELECT  a.l0_name                                                           AS country
            ,a.l1_name                                                           AS channel
            ,a.po_type
            ,a.released_po
            ,pm.allocated_plan_name
            ,allocation_code
            ,a.style
            ,a.article
            ,a.style_description
            ,a.total_units_allocated
            ,a.min_units_allocation
            ,a.wos_units_allocation
            ,ROUND(CAST(a.dc_available AS int),0)                                AS dc_available
            ,COALESCE(a.reserve_quantity,0)                                      AS reserve_quantity
            ,COALESCE(a.ata_eaches,0)                                            AS of_eaches
            ,COALESCE(a.ata_packs,0)                                             AS of_packs
            ,COALESCE(a.in_stock,0)                                              AS store_in_stock
            ,COALESCE(a.in_stock_ata,0)                                          AS store_in_stock_ata
            ,ROUND(cast(COALESCE(a.remaining_available_to_allocate,0) AS int),0) AS remaining_available_to_allocate
            ,concat(a.article,''-'',allocation_code)                             AS key
            ,a.priority
        FROM plan_master pm
        INNER JOIN final a
        ON pm.plan_code = a.allocation_code
    ';
    RAISE NOTICE 'query combine --> %', _query_combine;
    perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.reporting_daily_allocation_product_list', 'Before returning function value',_query_combine,jsonb_build_object('product attribute',$2,'store attributes',$3,'table_filters',$4,'_current_date',$5)) ;		
    OPEN input FOR EXECUTE _query_combine;
    RETURN input;
END
$function$
;