--liquibase formatted sql
--changeset aman.lakkoju:release_po_changes runOnChange:true stripComments:false splitStatements:false context:MTP-93749 labels:MTP-93749 fix_3
--comment: release_po_changes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.finalize_add_release_po(varchar);
CREATE OR REPLACE FUNCTION inventory_smart.finalize_add_release_po(character varying)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
/* 
   * Function/Procedure name: inventory_smart.finalize_add_release_po
   * Created by: Manohara Gulla
   * Created at: 26-MAY-2025
   * No of input parameter: 1
   * Parameter Description : $1 = allocation code
   * Purpose: 
   * This function will add release po to plan attributes table
   * Calling Statement:
   *
      begin;
      select * from inventory_smart.finalize_add_release_po
          ('6_155_PFS_20230519T071512');
      commit;
   *
   * if any modification done in same function/procedure please record the changes in below format
   *
   * Updated_by       Updated_on      Purpose
   * shrinidhi - 07/07/25 - Bugfix: Duplicate release po in plan attributes for styles having multiple po_codes --------
   *
   */
declare
    _query_combine text;
    _pm_date date;
    _query text;
    _alloc_code text;
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
begin
    _query :=  'select date(created_at) from inventory_smart.plan_master where plan_code = %L';
    _alloc_code := $1;
    _query := format(_query, _alloc_code);
    execute _query into _pm_date;
    raise notice 'pm_date: %', _pm_date;

    _query_combine := format($$  
            WITH carfg AS (
                SELECT DISTINCT ON (allocation_code, article, store, inventory_source) 
                    allocation_code, 
                    case when allocation_code like '%%105%%' then COALESCE(((regexp_match(allocation_code, '_(\d+)$'))[1])::int,0) else 0 end AS split_idx,
                    article, 
                    store, 
                    inventory_source, 
                    created_at,
                    replace(dc_codes[1], '''', '') dc_codes
                FROM 
                    inventory_smart.create_allocation_result_flat_gurobi carfs
                    WHERE carfs.created_at between $$ || quote_literal(_pm_date::timestamp) || $$ and $$ || quote_literal(_pm_date::timestamp + interval '1 day') || $$ and allocation_code = '%1$s'
            )
--                select  * from carfg;
            ,paf AS (
                SELECT DISTINCT ON (article, l0_name, l2_id, l3_id, l4_id)  
                    article, 
                    l0_name, 
                    l2_id, 
                    l3_id, 
                    l4_id 
                FROM 
                    global.product_attributes_filter 
                    where article in (select distinct article from inventory_smart.create_allocation_result_flat_gurobi carfs
                    WHERE carfs.created_at between $$ || quote_literal(_pm_date::timestamp) || $$ and $$ || quote_literal(_pm_date::timestamp + interval '1 day') || $$ and allocation_code = '%1$s')
            )
--                select * from paf;
            ,rpo AS (
                SELECT
                    carfg.allocation_code,
                    CASE
                        WHEN carfg.inventory_source = 'dc' THEN paf.l0_name || paf.l2_id || paf.l3_id || paf.l4_id || 'B' || TO_CHAR((carfg.created_at AT TIME ZONE 'America/New_York')+ (split_idx || ' second')::interval, 'MMDDYYHHMISS')
                        WHEN carfg.inventory_source = 'po' THEN paf.l0_name || paf.l2_id || paf.l3_id || 'L' || TO_CHAR((carfg.created_at AT TIME ZONE 'America/New_York')+ (split_idx || ' second')::interval, 'MMDDYYHHMISS')||'_'||rid.id
                        WHEN carfg.inventory_source = 'ns' THEN paf.l0_name || carfg.store || 'S' || TO_CHAR((carfg.created_at AT TIME ZONE 'America/New_York')+ (split_idx || ' second')::interval, 'MMDDYYHHMISS')
                        ELSE paf.l0_name || paf.l2_id || paf.l3_id || paf.l4_id || 'B' || TO_CHAR((carfg.created_at AT TIME ZONE 'America/New_York')+ (split_idx || ' second')::interval, 'MMDDYYHHMISS')
                    END AS release_po
                FROM 
                    carfg 
                JOIN 
                    paf USING (article)
                LEFT JOIN (
				        select po.po_code, po.article, lpi.id 
				        from (
							    select distinct 
                                case when article like '%%USA-Brick%%' then 'USA' else  'CAN' end as country,
							    po_code,
							    article
							    from inventory_smart.po_master 
                                where article like '%%Brick%%'
							) po
							LEFT JOIN inventory_smart.launch_po_identifier lpi
	   						ON po.po_code = lpi.omnia_bulk_po_number and po.country = lpi.country
	                    group by 1,2,3
            	) rid on inventory_source = 'po' and carfg.article = rid.article and carfg.dc_codes = rid.po_code
            )
--                select  * from rpo;
            ,insert_values AS (
                SELECT 
                    allocation_code,
                    'released_po' AS attribute_name,
                    ARRAY[string_agg(distinct quote_literal(release_po), ',')]::text[] AS attribute_value
                FROM 
                    rpo
                GROUP BY 1
            )
--				select * from insert_values;
            INSERT INTO inventory_smart.plan_attributes (plan_code, attribute_name, attribute_value)
            SELECT allocation_code, attribute_name, attribute_value FROM insert_values;
    $$, $1);
    raise notice '%', _query_combine;
    execute _query_combine;
    perform  global.sp_log(v_gen_random_uuid,'inventory_smart.finalize_add_release_po', 'Before end',_query_combine,jsonb_build_object('allocation_code', $1));
end
$function$
;
