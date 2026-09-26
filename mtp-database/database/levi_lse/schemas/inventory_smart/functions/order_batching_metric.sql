--liquibase formatted sql
--changeset liquibase:OB setup runOnChange:true stripComments:false splitStatements:false context:MTP-126141 labels:MTP-126141
--comment: MTP-126141 | OB setup
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.order_batching_metric(refcursor, jsonb, jsonb, jsonb, character varying);
DROP FUNCTION IF EXISTS inventory_smart.order_batching_metric(refcursor, jsonb, jsonb, jsonb, jsonb, character varying);

CREATE OR REPLACE FUNCTION inventory_smart.order_batching_metric(input refcursor, jsonb, jsonb, jsonb, jsonb, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /* 
  * Function/Procedure name: inventory_smart.order_batching_metric
  * Created by: Suba Selvandran N
  * Created at: 23-May-2023
  * No of input parameter: 3
  * Parameter Description : $1 = cursor
  *                         $2 = product filters str
                            $3 = store filters str
                            $4 = custom filters str
  * if any modification done in same function/procedure please record the changes in below format
  *
  * Updated_by       Updated_on      Purpose
  * ----------       -----------     --------
  * Shreyas Sankpal	 23-May-2024	 [MTP-87708] Align with Levis
  * Krishna          15-Jan-2025     [no ref ticket] Fixed query logic - added final_pre_3 CTE for proper inventory calculations and corrected aggregation levels
  */
declare
    _query_combine text;
    _query_pa      text:='';
    _query_sa      text:='';
    _query_cus     text:='';
    _query_psa    text:='';
    _created_at_filter text:='';
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
    begin
    _query_pa  := global.form_main_table_filters('product_attributes_filter', $2);
    _query_sa  := global.form_main_table_filters('store_attributes_filter', $3);
	_query_psa := global.form_main_table_filters('product_store_attributes_filter', $4);
    _query_cus := inventory_smart.form_main_table_filters('',$5);

    --For Now Adding to custom filter, need to check for efficiency
    _created_at_filter := format('(created_at AT TIME ZONE ''UTC'')::date = %L::date', $6);
    IF $6 IS NOT NULL AND trim($6) != '' THEN
        IF _query_cus IS NULL OR trim(_query_cus) = '' THEN
            _query_cus := 'WHERE ' || _created_at_filter;
        ELSE
            _query_cus := _query_cus || ' AND ' || _created_at_filter;
        END IF;
    END IF;

    _query_combine := format($$
			WITH
			product_filters AS materialized (
				SELECT product_code, article, display_article
				FROM global.product_attributes_filter %1$s
			),
			store_filters AS materialized(
				SELECT store_code FROM global.store_attributes_filter %2$s
			),
	        plan_master AS materialized (
                SELECT
					*
				FROM (
                    SELECT 
                    plan_code, 
                    plan_code as allocation_name, 
                    plan_code as allocation_code, 
                    created_at, 
                    CASE WHEN type in (0, 4, 5) THEN 'Manual' ELSE 'Auto' end as allocation_type
                    FROM 
                    inventory_smart.plan_master 
                    WHERE 
                    status IN (2) 
                    AND is_deleted = false 
                    AND created_at >= (CURRENT_DATE - INTERVAL '5 days') AT TIME ZONE 'UTC'
                    AND created_at <  (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'UTC'
                )  %3$s
            ) ,
			filter_allocations_pre as materialized (
				SELECT
					*
				FROM (
					SELECT 
						carfg.allocation_code,
						carfg.article,
						carfg.retail_size_cd,
						carfg.store,
                        carfg.store_name,
						carfg.allocated_total,
						carfg.inventory_source,
						carfg.inv_avai,
						carfg.created_at,
                        carfg.pack_dc_allocation,
                        carfg.store_grade,
                        carfg.store_cluster, 
						CASE
							WHEN inventory_source='dc' THEN 'B'
							WHEN inventory_source='po' THEN 'L'
							WHEN inventory_source='ns' THEN 'S'
							ELSE ''
						END AS po_type,
						plm.allocation_type,
						plm.allocation_name
					FROM inventory_smart.create_allocation_result_flat_gurobi AS carfg
					INNER JOIN plan_master plm ON plm.plan_code = carfg.allocation_code
					where exists (select 1 from product_filters paf where paf.article=carfg.article)
					AND carfg.created_at >= (CURRENT_DATE - INTERVAL '5 days') AT TIME ZONE 'UTC'
					AND carfg.created_at <  (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'UTC'
				) a %4$s 
			),
			filter_allocations as materialized (
            select a.* 
            from filter_allocations_pre a
            where exists (select 1 from store_filters b where a.store=b.store_code)
            )
            ,packs_with_out_store_filters as (
				SELECT
					js.key as dc_code,
					store,
					store_name,
					allocated_total,
					allocation_code,
					inv_avai AS dc_available,
					article,
					retail_size_cd as size,
					pack_data.pack_type_id,
					pack_data.packs_allocated_qty,
					pack_data.packs_available_qty
				FROM
					filter_allocations_pre
					CROSS JOIN LATERAL jsonb_each(pack_dc_allocation) js
					CROSS JOIN LATERAL (
						SELECT 
							UNNEST((TRANSLATE((js.value->>'packs_allocated')::text, '[]', '{}'))::text[]) AS pack_type_id,
							UNNEST((TRANSLATE((js.value->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) AS packs_allocated_qty,
							UNNEST((TRANSLATE((js.value->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) AS packs_available_qty
					) pack_data
		    ),

            allocation_base_with_out_store_filters AS materialized (
			select a.* ,dpc.pack_type,dpc.units_in_pack,
			a.packs_allocated_qty * (COALESCE(dpc.units_in_pack,1)::integer) AS allocated_qty,
			a.packs_available_qty * (COALESCE(dpc.units_in_pack,1)::integer) AS available_qty
			from packs_with_out_store_filters a
			JOIN inventory_smart.dc_pack_configuration dpc USING (pack_type_id,article, size)
		    ),

            dc_pack_reserves AS (
		    SELECT
		        article,
		        dc_code,
		        pack_type_id,
		        SUM(COALESCE(quantity, 0)) AS reserve_quantity
		    FROM
		        inventory_smart.dc_pack_reserve_quantity
		    WHERE
		        article IN (
		            SELECT DISTINCT article 
		            FROM filter_allocations_pre
		        )
		    GROUP BY article, dc_code, pack_type_id
		),
    pack_type_level_split as materialized(
            select 
                article, 
                store,
                allocation_code,
                dc_code,
                pack_type_id,
                pack_type,
                array_agg(a.size ORDER BY a.size) AS sizes,
                SUM(COALESCE(a.units_in_pack, 1)) AS total_units_in_pack,
                AVG(coalesce(packs_allocated_qty, 0)) as packs_allocated_qty,
                AVG(coalesce(packs_available_qty, 0)) as packs_available_qty
            from allocation_base_with_out_store_filters a
            group by 1, 2, 3, 4, 5, 6
            ),
		dc_available_inventory AS (
			SELECT
				ab.dc_code,
				ab.article,
				ab.pack_type_id,
				ab.pack_type,
				MAX(packs_available_qty) as packs_available_qty,
				SUM(COALESCE(ab.packs_allocated_qty, 0)) as total_packs_allocated_qty,
				MAX(COALESCE(dcpr.reserve_quantity, 0)) as reserve_quantity,
				MAX(total_units_in_pack) as total_units_in_pack,
				GREATEST(
					MAX(packs_available_qty) - SUM(COALESCE(ab.packs_allocated_qty, 0)) - MAX(COALESCE(dcpr.reserve_quantity, 0)), 
					0
				) as net_available_packs,
				GREATEST(
					MAX(packs_available_qty) - SUM(COALESCE(ab.packs_allocated_qty, 0)) - MAX(COALESCE(dcpr.reserve_quantity, 0)), 
					0
				) * MAX(total_units_in_pack) as net_available_total
			FROM pack_type_level_split ab
			LEFT JOIN dc_pack_reserves dcpr ON dcpr.article = ab.article and dcpr.dc_code::text=ab.dc_code::text and dcpr.pack_type_id=ab.pack_type_id
			GROUP BY ab.dc_code, ab.article, ab.pack_type_id, ab.pack_type
			),
		dc_available_summary AS (
			select sum(dc_eaches_available) as dc_eaches_available, sum(dc_packs_available) as dc_packs_available, sum(dc_total_available) as dc_total_available from (
			SELECT
				dc_code,
				SUM(CASE WHEN pack_type = 'eaches' THEN net_available_packs ELSE 0 END) as dc_eaches_available,
				SUM(CASE WHEN pack_type = 'packs' THEN net_available_packs ELSE 0 END) as dc_packs_available,
				SUM(net_available_total) as dc_total_available
			FROM dc_available_inventory
			GROUP BY dc_code
			)
		),

        article_list as (
        select article from filter_allocations group by 1
        ),

        vir_reservation_remaining AS materialized (
            SELECT 
                sum(vir_reservation_remaining) AS vir_reservation_remaining
            from
            (
                select
                    article,
                    dc_code,
                    max(aic.vir_reservation_remaining) as vir_reservation_remaining
                from
                    inventory_smart.article_inventory_constraint aic
                where exists (select 1 from article_list b where aic.article=b.article)
                group by article, dc_code
            )
			),
		    final_pre_1 as materialized (
                select 
                article,
                store_code,
                (SELECT COUNT(DISTINCT allocation_code) FROM filter_allocations) as allocation_count,
                (SELECT COUNT(DISTINCT store) FROM filter_allocations) as store_count,
                sum(allocated_total) as allocated_qty
                from (
                    SELECT 
                            a.article,
                            a.store as store_code,
                            a.allocation_code,
                            SUM(a.allocated_total) AS allocated_total
                        FROM 
                            filter_allocations a 
                        GROUP BY 1,2,3
                )   x
                group by 1,2
            )
--            select * from final_pre_1
            ,
            final_pre_2 as materialized (
                SELECT 
                    aa.article,
                    aa.store_count,
                    aa.allocation_count,
                    COALESCE(SUM(aa.allocated_qty), 0) as allocated_qty
                FROM
                    final_pre_1 AS aa
                group by
                    aa.article, aa.store_count, aa.allocation_count
            )
--              select * from final_pre_2
            ,
            final_pre_3 as materialized (
                 select
                     aa.article,
                     aa.store_count,
                     aa.allocation_count,
                     aa.allocated_qty,
                     dcas.dc_total_available as dc_available
                 from final_pre_2 aa
                cross join dc_available_summary dcas
             ),
            final as materialized (
                select
                    coalesce(count(distinct article), 0) as article_count,
                    coalesce(ROUND(avg(store_count), 0), 0) as store_count,
                    coalesce(ROUND(avg(allocation_count), 0), 0) as allocation_count,
                    coalesce(sum(allocated_qty), 0) as allocated_qty,
                    coalesce(ROUND(AVG(dc_available)::numeric, 0)::numeric, 0) as dc_available,
                    coalesce(ROUND(AVG(vr.vir_reservation_remaining)::numeric, 0)::numeric, 0) as net_vir_reservation_remaining
                from 
                    final_pre_3
                CROSS join
                    vir_reservation_remaining vr
		    )
            SELECT
                to_char(allocation_count, 'FM999,999,999') AS "# Allocations",
                to_char(article_count, 'FM999,999,999') AS "# Allocation PC9s",
                to_char(store_count, 'FM999,999,999') as "# Allocated Stores",
                to_char(allocated_qty, 'FM999,999,999') AS "# Allocation units",
                to_char(dc_available, 'FM999,999,999') AS "DC Net Available Inventory",
                to_char(net_vir_reservation_remaining, 'FM999,999,999') AS "# Net VIR Remaining"
            FROM final z
		$$, _query_pa, _query_sa, _query_cus, _query_psa);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine; 
		perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.order_batching_metric', 'Before returning function value',_query_combine,jsonb_build_object('product filters str',$2,'store filters str',$3,'product store filters str',$4,'custom filter str',$5)) ;		

        RETURN $1;
    end
$function$
;
