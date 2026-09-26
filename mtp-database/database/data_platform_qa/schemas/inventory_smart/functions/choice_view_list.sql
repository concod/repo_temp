--liquibase formatted sql
--changeset linu.nazil:choice_view_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-73526
--comment: initial changeset for constraints choice_view_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.choice_view_list(refcursor, jsonb, date, text, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.choice_view_list(refcursor, jsonb, date, text, jsonb, varchar);
CREATE OR REPLACE FUNCTION inventory_smart.choice_view_list(refcursor, _product_filters jsonb, _resolution_date date, _constraint_selections text, _meta_filters jsonb, _psaf_hierarchy_level character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    _pa_query TEXT;
    _query_combine TEXT;
	_query_meta_filters text;
    v_gen_random_uuid TEXT := gen_random_uuid()::VARCHAR;
BEGIN
    _pa_query := global.form_main_table_filters('product_attributes_filter', $2);
    _query_meta_filters := global.form_table_query(_meta_filters);

	EXECUTE 'create unlogged TABLE "choice_view_psm_rcl_resolution_input_' || v_gen_random_uuid || '" as 
			select product_code, store_code, psa_code from global.product_attributes_filter paf
			join global.product_store_attributes_filter_store_code psaf using(l0_name)
			' || _pa_query || ';';

	EXECUTE 'create unlogged TABLE "choice_view_constraints_rcl_resolution_input_' || v_gen_random_uuid || '" as 
			select res.product_code, res.store_code, psaf.psa_code from global.generate_rcl_psm_data(''"choice_view_psm_rcl_resolution_input_' || v_gen_random_uuid || '"'', 101, ' || quote_literal(_resolution_date) || ') res
			join global.product_attributes_filter paf using(product_code)
			JOIN global.product_store_attributes_filter psaf 
			USING (' || _psaf_hierarchy_level || ', store_code)
        	' || _pa_query || ' and res.is_active ;';

    _query_combine = 'WITH resolved_choice_view AS (
        SELECT b.*, paf.size FROM inventory_smart.generate_rcl_constraint_data(
            ''"choice_view_constraints_rcl_resolution_input_' || v_gen_random_uuid || '"'', 170, ' || quote_literal(_resolution_date) || '
        )b
		join global.product_attributes_filter paf using(product_code)
		' || _pa_query || '
    ), final_aggregates AS (
        SELECT 
            rcv.store_code, 
			article,
			size,
            wos, 
            min_stock,
            max_stock
        FROM resolved_choice_view rcv
        GROUP BY rcv.store_code, article, size, wos, min_stock, max_stock
    )
    SELECT store_code, article, size,  ' || _constraint_selections || ' 
    FROM final_aggregates ' || _query_meta_filters || ';';

    RAISE NOTICE 'Query combine: %', _query_combine;
    
    OPEN $1 FOR EXECUTE _query_combine;

    PERFORM global.sp_log(
        v_gen_random_uuid, 
        'inventory_smart.choice_view_list', 
        'After final query execution', 
        _query_combine, 
        jsonb_build_object(
            'product_filter', $2, 
            '_resolution_date', $3, 
            'constraint_selections', $4,  
            'meta_filters', $5
        )
    );

    RETURN $1;
END
$function$
;