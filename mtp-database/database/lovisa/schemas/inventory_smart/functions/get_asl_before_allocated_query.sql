--liquibase formatted sql
--changeset satvik.sharma:lovisa_get_asl_before_allocated_query runOnChange:true stripComments:false splitStatements:false context:MTP-130085 labels:MTP-130085
--comment: Lovisa specific before allocated query builder
--rollback: SELECT  1
DROP FUNCTION IF EXISTS inventory_smart.get_asl_before_allocated_query(text);
CREATE OR REPLACE FUNCTION inventory_smart.get_asl_before_allocated_query(p_alloc_type text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

    DECLARE
        _before_allocated_query text;
    BEGIN
        _before_allocated_query := ',before_allocated_pre as(
				select ph.product_code, ph.ph_code, ph.size,
					JSONB_OBJECT_AGG(ph.dc_code, eaches_oh) as eaches_oh_map,
					JSONB_OBJECT_AGG(ph.dc_code, packs_oh) as packs_oh_map,
					sum(eaches_oh) as eaches_oh,
					sum(packs_oh) as packs_oh
				from (select ph_code, article, product_code, dc_code, size from product_store_dc_mapping group by 1, 2, 3, 4, 5) ph
				join (
					select
						dpi.dc_code,
						dpi.article,
						dpc.product_code,
						dpc.size,
						SUM(CASE WHEN dpi.pack_type = ''eaches'' THEN COALESCE(dpc.units_in_pack, 1) * COALESCE(dpi.oh_pack_qty, 0) ELSE 0 END) eaches_oh,
						SUM(CASE WHEN dpi.pack_type = ''packs'' THEN COALESCE(dpc.units_in_pack, 1) * COALESCE(dpi.oh_pack_qty, 0) ELSE 0 END) packs_oh
					from inventory_smart.dc_pack_inventory dpi
					JOIN inventory_smart.dc_pack_configuration dpc on
						dpi.pack_type_id=dpc.pack_type_id and dpi.article=dpc.article and dpi.pack_type=dpc.pack_type
					group by 1, 2, 3, 4
				) dpi on
				dpi.article = ph.article and dpi.product_code = ph.product_code and dpi.dc_code = ph.dc_code
				group by 1, 2, 3
			)
			,before_allocated as (
				select ph_code,
					JSONB_OBJECT_AGG(size, eaches_oh_map) as eaches_oh_map,
					JSONB_OBJECT_AGG(size, packs_oh_map) as packs_oh_map,
					sum(eaches_oh) as eaches_oh,
					sum(packs_oh) as packs_oh
				from before_allocated_pre
				group by 1
			)';

        RETURN _before_allocated_query;

    END
$function$
;
