--liquibase formatted sql
--changeset rohanpowar.v@impactanalytics.co:store_product_groups_list runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:liquibase_project_start
--comment: is_default column added
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.store_product_groups_list(input jsonb, jsonb, jsonb, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.store_product_groups_list(input jsonb, jsonb, jsonb, jsonb, jsonb, jsonb)
 RETURNS TABLE(sg_code integer, name character varying, special_classification character varying, created_at timestamp with time zone, updated_at timestamp with time zone, created_by character varying, updated_by character varying, store_count bigint, sg_count bigint, channel character varying, is_default boolean)
 LANGUAGE plpgsql
AS $function$
/*
  * Function/Procedure name: global.store_product_groups_list
  * Created by: Kailash Yadav
  * Created at: 12-May-2022
  * No of input parameter: 6
  * Parameter Description : $1 = Store Group Filter
  *                         $2 = JSON for Store_master Filter
  *                         $3 = JSON for Store_master_attribute Filter
  *                         $4 = JSON for product Filter
  *                         $5 = JSON for product_master_attribute Filter
  *                         $6 = JSON for search, sort and limit clause
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
  * Gautam           19-Sep-2023    Removed left joins on filter query to return rows matching passed store_code_name
  * Gautam           20-Sep-2023    Added union to the existing query to return empty store groups
  * Rohanpowar       25-Nov-2025    Added is_default column
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
 	_query_empty_store_groups text:='';
 	begin
 		$1 := $1 || ('{"is_deleted": [{"type": "custom", "operator": "=", "values": false}]}'::jsonb);
 		$2 := $2 || ('{"active": [{"type": "custom", "operator": "=", "values": true}]}'::jsonb);
 		_query_sg := global.form_main_table_filters('store_groups', $1);
 		SELECT count(*) INTO _main_filter_cnt from jsonb_each_text($2);
 		SELECT count(*) INTO _attr_filter_cnt from jsonb_each_text($3);
 		SELECT count(*) INTO _main_product_filter_cnt from jsonb_each_text($4);
 		SELECT count(*) INTO _attr_product_filter_cnt from jsonb_each_text($5);
 		--raise notice '%,%', _main_filter_cnt, _attr_filter_cnt;
 		_query_table_filters := global.form_table_query($6);
 		if _main_product_filter_cnt = 0 and _attr_product_filter_cnt != 0 then
 			_query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $5);
 		 	raise notice '_query_pa%',_query_pa;
 			_product_filter_con := 'select distinct y.store_code store_code from (('||_query_pa||') x
 			join (select product_code, store_code from global.product_Store_mapping ' ||_validaity_where_clause || '  ) y
 			 on x.product_code = y.product_code)';
 			raise notice '_product_filter_con%',_product_filter_con;
 		elseif _main_product_filter_cnt != 0 and _attr_product_filter_cnt = 0 then
 			_query_pm := global.form_main_table_filters('product_master', $4);
 			_product_filter_con := 'select distinct y.store_code store_code from ((select product_code from global.product_master'||_query_pm||') x
 			join (select product_code, store_code from global.product_Store_mapping ' ||_validaity_where_clause || ' ) y
 			 on x.product_code = y.product_code)';
 			raise notice '_query_pm%',_query_pm;
 		elseif _main_product_filter_cnt != 0 and _attr_product_filter_cnt != 0 then
 			_query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $5);
 			_query_pm := global.form_main_table_filters('product_master', $4);
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
  	 		_query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $3);
  	 		if length(_product_filter_con)>1  then
  	 		_filter_con := ' JOIN (SELECT sgm.sg_code FROM (' || _query_sa || ') x  JOIN ('||_product_filter_con|| ') y
  			on x.store_code = y.store_code
  		  	 JOIN "global".store_groups_mapping sgm
  	 		ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
  	 		elseif  length(_product_filter_con) = 0 then
  	 		_filter_con := ' JOIN (SELECT sgm.sg_code FROM (' || _query_sa || ') x JOIN "global".store_groups_mapping sgm ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
  	 		end if ;
  	 	elseif 	_main_filter_cnt != 0 and _attr_filter_cnt = 0 then
  	 		_query_sm := 'SELECT * FROM global.store_master' || (global.form_main_table_filters('store_master', $2));
  	 		if length(_product_filter_con)>1  then
  	 		_filter_con := ' JOIN (SELECT sgm.sg_code FROM (' || _query_sm || ') x  JOIN ('||_product_filter_con|| ') y
  				on x.store_code = y.store_code
  			  	 JOIN "global".store_groups_mapping sgm
  		 		ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
  	 		elseif  length(_product_filter_con) = 0 then
  	 			_filter_con := ' JOIN (SELECT sgm.sg_code FROM (' || _query_sm || ') x JOIN "global".store_groups_mapping sgm ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
  	 	    end if;
  	 	elseif 	_main_filter_cnt != 0 and _attr_filter_cnt != 0 then
  	 		_query_sm := 'SELECT * FROM global.store_master' || (global.form_main_table_filters('store_master', $2));
  	 		_query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $3);
  	 		if length(_product_filter_con)>1  then
  	 		_filter_con := ' JOIN (SELECT sgm.sg_code FROM (' || _query_sm || ') x  JOIN (' || _query_sa || ') y on x.store_code = y.store_code join ('||_product_filter_con|| ') z
  				on x.store_code = z.store_code
  			  	join "global".store_groups_mapping sgm
  		 		on x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
  		 	elseif  length(_product_filter_con) = 0 then
  	 		 _filter_con := ' JOIN (SELECT sgm.sg_code FROM (' || _query_sm || ') x JOIN (' || _query_sa || ') y on x.store_code = y.store_code join "global".store_groups_mapping sgm ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
  	 	   end if;
  		 end if;
 		raise notice '_filter_con%',_filter_con;
 	
 		_query_empty_store_groups := '
			select 
			sg.sg_code,	
			sg.name,
			sg.special_classification,
			sg.created_at,
			sg.updated_at,
			sg.created_by,
			sg.updated_by,
			sg.channel,
			sg.is_default
			from "global".store_groups  sg '
			|| _query_sg || ' and 
			 sg.sg_code not in (
			select
			distinct sg_code
			from
			"global".store_groups_mapping sgm join "global".store_attributes_filter saf using(store_code) where
			saf.is_deleted=false and saf.active ) ';
			
		_query_combine := 'select *
			from (
			select 
			sg_data.sg_code,
			sg_data.name,
			sg_data.special_classification,
			sg_data.created_at,
			sg_data.updated_at,
			um.name as created_by, 
			umup.name as updated_by,
			COALESCE(sgm.store_count, 0) as store_count, 
			COALESCE(sgm.sg_count, 0) as sg_count,
			sg_data.channel,
			sg_data.is_default
		 	from (			
		 				
			select * from (
			 			
			select 
				sg.sg_code,
				sg.name,
				sg.special_classification,
				sg.created_at,
				sg.updated_at,
				sg.created_by,
				sg.updated_by,
				sg.channel,
				sg.is_default
				from (
				select
				* 
				from
				"global".store_groups sg
			    ' || _query_sg ||  ' ) sg
				' || _filter_con || ' ) sg_temp 
			union '
		|| _query_empty_store_groups || '  ) sg_data
		
		left join (select user_code, name from "global".user_master um  where  (um.is_deleted::bool = ''false''::bool) ) um on sg_data.created_by = um.user_code
		left join (select user_code, name from "global".user_master um  where  (um.is_deleted::bool = ''false''::bool) ) umup on sg_data.updated_by = umup.user_code
		left join (
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
 					sg_code ) sgm on sg_data.sg_code = sgm.sg_code ) X ' || _query_table_filters;

 		raise notice '%',_query_combine;
 		return query execute _query_combine;
 	end 
$function$
;

--changeset arnab.nandy@impactanalytics.co:store_product_groups_list_for_psa_flag_cursor_based runOnChange:true stripComments:false splitStatements:false context:MTP-37094 labels:MTP-37094
--comment: changeset for store_product_groups_list function for product store dimension and cursor based
DROP FUNCTION IF EXISTS global.store_product_groups_list(input refcursor, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, boolean, boolean);
CREATE OR REPLACE FUNCTION global.store_product_groups_list(input refcursor, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, boolean, boolean)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
  * Function/Procedure name: global.store_product_groups_list
  * Created by: Kailash Yadav
  * Created at: 12-May-2022
  * No of input parameter: 6
  * Parameter Description : $2 = Store Group Filter
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
    _psa_flag bool := $8;
    _return_query bool := $9;
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
 		    if _psa_flag = true then
 		    	_query_pa := global.form_attribute_table_filters_v2('product_store_attributes', 'store_code', $6);
 		    else
 				_query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $6);
 			end if;
 		 	raise notice '_query_pa%',_query_pa;
 		    if _psa_flag = true then
 		    	_product_filter_con := 'select distinct x.store_code store_code, x.psa_code psa_code from ('||_query_pa||') x';
 		    else
	 			_product_filter_con := 'select distinct y.store_code store_code from (('||_query_pa||') x
	 			join (select product_code, store_code from global.product_Store_mapping ' ||_validaity_where_clause || '  ) y
	 			 on x.product_code = y.product_code)';
	 		end if;
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
 	 	if 	(_main_filter_cnt = 0 and _attr_filter_cnt != 0) or _psa_flag = true then
  	 		_query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $4);
  	 		if length(_product_filter_con)>1  then
	  	 		if _psa_flag = true then
	  	 			_filter_con := 'JOIN (SELECT sgm.sg_code FROM (' || _query_sa || ') x  JOIN ('||_product_filter_con|| ') y
						  			on x.store_code = y.store_code
						  		  	 JOIN "global".aggregated_store_groups_mapping sgm
						  	 		ON y.psa_code = sgm.psa_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
				else
		  	 		_filter_con := 'LEFT JOIN (SELECT sgm.sg_code FROM (' || _query_sa || ') x  JOIN ('||_product_filter_con|| ') y
		  			on x.store_code = y.store_code
		  		  	 JOIN "global".store_groups_mapping sgm
		  	 		ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
		  	 	end if;
  	 		elseif  length(_product_filter_con) = 0 then
  	 		_filter_con := ' LEFT JOIN (SELECT sgm.sg_code FROM (' || _query_sa || ') x JOIN "global".store_groups_mapping sgm ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
  	 		end if ;
  	 	elseif 	_main_filter_cnt != 0 and _attr_filter_cnt = 0 then
  	 		_query_sm := 'SELECT * FROM global.store_master' || (global.form_main_table_filters('store_master', $3));
  	 		if length(_product_filter_con)>1  then
  	 		_filter_con := ' LEFT JOIN (SELECT sgm.sg_code FROM (' || _query_sm || ') x  JOIN ('||_product_filter_con|| ') y
  				on x.store_code = y.store_code
  			  	 JOIN "global".store_groups_mapping sgm
  		 		ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
  	 		elseif  length(_product_filter_con) = 0 then
  	 			_filter_con := ' LEFT JOIN (SELECT sgm.sg_code FROM (' || _query_sm || ') x JOIN "global".store_groups_mapping sgm ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
  	 	    end if;
  	 	elseif 	_main_filter_cnt != 0 and _attr_filter_cnt != 0 then
  	 		_query_sm := 'SELECT * FROM global.store_master' || (global.form_main_table_filters('store_master', $3));
  	 		_query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $4);
  	 		if length(_product_filter_con)>1  then
  	 		_filter_con := ' LEFT JOIN (SELECT sgm.sg_code FROM (' || _query_sm || ') x  JOIN (' || _query_sa || ') y on x.store_code = y.store_code join ('||_product_filter_con|| ') z
  				on x.store_code = z.store_code
  			  	join "global".store_groups_mapping sgm
  		 		on x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
  		 	elseif  length(_product_filter_con) = 0 then
  	 		 _filter_con := ' LEFT JOIN (SELECT sgm.sg_code FROM (' || _query_sm || ') x JOIN (' || _query_sa || ') y on x.store_code = y.store_code join "global".store_groups_mapping sgm ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
  	 	   end if;
  		 end if;
 		raise notice '_filter_con%',_filter_con;
 	/*select y.store_code store_code from (
 	(SELECT product_code, l0_name FROM "global".product_attributes_filter  a WHERE (l0_name::varchar = any('{"Accessories"}'::varchar[]))) x
 	join  (select product_code, store_code from global.product_Store_mapping b  ) y
 	 on x.product_code = y.product_code)
 	 */
 		_query_combine := global.build_store_product_groups_list_final_query(_query_sg, _filter_con, _query_table_filters, _psa_flag);
 		raise notice '%',_query_combine;
 		open $1 for execute _query_combine;
 	    if _return_query = true then
 	    	return _query_combine;
 	    else
 			return $1;
 		end if;
 	end
$function$
;

