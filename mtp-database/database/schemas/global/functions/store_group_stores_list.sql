--liquibase formatted sql
--changeset liquibase:store_group_stores_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_group_stores_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.store_group_stores_list(input refcursor, jsonb, jsonb, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.store_group_stores_list(input refcursor, jsonb, jsonb, jsonb, jsonb, jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
/*
 * Function/Procedure name: global.store_group_stores_list
 * Created by: Kailash Yadav
 * Created at: 13-May-2022
 * No of input parameter: 6
 * Parameter Description : $1 = refcursor name
                           $2 = JSON for Store_master Filter
 *                         $3 = JSON for Store_master_attribute Filter
                           $4 = JSON for product Filter
                           $5 = JSON for product_master_attribute Filter
                           $6 = JSON for search, sort and limit clause
 * Purpose: This function been created to get the list of stores and channel details
 *
 * Calling Statement:
    select global.store_group_stores_list('my_cur',
	'{}',
    '{"channel": [{"type": "list", "operator": "in", "values": ["Full Line Retail"]}]}' ,
	'{"product_code": [{"type": "list", "operator": "in", "values": ["22945-N13"]}]}',
	'{"l0_name": [{"type": "list", "operator": "in", "values": ["Accessories"]}]}',
	'{}')
 *
 *
 * if any modification done in same function/procedure please record the changes in below format
 *
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 * Pradeep          22-Aug-2022 	Added mapping validity check
 */
	declare
	_query_sm text := '';
	_query_sa text := '';
	_query_pm text := '';
	_query_pa text := '';
	_query_table_filters text := '';
	_query_combine text := '';
	_main_product_filter_cnt int := 0;
	_attr_product_filter_cnt int := 0;
	_product_filter_con text := '';
	_validaity_where_clause text := ' where validity is not null ';
	begin
		$2 := $2 || ('{"active": [{"type": "custom", "operator": "=", "values": true}]}'::jsonb);
		_query_sm := 'SELECT * FROM global.store_master' || (global.form_main_table_filters('store_master', $2));
 		_query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $3);
		_query_pm := 'SELECT product_code FROM global.product_master' || (global.form_main_table_filters('product_master', $4));
		_query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $5);
		_query_table_filters := global.form_table_query($6);
		SELECT count(*) INTO _main_product_filter_cnt from jsonb_each_text($4);
		SELECT count(*) INTO _attr_product_filter_cnt from jsonb_each_text($5);
	_product_filter_con := 'select distinct y.store_code store_code from (('||_query_pm||') x
			join ('||_query_pa||') z   on x.product_code =z.product_code
			join (select product_code, store_code from global.product_Store_mapping ' ||_validaity_where_clause || '  ) y
			 on x.product_code =y.product_code)';
	if _main_product_filter_cnt =0 and _attr_product_filter_cnt =0 then
 		_query_combine := 'SELECT * FROM (
			select
				sm.*
			from
				(SELECT main.store_name, attributes.* FROM (' || _query_sm || ') main JOIN (' || _query_sa || ') attributes ON main.store_code = attributes.store_code) sm
		) X ' || _query_table_filters;
	else
		_query_combine := 'SELECT * FROM (
			select
				sm.*
			from
				(SELECT main.store_name, attributes.* FROM (' || _query_sm || ') main JOIN (' || _query_sa || ') attributes ON main.store_code = attributes.store_code
				 join ('||_product_filter_con|| ') z
				on main.store_code =z.store_code) sm
				) X ' || _query_table_filters;
	end if;
		raise notice '%',_query_combine;
		OPEN $1 FOR execute _query_combine;
		return _query_combine;
	end $function$
;

