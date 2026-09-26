--liquibase formatted sql
--changeset liquibase:empty data  fixes runOnChange:true stripComments:false splitStatements:false context:MTP-117846 labels:MTP-117846
--comment: MTP-117846 | empty data  fixes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.order_batching_hle_base_data(input, jsonb, varchar);

CREATE OR REPLACE FUNCTION inventory_smart.order_batching_hle_base_data(input refcursor, allocation_codes jsonb, created_at varchar)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$

declare
    _query_combine text;
	_created_at_start timestamptz;
    _created_at_end timestamptz;
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
    begin
	_created_at_start := created_at::date AT TIME ZONE 'America/Los_Angeles';
    _created_at_end := (created_at::date + INTERVAL '1 day') AT TIME ZONE 'America/Los_Angeles';
    _query_combine := format($$
    
        with base_allocation_codes_data as materialized (
            select 
            carfs.article, 
            carfs.store, 
            carfs.store_cluster,
            carfs.store_grade,
            carfs.retail_size_cd, 
            carfs.allocation_code, 
            carfs.created_at, 
            carfs.created_by,
            carfs.pack_dc_allocation,
            carfs.min,
            carfs.wos,
            carfs.delivery_dt
            from inventory_smart.create_allocation_result_flat_gurobi carfs
            join inventory_smart.plan_master pm 
            on carfs.allocation_code = pm.plan_code
            where carfs.created_at >= %1$L::timestamptz and carfs.created_at < %2$L::timestamptz
            and carfs.allocation_code = ANY(%3$s::text[])
            and pm.status = 2
            and pm.is_deleted = false
        ),
        allocation_code_article_store_level_msc as (
        --separate CTE to reduce group cols in later cte's    
		select 
            store,
            article,
            store_cluster,
            store_grade,
            created_at, 
            created_by,
            allocation_code,
            delivery_dt,
            avg(min) as min,
            avg(wos) as wos
            from base_allocation_codes_data
            group by 1,2,3,4,5,6,7,8
		),
        distinct_articles as (
            select distinct article from base_allocation_codes_data
        ),
        distinct_stores as (
            select distinct store from base_allocation_codes_data
        ),

        product_filters_of_articles as (
            select 
            paf.l0_name, 
            paf.l1_name, 
            paf.l2_name, 
            paf.l3_name, 
            paf.l4_name, 
            paf.l5_name,
            paf.l7_code,
            paf.article,
            paf.display_article,
            paf.article_description,
            coalesce(paf.global_fit_platform,'') as global_fit_platform,
            ROUND(AVG(paf.price::numeric), 2)::numeric(10, 2) AS price
            from global.product_attributes_filter paf
            where article in (select article from distinct_articles)
            group by 1,2,3,4,5,6,7,8,9,10,11
            --TODO: Add product_group filter and other if any
        )
       -- select * from product_filters_of_articles
        ,

        store_filters_of_stores as (
            select 
            saf.store_code,
            saf.store_name,
            saf.district,
            saf.state,
            saf.territory,
            saf.country_id,
            saf.channel,
            saf.sls_floor_capacity
            from global.store_attributes_filter saf
            where saf.store_code in (select store from distinct_stores)
            --TODO: Add store_group filter and other if any
        ),

        pack_dc_cross_allocation_codes as (
            select 
            carfg.article, 
            carfg.store, 
            carfg.retail_size_cd, 
            carfg.allocation_code, 
            pack_data.pack_type_id,
            pack_data.packs_allocated_qty,
            pack_data.packs_available_qty,
            js.key as dc_code
            from base_allocation_codes_data carfg
                CROSS JOIN LATERAL jsonb_each(carfg.pack_dc_allocation) js
                CROSS JOIN LATERAL (
                    SELECT
                        UNNEST((TRANSLATE((js.value->>'packs_allocated'), '[]', '{}'))::text[]) AS pack_type_id,
                        UNNEST((TRANSLATE((js.value->>'packs_allocated_qty'), '[]', '{}'))::numeric[]) AS packs_allocated_qty,
                        UNNEST((TRANSLATE((js.value->>'packs_available_qty'), '[]', '{}'))::numeric[]) AS packs_available_qty
                ) pack_data
        )
       -- select * from pack_dc_cross_allocation_codes
        ,
        packs_filtered as (
            select
            pack_cross.allocation_code, 
            pack_cross.dc_code,
            pack_cross.store,  
            pack_cross.article, 
            pack_cross.pack_type_id,
            dpc.pack_type,
            avg(pack_cross.packs_allocated_qty):: int as packs_allocated_qty,
            avg(pack_cross.packs_available_qty):: int as packs_available_qty, 
            array_agg(pack_cross.retail_size_cd ORDER BY pack_cross.retail_size_cd) AS sizes,
            array_agg(COALESCE(dpc.units_in_pack, 1) ORDER BY pack_cross.retail_size_cd) AS units_in_pack_list,
            (avg(pack_cross.packs_allocated_qty) * SUM(COALESCE(dpc.units_in_pack, 1)))::int AS total_allocated_qty,
            (avg(pack_cross.packs_available_qty) * SUM(COALESCE(dpc.units_in_pack, 1)))::int AS total_available_qty
            from pack_dc_cross_allocation_codes pack_cross
            inner join inventory_smart.dc_pack_configuration dpc 
            on pack_cross.pack_type_id=dpc.pack_type_id and pack_cross.article=dpc.article and pack_cross.retail_size_cd=dpc.size
            group by 
                pack_cross.allocation_code, 
                pack_cross.dc_code,
                pack_cross.store,  
                pack_cross.article, 
                pack_cross.pack_type_id,
                dpc.pack_type
        )
        ,
        final_cte as(
        select 
        pack_cross.allocation_code, 
        pack_cross.dc_code,
        COALESCE(dc.name, pack_cross.dc_code) as dc_name,
        pack_cross.store, 
        pack_cross.store as store_code,  
        saf.store_name,
        COALESCE(saf.district, '') AS district,
        COALESCE(saf.state, '') AS state,
        COALESCE(saf.territory, '') AS territory,
        COALESCE(saf.country_id, '') AS country_id,
        COALESCE(saf.channel, '') AS channel,
        bm.store_grade,
        bm.store_cluster,
        pack_cross.article, 
        paf.display_article, 
        paf.article_description, 
        paf.l0_name, 
        paf.l1_name, 
        paf.l1_name as consumer,
        paf.l2_name, 
        paf.l3_name, 
        paf.l3_name as category,
        paf.l4_name, 
        paf.l5_name,
        paf.l7_code,
        paf.l7_code as pc5,
        paf.global_fit_platform,
        pack_cross.pack_type_id,
        pack_cross.pack_type,
        coalesce(saf.sls_floor_capacity, 0)::int as store_capacity,
        coalesce(paf.price,1) as price, 
        bm.created_at,
        bm.created_by,
        coalesce(pack_cross.packs_allocated_qty, 0) as packs_allocated_qty,
        coalesce(pack_cross.packs_available_qty, 0) as packs_available_qty,
        pack_cross.sizes,
        pack_cross.units_in_pack_list,
        pack_cross.total_allocated_qty,
        pack_cross.total_available_qty,
        --(pack_cross.total_allocated_qty * COALESCE(paf.price, 1))::numeric(18,2) AS allocated_value,
        bm.min,
        bm.wos,
        bm.delivery_dt,
        um.user_name as created_by
        from packs_filtered pack_cross
        INNER JOIN product_filters_of_articles paf on pack_cross.article = paf.article
        inner join allocation_code_article_store_level_msc bm on pack_cross.allocation_code = bm.allocation_code and pack_cross.store = bm.store and pack_cross.article = bm.article
        LEFT JOIN store_filters_of_stores saf on pack_cross.store = saf.store_code
        LEFT JOIN global.distribution_centres dc on pack_cross.dc_code::text = dc.dc_code::text
        LEFT JOIN global.user_master um ON um.user_code = bm.created_by
        )
        
        select * from final_cte
    $$, _created_at_start, _created_at_end, 'ARRAY[' || (SELECT string_agg(quote_literal(elem), ',') FROM jsonb_array_elements_text(allocation_codes) AS elem) || ']');
    raise notice '%', _query_combine;
    OPEN $1 FOR EXECUTE _query_combine;
    perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.order_batching_hle_base_data', 'Before returning function value',_query_combine,jsonb_build_object('allocation_codes',allocation_codes)) ;
    RETURN $1;
    end
$function$
;