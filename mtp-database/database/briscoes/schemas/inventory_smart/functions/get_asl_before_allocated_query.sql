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
        _eaches_packs_calculation text;
		_final_join text;
		_final_cal text;

    BEGIN
		-- Set default parameters
		_final_cal := 'sum(eaches) as eaches_oh, sum(packs) as packs_oh';
		_source_table := 'inventory_smart.dc_pack_inventory';
		_additional_filter := '';
		_additional_join_condition := 'and dpi.pack_type_id=dpc.pack_type_id where dpi.oh_pack_qty > 0';
		_final_join := 'dpi.article = ph.article and dpi.product_code = ph.product_code and dpi.dc_code = ph.dc_code';

        -- Set parameters based on allocation type
        CASE p_alloc_type
            WHEN 'po' THEN
                _source_table := 'inventory_smart.po_master';
                _additional_filter := '%9$s';
                _additional_join_condition := 'and dpi.product_code=dpc.product_code where dpi.available_qty > 0';
                _eaches_packs_calculation := 'dpc.size, sum(case when dpc.pack_type = ''eaches'' then COALESCE(dpc.units_in_pack, 1) * COALESCE(dpi.available_qty, 0) else 0 end) eaches,
						                    sum(case when dpc.pack_type = ''packs'' then COALESCE(dpc.units_in_pack, 1) * COALESCE(dpi.available_qty, 0) else 0 end) packs';
			WHEN 'pdq' Then 
				_final_cal := 'avg(eaches) as eaches_oh, avg(packs) as packs_oh';
				_eaches_packs_calculation := '''NS'' as size, avg(case when dpi.pack_type = ''packs'' then COALESCE(dpc.units_in_pack, 1) * COALESCE(dpi.oh_pack_qty, 0) else 0 end) eaches,
						                    avg(case when dpi.pack_type = ''eaches'' then COALESCE(dpc.units_in_pack, 1) * COALESCE(dpi.oh_pack_qty, 0) else 0 end) packs';
				_final_join := 'dpi.article = ph.article and dpi.dc_code = ph.dc_code';

            ELSE
                _eaches_packs_calculation := 'dpc.size, sum(case when dpi.pack_type = ''eaches'' then COALESCE(dpc.units_in_pack, 1) * COALESCE(dpi.oh_pack_qty, 0) else 0 end) eaches,
						                    sum(case when dpi.pack_type = ''packs'' then COALESCE(dpc.units_in_pack, 1) * COALESCE(dpi.oh_pack_qty, 0) else 0 end) packs';

        END CASE;

        -- Single query template with parameters
        _before_allocated_query := format(',before_allocated_pre as (
            select
                ph.product_code, ph.ph_code, ph.size,
				JSONB_OBJECT_AGG(ph.dc_code, eaches) as eaches_oh_map,
				JSONB_OBJECT_AGG(ph.dc_code, packs) as packs_oh_map,
                %6$s
            from (select ph_code, article, dc_code, product_code, size from product_store_dc_mapping group by 1, 2, 3, 4, 5) ph
            join (
                select
                    dpi.dc_code,
                    dpi.article,
					dpc.product_code,
					
                    %1$s
                from (select * from %2$s %3$s) dpi
                JOIN inventory_smart.dc_pack_configuration dpc
                on
                    dpi.pack_type_id=dpc.pack_type_id
                    and dpi.article=dpc.article
                    %4$s
					group by 1, 2, 3, 4
            ) dpi on
			%5$s
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
        _eaches_packs_calculation, -- %1$s
        _source_table, -- %2$s
        _additional_filter, -- %3$s
        _additional_join_condition, -- %4$s
		_final_join, -- %5$
		_final_cal -- %6$s
        );

        RETURN _before_allocated_query;

    END
 $function$
;
