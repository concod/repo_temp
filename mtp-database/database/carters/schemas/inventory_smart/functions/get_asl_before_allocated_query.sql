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
        _source_table text;
        _additional_filter text;
        _additional_join_condition text;
        _eaches_packs_calculation text;

    BEGIN
        -- Set parameters based on allocation type
        CASE p_alloc_type
            WHEN 'po' THEN
                _source_table := 'inventory_smart.po_master';
                _additional_filter := '%9$s';
                _additional_join_condition := '';
                _eaches_packs_calculation := 'sum(case when dpc.pack_type = ''eaches'' then COALESCE(dpc.units_in_pack, 1) * COALESCE(dpi.available_qty, 0) else 0 end) eaches,
						                    sum(case when dpc.pack_type = ''packs'' then COALESCE(dpc.units_in_pack, 1) * COALESCE(dpi.available_qty, 0) else 0 end) packs';
            WHEN 'ns' THEN
                _source_table := 'inventory_smart.new_store_inventory_source';
                _additional_filter := '';
                _additional_join_condition := 'and dpi.pack_type=dpc.pack_type';
                _eaches_packs_calculation := 'sum(case when dpi.pack_type = ''eaches'' then COALESCE(dpc.units_in_pack, 1) * COALESCE(dpi.oh_pack_qty, 0) else 0 end) eaches,
						                    sum(case when dpi.pack_type = ''packs'' then COALESCE(dpc.units_in_pack, 1) * COALESCE(dpi.oh_pack_qty, 0) else 0 end) packs';
            ELSE
                _source_table := 'inventory_smart.dc_pack_inventory';
                _additional_filter := '';
                _additional_join_condition := 'and dpi.pack_type=dpc.pack_type';
                _eaches_packs_calculation := 'sum(case when dpi.pack_type = ''eaches'' then COALESCE(dpc.units_in_pack, 1) * COALESCE(dpi.oh_pack_qty, 0) else 0 end) eaches,
						                    sum(case when dpi.pack_type = ''packs'' then COALESCE(dpc.units_in_pack, 1) * COALESCE(dpi.oh_pack_qty, 0) else 0 end) packs';
        END CASE;

        -- Single query template with parameters
        _before_allocated_query := format(',before_allocated_pre as (
            select
                ph.product_code, ph.ph_code, ph.size,
				JSONB_OBJECT_AGG(ph.dc_code, eaches) as eaches_oh_map,
				JSONB_OBJECT_AGG(ph.dc_code, packs) as packs_oh_map,
                sum(eaches) as eaches_oh,
                sum(packs) as packs_oh
            from (select ph_code, article, dc_code, product_code, size from product_store_dc_mapping group by 1, 2, 3, 4, 5) ph
            join (
                select
                    dpi.dc_code,
                    dpi.article,
					dpc.product_code,
					dpc.size,
                    %1$s
                from (select * from %2$s %3$s) dpi
                JOIN inventory_smart.dc_pack_configuration dpc
                on
                    dpi.pack_type_id=dpc.pack_type_id
                    and dpi.article=dpc.article
                    %4$s
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
			)',
        _eaches_packs_calculation,
        _source_table,
        _additional_filter,
        _additional_join_condition
        );

        RETURN _before_allocated_query;

    END
 $function$
; 