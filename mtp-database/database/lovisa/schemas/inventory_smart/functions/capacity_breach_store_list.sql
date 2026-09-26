--liquibase formatted sql
--changeset swapnil.bhange:capacity_breach_store_list_v3 runOnChange:true stripComments:false splitStatements:false context:MTP-127761 labels:MTP-127761
--comment: MTP-127761 Lovisa specific function_v3
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.capacity_breach_store_list(character varying, character varying);
DROP FUNCTION IF EXISTS inventory_smart.capacity_breach_store_list(character varying);
CREATE OR REPLACE FUNCTION inventory_smart.capacity_breach_store_list(character varying, character varying DEFAULT '[]')
 RETURNS TABLE(l1_name character varying, range_name character varying, store_code character varying, store_grade character varying, store_name_display character varying, channel character varying, unit_capacity integer, oh numeric, oo numeric, it numeric, oh_it_oo numeric, prong_density_pre numeric, prong_density_post numeric, store_inv numeric, old_alloc numeric, dc_available integer, net_available integer, user_reserve_qty integer, allocated_qty integer)
 LANGUAGE plpgsql
AS $function$
   /* 
    * Function/Procedure name: inventory_smart.capacity_breach_store_list
    * Created by: Nibeel Yunus
    * Created at: 26-02-2026
    * No of input parameter: 2
    * Parameter Description : 
    *                         1 = Allocation Code
    *                         2 = JSON array of article codes (optional, default '[]')   
    * Purpose: 
    * This function is created to calculate capacity breach after allocation at a store-l1_name-range_name level
    * Finalize screen of Allocate flow - 3rd tab
    * Calling Statement:
        select * from inventory_smart.capacity_breach_store_list
            ('6_250_FactoryLineRetail_20230626T101741');
        select * from inventory_smart.capacity_breach_store_list
            ('6_250_FactoryLineRetail_20230626T101741',
             '["article1", "article2"]');
    *
    *
    * if any modification done in same function/procedure please record the changes in below format
    *
    * Updated_by       Updated_on      Purpose
    * ----------       -----------     --------
    *
    */
declare

    _query_combine text:= '';
    _article_filter text:= '';

