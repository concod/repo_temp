--liquibase formatted sql
--changeset arnab.nandy@impactanalytics.co:store_group_psa_name_list runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:MTP-41716
--comment: initial changeset for store_group_psa_name_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.store_group_psa_name_list(input refcursor, jsonb, jsonb, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.store_group_psa_name_list(input refcursor, jsonb, jsonb, jsonb, jsonb, jsonb)
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
 * Arnab            24-April-2022 	Created this function to reduce filter fetch time
 */
	declare
	_query_sm text := '';
	_query_sa text := '';
	_query_pm text := '';
	_query_pa text := '';
	_query_table_filters text := '';
	_query_combine text := '';
    _store_table_join_query text := '';
    _main_store_filter_cnt int := 0;
    _attr_store_filter_cnt int := 0;
	_main_product_filter_cnt int := 0;
	_attr_product_filter_cnt int := 0;
	begin
		SELECT count(*) INTO _main_store_filter_cnt from jsonb_each_text($2);
		$2 := $2 || ('{"active": [{"type": "custom", "operator": "=", "values": true}]}'::jsonb);
		_query_sm := 'SELECT * FROM global.store_master' || (global.form_main_table_filters('store_master', $2));
 		_query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $3);
		_query_pm := 'SELECT product_code FROM global.product_master' || (global.form_main_table_filters('product_master', $4));
	    _query_pa := global.form_attribute_table_filters_v2('product_store_attributes', 'store_code', $5);
		_query_table_filters := global.form_table_query($6);
		SELECT count(*) INTO _attr_store_filter_cnt from jsonb_each_text($3);
		SELECT count(*) INTO _main_product_filter_cnt from jsonb_each_text($4);
		SELECT count(*) INTO _attr_product_filter_cnt from jsonb_each_text($5);
		
	if (_main_store_filter_cnt =0 and _attr_store_filter_cnt =0) then
	    _query_combine := 'SELECT * FROM (
					select
						count (distinct psa.store_code) store_count, max(psa.l0_name) as l0_name, max(psa.l1_name) as l1_name, max(psa.l3_name) as l3_name, max(psa.l4_name) as l4_name, max(psa.psa_code) as psa_code, max(psa.psa_name) as psa_name
					from
						(' || _query_pa || ') psa group by (psa_name)) X ' || _query_table_filters;
	else
	    _store_table_join_query := '(SELECT main.store_name, attributes.* FROM (' || _query_sm || ') main JOIN (' || _query_sa || ') attributes ON main.store_code = attributes.store_code) sm';
	        _query_combine := 'SELECT * FROM (
					select
						count (distinct psa.store_code) store_count, max(psa.l0_name) as l0_name, max(psa.l1_name) as l1_name, max(psa.l3_name) as l3_name, max(psa.l4_name) as l4_name, max(psa.psa_code) as psa_code, max(psa.psa_name) as psa_name
					from
						' || _store_table_join_query || ' 
				join (' || _query_pa || ') psa on sm.store_code = psa.store_code group by psa.psa_code) X ' || _query_table_filters;
	end if;
	raise notice '%',_query_combine;
	OPEN $1 FOR execute _query_combine;
	return _query_combine;
	end $function$
;
