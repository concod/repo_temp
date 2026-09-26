--liquibase formatted sql
--changeset nuttu.hariprasad@impactanalytics.co :store_product_groups_list_store_group_filter runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start : ticket-id : MTP-121568.
--comment: initial changeset for store_product_groups_list : store group name level filter added column added : ticket-id : MTP-121568.
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.store_product_groups_list(input jsonb, jsonb, jsonb, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.store_product_groups_list(input jsonb, jsonb, jsonb, jsonb, jsonb, jsonb)
 RETURNS TABLE(
    sg_code integer,
    name character varying,
    special_classification character varying,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    created_by character varying,
    updated_by character varying,
    store_count bigint,
    sg_count bigint,
    channel character varying,
    is_default boolean,
    is_uploaded character varying
)
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
  * Gautam           11-Sep-2023    Removed left joins on filter query to return rows matching passed store codes
  * Hariprasad       27-Mar-2025    removed unnecessary joins and repeated tables moved to CTE.
  * Rahul            19-Jun-2025    Add WHS only retail_region logic via saf join predicate
  * Hariprasad       29-Oct-2025    added is_default column : ticket-id : MTP-113012.
  */
declare
    _query_sm text := '';
    _query_sa text := '';
    _query_pm text := '';
    _query_pa text := '';
    _query_sa_where_clause text := '';
    _query_table_filters text := '';
    _query_combine text := '';
    _main_filter_cnt int := 0;
    _attr_filter_cnt int := 0;
    _main_product_filter_cnt int := 0;
    _attr_product_filter_cnt int := 0;
    _filter_con text := ' ';
    _product_filter_con text := '';
    _query_sg text;
    _validaity_where_clause text := 'where validity is not null ';
    _empty_store_groups text := '';
    _whs_ret_pred text := '';
    _store_group_filter jsonb := NULL;
    _store_group_values text;
begin
    -- add defaults
    $1 := $1 || ('{"is_deleted":[{"type":"custom","operator":"=","values":false}]}'::jsonb);
    $2 := $2 || ('{"active":[{"type":"custom","operator":"=","values":true}]}'::jsonb);

    -- extract store_group from any filter parameter (order-independent check)
    -- Check all parameters that might contain store_group filter: $2, $3, $4, $5
    IF $3 ? 'store_group' THEN
        _store_group_filter := $3->'store_group';
    ELSIF $4 ? 'store_group' THEN
        _store_group_filter := $4->'store_group';
    ELSIF $5 ? 'store_group' THEN
        _store_group_filter := $5->'store_group';
    ELSIF $2 ? 'store_group' THEN
        _store_group_filter := $2->'store_group';
    END IF;
    
    -- If store_group was found, add it as name filter to $1 for store_groups filtering
    IF _store_group_filter IS NOT NULL THEN
        $1 := $1 || jsonb_build_object('name', _store_group_filter);
        -- Ensure store_group is in $3 so it also filters stores via store_groups_mapping
        IF NOT ($3 ? 'store_group') THEN
            $3 := $3 || jsonb_build_object('store_group', _store_group_filter);
        END IF;
    END IF;

    -- base filter counts
    _query_sg := global.form_main_table_filters('store_groups', $1);
    
    -- If store_group was extracted and name filter wasn't added by form_main_table_filters, add it manually
    IF _store_group_filter IS NOT NULL AND (COALESCE(_query_sg, '') !~* '\Wname\W' AND COALESCE(_query_sg, '') !~* '\Wsg\.name\W') THEN
        _store_group_values := NULL;
        SELECT concat(array_agg(value)) INTO _store_group_values 
        FROM json_array_elements_text(((json_extract_path(_store_group_filter, '0')::json)->>'values')::json);
        
        IF _store_group_values IS NOT NULL AND _store_group_values != '' THEN
            IF COALESCE(_query_sg, '') LIKE ' WHERE%' THEN
                _query_sg := _query_sg || ' AND name = any(''' || _store_group_values || '''::varchar[])';
            ELSE
                _query_sg := ' WHERE name = any(''' || _store_group_values || '''::varchar[])';
            END IF;
        END IF;
    END IF;
    SELECT count(*) INTO _main_filter_cnt     FROM jsonb_each_text($2);
    SELECT count(*) INTO _attr_filter_cnt     FROM jsonb_each_text($3);
    SELECT count(*) INTO _main_product_filter_cnt FROM jsonb_each_text($4);
    SELECT count(*) INTO _attr_product_filter_cnt FROM jsonb_each_text($5);
    _query_table_filters := global.form_table_query($6);

    -- product filters unchanged
    IF _main_product_filter_cnt = 0 AND _attr_product_filter_cnt != 0 THEN
        _query_pa := global.form_attribute_table_filters_v2('product_attributes','product_code',$5);
        _query_pm := '';
    ELSIF _main_product_filter_cnt != 0 AND _attr_product_filter_cnt = 0 THEN
        _query_pm := global.form_main_table_filters('product_master',$4);
        _query_pa := '';
    ELSIF _main_product_filter_cnt != 0 AND _attr_product_filter_cnt != 0 THEN
        _query_pm := global.form_main_table_filters('product_master',$4);
        _query_pa := global.form_attribute_table_filters_v2('product_attributes','product_code',$5);
    ELSE
        _query_pm := '';
        _query_pa := '';
    END IF;

    -- prepare a pure attribute‑predicate for non‑WHS using EXISTS
    IF _attr_filter_cnt > 0 THEN
        -- get raw WHERE-clause from the helper
        _query_sa := global.form_attribute_table_filters_v2('store_attributes','store_code',$3);
        -- strip everything up to and including WHERE
        _query_sa := regexp_replace(_query_sa,
                                    '^\s*SELECT\s+.*?\s+WHERE\s*','',
                                    'i');
        -- wrap in EXISTS against the saf row already joined
        _query_sa := 'EXISTS (SELECT 1
                              FROM "global".store_attributes_filter saf2
                             WHERE saf2.store_code = saf.store_code
                               AND ' || _query_sa || ')';
    ELSE
        _query_sa := 'TRUE';
    END IF;

    -- prepare wholesale-region predicate for WHS using EXISTS
    IF $3 ? 'retail_region' THEN
        -- get raw WHERE-clause for retail_region only
        _whs_ret_pred := global.form_attribute_table_filters_v2(
                            'store_attributes','store_code',
                            jsonb_build_object('retail_region',$3->'retail_region')
                         );
        -- strip everything up to and including WHERE
        _whs_ret_pred := regexp_replace(_whs_ret_pred,
                                        '^\s*SELECT\s+.*?\s+WHERE\s*','',
                                        'i');
        -- wrap in EXISTS
        _whs_ret_pred := 'EXISTS (SELECT 1
                                     FROM "global".store_attributes_filter saf2
                                    WHERE saf2.store_code = saf.store_code
                                      AND ' || _whs_ret_pred || ')';
    ELSE
        _whs_ret_pred := 'TRUE';
    END IF;

    -- build and execute
    _query_combine :=
      'WITH store_groups_base AS (
           SELECT
             sg.sg_code, sg.name, sg.special_classification,
             sg.created_at, sg.updated_at, sg.created_by,
             sg.updated_by, sg.channel,
             sg.is_default,
             sg.extra->>'|| ''''|| 'is_uploaded'||''''||' as is_uploaded
           FROM "global".store_groups sg ' || _query_sg || '
       ),
       store_metrics AS MATERIALIZED (
           SELECT
             sgm.sg_code,
             COUNT(DISTINCT sgm.store_code)  AS store_count,
             COUNT(DISTINCT sgm.ref_sg_code) AS sg_count
           FROM "global".store_groups_mapping sgm
           JOIN "global".store_master sm
             ON sm.store_code = sgm.store_code
           JOIN "global".store_attributes_filter saf
             ON saf.store_code = sm.store_code
             AND (
               (saf.special_classification = ''WHS'' AND ' || _whs_ret_pred || ')
               OR
               (saf.special_classification <> ''WHS'' AND ' || _query_sa || ')
             )
           WHERE sm.active = true
           GROUP BY sgm.sg_code
           HAVING COUNT(DISTINCT sgm.store_code) > 0
       ),
       user_names AS MATERIALIZED (
           SELECT user_code, name AS user_name
           FROM "global".user_master
           WHERE is_deleted = false
             AND user_code IN (
               SELECT created_by FROM store_groups_base
               UNION
               SELECT updated_by FROM store_groups_base
           )
       )
       SELECT
         sg.sg_code, sg.name, sg.special_classification,
         sg.created_at, sg.updated_at,
         cu.user_name AS created_by, uu.user_name AS updated_by,
         COALESCE(sm.store_count,0) AS store_count,
         COALESCE(sm.sg_count,0)    AS sg_count,
         sg.channel,
         sg.is_default,
         (case 
            when sg.is_uploaded is not null then sg.is_uploaded
            else ' || '''' || 'FALSE' || '''' ||'
         end)::varchar as is_uploaded
       FROM store_groups_base sg
       JOIN store_metrics sm
         ON sg.sg_code = sm.sg_code
       LEFT JOIN user_names cu
         ON sg.created_by = cu.user_code
       LEFT JOIN user_names uu
         ON sg.updated_by = uu.user_code
       ' || _query_table_filters || ';';

    RAISE NOTICE 'Final SP SQL: %', _query_combine;
    RETURN QUERY EXECUTE _query_combine;
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

--changeset nuttu.hariprasadr@impactanalytics.co:is_default column added runOnChange:true stripComments:false splitStatements:false context:MTP-42413 labels:ticket-id : MTP-113012.
--comment: changeset for store_product_groups_list function is_default column added  : ticket-id : MTP-113012.
DROP FUNCTION IF EXISTS global.store_product_groups_list(input jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, boolean);
CREATE OR REPLACE FUNCTION global.store_product_groups_list(input jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, boolean)
 RETURNS TABLE(sg_code integer, name character varying, special_classification character varying, created_at timestamp with time zone, updated_at timestamp with time zone, created_by character varying, updated_by character varying, store_count bigint, sg_count bigint, channel character varying, is_default boolean, is_uploaded character varying)
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
  * Gautam           11-Sep-2023    Removed left joins on filter query to return rows matching passed store codes
  * Hariprasad       27-Mar-2025    removed unnecessary joins and repeated tables moved to CTE.
  * Hariprasad       29-Oct-2025    added is_default column : ticket-id : MTP-113012.
  */
 declare
 	_query_sm text := '';
 	_query_sa text := '';
 	_query_pm text := '';
 	_query_pa text := '';
	_query_sa_where_clause text := '';
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
  	 		raise notice 'main %',_query_sa; 
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
			 _filter_con :=  ' JOIN (SELECT sgm.sg_code FROM (' || _query_sm || ') x JOIN (' || _query_sa || ') y on x.store_code = y.store_code join "global".store_groups_mapping sgm ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
  	 	   end if;
  		 end if;

		_query_sa_where_clause := global.form_attribute_table_where_clause('store_attributes', 'store_code', $3);
		IF COALESCE(LENGTH(TRIM(_query_sa_where_clause)), 0) > 0 THEN
		    _query_sa_where_clause :=  _query_sa_where_clause || ' and sm.active = true ' ;  
		ELSE
			_query_sa_where_clause := ' WHERE sm.active = true ';
		END if;
 		raise notice '_filter_con%',_filter_con;
		_query_combine := 'WITH store_groups_base AS (
						    SELECT
						        sg.sg_code,
						        sg.name,
						        sg.special_classification,
						        sg.created_at,
						        sg.updated_at,
						        sg.created_by,
						        sg.updated_by,
						        sg.channel,
								sg.is_default,
								sg.extra->>'|| ''''|| 'is_uploaded'||''''||' as is_uploaded
						    FROM "global".store_groups sg  '  || _query_sg || '
						),
						store_metrics AS materialized (
						    SELECT 
						        sgm.sg_code,
						        COUNT(DISTINCT sgm.store_code) AS store_count,
						        COUNT(DISTINCT sgm.ref_sg_code) AS sg_count
						    FROM "global".store_groups_mapping sgm
							  INNER JOIN "global".store_master sm ON sm.store_code = sgm.store_code
							  inner join "global".store_attributes_filter saf on saf.store_code = sm.store_code
						   ' || _query_sa_where_clause || '
						    GROUP BY sgm.sg_code
						    HAVING COUNT(DISTINCT sgm.store_code) > 0 
						),
						user_names AS materialized (
						    SELECT 
						        user_code,
						        name AS user_name
						    FROM "global".user_master 
						    WHERE is_deleted = false
						    AND user_code IN (
						        SELECT created_by FROM store_groups_base
						        UNION
						        SELECT updated_by FROM store_groups_base
						    )
						)
					select * from (	SELECT
						    sg.sg_code,
						    sg.name,
						    sg.special_classification,
						    sg.created_at,
						    sg.updated_at,
						    created_user.user_name AS created_by,
						    updated_user.user_name AS updated_by,
						    COALESCE(sm.store_count, 0) AS store_count,
						    COALESCE(sm.sg_count, 0) AS sg_count,
						    sg.channel,
							sg.is_default,
							(case 
												when sg.is_uploaded is not null then sg.is_uploaded
												else ' || '''' || 'FALSE' || '''' ||'
											end)::varchar is_uploaded
						FROM store_groups_base sg
						INNER JOIN store_metrics sm ON sg.sg_code = sm.sg_code
						LEFT JOIN user_names created_user 
						    ON sg.created_by = created_user.user_code 
						LEFT JOIN user_names updated_user 
						    ON sg.updated_by = updated_user.user_code ) as result ' || _query_table_filters;
		/*
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
		*/
 		raise notice '%',_query_combine;
 		return query execute _query_combine;
 	end 
$function$
;
