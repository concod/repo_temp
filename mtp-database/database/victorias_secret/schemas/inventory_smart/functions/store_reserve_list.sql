--liquibase formatted sql
--changeset liquibase:store_reserve_list runOnChange:true stripComments:false splitStatements:false context:MTP-56337 labels:MTP-56337
--comment: MTP-56337-add-cols-store-reserve
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.store_reserve_list(refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.store_reserve_list(input refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
	_query_combine text := '';
	_channel text := inventory_smart.get_channel_from_input($2);
	_query_pa text := global.form_main_table_filters('product_attributes_filter', $2);
	_query_sa text := global.form_main_table_filters('store_attributes_filter', $3);
	_query_table_filters text := '';
	_unique_key jsonb;
	_product_attr jsonb; 
	_unique_clause text := '';
	_filter_having text;
    _filter_where text;
    _ph_sort text ;
    _ph_search text;
    _overall_search text;
    _limit int := 0;
    _offset int;
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
begin
    SELECT $2 - 'unique_key' INTO _product_attr;

    _query_pa := global.form_main_table_filters('product_attributes_filter', _product_attr);
    SELECT * FROM inventory_smart.form_search_sort_clause($4, 'product_attributes_filter', 'global') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset;
    IF _limit != 0 THEN
        _query_table_filters =  _overall_search || replace(global.form_table_query($4), 'WHERE', 'AND');
    END IF;
    _query_combine := '
        WITH product_attributes_filter AS (
            SELECT * FROM "global".product_attributes_filter ' || _query_pa || _ph_search || '
        ),
		store_attributes_filter as (
			            SELECT * FROM "global".store_attributes_filter '|| _query_sa ||'
        ),
        result as (SELECT 
        paf.product_code,
        paf.product_description,
        paf.l6_id,
        paf.size,
        paf.l0_name,
        paf.l2_name,
        paf.l3_name,
        paf.l4_name,
        paf.l5_name,
        paf.l6_name,
        paf.color,
        paf.subbrand_code_desc,
        paf.collection,
        paf.masterstyle_descr,
        paf.product_lifecycle,
        paf.current_assortment_group,
        paf.flex_style,
        paf.generic,
        paf.sizes_mat,
        paf.form,
        paf.user_defined_1,
        paf.user_defined_2,
        paf.user_defined_3,
        paf.user_defined_4,
        paf.user_defined_5,
        paf.user_defined_6,
        sr.store_code,
        sr.initial_oh,
        sr.it,
        sr.oo,
        sr.rfid_delta,
        sr.epc_units,
        sr.store_reserve,
        sr.wip,
        sr.net_available,
        sr.reservation_start_date,
        sr.reservation_end_date
        from product_attributes_filter paf join inventory_smart.store_reserve sr using (product_code)
        join store_attributes_filter using (store_code))
        SELECT * FROM result WHERE TRUE ' 
        ||_query_table_filters;
    RAISE NOTICE '%', _query_combine;
    OPEN $1 FOR EXECUTE _query_combine;
    perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.store_reserve_list', 'Before Return',_query_combine,jsonb_build_object('$2', $2, '$3', $3,'$4',$4));	 
    RETURN $1;
END;
$function$
;