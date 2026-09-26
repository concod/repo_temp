--liquibase formatted sql
--changeset nibeel.yunus:code_refactor runOnChange:true stripComments:false splitStatements:false context:MTP-95638 labels:MTP-95638
--comment: MTP-95638
--rollback: SELECT  1
DROP FUNCTION IF EXISTS inventory_smart.get_asl_before_allocated_query(text);
CREATE OR REPLACE FUNCTION inventory_smart.get_asl_before_allocated_query(p_alloc_type text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

    DECLARE
        _before_allocated_query text;
        _cte_name text;
        _source_query text;

    BEGIN
        -- Set parameters based on allocation type
        CASE p_alloc_type
            WHEN 'asn' THEN
                _source_query := '
                    SELECT 
                        paf.article,
                        paf.product_code,
                        paf.product_code AS pack_type_id,
                        paf.size,
                        paf.ph_code,
                        am.asn_id as asn_code,
                        am.available_qty as oh,
                        0 as it,
                        0 as oo,
                        dc.dc_code,
                        1 AS units_in_pack
                    FROM (select * from inventory_smart.asn_master %9$s) am
                    JOIN global.distribution_centres dc ON dc.dc_code = am.dc_code
                    JOIN (select article, unnest(sizes) as size, unnest(product_codes) as product_code, ph_code from %4$s) paf on am.pack_type_id = paf.product_code
                    JOIN global.store_attributes_filter saf ON dc.linked_store_code::text = saf.store_code::text
                ';
            ELSE
                _source_query := '
                    SELECT paf.article,
                        paf.product_code,
                        paf.product_code AS pack_type_id,
                        paf.size,
                        paf.ph_code,
                        li.oh,
                        li.it,
                        li.oo,
                        li.channel,
                        dc.dc_code,
                        1 AS units_in_pack
                    FROM inventory_smart.latest_inventory li
                    JOIN global.distribution_centres dc ON li.store_code::text = dc.linked_store_code::text
                    JOIN (select article, unnest(sizes) as size, unnest(product_codes) as product_code, ph_code from %4$s) paf USING (product_code)
                    JOIN global.store_attributes_filter saf ON li.store_code::text = saf.store_code::text
                ';
        END CASE;

        -- Single query template with parameters
        _before_allocated_query := format(',before_allocated_pre as (
                select ph.product_code, ph.ph_code, ph.size,
                    JSONB_OBJECT_AGG(ph.dc_code, oh) as eaches_oh_map,
                    JSONB_OBJECT_AGG(ph.dc_code, oh) as packs_oh_map,
                    sum(oh) as eaches_oh,
                    sum(oh) as packs_oh					
                from (
                    %1$s
                ) ph
                join (select distinct product_code, dc_code from product_dc_map_after_store_eligible)pdc using (product_code, dc_code)
                group by 1,2,3
            )
            ,before_allocated as (
				select ph_code,
					JSONB_OBJECT_AGG(size, eaches_oh_map) as eaches_oh_map,
					JSONB_OBJECT_AGG(size, packs_oh_map) as packs_oh_map,
					sum(eaches_oh) as eaches_oh,
					sum(packs_oh) as packs_oh
				from before_allocated_pre
				group by 1
			)',
        _source_query
        );

        RETURN _before_allocated_query;

    END
 $function$
; 