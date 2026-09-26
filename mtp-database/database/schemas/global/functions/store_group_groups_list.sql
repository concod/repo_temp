--liquibase formatted sql
--changeset liquibase:store_group_groups_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_group_groups_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.store_group_groups_list(input jsonb, jsonb, jsonb, integer);
CREATE OR REPLACE FUNCTION global.store_group_groups_list(input jsonb, jsonb, jsonb, integer)
 RETURNS TABLE(sg_code integer, name character varying, special_classification character varying, store_count bigint, is_mapped boolean)
 LANGUAGE plpgsql
AS $function$
	declare
	_query_sm text := '';
	_query_sa text := '';
	_query_table_filters text := '';
	_query_combine text := '';
	_main_filter_cnt int := 0;
	_attr_filter_cnt int := 0;
	_filter_con text := ' ';
	begin
	    $1 := $1 || ('{"active": [{"type": "custom", "operator": "=", "values": true}]}'::jsonb);
		SELECT count(*) INTO _main_filter_cnt from jsonb_each_text($1);
		SELECT count(*) INTO _attr_filter_cnt from jsonb_each_text($2);
		raise notice '%,%', _main_filter_cnt, _attr_filter_cnt;
		_query_table_filters := global.form_table_query($3);
	 	if 	_main_filter_cnt = 0 and _attr_filter_cnt != 0 then
	 		_query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $2);
	 		_filter_con := ' JOIN (SELECT sgm.sg_code FROM (' || _query_sa || ') x JOIN "global".store_groups_mapping sgm ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
	 	elseif 	_main_filter_cnt != 0 and _attr_filter_cnt = 0 then
	 		_query_sm := 'SELECT * FROM global.store_master' || (global.form_main_table_filters('store_master', $1));
	 		_filter_con := ' JOIN (SELECT sgm.sg_code FROM (' || _query_sm || ') x JOIN "global".store_groups_mapping sgm ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
	 	elseif 	_main_filter_cnt != 0 and _attr_filter_cnt != 0 then
	 		_query_sm := 'SELECT * FROM global.store_master' || (global.form_main_table_filters('store_master', $1));
	 		_query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $2);
	 		_filter_con := ' JOIN (SELECT sgm.sg_code FROM (' || _query_sm || ') x JOIN (' || _query_sa || ') y on x.store_code = y.store_code join "global".store_groups_mapping sgm ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
		 end if;
 		_query_combine := 'SELECT * FROM (
			select
				sg.*,
				sgm.is_mapped
			from
				(
				select
					sgmain.sg_code,
					sgmain.name,
					sgmain.special_classification,
					count(distinct sgmmain.store_code) as store_count
				from
					"global".store_groups sgmain 
				join
					"global".store_groups_mapping sgmmain
				on sgmain.sg_code = sgmmain.sg_code
				where
					is_deleted = false and sgmain.sg_code != ' || $4 || ' group by 1) sg'
 			|| _filter_con ||
			'left join (
				select
					sg_code,
					ref_sg_code,
					case when sg_code is null then false else true end as is_mapped
				from
					"global".store_groups_mapping
				where
					sg_code = ' || $4 || ' group by 1,2
				) sgm on
				sg.sg_code = sgm.ref_sg_code
) X ' || _query_table_filters;
		raise notice '%',_query_combine;
		return query execute _query_combine;
	end $function$
;

--changeset chaitanyaprasad:MTP-39883 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-39883
--comment: sending created_at, created_by, updated_at, updated_by fields by joining with user_master
DROP FUNCTION IF EXISTS global.store_group_groups_list(jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,integer);
CREATE OR REPLACE FUNCTION global.store_group_groups_list(input jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, integer)
 RETURNS TABLE(sg_code integer, name character varying, special_classification character varying, store_count bigint, created_at timestamp with time zone, updated_at timestamp with time zone, created_by character varying, updated_by character varying, is_mapped boolean)
 LANGUAGE plpgsql
