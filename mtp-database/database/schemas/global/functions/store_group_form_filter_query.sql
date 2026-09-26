--liquibase formatted sql
--changeset liquibase:store_group_form_filter_query runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_group_form_filter_query
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.store_group_form_filter_query(input jsonb, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.store_group_form_filter_query(input jsonb, jsonb, jsonb, jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
	/*
	 * Function/Procedure name: global.store_group_form_filter_query
	 * Created by: Pradeep
	 * Parameter Description :
	 * 						   $1 =JSON for Store_master Filter
	 *                         $2 = JSON for Store_master_attribute Filter
	                           $3 = JSON for product Filter
	                           $4 = JSON for product_master_attribute Filter
	 * Purpose: This function been created to prepate the store - product cross filter query
	 * if any modification done in same function/procedure please record the changes in below format
	 *
	 * Updated_by       Updated_on      Purpose
	 * ----------       -----------     --------	
	 * Pradeep          06-Sept-2022 	Added mapping validity check
	 */
	declare
		_query_sm text := '';
		_query_sa text := '';
		_query_pm text := '';
		_query_pa text := '';
		_main_filter_cnt int := 0;
		_attr_filter_cnt int := 0;
		_filter_con text := ' ';
		_main_product_filter_cnt int := 0;
		_attr_product_filter_cnt int := 0;
		_product_filter_con text :='';
		_validaity_where_clause text := ' where validity is not null ';
	begin
		$1 := $1 || ('{"active": [{"type": "custom", "operator": "=", "values": true}]}'::jsonb);
		SELECT count(*) INTO _main_filter_cnt from jsonb_each_text($1);
		SELECT count(*) INTO _attr_filter_cnt from jsonb_each_text($2);
		SELECT count(*) INTO _main_product_filter_cnt from jsonb_each_text($3);
		SELECT count(*) INTO _attr_product_filter_cnt from jsonb_each_text($4);
		raise notice '%,%', _main_filter_cnt, _attr_filter_cnt;
		if _main_product_filter_cnt=0 and _attr_product_filter_cnt!=0 then
			_query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $4);
		 	raise notice '_query_pa%',_query_pa;
			_product_filter_con:= 'select y.store_code store_code from (('||_query_pa||') x
			join (select product_code, store_code from global.product_Store_mapping  ' ||_validaity_where_clause || ' ) y
			 on x.product_code =y.product_code)';
			raise notice '_product_filter_con%',_product_filter_con;
		elseif _main_product_filter_cnt!=0 and _attr_product_filter_cnt=0 then
			_query_pm := global.form_main_table_filters('product_master', $3);
			_product_filter_con:= 'select y.store_code store_code from ((select product_code from global.product_master'||_query_pm||') x
			join (select product_code, store_code from global.product_Store_mapping  ' ||_validaity_where_clause || ' ) y
			 on x.product_code =y.product_code)';
			raise notice '_query_pm%',_query_pm;
		elseif _main_product_filter_cnt!=0 and _attr_product_filter_cnt!=0 then
			_query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $4);
			_query_pm := global.form_main_table_filters('product_master', $3);
			_product_filter_con := 'select y.store_code store_code from ((select product_code from global.product_master'||_query_pm||') x
			join ('||_query_pa||') z   on x.product_code =z.product_code
			join (select product_code, store_code from global.product_Store_mapping  ' ||_validaity_where_clause || '  ) y
			 on x.product_code =y.product_code)';
		end if;
	 	if 	_main_filter_cnt = 0 and _attr_filter_cnt != 0 then
	 		_query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $2);
	 		if length(_product_filter_con)>1  then
	 		_filter_con := ' SELECT x.store_code FROM (' || _query_sa || ') x  JOIN ('||_product_filter_con|| ') y
				on x.store_code =y.store_code ';
	 		elseif  length(_product_filter_con)=0 then
	 			_filter_con := ' SELECT * FROM (' || _query_sa || ') x ';
	 	    end if ;
	 	elseif 	_main_filter_cnt != 0 and _attr_filter_cnt = 0 then
	 		_query_sm := ' SELECT store_code FROM global.store_master' || (global.form_main_table_filters('store_master', $1));
	 		if length(_product_filter_con)>1  then
	 		_filter_con := ' SELECT * FROM (' || _query_sm || ') x  JOIN ('||_product_filter_con|| ') y
				on x.store_code =y.store_code';
	 		elseif  length(_product_filter_con)=0 then
	 			_filter_con := ' SELECT x.store_code FROM (' || _query_sm || ') x ';
	 		end if;
	 	elseif 	_main_filter_cnt != 0 and _attr_filter_cnt != 0 then
	 		_query_sm := ' SELECT store_code FROM global.store_master' || (global.form_main_table_filters('store_master', $1));
	 		_query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $2);
	 		if length(_product_filter_con)>1  then
	 			_filter_con := ' SELECT m.store_code FROM (' || _query_sm || ') m join (' || _query_sa || ') x 
 				on m.store_code = x.store_code
				 JOIN ('||_product_filter_con|| ') y
				on x.store_code =y.store_code';
	 		elseif  length(_product_filter_con)=0 then
	 			_filter_con := ' SELECT x.store_code FROM (' || _query_sm || ') x JOIN (' || _query_sa || ') y on x.store_code = y.store_code';
 	 		end if;
		 end if;
		return _filter_con;
	end $function$
;
