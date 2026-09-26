--liquibase formatted sql
--changeset liquibase:ajunravi:store-level-capacity-changes runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-41571-MTP-41570,MTP-95461
--comment: MTP-41571-MTP-41570,MTP-95461
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.store_capacity_bulk_update_by_filters(jsonb, jsonb, int, int, int, int, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.store_capacity_bulk_update_by_filters(jsonb, jsonb, int, int, int, int, jsonb, jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
	_query text := '';
	_query_pa text := '';
	_query_sa text := '';
	_query_sg text := '';
	_query_table_filters text := '';
	_update_column text := '';
	_tq jsonb := (($8 - 'sort') - 'limit');
	_search_query text;
	_query_combine text = ' ';
	_query_mapping text := '';
	_dummy text;
	_ph_search text;
	_sa_search text;
	_excluded_filter text := '';
	_input_json json;
	_obj json;
	_store_code text;
	_hierarchy text;

	

begin
    SELECT * FROM inventory_smart.form_search_sort_clause($8, 'store_attributes_filter', 'global') INTO _dummy, _sa_search, _dummy, _dummy, _dummy, _dummy, _dummy;
	_query_pa := _query_pa || _ph_search;
	_query_sa := global.form_main_table_filters('store_attributes_filter', $2);
	_query_sa := _query_sa || _sa_search;
	raise notice '%', _query_sa;
	raise notice '%', _sa_search;  
	_query_table_filters := global.form_table_query(_tq);
	if _query_table_filters ILIKE '%WHERE%' then
		_query_table_filters := replace(_query_table_filters, 'WHERE', ' AND ');
	end if;

    FOR _obj IN SELECT * FROM jsonb_array_elements($7)
       loop
	     _store_code := '''' || REPLACE(_obj->>'store_code', '"', '') || '''';
	     _hierarchy := '''' || REPLACE(_obj->>'product_hierarchy', '"', '') || '''';
	     _excluded_filter := format(_excluded_filter || ' AND NOT ( suc.store_code = %1$s and suc.product_hierarchy = %2$s ) ', _store_code, _hierarchy);
    	end loop;
    
		_update_column := _update_column || ' unit_capacity = ' || $3::float || ',';
	
		if $4 IS NOT NULL THEN
			_update_column := _update_column || ' receipt_capacity = ' || $4::float || ',';
		end if;
		if $5 IS NOT NULL THEN
			_update_column := _update_column || ' carton_capacity = ' || $5::float || ',';
		end if;
	
		_update_column := _update_column || ' updated_at = now(), upload_flag = ''false'' , updated_by = ' || $6;
	
		_query := '
		  UPDATE 
		  	inventory_smart.store_unit_capacity t1 
			SET ' || _update_column || '
			FROM 
		  	(
		    	select
		      		suc.product_hierarchy,
		      		suc.store_code,
					saf.channel,
					saf.retail_facility_code
		    	from 
		      	inventory_smart.store_unit_capacity suc
	
			  	LEFT join (select store_code,store_name, channel, retail_facility_code FROM global.store_attributes_filter ' || _query_sa || ' ) saf ON saf.store_code = suc.store_code 
		  		where saf.store_code IS NOT null ' || _query_table_filters ||  _excluded_filter || '
			) t2
			WHERE
		 		t1.store_code = t2.store_code ';
	
        raise notice '_query %', _query;

		EXECUTE _query;
	
END
$function$
;