AS $function$
 	/*
 	 * Function/Procedure name: global.store_group_groups_list
 	 * Created by: Kailash Yadav
 	 * Created at: 13-May-2022
 	 * No of input parameter: 6
 	 * Parameter Description : $1 = store group filter (application_code)
 	 * 						   $2 = JSON for Store_master Filter
 	 *                         $3 = JSON for Store_master_attribute Filter
 	                           $4 = JSON for product Filter
 	                           $5 = JSON for product_master_attribute Filter
 	                           $6 = JSON for search, sort and limit clause
 	                           $7 = sg_code from store group mapping
 	 * Purpose: This function been created to get the list of store group details
 	 *
 	 * Calling Statement:
 	 *   select global.store_group_groups_list('my_cur',
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
 	 * Pradeep			13-aug-2022     Added one extra param to support filters on store group (application_code)	
 	 * Pradeep          22-Aug-2022 	Added mapping validity check
	 * Chaitanya        02-Apr-2024 	Added created_at, created_by, updated_at, updated_by fields
 	 */
 	declare
 	_query_sg text := '';
 	_query_sm text := '';
 	_query_sa text := '';
 	_query_pm text := '';
 	_query_pa text := '';
 	_query_table_filters text := '';
 	_query_combine text := '';
 	_main_filter_cnt int := 0;
 	_attr_filter_cnt int := 0;
 	_filter_con text := ' ';
 	_main_product_filter_cnt int := 0;
 	_attr_product_filter_cnt int := 0;
 	_product_filter_con text:='';
 	_validaity_where_clause text := ' where validity is not null ';
 	begin
 		$1 := $1 || ('{"is_deleted": [{"type": "custom", "operator": "=", "values": false}]}'::jsonb);
 		_query_sg := global.form_main_table_filters('store_groups', $1);
 		SELECT count(*) INTO _main_filter_cnt from jsonb_each_text($2);
 		SELECT count(*) INTO _attr_filter_cnt from jsonb_each_text($3);
 		SELECT count(*) INTO _main_product_filter_cnt from jsonb_each_text($4);
 		SELECT count(*) INTO _attr_product_filter_cnt from jsonb_each_text($5);
 		raise notice '%,%', _main_filter_cnt, _attr_filter_cnt;
 		_query_table_filters := global.form_table_query($6);
 		if _main_product_filter_cnt=0 and _attr_product_filter_cnt!=0 then
 			_query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $5);
 		 	raise notice '_query_pa%',_query_pa;
 			_product_filter_con:= 'select y.store_code store_code from (('||_query_pa||') x
 			join (select product_code, store_code from global.product_Store_mapping ' ||_validaity_where_clause || ' ) y
 			 on x.product_code =y.product_code)';
 			raise notice '_product_filter_con%',_product_filter_con;
 		elseif _main_product_filter_cnt!=0 and _attr_product_filter_cnt=0 then
 			_query_pm := global.form_main_table_filters('product_master', $4);
 			_product_filter_con:= 'select y.store_code store_code from ((select product_code from global.product_master'||_query_pm||') x
 			join (select product_code, store_code from global.product_Store_mapping ' ||_validaity_where_clause || '  ) y
 			 on x.product_code =y.product_code)';
 			raise notice '_query_pm%',_query_pm;
 		elseif _main_product_filter_cnt!=0 and _attr_product_filter_cnt!=0 then
 			_query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $5);
 			_query_pm := global.form_main_table_filters('product_master', $4);
 			_product_filter_con:= 'select y.store_code store_code from ((select product_code from global.product_master'||_query_pm||') x
 			join ('||_query_pa||') z   on x.product_code =z.product_code
 			join (select product_code, store_code from global.product_Store_mapping ' ||_validaity_where_clause || '  ) y
 			 on x.product_code =y.product_code)';
 		end if;
 	 	if 	_main_filter_cnt = 0 and _attr_filter_cnt != 0 then
 	 		_query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $3);
 	 		if length(_product_filter_con)>1  then
 	 		_filter_con := ' JOIN (SELECT sgm.sg_code FROM (' || _query_sa || ') x  JOIN ('||_product_filter_con|| ') y
 				on x.store_code =y.store_code
 			  	 JOIN "global".store_groups_mapping sgm
 		 		ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
 	 		elseif  length(_product_filter_con)=0 then
 	 			_filter_con := ' JOIN (SELECT sgm.sg_code FROM (' || _query_sa || ') x JOIN "global".store_groups_mapping sgm ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
 	 	    end if ;
 	 	elseif 	_main_filter_cnt != 0 and _attr_filter_cnt = 0 then
 	 		_query_sm := 'SELECT * FROM global.store_master' || (global.form_main_table_filters('store_master', $2));
 	 		if length(_product_filter_con)>1  then
 	 		_filter_con := ' JOIN (SELECT sgm.sg_code FROM (' || _query_sa || ') x  JOIN ('||_product_filter_con|| ') y
 				on x.store_code =y.store_code
 			  	 JOIN "global".store_groups_mapping sgm
 		 		ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
 	 		elseif  length(_product_filter_con)=0 then
 	 			_filter_con := ' JOIN (SELECT sgm.sg_code FROM (' || _query_sm || ') x JOIN "global".store_groups_mapping sgm ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
 	 		end if;
 	 	elseif 	_main_filter_cnt != 0 and _attr_filter_cnt != 0 then
 	 		_query_sm := 'SELECT * FROM global.store_master' || (global.form_main_table_filters('store_master', $2));
 	 		_query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $3);
 	 		if length(_product_filter_con)>1  then
 	 			_filter_con := ' JOIN (SELECT sgm.sg_code FROM (' || _query_sa || ') x  JOIN ('||_product_filter_con|| ') y
 				on x.store_code =y.store_code
 			  	 JOIN "global".store_groups_mapping sgm
 		 		ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
 	 		elseif  length(_product_filter_con)=0 then
 	 			_filter_con := ' JOIN (SELECT sgm.sg_code FROM (' || _query_sm || ') x JOIN (' || _query_sa || ') y on x.store_code = y.store_code join "global".store_groups_mapping sgm ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
 	 		end if;
 		 end if;
  		_query_combine := 'SELECT * FROM (
        select
            sg.*,
            sgm.is_mapped
        from
            (
            select
                sgmain.sg_code,
                sgmain.name,
                sgmain.special_classification,
                sgmmain.store_count as store_count,
                sgmain.created_at,
                sgmain.updated_at,
                um.name as created_by, 
				umup.name as updated_by
            from
                (
                select sg_code, name, special_classification, created_at, updated_at, channel, created_by, updated_by
                from
                "global".store_groups 
                  ' || _query_sg ||' AND sg_code != '|| $7 ||'
                ) sgmain
                left join (select user_code, name from "global".user_master um  where  (um.is_deleted::bool = ''false''::bool) ) um
                on sgmain.created_by = um.user_code 
                left join (select user_code, name from "global".user_master um  where  (um.is_deleted::bool = ''false''::bool) ) umup
                on sgmain.updated_by = umup.user_code
                join
                (
                    select sg_code, count(distinct store_code) as store_count
                    from 
                    "global".store_groups_mapping 
                    group by sg_code
                )sgmmain
                on sgmain.sg_code = sgmmain.sg_code
            ) sg
        ' || _filter_con || '
        left join (
            select
                sg_code,
                ref_sg_code,
                case when sg_code is null then false else true end as is_mapped
            from
                "global".store_groups_mapping
            where
                sg_code = ' || $7 || ' group by 1,2
            ) sgm on
            sg.sg_code = sgm.ref_sg_code
 		) X ' || _query_table_filters;

 		raise notice '%',_query_combine;
 		return query execute _query_combine;
 	end $function$
