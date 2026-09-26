--liquibase formatted sql
--changeset ramkumar.vahanan:addig mfp_categorization runOnChange:true stripComments:false splitStatements:false context:MTP-119051 labels:MTP-119051
--comment: adding mfp_categorization
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.po_finalize_product_view(input refcursor, character varying, character varying, character varying);
DROP FUNCTION IF EXISTS inventory_smart.po_finalize_product_view(refcursor, varchar, varchar, varchar, varchar, varchar);
CREATE OR REPLACE FUNCTION inventory_smart.po_finalize_product_view(input refcursor, character varying, character varying, character varying, character varying, character varying)
RETURNS refcursor
LANGUAGE plpgsql
AS $function$
/* 
  * Function/Procedure name: inventory_smart.po_finalize_product_view
  * No of input parameter: 6
  * Parameter Description : $1 = refcursor
  *                         $2 = Allocation Code
  *                         $3 = Store code
  *                         $4 = Ignore allocation codes
  *                         $5 = article filter
  *                         $6 = type
  * Purpose: 
  * This function is created to calculate Store View Allocation Summary which is displayed in the 
  * Finalize screen of Allocate flow
  * Calling Statement:
    begin;
     select * from inventory_smart.po_finalize_product_view
        ('my_cur',
        '6_155_PFS_20230519T071512',
        '',
        '',
        '',
        'allocated');
    FETCH ALL IN "my_cur";
    commit;
  * if any modification done in same function/procedure please record the changes in below format
  *
  * Updated_by       Updated_on      Purpose
  * ----------       -----------     --------
  *
  */
    declare
        _query_combine text;
        _store_filter text;
        _article_filter text;
        _final_inv_query text;
        _pm_date date;
        _query text;
        _alloc_code text;
	v_gen_random_uuid text  := gen_random_uuid()::varchar;
    begin
        _query :=  'select date(created_at) from inventory_smart.plan_master where plan_code = %L';
        if $4 = '' then 
            _alloc_code := $2;
        else
            _alloc_code := $4;
        end if; 
        _query := format(_query, _alloc_code);
        execute _query into _pm_date;
        raise notice 'pm_date: %', _pm_date;

        _article_filter := '';
        _store_filter := '';
        if ($3 = '') IS FALSE
            then
                _store_filter := format($$ AND store_code = '%s'$$, $3);
            end if;
        IF ($5 = '') IS FALSE
        THEN
            _article_filter = format($$ AND article IN ('%s')$$, $5);
        END IF;
        IF ($6 = 'allocated')
            THEN
                _final_inv_query := $$
                    ,current_available_pack_level AS (
                        SELECT
                            dc_code,
                            article,
                            pack_type_id,
                            SUM(oh) oh
                        FROM (
                            SELECT
                            article,
                            size,
                            pack_type_id,
                            dc_code
                            FROM
                            packs
                            GROUP BY 1, 2, 3, 4
                        ) a
                        LEFT JOIN (
                                SELECT
                                po_code::text as dc_code,
                                pack_type_id,
                                article,
                                size,
                                oh
                                FROM
                                inventory_smart.sku_po_available_units
                                WHERE(article, po_code, pack_type_id) in ( SELECT distinct article, dc_code, pack_type_id FROM packs) 
) b
                            USING(dc_code, pack_type_id, article, size)
                            GROUP BY 1, 2, 3
                    ) 
                    ,other_allocations_pack_level as (
                        SELECT 
                            dc_code,
                            article, 
                            pack_type_id, 
                            SUM(allocated_reserve_qty) as allocated_reserve_qty
                        FROM (
                            SELECT 
                                dc_code,
                                article, 
                                pack_type_id, 
                                size, 
                                COALESCE(quantity,0) as allocated_reserve_qty
                            FROM (
                                SELECT 
                                    dc_code::text, 
                                    article, 
                                    pack_type_id, 
                                    size 
                                FROM packs
                                GROUP BY 1, 2, 3, 4
                            ) am
                            join (
                                select *
                                from inventory_smart.sku_po_allocated_units(
                                    '', ARRAY(SELECT DISTINCT article FROM packs)
                                )
                                where allocation_code not in ($$ || quote_literal('%1$s') || $$)
                            ) b
                            USING (dc_code, article, size, pack_type_id)
                        ) a
                        GROUP BY 1, 2, 3
                    )
                    ,final_inv_pack_level AS MATERIALIZED (
                        SELECT
                            dc_code,
                            article,
                            pack_type_id,
                            pack_type,
                            SUM(packs_allocated_qty) as packs_allocated_qty,
                            AVG(units_in_pack) as units_in_pack,
                            COALESCE(AVG(oh),0) AS dc_available,
                            COALESCE(AVG(allocated_reserve_qty),0) AS allocated_reserve_qty
                        FROM (
                            SELECT
                                dc_code,
                                article,
                                pack_type_id,
                                pack_type,
                                store_code,
                                sum(allocated_qty) as packs_allocated_qty,
                                sum(units_in_pack) as units_in_pack
                            FROM packs
                            GROUP BY 1, 2, 3, 4, 5
                        ) foo
                        LEFT JOIN
                            current_available_pack_level
                        USING(dc_code, article, pack_type_id)
                        LEFT JOIN
                            other_allocations_pack_level
                        USING(dc_code, article, pack_type_id)
                        GROUP BY 1, 2, 3, 4
                    )
                    ,net_available_count_pack_level AS materialized(
                        select 
                        a.*,
                        units_in_pack,
						a.net_available/a.units_in_pack as net_available_packs,
                        a.net_available_before_allocation/a.units_in_pack as net_available_before_allocation_packs
                        from 
                        (
                            SELECT
                                article,
                                dc_code,
                                pack_type_id,
                                pack_type,
                                units_in_pack,
                                COALESCE(SUM(dc_available),0) - COALESCE(SUM(packs_allocated_qty),0) - COALESCE(SUM(allocated_reserve_qty),0) net_available,
                                COALESCE(SUM(dc_available),0) - COALESCE(SUM(allocated_reserve_qty),0) AS net_available_before_allocation
                            FROM
                                final_inv_pack_level 
							GROUP BY 1, 2, 3, 4, 5
                        ) a
                    )
                    ,net_available_count_eaches as materialized(
                        select
                            article,
                            dc_code,
                            sum(net_available_packs) as net_available_eaches,
                            sum(net_available_before_allocation_packs) as net_available_before_allocation_eaches
                        from net_available_count_pack_level
                        where pack_type='eaches'
                        group by 1,2
                    )
                    , net_available_count_packs as materialized(
                        select
                            article,
                            dc_code,
                            sum(net_available_packs) as net_available_packs,
                            sum(net_available_before_allocation_packs) as net_available_before_allocation_packs
                        from net_available_count_pack_level
                        where pack_type='packs'
                        group by 1,2
                    )
                    , net_available as materialized(
                    	select 
                    		a.article,
                    		a.dc_code,
                    		b.size,
                    		sum(a.net_available_packs*b.units_in_pack) as net_available,
                            sum(a.net_available_before_allocation_packs*b.units_in_pack) as net_available_before_allocation
                    	from net_available_count_pack_level a
                    	left join inventory_smart.dc_pack_configuration b
                    	using (pack_type_id, article)
                    	group by 1,2,3
                    )
                    $$;
        _final_inv_query := format(_final_inv_query,_alloc_code);
    ELSE
        _final_inv_query := $$
            ,final_inv as materialized(
                    SELECT 
                        a.dc_code,
                        a.article,
                        a.pack_type_id,
                        a.pack_type,
                        a.dc_code as dc_name,
                        AVG(a.units_in_pack) as units_in_pack,
                        AVG(COALESCE(dc_available::int, 0)) - SUM(COALESCE(allocated_qty::int, 0))  as net_available,
                        SUM(COALESCE(allocated_qty, 0)) as allocated_qty,
                        AVG(COALESCE(dc_available, 0)) as net_available_before_allocation,
                        0 as allocated_reserve_qty
                    FROM (
                        SELECT
                            article,
                            dc_code,
                            pack_type_id,
                            pack_type,
                            store_code,
                            SUM(allocated_qty) as allocated_qty,
                            SUM(available_qty) as dc_available,
                            SUM(units_in_pack) as units_in_pack
                        from packs
                        group by 1,2,3,4,5
                    ) a
                    group by 1,2,3,4,5
                )
                ,net_available_count_pack_level as materialized(
                    select 
                        a.*,
						a.net_available/a.units_in_pack as net_available_packs,
                        a.net_available_before_allocation/a.units_in_pack as net_available_before_allocation_packs
                        from 
                        (
                            select 
                                article, 
                                dc_code, 
                                pack_type_id, 
                                pack_type,
                                net_available,
                                net_available_before_allocation,
                                units_in_pack
                            from final_inv
                            group by 1,2,3,4,5,6,7
                        ) a
                )
                ,net_available_count_eaches as materialized(
                    select 
                        article, 
                        dc_code, 
                        sum(net_available_packs) as net_available_eaches, 
                        sum(net_available_before_allocation_packs) as net_available_before_allocation_eaches
                    from net_available_count_pack_level
                    where pack_type='eaches'
                    group by 1,2
                )
                ,net_available_count_packs as materialized(
                    select 
                        article, 
                        dc_code, 
                        sum(net_available_packs) as net_available_packs,
                        sum(net_available_before_allocation_packs) as net_available_before_allocation_packs
                    from net_available_count_pack_level
                    where pack_type='packs'
                    group by 1,2
                ),
                net_available as materialized(
                    	select 
                    		a.article,
                    		a.dc_code,
                    		b.size,
                    		sum(a.net_available_packs*b.units_in_pack) as net_available,
                            sum(a.net_available_before_allocation_packs*b.units_in_pack) as net_available_before_allocation
                    	from net_available_count_pack_level a
                    	left join inventory_smart.dc_pack_configuration b
                    	using (pack_type_id, article)
                    	group by 1,2,3
                )
			$$;
        END IF;
        _query_combine := format($$
            ------ PO -PRODUCT VIEW -PRODUCT LEVEL - TABLE DATA
             WITH base_table as materialized (
                SELECT
                article,
                channel,
                store store_code,
                pack_dc_allocation,
                inventory_source,
                demand_type,
                demand,
                allocated_total,
                min,
                max,
                oh,
                oo,
                it,
                lt_forecast,
                wos,
                carfs.retail_size_cd size,
                oh_oo_intransit,
                (allocated_total + oh_oo_intransit) / NULLIF(ros, 0) AS current_wos
            FROM
                inventory_smart.create_allocation_result_flat_gurobi carfs
            LEFT JOIN
                global.store_attributes_filter saf
            ON
                store_code = store
            WHERE allocation_code = '%1$s' %3$s %2$s
            and carfs.created_at between $$ || quote_literal(_pm_date::timestamp) || $$ and $$ || quote_literal(_pm_date::timestamp + interval '1 day') || $$
            )
            ,flat_table as (
                    SELECT article,
                        store_code,
                        js.key dc_code, 
                        channel,
                        size,
                        UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) pack_type_id,
                        UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) allocated_qty,
                        UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty        
                    FROM (
                        SELECT * FROM base_table 
                    ) foo , JSONB_EACH(pack_dc_allocation) js
                )  
            ,packs as materialized (
                    SELECT article,
                        dc_code,
                        store_code,
                        pack_type_id,
                        dpc.size,
                        channel,
                        pack_type,
                        allocated_qty * COALESCE(units_in_pack,1)::double precision AS allocated_qty,
                        available_qty * COALESCE(units_in_pack,1)::double precision AS available_qty,
                        units_in_pack,
                        allocated_qty AS packs_allocated_qty,
                        available_qty AS packs_available_qty
                    FROM inventory_smart.dc_pack_configuration dpc
                    JOIN flat_table USING (pack_type_id, article, size)
                )
            ,packs_calc_base as (
            SELECT
                        article,
                        dc_code,
                        pack_type_id,
                        pack_type,
                        store_code,
                        AVG(packs_allocated_qty) AS adl_packs_allocated
                    FROM
                        packs
                    WHERE
                        pack_type='packs'
                    GROUP BY 1, 2, 3,4,5
                )
            ,eaches_cacl_base as (
                                    SELECT
                                        article,
                                        dc_code,
                                        pack_type_id,
                                        pack_type,
                                        store_code,
                                        SUM(packs_allocated_qty) AS adl_eaches_allocated
                                    FROM
                                        packs
                                    WHERE
                                        pack_type='eaches'
                                    GROUP BY 1, 2, 3,4,5
                )
            ,allocated_split_packs as  (
                    select 
                        article,
                        dc_code,
                        sum(adl_packs_allocated) as adl_packs_allocated
                    from packs_calc_base
                        group by 1,2                      
                )
            ,allocated_split_eaches AS (
                select article,
                dc_code,
                sum(adl_eaches_allocated) as adl_eaches_allocated
                from eaches_cacl_base
                group by 1,2                
            )
            ,allocated_qty_size AS (
                -- Size-level allocated quantity must be computed per (article, dc_code, size).
                -- `packs` rows can exist for both pack_type='eaches' and pack_type='packs'.
                -- `allocated_qty` in `packs` is already in EACHES units (packs * units_in_pack).
                -- Aggregate per store first (to avoid any accidental duplication), then sum to DC+size.
                SELECT
                    article,
                    dc_code,
                    size,
                    SUM(store_allocated_qty) AS allocated_qty
                FROM (
                    SELECT
                        article,
                        dc_code,
                        size,
                        store_code,
                        SUM(COALESCE(allocated_qty, 0)) AS store_allocated_qty
                    FROM packs
                    GROUP BY 1, 2, 3, 4
                ) s
                GROUP BY 1, 2, 3
            )
        %4$s
        ,store_level_oh as (
                SELECT article, sum(oh) as oh, sum(oo) as oo, sum(it) as it
                FROM base_table
                group by article
        )
        ,sales_aggregate as (
                select 
                    article,
                    round(coalesce(sum(lw_qty),0)) as lw_qty,
                    round(coalesce(avg(instock_percentage)::numeric,0::numeric),2) as instock_percentage,
                    round(coalesce(avg(perc_committed)::numeric,0::numeric),2) as perc_committed
                    from (
                            select 
                                article,
                                store_code,
                                avg(aid.lw_units) as lw_qty,--avg to consider all sizes
                                avg(aid.instock_percentage) as instock_percentage,
                                avg(aid.perc_committed) as perc_committed
                            from packs
                            left join inventory_smart.article_inventory_dashboard aid using(article, store_code)
                            group by 1, 2
                        ) a
                group by 1
            )
        ,article_level_base_table as  (
            select article, 
                    inventory_source, 
                    demand_type, 
                    sum(demand) as demand,
                    COUNT( DISTINCT(CASE WHEN allocated_total > 0 then store_code end)) as store, 
                    COUNT( distinct store_code ) as all_stores,-- stores can have 0 alloc
                    sum(MIN) as MIN,
                    sum(MAX) as MAX
                    from base_table bt
                GROUP BY 1, 2, 3)
        ,constraints_aggregate AS materialized(
        /* DC Ãƒâ€” Article constraints aligned to fi.dc_code (full) and fi.article */
            WITH map_po_to_dc AS (
                SELECT DISTINCT
                    p.dc_code   AS dc_code_full,
                    p.article,
                    p.size,
                    spu.dc_code AS dc_code_num
                FROM packs p
                JOIN inventory_smart.sku_po_available_units spu
                ON spu.po_code = p.dc_code
                AND spu.article = p.article
                AND spu.size    = p.size
            )
            SELECT
                m.dc_code_full AS dc_code,
                m.article::text AS article,
                ROUND(COALESCE(MAX(aic.vir_reservation_remaining), 0)) AS vir_pre_allocation,
                ROUND(COALESCE(MAX(aic.vir_reservation_remaining), 0)) AS vir_post_allocation,
                ROUND(COALESCE(MAX(aic.iob_reservation_remaining), 0)) AS iob
            FROM map_po_to_dc m
            JOIN inventory_smart.article_inventory_constraint aic
                ON aic.dc_code = m.dc_code_num
            AND aic.article = m.article
            GROUP BY m.dc_code_full, m.article
        )
        ,size_order as (
            /* Simpler: product_code in AST is already size-specific.
            Map (article,size) Ã¢â€ â€™ product_code via PAF, constrain channel via PAF.l0_name.
            Unique constraint (product_code, channel) means a single row; MIN() is a safe guard. */
            SELECT
                p.article,
                p.size,
                MIN(ast."order") AS order
            FROM (
                SELECT DISTINCT article, size FROM base_table
                ) p
            JOIN global.product_attributes_filter paf
                ON paf.article = p.article
                AND paf.size = p.size
                AND paf.active
                AND NOT paf.is_deleted
            LEFT JOIN inventory_smart.article_status_tag ast
                ON ast.product_code = paf.product_code
                AND ast.channel = paf.l0_name
            GROUP BY 1, 2
        )
        ,product_details AS (
                SELECT
                    DISTINCT 
                    article,
                    size,
                    display_article,
                    product_code,
                    price,
                    l0_name,
                    l1_name,
                    l2_name,
                    l3_name,
                    l4_name,
                    l5_name,
                    l6_name,
                    l7_code,
                    product_description description,
                    mfp_categorization,
                    markdown_date,
                    distributions
                FROM global.product_attributes_filter paf
                WHERE
                    (article,size) IN (SELECT DISTINCT article,size FROM base_table) 
            )
            ,article_pack_type_data as (
            			select 
    						array_agg(distinct pack_type) pack_type
            		    from packs
            )
