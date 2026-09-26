--liquibase formatted sql
--changeset liquibase:po_finalize_product_view_summary runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for po_finalize_product_view_summary
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.po_finalize_product_view_summary(input refcursor, character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.po_finalize_product_view_summary(input refcursor, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
  /* 
   * Function/Procedure name: inventory_smart.product_view_summary
   * Created by: Renugopal S
   * Created at: 21-July-2022
   * No of input parameter: 2
   * Parameter Description : $1 = Application name
   *                         $2 = Allocation Code
  *                          $3 = Ignore allocation code
                             $4 = article filter
                             $5 = type
   * Purpose: 
   * This function is created to calculate Store View Allocation Summary which is displayed in the 
   * Finalize screen of Allocate flow
   * Calling Statement:
  
      begin;
      select * from inventory_smart.finalize_product_view_summary
          ('my_cur',
           '3_aignet_test_allocation_1',
           '');
       FETCH ALL IN "my_cur";
      commit;
      
  
  
   * if any modification done in same function/procedure please record the changes in below format
   *
   * Updated_by       Updated_on      Purpose
   * ----------       -----------     --------
   * Suba Selvandran  20-Apr-2023	  Sync PO with other finalize queries
   */
    declare
        _query_combine text;
        _article_filter text; 
    begin
        IF ($4 = '') IS FALSE
        THEN
            _article_filter = format($$AND article IN ('%s')$$, $4);
        END IF;
        _query_combine := format($$
        ----PRODUCT VIEW  summary
        WITH base_table as (
            SELECT carfs.*, channel, store store_code, retail_size_cd size FROM inventory_smart.create_allocation_result_flat_gurobi carfs
            JOIN global.store_attributes_filter saf ON saf.store_code::text = carfs.store::text 
            WHERE allocation_code = '%1$s' %3$s
        )
        ,flat_table as (
            SELECT article,
                   store_code,
                   js.key dc_code, 
                   channel,
                   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) pack_type_id,
                   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) allocated_qty        
            FROM (
                SELECT article, store_code, channel, pack_dc_allocation FROM base_table 
                GROUP BY 1, 2, 3, 4
            ) foo , JSONB_EACH(pack_dc_allocation) js
        )
--        select * from flat_table
--        
        ,packs AS (
            SELECT article,
                   dc_code,
                   store_code,
                   pack_type_id,
                   size,
                   channel,
                   allocated_qty * units_in_pack::double precision AS allocated_qty
            FROM inventory_smart.dc_pack_configuration dpc
            JOIN flat_table USING (article, pack_type_id)
        )
--        select * from flat_table
--        
        ,packs_base as (
            SELECT article,
                   dc_code,
                   store_code,
                   pack_type_id,
                   pack_type_id as size,
                   allocated_qty,
                   channel
            FROM flat_table
            WHERE NOT (pack_type_id IN ( SELECT pack_type_id FROM packs))
            UNION
            SELECT article,
                   dc_code,
                   store_code,
                   pack_type_id,
                   size,
                   allocated_qty,
                   channel
           FROM packs
        )
        ,packs_base_with_product_code as (
        	SELECT pb.*, paf.product_code
			FROM packs_base pb
        	LEFT JOIN global.product_attributes_filter paf USING(article, size)
        )      
        ,current_allocation as (
			SELECT am.dc_code,
				   size,
                   0 as user_reserve_qty,
				   SUM(available_qty) oh
			FROM (
				SELECT dc_code, size, product_code, channel
				FROM packs_base_with_product_code
				GROUP BY 1, 2, 3, 4
			) am
			LEFT JOIN inventory_smart.po_master sa  
			ON am.product_code = sa.product_code and am.dc_code = sa.po_code::text and am.channel = sa.channel
			GROUP BY 1, 2
		)
		,other_allocations as (
			SELECT po_code dc_code,
				   size,
				   SUM(quantity) as allocated_reserve_qty
			FROM inventory_smart.sku_po_allocations sda 
			WHERE allocation_code not in ('%1$s', '%2$s')
			group by 1, 2
		)
        ,first_table as (
            --article count and store count
            SELECT COUNT(DISTINCT article) as art_cnt,
                   COUNT(DISTINCT store_code) as store_cnt
            FROM packs_base
            WHERE allocated_qty > 0
        )
--        select * from first_table
--        
        ,second_table as (
            --store average
            SELECT AVG(store_count) as store_avg
            FROM (
                SELECT article, COUNT(DISTINCT store_code) as store_count
                FROM packs_base
                WHERE allocated_qty > 0
                GROUP BY 1
            ) as a
        )
        ,third_table as (
            SELECT b.size,
                   ast."order" as size_order,
                   SUM(allocated_qty) as allocated_size
            FROM (SELECT article, size, channel, SUM(allocated_qty) allocated_qty FROM packs_base GROUP BY 1, 2, 3) b
            LEFT JOIN (
                SELECT article, size, product_code
                FROM global.product_attributes_filter paf WHERE article in (SELECT distinct article from base_table) and active
            ) paf USING (article, size)
            LEFT JOIN inventory_smart.article_status_tag ast USING (product_code, channel)
            group by 1, 2
        )
--        select * from third_table
--        
        ,fourth_table as (
            SELECT dc_code,
                   dc_code dc_name,
                   size,
                   SUM(allocated_qty) as allocated_qty,
                   SUM(oh) as dc_available,
                   SUM(allocated_reserve_qty) as allocated_reserve_qty,
                   SUM(user_reserve_qty) as user_reserve_qty,
                   COALESCE(SUM(oh), 0) - COALESCE(SUM(allocated_reserve_qty), 0) - COALESCE(SUM(allocated_qty), 0) - COALESCE(SUM(user_reserve_qty), 0) as net_available
            FROM (
                SELECT size,
                       dc_code,
                       SUM(allocated_qty) as allocated_qty
                FROM packs_base
                GROUP BY 1, 2
            ) a
            LEFT JOIN current_allocation USING (size, dc_code)
            LEFT JOIN other_allocations USING (size, dc_code)
            GROUP BY 1, 2, 3
        )
--        select * from fourth_table
--        
        SELECT dc_code,
               dc_name as dc,
               art_cnt,
               store_cnt,
               store_avg,
               size,
               size_order,
               allocated_size,
               allocated_qty,
               net_available as net_dc_available,
               allocation_perc
        FROM (
            SELECT *,
                   CASE WHEN allocated_qty = 0 THEN 0
                           ELSE allocated_size / allocated_qty
                   END AS allocation_perc
            FROM first_table
            CROSS JOIN second_table
            CROSS JOIN (SELECT * FROM fourth_table LEFT JOIN third_table USING(size)) foo
        ) a
        ORDER BY size_order
        $$, $2, $3, _article_filter);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;  
        RETURN $1;
    end
$function$;