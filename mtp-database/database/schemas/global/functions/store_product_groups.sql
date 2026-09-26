
--liquibase formatted sql
--changeset abhishek.jha@impactanalytics.co:store_product_groups_feature-mtp-59319 runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:feature-mtp-59319
--comment: using to return query text, to be used in select_all_transactions for all store group updation
--rollback: SELECT 1
DROP FUNCTION IF EXISTS "global".store_product_groups(input refcursor, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, boolean, boolean);
CREATE OR REPLACE FUNCTION global.store_product_groups(input refcursor, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, boolean, boolean)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
/*
  * Function/Procedure name: global.store_product_groups_list
  * Created by: Kailash Yadav
  * Created at: 12-May-2022
  * No of input parameter: 7
  * Parameter Description : $1 = Cursor name
  *							$2 = Store Group Filter
  *                         $3 = JSON for Store_master Filter
  *                         $4 = JSON for Store_master_attribute Filter
  *                         $5 = JSON for product Filter
  *                         $6 = JSON for product_master_attribute Filter
  *                         $7 = JSON for search, sort and limit clause
  * Purpose: This function been created to get the store group list after select the different filter like store, store_attribute, product and product_attribute
  * Calling Statement:
  *  select * from	global.store_product_groups_list(
  *    '{}',
  *    '{}',
  *    '{"channel": [{"type": "list", "operator": "in", "values": ["Full Line Retail"]}]}',
  *    '{}',
  *    '{"l0_name": [{"type": "list", "operator": "in", "values": ["Accessories"]}]}',
  *    '{}')
  *
  * if any modification done in same function/procedure please record the changes in below format
  *
  * Updated_by       Updated_on      Purpose
  * ----------       -----------     --------
  * Ashish Gupta     21-Jun-2022     Add SG Filter to add application code
  * Pradeep          22-Aug-2022 	Added mapping validity check
  * Gautam           10-Oct-2022    Send Created by user name by joining store_groups with user_master
  * Chaitanya        01-Sep-2023    Send updated by user name by joining store_groups with user_master
  * Gautam           11-Sep-2023    Removed left joins on filter query to return rows matching passed store codes
  * Abhishek Jha     15-Oct-2024    modified to return query text, to be used in select_all_transactions for all store group updation
  */
 declare
 	_query_sm text := '';
 	_query_sa text := '';
 	_query_pm text := '';
 	_query_pa text := '';
 	_query_table_filters text := '';
 	_query_combine text := '';
 	_main_filter_cnt int := 0;
 	_attr_filter_cnt int := 0;
 	_main_product_filter_cnt int := 0;
 	_attr_product_filter_cnt int := 0;
 	_filter_con text := ' ';
 	_product_filter_con text:='';
 	_query_sg text;
 	_validaity_where_clause text := 'where validity is not null ';
 	_empty_store_groups text:= '';
  	begin
 		$2 := $2 || ('{"is_deleted": [{"type": "custom", "operator": "=", "values": false}]}'::jsonb);
 		$3 := $3 || ('{"active": [{"type": "custom", "operator": "=", "values": true}]}'::jsonb);
 		_query_sg := global.form_main_table_filters('store_groups', $2);
 		SELECT count(*) INTO _main_filter_cnt from jsonb_each_text($3);
 		SELECT count(*) INTO _attr_filter_cnt from jsonb_each_text($4);
 		SELECT count(*) INTO _main_product_filter_cnt from jsonb_each_text($5);
 		SELECT count(*) INTO _attr_product_filter_cnt from jsonb_each_text($6);
 		--raise notice '%,%', _main_filter_cnt, _attr_filter_cnt;
 		_query_table_filters := global.form_table_query($7);
 		if _main_product_filter_cnt = 0 and _attr_product_filter_cnt != 0 then
 			_query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $6);
 		 	raise notice '_query_pa%',_query_pa;
 			_product_filter_con := 'select distinct y.store_code store_code from (('||_query_pa||') x
 			join (select product_code, store_code from global.product_Store_mapping ' ||_validaity_where_clause || '  ) y
 			 on x.product_code = y.product_code)';
 			raise notice '_product_filter_con%',_product_filter_con;
 		elseif _main_product_filter_cnt != 0 and _attr_product_filter_cnt = 0 then
 			_query_pm := global.form_main_table_filters('product_master', $5);
 			_product_filter_con := 'select distinct y.store_code store_code from ((select product_code from global.product_master'||_query_pm||') x
 			join (select product_code, store_code from global.product_Store_mapping ' ||_validaity_where_clause || ' ) y
 			 on x.product_code = y.product_code)';
 			raise notice '_query_pm%',_query_pm;
 		elseif _main_product_filter_cnt != 0 and _attr_product_filter_cnt != 0 then
 			_query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $6);
 			_query_pm := global.form_main_table_filters('product_master', $5);
 			_product_filter_con := 'select distinct y.store_code store_code from ((select  product_code from global.product_master'||_query_pm||') x
 			join ('||_query_pa||') z on x.product_code = z.product_code
 			join (select product_code, store_code from global.product_Store_mapping ' ||_validaity_where_clause || ' ) y
 			 on x.product_code = y.product_code)';
 		end if;
 	--raise notice '_query_pa%',_query_pa;
 	--raise notice '_query_pm%',_query_pm;
 	raise notice ' _main_filter_cnt : %',_main_filter_cnt;
 	raise notice ' _attr_filter_cnt : % ', _attr_filter_cnt;
 	raise notice '_product_filter_con%',_product_filter_con;
 	 	if 	_main_filter_cnt = 0 and _attr_filter_cnt != 0   then
  	 		_query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $4);
  	 		if length(_product_filter_con)>1  then
  	 		_filter_con := ' JOIN (SELECT sgm.sg_code FROM (' || _query_sa || ') x  JOIN ('||_product_filter_con|| ') y
  			on x.store_code = y.store_code
  		  	 JOIN "global".store_groups_mapping sgm
  	 		ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
  	 		elseif  length(_product_filter_con) = 0 then
  	 		raise notice 'main %',_query_sa; 
  	 		_filter_con := ' JOIN (SELECT sgm.sg_code FROM (' || _query_sa || ') x JOIN "global".store_groups_mapping sgm ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
  	 		end if ;
  	 	elseif 	_main_filter_cnt != 0 and _attr_filter_cnt = 0 then
  	 		_query_sm := 'SELECT * FROM global.store_master' || (global.form_main_table_filters('store_master', $3));
  	 		if length(_product_filter_con)>1  then
  	 		_filter_con := ' JOIN (SELECT sgm.sg_code FROM (' || _query_sm || ') x  JOIN ('||_product_filter_con|| ') y
  				on x.store_code = y.store_code
  			  	 JOIN "global".store_groups_mapping sgm
  		 		ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
  	 		elseif  length(_product_filter_con) = 0 then
  	 			_filter_con := ' JOIN (SELECT sgm.sg_code FROM (' || _query_sm || ') x JOIN "global".store_groups_mapping sgm ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
  	 	    end if;
  	 	elseif 	_main_filter_cnt != 0 and _attr_filter_cnt != 0 then
  	 		_query_sm := 'SELECT * FROM global.store_master' || (global.form_main_table_filters('store_master', $3));
  	 		_query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $4);
  	 		if length(_product_filter_con)>1  then
  	 		_filter_con := ' JOIN (SELECT sgm.sg_code FROM (' || _query_sm || ') x  JOIN (' || _query_sa || ') y on x.store_code = y.store_code join ('||_product_filter_con|| ') z
  				on x.store_code = z.store_code
  			  	join "global".store_groups_mapping sgm
  		 		on x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
  		 	elseif  length(_product_filter_con) = 0 then
			 _filter_con :=  ' JOIN (SELECT sgm.sg_code FROM (' || _query_sm || ') x JOIN (' || _query_sa || ') y on x.store_code = y.store_code join "global".store_groups_mapping sgm ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
  	 	   end if;
  		 end if;
 		raise notice '_filter_con%',_filter_con;
		_query_combine := 'SELECT * FROM (
 		 		select
 				sg.sg_code,
 				sg.name,
 				sg.special_classification,
 				sg.created_at,
 				sg.updated_at,
 				um.name as created_by,
				umup.name as updated_by,
 				COALESCE(sgm.store_count, 0) as store_count,
 				COALESCE(sgm.sg_count, 0) as sg_count,
				sg.channel,
				(case 
					when sg.is_uploaded is not null then sg.is_uploaded
					else ' || '''' || 'FALSE' || '''' ||'
				end)::varchar is_uploaded
 			from
 				(
 				select
 					sg_code,
 					sg.name,
 					sg.special_classification,
 					sg.created_at,
 					sg.updated_at,
 					sg.created_by,
					sg.channel,
					sg.updated_by,
					sg.extra->>'|| ''''|| 'is_uploaded'||''''||' as is_uploaded
 				from
 					"global".store_groups  sg
				' 
 				|| _query_sg || '  ) sg
 			left join (select user_code, name from "global".user_master um  where  (um.is_deleted::bool = ''false''::bool) ) um
 			on sg.created_by = um.user_code 
			left join (select user_code, name from "global".user_master um  where  (um.is_deleted::bool = ''false''::bool) ) umup
 			on sg.updated_by = umup.user_code'
  			|| _filter_con || 
 			'left join (
 				select
 					sg_code,
 					count(distinct sgm.store_code) as store_count,
 					count(distinct ref_sg_code) as sg_count
 				from
 					"global".store_groups_mapping sgm
 				join "global".store_master sm
 					on sgm.store_code = sm.store_code
 				where active
 				group by
 					sg_code) sgm on
 				sg.sg_code = sgm.sg_code
 			) X ' || _query_table_filters;
 		raise notice '%',_query_combine;
 		return _query_combine;
 	end 
$function$
;
