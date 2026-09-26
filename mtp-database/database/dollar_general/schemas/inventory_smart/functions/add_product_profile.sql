--liquibase formatted sql
--changeset liquibase:add_product_profile-table-name-update runOnChange:true stripComments:false splitStatements:false context:MTP-70709 labels:MTP-70709
--comment: MTP-70709:pp-edit-flow-table-name-update
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.add_product_profile(input jsonb, jsonb, jsonb, text, integer);
DROP FUNCTION IF EXISTS inventory_smart.add_product_profile(input jsonb, jsonb, jsonb, integer);
CREATE OR REPLACE FUNCTION inventory_smart.add_product_profile(input jsonb, jsonb, jsonb, integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$


/*
 * Function/Procedure name: inventory_smart.add_product_profile
 * Created by: Adesh Kumar
 * Created at: 22-Apr-2024
 * No of input parameter: 2
 * Parameter Description : $1 = JSON to create product_profile
 *                         $2 = JSON for product attribute filter
                           $3 = JSON for store filter
                           $4 = PP_CODE is available for update or zero for insert.
 * Purpose: This function been created to insert/update the data into product_profile_master, product_profile_attributes and product_profile_mapping
 * Calling Statement:
             select * from inventory_smart.add_product_profile
            ('{"special_classification": "user-defined", "is_deleted": "false", "created_at": "2022-07-14 10:09:04.685029", "created_by": 3, "name": "Test123", "description": "Test123", "attributes": {"start_date": "2021-03-23", "end_date": "2022-03-23", "sales_attribute": "clearance,promo", "date_type": "dynamic", "date_value": "Last 180 days", "min_price": "5", "max_price": "100", "product_attribute": "l0_name,l1_name,article,l2_name"}}',
             '{"l1_name": [{"operator": "in", "type": "list", "values": ["102_BEAUTY CARE"]}],
             "primary_sku": [{"type": "list", "operator": "in", "values": ["23472201", "31261701"]}]}',
             '{}',
              0
            ) ;
             *
 * if any modification done in same function/procedure please record the changes in below format
 *
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------

 */




	declare
	_key text;
	_value text;
	_mapping_code int;
	_prod_code text;
	_store_code text;
	_query text;
	--_keys text[] := array['product_code', 'created_by']::text[];
	--_vals text[] := array[('''' || $1 || ''''), $3]::text[];
	_keys text[];
	_vals text[];
	_key_attr text;
	_value_attr text;
	_vals_attr text[];
	_update_vals_attr text[];
	_update_vals text;
	_pp_code integer;
	_insert_query text;
	_update_query text;
	_ph_code_query text;
	_ph_code text;
    _hierarchy_code_query text;
    _hierarchy_code text;
	_query_pa text;
    _query_paa text;
	_query_sa text;
	_query_insert text;
	_jsonb_ph jsonb;
	_query_ph text;
	_jsonb_ph_article jsonb; 
	
	begin
		
		for _key, _value in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop 
			if _key <> 'attributes' then
				if $4 >0 then 
				
					_update_vals_attr := array_append(_update_vals_attr,   _key || ' = ''' || _value||'''' );
				else
					_keys := array_append(_keys, _key);
					_vals := array_append(_vals, '''' || _value || '''');
				end if;
				
			end if;
		end loop;
		
		_query_ph := 'select jsonb $$'||$2::text||'$$||''{"product_codes":[]}''';
		--raise notice '_query_ph%',_query_ph;
		execute _query_ph into _jsonb_ph_article;
		_query_paa := 'SELECT * FROM "inventory_smart".ph_master' || (inventory_smart.form_main_table_filters('ph_master', _jsonb_ph_article));
	
		_query_ph := 'select jsonb $$'||_jsonb_ph_article::text||'$$ - ''primary_sku''' ;
		--raise notice '_query_ph%',_query_ph;
		execute _query_ph into _jsonb_ph;
		_query_pa := 'SELECT * FROM "inventory_smart".ph_master' || (inventory_smart.form_main_table_filters('ph_master', _jsonb_ph));
		--raise notice '_query_ph%',_query_ph;
		
		raise notice '_jsonb_ph%',_jsonb_ph;

        _query_sa := "global".form_attribute_table_filters_v2('store_attributes', 'store_code', $3);

		_update_vals :=  replace (replace (replace (_update_vals_attr::text,'{',''),'}',''),'"','');
		
		if $4 >0 then
			_update_query := 'Update inventory_smart.product_profile_master set '||_update_vals ||' where pp_code ='||$4 ;
			
			execute _update_query;
		else
			_insert_query :='INSERT INTO "inventory_smart".product_profile_master (' || (ARRAY_TO_STRING(_keys, ', ', '')) || ') VALUES (' || (ARRAY_TO_STRING(_vals, ', ', '')) || ') returning pp_code ;';
			execute _insert_query into _pp_code;
		end if;
	
		if $4 >0 then 	
			_pp_code := $4;
			execute 'DELETE FROM "inventory_smart".product_profile_attributes_filter where pp_code ='||_pp_code;
		end if ;
	
		for _key, _value in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop 
			if _key = 'attributes' then
				for _key_attr, _value_attr in SELECT * FROM jsonb_each_text(_value::jsonb) WHERE value IS NOT NULL loop 
					_vals_attr := array_append(_vals_attr, ('(''' || _pp_code || ''', ''' || _key_attr || ''', ''' || _value_attr || ''')'));
					
				end loop;
			end if;
		end loop;

			_key_attr := 'product_hierarchy_filters';
		
			_vals_attr :=  array_append(_vals_attr, ('(''' || _pp_code || ''', ''' || _key_attr || ''', $$' || _jsonb_ph_article || '$$)'));
			
			_key_attr := 'store_hierarchy_filters';
		
			_vals_attr :=  array_append(_vals_attr, ('(''' || _pp_code || ''', ''' || _key_attr || ''', $$' || $3 || '$$)'));



		
		if cardinality(_vals_attr) > 0 then
			_query_insert:= 'INSERT INTO "inventory_smart".product_profile_attributes (pp_code, attribute_name, attribute_value) VALUES ' || (ARRAY_TO_STRING(_vals_attr, ', ', '')) || ';';
			raise notice '%',_query_insert;
			execute 'DELETE FROM "inventory_smart".product_profile_attributes where pp_code ='||_pp_code;
			--execute 'DELETE FROM "inventory_smart".product_profile_attributes_filter where pp_code ='||_pp_code;
			execute 'INSERT INTO "inventory_smart".product_profile_attributes (pp_code, attribute_name, attribute_value) VALUES ' || (ARRAY_TO_STRING(_vals_attr, ', ', '')) || ';';
			
		end if;
	
		
		raise notice '_pp_code%',$3;
	
	delete from  inventory_smart.product_profile_user_mapping_size where pp_code = _pp_code;
	call inventory_smart.build_product_profile_attributes_filter(_pp_code);
	perform cache.update_dependencies('inventory_smart.product_profile_master');
	
	return _pp_code;
	
	end $function$
;
