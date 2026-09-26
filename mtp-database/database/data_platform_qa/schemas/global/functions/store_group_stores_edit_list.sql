--liquibase formatted sql
--changeset liquibase:store_group_stores_edit_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_group_stores_edit_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.store_group_stores_edit_list(input refcursor, jsonb, jsonb, jsonb, integer);
CREATE OR REPLACE FUNCTION global.store_group_stores_edit_list(input refcursor, jsonb, jsonb, jsonb, integer)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
	declare
	_query_sm text := '';
	_query_sa text := '';
	_query_table_filters text := '';
	_query_combine text := '';
	begin
	    $2 := $2 || ('{"active": [{"type": "custom", "operator": "=", "values": true}]}'::jsonb);
		_query_sm := 'SELECT * FROM global.store_master' || (global.form_main_table_filters('store_master', $2));
 		_query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $3);
		_query_table_filters := global.form_table_query($4);
 		_query_combine := 'SELECT * FROM (
			select
				sm.*,
				(case when sgm.store_code is null then false else true end) as is_mapped
			from
				(SELECT main.store_name, attributes.*  FROM (' || _query_sm || ') main JOIN (' || _query_sa || ') attributes ON main.store_code = attributes.store_code) sm
		 left join (select store_code from "global".store_groups_mapping where sg_code = ' || $5 ||') sgm on sgm.store_code = sm.store_code

		) X ' || _query_table_filters;
		raise notice '%',_query_combine;
		OPEN $1 FOR execute _query_combine;
		return $1;
	end $function$
;

--changeset arnab.nandy@impactanalytics.co:store_group_stores_edit_list_optimizing_for_product_store_attribute runOnChange:true stripComments:false splitStatements:false context:MTP-41716 labels:MTP-41716
--comment: changeset for store_group_stores_edit_list function for optimizing for product store dimension
DROP FUNCTION IF EXISTS global.store_group_stores_edit_list(input refcursor, jsonb, jsonb, jsonb, jsonb, jsonb, integer);
CREATE OR REPLACE FUNCTION global.store_group_stores_edit_list(input refcursor, jsonb, jsonb, jsonb, jsonb, jsonb, integer, boolean)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
	/*
	 * Function/Procedure name: global.store_group_stores_edit_list
	 * Created by: Kailash Yadav
	 * Created at: 13-May-2022
	 * No of input parameter: 6
	 * Parameter Description : $1 = refcursor name
	                           $2 = JSON for Store_master Filter
	 *                         $3 = JSON for Store_master_attribute Filter
	                           $4 = JSON for product Filter
	                           $5 = JSON for product_master_attribute Filter
	                           $6 = JSON for search, sort and limit clause
	                           $7 = sg_code from store group mapping
	                           $8 = product_store_attribute flag
	 * Purpose: This function been created to get the store group mapping
	 *
	 * Calling Statement:
	 *   select global.store_group_stores_edit_list(
	 * 				'my_cur',
					'{}',
				    '{"channel": [{"type": "list", "operator": "in", "values": ["Full Line Retail"]}]}' ,
					'{"product_code": [{"type": "list", "operator": "in", "values": ["22945-N13"]}]}',
					'{"l0_name": [{"type": "list", "operator": "in", "values": ["Accessories"]}]}',
					'{}',
					1)
	 *
	 * if any modification done in same function/procedure please record the changes in below format
	 *
	 * Updated_by       Updated_on      Purpose
	 * ----------       -----------     --------
	 *
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
	_product_filter_con text:='';
	_validaity_where_clause text := 'where  validity is not null';
    _psa_flag bool := $8;
    _query_psa text := '';
begin
	$2 := $2 || ('{"active": [{"type": "custom", "operator": "=", "values": true}]}'::jsonb);
	_query_sm := 'SELECT * FROM global.store_master' || (global.form_main_table_filters('store_master', $2));
	_query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $3);
	_query_pm := 'SELECT product_code FROM global.product_master' || (global.form_main_table_filters('product_master', $4));
	_query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $5);
	_query_table_filters := global.form_table_query($6);
	_query_psa := global.form_attribute_table_filters_v2('product_store_attributes', 'store_code', $5);
	raise notice '_query_psa %', _query_psa;
	SELECT count(*) INTO _main_product_filter_cnt from jsonb_each_text($4);
	SELECT count(*) INTO _attr_product_filter_cnt from jsonb_each_text($5);
	_product_filter_con:= 'select distinct y.store_code store_code from (('||_query_pm||') x
					join ('||_query_pa||') z   on x.product_code =z.product_code
					join (select product_code, store_code from global.product_Store_mapping ' ||_validaity_where_clause || '  ) y
					 on x.product_code =y.product_code)';
	if (_main_product_filter_cnt =0 and _attr_product_filter_cnt =0) or _psa_flag = true then
		if _psa_flag = true then 
			_query_combine := 'SELECT * FROM (
				select
					sgm.psa_code_psaf psa_code,
					count (distinct sgm.store_code) store_count,
					max(sgm.psa_name) psa_name,
					(case when max(sgm.psa_code_asgm) is null then false else true end) as is_mapped,
					max(sgm.l0_name) l0_name,
					max(sgm.l1_name) l1_name,
					max(sgm.l3_name) l3_name,
					max(sgm.l4_name) l4_name
				from
					(
						select psaf.psa_code psa_code_psaf, asgm.psa_code psa_code_asgm, psa_name, store_code, l0_name, l1_name, l3_name, l4_name from ('|| _query_psa ||') psaf
						left join (select psa_code from "global".aggregated_store_groups_mapping where sg_code = '|| $7 || ') asgm
						on psaf.psa_code = asgm.psa_code
					  ) sgm group by (sgm.psa_code_psaf, sgm.psa_code_asgm)
				) X ' || _query_table_filters;
		else
			_query_combine := 'SELECT * FROM (
				select
					sm.*,
					(case when sgm.store_code is null then false else true end) as is_mapped
				from
					(SELECT main.store_name, attributes.*  FROM (' || _query_sm || ') main JOIN (' || _query_sa || ') attributes ON main.store_code = attributes.store_code) sm
				 left join (select store_code from "global".store_groups_mapping where sg_code = ' || $7 ||') sgm on sgm.store_code = sm.store_code
				) X ' || _query_table_filters;
		end if;
	else
	_query_combine := 'SELECT * FROM (
		select
			sm.*,
			(case when sgm.store_code is null then false else true end) as is_mapped
		from
			(SELECT main.store_name, attributes.*  FROM (' || _query_sm || ') main JOIN (' || _query_sa || ') attributes ON main.store_code = attributes.store_code
			join ('||_product_filter_con|| ') z
			on main.store_code =z.store_code
			)sm
		left join (select store_code from "global".store_groups_mapping where sg_code = ' || $7 ||') sgm on sgm.store_code = sm.store_code
		) X ' || _query_table_filters;
	end if;
	raise notice '%',_query_combine;
	OPEN $1 FOR execute _query_combine;
	return _query_combine;
end $function$
;