begin      

    -- Build optional article filter from JSON array parameter
    IF $2 IS NOT NULL AND $2 != '[]' AND $2 != '' THEN
        SELECT 'AND carfs.article IN (' || string_agg(quote_literal(elem), ', ') || ')'
        INTO _article_filter
        FROM jsonb_array_elements_text($2::jsonb) AS elem;
    END IF;

	_query_combine := format($$
           WITH base_table AS materialized(
                SELECT carfs.*, saf.channel, store store_code, retail_size_cd size
                FROM inventory_smart.create_allocation_result_flat_gurobi carfs
                LEFT JOIN global.store_attributes_filter saf ON store_code = store
                WHERE 
                allocation_code = '%1$s'
				and 
                carfs.created_at >= (date((now() AT TIME ZONE 'Australia/Melbourne'::text))::timestamp without time zone AT TIME ZONE 'Australia/Melbourne'::text) AND carfs.created_at <= ((date((now() AT TIME ZONE 'Australia/Melbourne'::text))::timestamp without time zone AT TIME ZONE 'Australia/Melbourne'::text) + '23:59:59'::interval) 
				%2$s
            )
			--select * from base_table;
            ,flat_table as materialized(
                SELECT 
                    article,
                    store_code,
                    store_name,
                    store_grade,
                    js.key dc_code, 
                    channel,
                    UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) pack_type_id,
                    UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) allocated_qty,
                    UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty        
                FROM (
                    SELECT article, store_code, store_name, store_grade, channel, pack_dc_allocation FROM base_table 
                    GROUP BY 1, 2, 3, 4, 5, 6
                ) foo , JSONB_EACH(pack_dc_allocation) js
            )
			--select * from flat_table;
            ,packs as materialized(
                SELECT 
                    ft.article,
                    dc_code,
                    store_code,
					store_grade,
                    dpc.pack_type_id,
                    dpc.size size,
					parent_article,
                    pack_description,
                    channel,
                    available_qty,
                    allocated_qty packs_allocated_qty,
                    allocated_qty * units_in_pack::double precision AS allocated_qty
                FROM inventory_smart.dc_pack_configuration dpc
                JOIN flat_table ft on ft.article=dpc.article and ft.pack_type_id=dpc.pack_type_id 
            )
			--select * from packs;
            ,packs_base as materialized(
                SELECT ft.article,
                    ft.dc_code,
                    ft.store_code,
                    ft.store_grade,
                    ft.pack_type_id,
                    ft.pack_type_id as size,
                    ft.pack_type_id as pack_description,
                    ft.pack_type_id as parent_article,
                    ft.allocated_qty,
                    ft.channel,
                    ft.allocated_qty as packs_allocated_qty,
                    'E' as type
                    FROM flat_table ft
                    WHERE NOT (ft.pack_type_id IN ( SELECT packs.pack_type_id FROM packs))
                UNION
                SELECT packs.article,
                    packs.dc_code,
                    packs.store_code,
                    packs.store_grade,
                    packs.pack_type_id,
                    packs.size,
                    packs.pack_description,
                    packs.parent_article,
                    packs.allocated_qty,
                    packs.channel,
                    packs.packs_allocated_qty,
                    'S' as type
                    FROM packs
            )
			--select * from packs_base;
            ,article_list as materialized(
            	select distinct article from packs_base 
            )  
			--select * from article_list;
            ,packs_detail as materialized(
                select
                    article,
                    paf.product_code,
                    paf.l0_name,
                    paf.l1_name,
                    paf.l2_name,
                    paf.l3_name,
                    paf.l4_name,
                    dc_code,
                    store_code,
                    store_grade,
                    size,
                    channel,
                    SUM(allocated_qty) allocated_qty,
                    JSON_OBJECT_AGG(pack_type_id, packs_allocated_qty) filter (
                    where type = 'S') packs_allocated_qty,
                    SUM(case when type = 'E' then allocated_qty end) as loose_units_allocated,
                    SUM(case when type = 'S' then allocated_qty end) as pack_units_allocated,
                    STRING_AGG(distinct case when type = 'S' then pack_description end, ',') as packs_allocated
                from packs_base
                join "global".product_attributes_filter paf using(article, size)
                where paf.article in (select article from article_list)
                group by 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
            )  
			--select * from packs_detail;  
            ,store_size_allocations as materialized(
                SELECT
                    article,
                    store_code,
                    store_grade,
                    size,
                    SUM(allocated_qty) allocated_qty,
                    SUM(CASE WHEN type = 'E' THEN allocated_qty END) as loose_units_allocated,
                    SUM(CASE WHEN type = 'S' THEN allocated_qty END) as pack_units_allocated,
                    STRING_AGG(DISTINCT CASE WHEN type = 'S' THEN parent_article END, ',') as packs_allocated,
                    STRING_AGG(DISTINCT CASE WHEN type = 'S' THEN pack_description END, ',') as pack_description
                FROM
                    packs_base
                GROUP BY 1, 2, 3,4
            )
			--select * from store_size_allocations;
           	,current_allocation as materialized(
           		SELECT article, dc_code, size, SUM(oh) oh
                FROM (
                	SELECT article, dc_code::int dc_code, size FROM packs_base
                    GROUP BY 1, 2, 3
               	) a 
				JOIN inventory_smart.sku_dc_available_units sku USING(article, dc_code, size)
				where sku.article in (select article from article_list)
				GROUP BY 1, 2, 3
            )
			--select * from current_allocation;
            ,reserve_allocation as materialized(
				SELECT article, dc_code, size, SUM(COALESCE(quantity,0)) user_reserve_qty 
				FROM (
					SELECT dc_code::int dc_code, article, size FROM packs_base
					GROUP BY 1, 2, 3
				) am
				LEFT JOIN inventory_smart.sku_dc_reserved_units sdru 
				USING (dc_code, article, size)
				GROUP BY 1, 2, 3
            )
			--select * from reserve_allocation;
            ,other_allocations as materialized(
				SELECT article, dc_code, size, SUM(quantity) allocated_reserve_qty, SUM(eaches_allocated) eaches_allocated, SUM(packs_allocated) packs_allocated
				FROM (
					SELECT article, dc_code::int dc_code, size FROM packs_base
					GROUP BY 1, 2, 3
				) a 
				JOIN inventory_smart.sku_dc_allocated_units sdal USING(article, dc_code, size)
				where sdal.article in (select article from article_list)
				GROUP BY 1, 2, 3
			)
			--select * from other_allocations;
			,final_inv as materialized(
				select
					article,
					l1_name,
					dc_code::text dc_code,
					dcs.name dc,
					size,
					AVG(allocated_qty) allocated_qty, 
					COALESCE(SUM(user_reserve_qty), 0) as user_reserve_qty,
					COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(SUM(user_reserve_qty), 0) as dc_available,
					COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(AVG(allocated_qty), 0) - COALESCE(SUM(user_reserve_qty), 0) as net_available
               	FROM (
                	SELECT 
						article,
						l1_name,
						dc_code::int dc_code,
						size,
						SUM(allocated_qty) as allocated_qty
					FROM packs_detail
					GROUP BY 1, 2, 3, 4
				) foo
				LEFT JOIN current_allocation USING (article, dc_code, size)
				LEFT JOIN reserve_allocation USING (article, dc_code, size)
				LEFT JOIN other_allocations USING (article, dc_code, size)
				LEFT JOIN global.distribution_centres dcs using(dc_code) 
				GROUP BY 1, 2, 3, 4, 5
			)
			--select * from final_inv;
       		,store_dept_inv as materialized(
                SELECT
                    store_code,
					l0_name,
                    l1_name,
					range_name,
					COALESCE(SUM(oh), 0) as oh,
 					COALESCE(SUM(it), 0) as it,
					COALESCE(SUM(oo), 0) as oo,
                    COALESCE(SUM(oh), 0) + COALESCE(SUM(it), 0) + COALESCE(SUM(oo), 0) as store_inv
                FROM inventory_smart.latest_inventory li
                JOIN global.product_attributes_filter paf USING (product_code)
                WHERE l1_name in (
                    SELECT DISTINCT l1_name 
                    FROM global.product_attributes_filter 
                    WHERE article in (
                        SELECT DISTINCT article 
                        FROM packs_base
                    )
                ) 
                GROUP BY 1, 2, 3, 4
            )
            --select * from store_dept_inv;
			,store_old_alloc as materialized(
            	select 
            		l0_name, 
            		l1_name, 
            		range_name, 
            		store as store_code,
            		COALESCE(sum(allocated_total),0) as old_alloc
            	FROM inventory_smart.create_allocation_result_flat_gurobi carfs
				JOIN inventory_smart.plan_master pm ON carfs.allocation_code::text = pm.plan_code::text
				join "global".product_attributes_filter paf using (article)		
				WHERE pm.created_at >= (date((now() AT TIME ZONE 'Australia/Melbourne'::text))::timestamp without time zone AT TIME ZONE 'Australia/Melbourne'::text) AND pm.created_at <= ((date((now() AT TIME ZONE 'Australia/Melbourne'::text))::timestamp without time zone AT TIME ZONE 'Australia/Melbourne'::text) + '23:59:59'::interval) AND (pm.status = ANY (ARRAY[2, 3])) AND pm.is_deleted = false
				and paf.article in (select article from article_list)
				and allocation_code != '%1$s'
				group by 1,2,3,4
			)
			--select * from store_old_alloc;
            ,store_capacity as materialized(
                SELECT
                    store_code,
					l0_name,
                    l1_name,
					range_name,
                    unit_capacity
                FROM inventory_smart.store_unit_capacity
                WHERE store_code in (
                    SELECT DISTINCT store_code 
                    FROM packs_base
                )
            )
            --select * from store_capacity;
            ,store_allocations as materialized(
                SELECT
                    store_code,
					l0_name,
                    l1_name,
					range_name,
                    SUM(allocated_qty) allocated_qty
                FROM store_size_allocations
                LEFT JOIN (
                    SELECT * 
                    FROM global.product_attributes_filter 
                    WHERE article IN (
                        select article from article_list
                    )
                ) a USING (article, size)
                GROUP BY 1, 2, 3, 4
            )
            --select * from store_allocations;
            ,capacity_breach as materialized(
            	SELECT
                	store_code,
					l0_name,
                    l1_name,
					range_name,
                  	allocated_qty,
                  	coalesce(unit_capacity,0) as unit_capacity,
					oh,
					oo,
					it,					
					(oh + oo + it ) as oh_it_oo,
                    COALESCE(old_alloc, 0) AS old_alloc,
                    (COALESCE(store_inv,0) + COALESCE(old_alloc, 0)) as store_inv,
					coalesce(ROUND(((COALESCE(store_inv,0) + COALESCE(old_alloc, 0)) * 1.0 / NULLIF(unit_capacity, 0))::numeric, 2),0) AS prong_density_pre,
					coalesce(ROUND(((COALESCE(store_inv,0) + COALESCE(old_alloc, 0) + allocated_qty) * 1.0 / NULLIF(unit_capacity, 0))::numeric, 2),0) AS prong_density_post
             	FROM store_allocations
               	LEFT JOIN store_dept_inv USING(store_code, l0_name, l1_name, range_name)
               	LEFT JOIN store_capacity USING(store_code, l0_name, l1_name, range_name)
                left join store_old_alloc using(store_code, l0_name, l1_name, range_name)
            )
            ,article_level_store as materialized(
                SELECT
                    article,
                    l0_name,
                    l1_name,
                    l2_name,
                    l3_name,
                    l4_name,
					range_name,
                    style_name,
                    store_code,
                    store_name,
                    store_grade,
					store_name_display,
                    channel,
                    size,
                    allocated_qty,
                    packs_allocated,
                    pack_description,
                    pack_units_allocated,
                    loose_units_allocated
                FROM store_size_allocations 
                LEFT JOIN (
                    SELECT * 
                    FROM global.product_attributes_filter 
                    WHERE article IN (
                       select article from article_list
                    )
                ) a USING (article, size)
                LEFT JOIN global.store_attributes_filter USING(store_code)
            )
            SELECT
             	als.l1_name,
				als.range_name,
				store_code,
	          	store_grade,
				store_name_display,
				channel,
                unit_capacity::int,
				cb.oh::numeric,
				cb.oo::numeric,
				cb.it::numeric,
				cb.oh_it_oo::numeric,
				prong_density_pre::numeric,
    			prong_density_post::numeric,
                store_inv::numeric,
				old_alloc::numeric,
				sum(fi.dc_available)::int as dc_available,
                sum(fi.net_available)::int as net_available,
                sum(fi.user_reserve_qty)::int as user_reserve_qty,
               	SUM(als.allocated_qty)::int allocated_qty
            FROM article_level_store als
            JOIN capacity_breach cb USING(store_code, l0_name, l1_name, range_name)
            LEFT JOIN final_inv fi USING (article) 
            LEFT JOIN (
                SELECT * 
                FROM inventory_smart.article_inventory_dashboard 
                WHERE article IN (
                    SELECT DISTINCT article 
                    FROM base_table
                )
            ) aid using(article, store_code, channel)
            GROUP BY 
              1,2,3,4,5,6,7,8,9,10,11,12,13,14,15
		$$, $1, _article_filter);
	
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;	
    end
   $function$
;