--            select * from article_pack_type_data;
            ,final_base AS (
                select 
                    distinct
                    article,
                    dc_code,
                    size
                FROM packs 
            )
        SELECT
                fb.article,
                fb.dc_code,
                fb.size,
                alb.inventory_source,
                alb.demand_type,
                alb.demand,
                alb.store,
                alb.all_stores,
                alb.MIN,
                alb.MAX,
                aqs.allocated_qty AS allocated_quantity_size,
                aqs.allocated_qty * paf.price AS allocated_retail_value,
                na.net_available,
                na.net_available_before_allocation,
                fb.dc_code dc,
                paf.display_article,
                paf.l0_name,
                paf.l1_name,
                paf.l2_name,
                paf.l3_name,
                paf.l4_name,
                paf.l5_name,
                paf.l6_name,
                paf.description,
                paf.l7_code,
                paf.mfp_categorization,
                paf.markdown_date,
                paf.distributions,
                sa.lw_qty,
                COALESCE(ca.vir_post_allocation, 0) AS vir_post_allocation,
                COALESCE(ca.vir_pre_allocation, 0) AS vir_pre_allocation,
                COALESCE(ca.iob,0) AS iob,
                sa.instock_percentage,
                sa.perc_committed,
                slo.oh,
                slo.it,
                slo.oo,
                so.order AS order,
                coalesce(asp.adl_packs_allocated,0) as adl_packs_allocated,
                coalesce(ase.adl_eaches_allocated,0) as adl_eaches_allocated,
                coalesce(nace.net_available_eaches,0) as adl_eaches_net_available,
                coalesce(nace.net_available_before_allocation_eaches,0) as adl_eaches_net_available_before_allocation,
                ROUND(coalesce(nacp.net_available_packs::int,0),0) as adl_packs_net_available,
                ROUND(coalesce(nacp.net_available_before_allocation_packs::int,0),0) as adl_packs_net_available_before_allocation,
                apt.pack_type
            from final_base fb
            left join article_level_base_table alb on fb.article=alb.article
            left join allocated_qty_size aqs on fb.article=aqs.article and fb.dc_code=aqs.dc_code and fb.size=aqs.size
            LEFT JOIN product_details paf on fb.article=paf.article and fb.size=paf.size
            left join sales_aggregate sa on fb.article=sa.article
            left join store_level_oh slo on fb.article=slo.article
            left join net_available_count_eaches nace on fb.article = nace.article and fb.dc_code = nace.dc_code 
            left join net_available_count_packs nacp on fb.article = nacp.article and fb.dc_code = nacp.dc_code 
            left join constraints_aggregate ca on fb.article = ca.article and fb.dc_code = ca.dc_code
            LEFT JOIN size_order so ON fb.article = so.article AND fb.size = so.size
            left join allocated_split_packs asp on fb.article=asp.article and fb.dc_code=asp.dc_code
            left join allocated_split_eaches ase on fb.article=ase.article and fb.dc_code=ase.dc_code
            left join net_available na on fb.article=na.article and fb.dc_code=na.dc_code and fb.size=na.size
            cross join article_pack_type_data apt 
            order by so.order
            $$, $2, _store_filter, _article_filter, _final_inv_query);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;
        perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.po_finalize_product_view', 'Before returning function value',_query_combine,jsonb_build_object('allocation_code',$2,'_store_code',$3,'Ignore allocation codes',$4,'article filter',$5,'type',$6)) ;		
		
        RETURN $1;
    END
$function$
;