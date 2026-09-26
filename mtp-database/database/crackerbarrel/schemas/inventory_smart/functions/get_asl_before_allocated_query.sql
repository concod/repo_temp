--liquibase formatted sql
--changeset nibeel.yunus:code_refactor runOnChange:true stripComments:false splitStatements:false context:MTP-107579 labels:MTP-107579
--comment: MTP-107579
--rollback: SELECT  1
DROP FUNCTION IF EXISTS inventory_smart.get_asl_before_allocated_query(text);
CREATE OR REPLACE FUNCTION inventory_smart.get_asl_before_allocated_query(p_alloc_type text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

    DECLARE
        _before_allocated_query text;
        _source_table text;
        _additional_filter text;
        _additional_join_condition text;

    BEGIN
        -- Set parameters based on allocation type
        CASE p_alloc_type
            WHEN 'po' THEN
                _source_table := 'inventory_smart.po_master';
                _additional_filter := '%9$s';
                _additional_join_condition := '';
            ELSE
                _source_table := 'inventory_smart.dc_pack_inventory';
                _additional_filter := '';
                _additional_join_condition := 'and dpi.pack_type=dpc.pack_type';
        END CASE;

        -- Single query template with parameters - includes both before_allocated_pre and before_allocated CTEs
        _before_allocated_query := format(',before_allocated_pre as(
				select ph.product_code, ph.ph_code, ph.size,
					JSONB_OBJECT_AGG(ph.dc_code, eaches_oh) as eaches_oh_map,
					JSONB_OBJECT_AGG(ph.dc_code, eaches_oh_oo) as eaches_oh_oo_map,
					JSONB_OBJECT_AGG(ph.dc_code, packs_oh) as packs_oh_map,
					JSONB_OBJECT_AGG(ph.dc_code, packs_oh_oo) as packs_oh_oo_map,
					sum(eaches_oh) as eaches_oh,
					sum(eaches_oh_oo) as eaches_oh_oo,
					sum(packs_oh) as packs_oh,
					sum(packs_oh_oo) as packs_oh_oo
				from (select ph_code, article, product_code, dc_code, size from product_store_dc_mapping group by 1, 2, 3, 4, 5) ph
				join(
					select
						dpi.dc_code,
						dpi.article,
						dpi.product_code,
						dpc.size,
						SUM(CASE WHEN dpc.pack_type = ''eaches'' THEN COALESCE(dpc.units_in_pack, 1) * COALESCE(dpi.oh_pack_qty, 0) ELSE 0 END) AS eaches_oh,
						SUM(CASE WHEN dpc.pack_type = ''eaches'' THEN COALESCE(dpc.units_in_pack, 1) * (COALESCE(dpi.oh_pack_qty, 0) + COALESCE(dpi.oo_pack_qty, 0)) ELSE 0 END) AS eaches_oh_oo,
    					SUM(CASE WHEN dpc.pack_type = ''packs'' THEN COALESCE(dpc.units_in_pack, 1) * COALESCE(dpi.oh_pack_qty, 0) ELSE 0 END) AS packs_oh,
    					SUM(CASE WHEN dpc.pack_type = ''packs'' THEN COALESCE(dpc.units_in_pack, 1) * (COALESCE(dpi.oh_pack_qty, 0) + COALESCE(dpi.oo_pack_qty, 0)) ELSE 0 END) AS packs_oh_oo
					from (select * from %1$s %2$s) dpi
     				JOIN inventory_smart.dc_pack_configuration dpc
     				on
     					dpi.pack_type_id=dpc.pack_type_id
     					and dpi.article=dpc.article
     					
						and dpi.product_code =dpc.product_code
					%3$s
					group by 1, 2, 3, 4
				)dpi on
				dpi.article = ph.article and dpi.product_code = ph.product_code and dpi.dc_code = ph.dc_code
				group by 1, 2, 3
			)	
			,before_allocated as (
				select ph_code,
					JSONB_OBJECT_AGG(size, eaches_oh_map) as eaches_oh_map,
					JSONB_OBJECT_AGG(size, eaches_oh_oo_map) as eaches_oh_oo_map,
					JSONB_OBJECT_AGG(size, packs_oh_map) as packs_oh_map,
					JSONB_OBJECT_AGG(size, packs_oh_oo_map) as packs_oh_oo_map,
					sum(eaches_oh) as eaches_oh,
					sum(eaches_oh_oo) as eaches_oh_oo,
					sum(packs_oh) as packs_oh,
					sum(packs_oh_oo) as packs_oh_oo 
				from before_allocated_pre
				group by 1
			)',
        _source_table,
        _additional_filter,
        _additional_join_condition
        );

        RETURN _before_allocated_query;

    END
$function$
;