--changeset arnab.nandy@impactanalytics.co:store_group_stores_list_fix runOnChange:true stripComments:false splitStatements:false context:MTP-37094 labels:MTP-37094 new
--comment: changeset for fixing ck and rl issue, fix for store group dup
DROP FUNCTION IF EXISTS global.store_group_stores_list(input refcursor, jsonb, jsonb, jsonb, jsonb, jsonb, boolean);
CREATE OR REPLACE FUNCTION global.store_group_stores_list(input refcursor, jsonb, jsonb, jsonb, jsonb, jsonb, boolean)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
/*
 * Function/Procedure name: global.store_group_stores_list
 * Created by: Kailash Yadav
 * Created at: 13-May-2022
 * No of input parameter: 6
 * Parameter Description : $1 = refcursor name
                           $2 = JSON for Store_master Filter
 *                         $3 = JSON for Store_master_attribute Filter
                           $4 = JSON for product Filter
                           $5 = JSON for product_master_attribute Filter
                           $6 = JSON for search, sort and limit clause
 * Purpose: This function been created to get the list of stores and channel details
 *
 * Calling Statement:
    select global.store_group_stores_list('my_cur',
	'{}',
    '{"channel": [{"type": "list", "operator": "in", "values": ["Full Line Retail"]}]}' ,
	'{"product_code": [{"type": "list", "operator": "in", "values": ["22945-N13"]}]}',
	'{"l0_name": [{"type": "list", "operator": "in", "values": ["Accessories"]}]}',
	'{}')
 *
 *
 * if any modification done in same function/procedure please record the changes in below format
 *
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 * Pradeep          22-Aug-2022 	Added mapping validity check
 */
	declare
	_query_sm text := '';
	_query_sa text := '';
	_query_pm text := '';
	_query_pa text := '';
	_query_table_filters text := '';
	_query_combine text := '';
   	_key text;
   	_value text;
	_main_product_filter_cnt int := 0;
	_attr_product_filter_cnt int := 0;
	_product_filter_con text := '';
	_validaity_where_clause text := ' where validity is not null ';
    _psa_flag bool := $7;
    _query_psa text := '';
    _psa_attributes text[] := array[]::text[];
    _psa_attributes_select_string text := '';
    _store_table_join_query text := '';
	begin
		$2 := $2 || ('{"active": [{"type": "custom", "operator": "=", "values": true}]}'::jsonb);
		_query_sm := 'SELECT * FROM global.store_master' || (global.form_main_table_filters('store_master', $2));
 		_query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $3);
		_query_pm := 'SELECT product_code FROM global.product_master' || (global.form_main_table_filters('product_master', $4));
		_query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $5);
	    _query_psa := global.form_attribute_table_filters_v2('product_store_attributes', 'store_code', $5);
		_query_table_filters := global.form_table_query($6);
		SELECT count(*) INTO _main_product_filter_cnt from jsonb_each_text($4);
		SELECT count(*) INTO _attr_product_filter_cnt from jsonb_each_text($5);
	_product_filter_con := 'select distinct y.store_code store_code from (('||_query_pm||') x
			join ('||_query_pa||') z   on x.product_code =z.product_code
			join (select product_code, store_code from global.product_Store_mapping ' ||_validaity_where_clause || '  ) y
			 on x.product_code =y.product_code)';
	if _psa_flag = true then
		for _key, _value in SELECT * FROM jsonb_each_text($5) WHERE value IS NOT NULL loop
			_psa_attributes := array_append(_psa_attributes, _key);
		end loop;
		FOR i IN 1..array_length(_psa_attributes, 1) LOOP
	        _psa_attributes_select_string := _psa_attributes_select_string || 'max(psa.' || _psa_attributes[i] || ') as ' || _psa_attributes[i];
	        IF i < array_length(_psa_attributes, 1) THEN
	            _psa_attributes_select_string := _psa_attributes_select_string || ', ';
	        END IF;
	    END LOOP;
	end if;
		
	if (_main_product_filter_cnt =0 and _attr_product_filter_cnt =0) or _psa_flag = true then
		_store_table_join_query := '(SELECT main.store_name, attributes.* FROM (' || _query_sm || ') main JOIN (' || _query_sa || ') attributes ON main.store_code = attributes.store_code ORDER BY main.store_code ASC) sm';
	    if _psa_flag = true then
	    	_query_combine := 'SELECT * FROM (
					select
						count (distinct psa.store_code) store_count, '|| _psa_attributes_select_string || ' 
					from
						' || _store_table_join_query || ' 
				join (' || _query_psa || ') psa on sm.store_code = psa.store_code group by psa.psa_code) X ' || _query_table_filters;
	    else
	 		_query_combine := 'SELECT * FROM (
				select
					sm.*
				from ' || _store_table_join_query || '
					
			) X ' || _query_table_filters;
		end if;
	else
		_query_combine := 'SELECT * FROM (
			select
				sm.*
			from
				(SELECT main.store_name, attributes.* FROM (' || _query_sm || ') main JOIN (' || _query_sa || ') attributes ON main.store_code = attributes.store_code
				 join ('||_product_filter_con|| ') z
				on main.store_code =z.store_code ORDER BY main.store_code ASC) sm
				) X ' || _query_table_filters;
	end if;
		raise notice '%',_query_combine;
		OPEN $1 FOR execute _query_combine;
		return _query_combine;
	end $function$
;