;

--changeset arnab.nandy@impactanalytics.co:MTP-37094 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-37094
--comment: making function cursor based and supproting product_store_attribute flag
DROP FUNCTION IF EXISTS global.store_group_groups_list(input refcursor, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, integer, boolean);
CREATE OR REPLACE FUNCTION global.store_group_groups_list(input refcursor, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, integer, boolean)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 	/*
 	 * Function/Procedure name: global.store_group_groups_list
 	 * Created by: Kailash Yadav
 	 * Created at: 13-May-2022
 	 * No of input parameter: 6
 	 * Parameter Description :
 	 * 						   $1 = cursor
 	 * 						   $2 = store group filter (application_code)
 	 * 						   $3 = JSON for Store_master Filter
 	 *                         $4 = JSON for Store_master_attribute Filter
 	                           $5 = JSON for product Filter
 	                           $6 = JSON for product_master_attribute Filter
 	                           $7 = JSON for search, sort and limit clause
 	                           $8 = sg_code from store group mapping
 	                           $9 = psa_flag for product store attributes
 	 * Purpose: This function been created to get the list of store group details
 	 *
 	 * Calling Statement:
 	 *   select global.store_group_groups_list('my_cur',
 					'{}',
 				    '{"channel": [{"type": "list", "operator": "in", "values": ["Full Line Retail"]}]}' ,
 					'{"product_code": [{"type": "list", "operator": "in", "values": ["22945-N13"]}]}',
 					'{"l0_name": [{"type": "list", "operator": "in", "values": ["Accessories"]}]}',
 					'{}',
 					1, false)
 	 *
 	 * if any modification done in same function/procedure please record the changes in below format
 	 *
 	 * Updated_by       Updated_on      Purpose
 	 * ----------       -----------     --------
 	 * Pradeep			13-aug-2022     Added one extra param to support filters on store group (application_code)	
 	 * Pradeep          22-Aug-2022 	Added mapping validity check
	 * Chaitanya        02-Apr-2024 	Added created_at, created_by, updated_at, updated_by fields
	 * Arnab            04-Apr-2024     Added psa_flag
 	 */
 	declare
 	_query_sg text := '';
 	_query_sm text := '';
 	_query_sa text := '';
 	_query_pm text := '';
 	_query_pa text := '';
 	_query_psa text := '';
 	_query_table_filters text := '';
 	_query_combine text := '';
 	_main_filter_cnt int := 0;
 	_attr_filter_cnt int := 0;
 	_filter_con text := ' ';
 	_main_product_filter_cnt int := 0;
 	_attr_product_filter_cnt int := 0;
 	_product_filter_con text:='';
 	_validaity_where_clause text := ' where validity is not null ';
 	_psa_flag bool := $9;
 	begin
 		$2 := $2 || ('{"is_deleted": [{"type": "custom", "operator": "=", "values": false}]}'::jsonb);
 		_query_sg := global.form_main_table_filters('store_groups', $2);
 		SELECT count(*) INTO _main_filter_cnt from jsonb_each_text($3);
 		SELECT count(*) INTO _attr_filter_cnt from jsonb_each_text($4);
 		SELECT count(*) INTO _main_product_filter_cnt from jsonb_each_text($5);
 		SELECT count(*) INTO _attr_product_filter_cnt from jsonb_each_text($6);
 		raise notice '%,%', _main_filter_cnt, _attr_filter_cnt;
 		_query_table_filters := global.form_table_query($7);
 		if _main_product_filter_cnt=0 and _attr_product_filter_cnt!=0 then
 			if _psa_flag = true then
 				_query_psa := global.form_attribute_table_filters_v2('product_store_attributes', 'store_code', $6);
 				raise notice '_query_psa %',_query_psa;
 			else
 				_query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $6);
 				raise notice '_query_pa%',_query_pa;
 			end if;
 			if _psa_flag = true then
 		    	_product_filter_con := 'select distinct x.store_code store_code, x.psa_code psa_code from ('||_query_psa||') x';
 		    else
	 			_product_filter_con:= 'select y.store_code store_code from (('||_query_pa||') x
		 			join (select product_code, store_code from global.product_Store_mapping ' ||_validaity_where_clause || ' ) y
		 			 on x.product_code =y.product_code)';
	 		end if;
 			raise notice '_product_filter_con%',_product_filter_con;
 		elseif _main_product_filter_cnt!=0 and _attr_product_filter_cnt=0 then
 			_query_pm := global.form_main_table_filters('product_master', $5);
 			_product_filter_con:= 'select y.store_code store_code from ((select product_code from global.product_master'||_query_pm||') x
 			join (select product_code, store_code from global.product_Store_mapping ' ||_validaity_where_clause || '  ) y
 			 on x.product_code =y.product_code)';
 			raise notice '_query_pm%',_query_pm;
 		elseif _main_product_filter_cnt!=0 and _attr_product_filter_cnt!=0 then
 			_query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $6);
 			_query_pm := global.form_main_table_filters('product_master', $5);
 			_product_filter_con:= 'select y.store_code store_code from ((select product_code from global.product_master'||_query_pm||') x
 			join ('||_query_pa||') z   on x.product_code =z.product_code
 			join (select product_code, store_code from global.product_Store_mapping ' ||_validaity_where_clause || '  ) y
 			 on x.product_code =y.product_code)';
 		end if;
 	 	if 	(_main_filter_cnt = 0 and _attr_filter_cnt != 0) or _psa_flag = true then
 	 		_query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $4);
 	 		if length(_product_filter_con)>1  then
	  	 		if _psa_flag = true then
	  	 			_filter_con := 'JOIN (SELECT sgm.sg_code FROM (' || _query_sa || ') x  JOIN ('||_product_filter_con|| ') y
						  			on x.store_code = y.store_code
						  		  	 JOIN "global".aggregated_store_groups_mapping sgm
						  	 		ON y.psa_code = sgm.psa_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
				else
		  	 		_filter_con := ' JOIN (SELECT sgm.sg_code FROM (' || _query_sa || ') x  JOIN ('||_product_filter_con|| ') y
					 				on x.store_code =y.store_code
					 			  	 JOIN "global".store_groups_mapping sgm
					 		 		ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
		  	 	end if; 	 		
 	 		elseif  length(_product_filter_con)=0 then
 	 			_filter_con := ' JOIN (SELECT sgm.sg_code FROM (' || _query_sa || ') x JOIN "global".store_groups_mapping sgm ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
 	 	    end if ;
 	 	elseif 	_main_filter_cnt != 0 and _attr_filter_cnt = 0 then
 	 		_query_sm := 'SELECT * FROM global.store_master' || (global.form_main_table_filters('store_master', $3));
 	 		if length(_product_filter_con)>1  then
 	 		_filter_con := ' JOIN (SELECT sgm.sg_code FROM (' || _query_sa || ') x  JOIN ('||_product_filter_con|| ') y
 				on x.store_code =y.store_code
 			  	 JOIN "global".store_groups_mapping sgm
 		 		ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
 	 		elseif  length(_product_filter_con)=0 then
 	 			_filter_con := ' JOIN (SELECT sgm.sg_code FROM (' || _query_sm || ') x JOIN "global".store_groups_mapping sgm ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
 	 		end if;
 	 	elseif 	_main_filter_cnt != 0 and _attr_filter_cnt != 0 then
 	 		_query_sm := 'SELECT * FROM global.store_master' || (global.form_main_table_filters('store_master', $3));
 	 		_query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $4);
 	 		if length(_product_filter_con)>1  then
 	 			_filter_con := ' JOIN (SELECT sgm.sg_code FROM (' || _query_sa || ') x  JOIN ('||_product_filter_con|| ') y
 				on x.store_code =y.store_code
 			  	 JOIN "global".store_groups_mapping sgm
 		 		ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
 	 		elseif  length(_product_filter_con)=0 then
 	 			_filter_con := ' JOIN (SELECT sgm.sg_code FROM (' || _query_sm || ') x JOIN (' || _query_sa || ') y on x.store_code = y.store_code join "global".store_groups_mapping sgm ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
 	 		end if;
 		 end if;
  		_query_combine := global.build_store_group_groups_list_final_query($8, _query_sg, _filter_con, _query_table_filters, _psa_flag);

 		raise notice '%',_query_combine;
 		open $1 for execute _query_combine;
 		return _query_combine;
 	end $function$
;
