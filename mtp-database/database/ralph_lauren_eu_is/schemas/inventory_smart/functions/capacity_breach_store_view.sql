--liquibase formatted sql
--changeset liquibase:capacity_breach runOnChange:true stripComments:false splitStatements:false context:MTP-43185
--comment: MTP-43185, fixed net dc calculation taking allocation on a store instead of all
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.capacity_breach_store_view(input refcursor, character varying, character varying, character varying, character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.capacity_breach_store_view(input refcursor, character varying, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /*
  * Function/Procedure name: inventory_smart.capacity_breach_store_view
  * Created by: Karthikeswar Saravanan
  * Created at: 27-May-2024
  * No of input parameter: 6
  * Parameter Description : $1 = Cursor
  *                         $2 = Allocation Code
  *                             $3 = Article code/SKU code
  *                             $4 = Store Code
  *                             $5 = Ignore allocation code
								$6 = type
  * Purpose:
  * This function is created to calculate Store View Allocation Summary which is displayed in the
  * Capcity Breach screen of Allocate flow
  * Calling Statement:

     begin;
     select * from inventory_smart.capacity_breach_store_view
         ('my_cur',
          '<allocation_code>',
         '<article_code>',
        '<store_code>');
      FETCH ALL IN "my_cur";
     commit;

  *
  * if any modification done in same function/procedure please record the changes in below format
  *
  * Updated_by       Updated_on      Purpose
  * ----------       -----------     --------
  *
  */
 declare
    _query text;
    begin
        _query := format($$
            WITH base_table AS (
                SELECT carfs.*, channel, store store_code, retail_size_cd size
                FROM inventory_smart.create_allocation_result_flat_gurobi carfs
                LEFT JOIN global.store_attributes_filter saf ON store_code = store
                WHERE allocation_code = '%1$s' AND carfs.article = '%2$s' and store_code='%3$s'
            )
            ,common_base_table AS (
                SELECT carfs.*, channel, store store_code, retail_size_cd size
                FROM inventory_smart.create_allocation_result_flat_gurobi carfs
                LEFT JOIN global.store_attributes_filter saf ON store_code = store
                WHERE allocation_code = '%1$s' AND carfs.article = '%2$s'
            )
            ,packs AS (
                SELECT pack_type_id
                FROM inventory_smart.dc_pack_configuration dpc where article='%2$s'
                group by 1
            )
            ,flat_table as (
                SELECT article,
                       store_code,
                       js.key::int dc_code,
                       channel,
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) pack_type_id,
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) allocated_qty,
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty
                FROM (
                    SELECT article, store_code, channel, pack_dc_allocation FROM base_table
                    GROUP BY 1, 2, 3, 4
                ) foo , JSONB_EACH(pack_dc_allocation) js
            )
            ,common_flat_table as (
                SELECT article,
                       store_code,
                       js.key::int dc_code,
                       channel,
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) pack_type_id,
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) allocated_qty,
                       UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty
                FROM (
                    SELECT article, store_code, channel, pack_dc_allocation FROM common_base_table
                    GROUP BY 1, 2, 3, 4
                ) foo , JSONB_EACH(pack_dc_allocation) js
            ),
            size_pack_grp as (
                SELECT  article,
                        store_code,
                        dc_code,
                        channel,
                        pack_type_id,
                        sum(allocated_qty) as allocated_qty,
                        max(available_qty) as available_qty
                from flat_table group by 1,2,3,4,5
            ),
            common_size_pack_grp as (
                SELECT  article,
                        dc_code,
                        pack_type_id,
                        sum(allocated_qty) as allocated_qty,
                        max(available_qty) as available_qty
                from common_flat_table group by 1,2,3
            ),
            avail_units_pack_eaches as(
                SELECT  article,
                        dc_code,
                        pack_type_id,
                        sum(oh)+sum(it)+sum(oo) as available_qty
                FROM inventory_smart.sku_dc_available_units
                where article ='%2$s'
                group by 1, 2, 3
            )
            ,pack_unit_config as (
                select  article,
                        pack_type_id,
                        sum(units_in_pack) as pack_units
                from inventory_smart.dc_pack_configuration dpc
                where article = '%2$s'
                group by 1, 2
            )
            ,reserve_allocation as (
                    SELECT article, dc_code, size as pack_type_id, SUM(COALESCE(quantity,0)) user_reserve_qty
                    FROM (
                        SELECT dc_code, article, pack_type_id as size FROM flat_table
                        GROUP BY 1, 2, 3
                    ) am
                    LEFT JOIN (
                        SELECT * FROM inventory_smart.sku_dc_reserved_units('{}', (SELECT ARRAY_AGG(article) FROM flat_table))
                    ) b
                    USING (dc_code, article, size)
                    GROUP BY 1, 2, 3
            )
            ,other_allocations as (
                SELECT article, dc_code, pack_type_id, SUM(allocated_reserve_qty) as allocated_reserve_qty
                FROM (
                    SELECT dc_code, article, pack_type_id, COALESCE(quantity,0) as allocated_reserve_qty
                    FROM (
                        SELECT dc_code, article, pack_type_id FROM flat_table
                        GROUP BY 1, 2, 3
                    ) am
                    JOIN inventory_smart.sku_dc_allocated_units
                    USING (dc_code, article, pack_type_id)
                ) a
                GROUP BY 1, 2, 3
            )
            ,result as (
                select  spg.article,
                        spg.store_code,
                        spg.dc_code,
                        dc.name as dc_name,
                        spg.pack_type_id as size,
                        spg.allocated_qty,
                        (COALESCE(aupe.available_qty,0)/ COALESCE(puc.pack_units,1)) - cspg.allocated_qty - COALESCE(ra.user_reserve_qty,0) - COALESCE(oa.allocated_reserve_qty,0) as net_dc_available,
                        bt.min as min_size,
                        bt.max as max_size,
                        bt.oh+bt.oo+bt.it as oh_oo_it_size,
                        CASE
                        	WHEN spg.pack_type_id in (select * from packs) then 'Pack'
                        	ELSE 'Each'
                        END as type
                from size_pack_grp spg
                left join common_size_pack_grp cspg using(dc_code, article, pack_type_id)
                left join avail_units_pack_eaches aupe using(dc_code, article, pack_type_id)
                left join pack_unit_config puc using(article, pack_type_id)
                left join reserve_allocation ra using(dc_code, article, pack_type_id)
                left join other_allocations oa using(dc_code, article, pack_type_id)
                left join base_table bt on spg.article=bt.article and spg.pack_type_id=bt.retail_size_cd and spg.store_code = bt.store_code
                left join global.distribution_centres dc using(dc_code)
            )
            select * from result
            $$, $2, $3, $4);
        raise notice '%', _query;
        OPEN $1 FOR execute _query;
        RETURN $1;
    end
 $function$
;