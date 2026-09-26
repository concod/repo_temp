--liquibase formatted sql
--changeset shreyas.sankpal@impactanalytics.co:fetch_filtered_tickets_download_MTP-50278 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-50278
--comment: added support for meta search/sort filtering and fixed datetime formatting issues
--rollback: SELECT 1
DROP FUNCTION IF EXISTS "global".fetch_filtered_tickets_download(refcursor, _text, bool, jsonb);
DROP FUNCTION IF EXISTS "global".fetch_filtered_tickets_download(refcursor, _text, bool, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.fetch_filtered_tickets_download(input refcursor, text[], boolean, jsonb, jsonb DEFAULT '{}'::jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
  * Function/Procedure name: global.fetch_filtered_tickets_download
  * Created by: Shreyas Sankpal
  * Created at: 24-Jun-2024
  * No of input parameter: 5
  * Parameter Description : $1 = Input Refcursor 
  *                         $2 = List of columns (for select clause)
  * 						$3 = is_download_request (boolean)
  * 						$4 = filters (for where clause)
  *							$5 = [Optional] meta object for search/sort filtering
  * 							 [Default] '{}'
  * 			
  * Purpose: The SP takes a cursor, columns list, is_download_request flag and filters dictionary,
  * 		as an input and builds select clause using columns,
  * 		where clause using filters and generates the query to fetch filtered tickets,
  * 		then executes the query using that cursor and returns the cursor.
  * Calling Statement: 
  * SELECT * FROM global.fetch_filtered_tickets_download
  * 	(cur, 
  * 	'['banner_banner_channel', 'closed_on', 'created_on', 
  * 	'issue_type', 'module_type', 'priority', 'status', 'id', 
  * 	'title', 'updated_on', 'user_id', 'user_name'],
  * 	True,
  * 	{
  * 		"id": null, 
  * 		"user_id": [251], 
  * 		"ticket_form_id": null, 
  * 		"asset_tag": null, 
  * 		"banner_banner_channel": null, 
  * 		"issue_type": null, 
  * 		"module_type": ["InventorySmart"], 
  * 		"non_issue": null, 
  * 		"ticket_type_id": null, 
  * 		"priority": ["urgent"], 
  * 		"status": null, 
  * 		"exclude_non_issue": false, 
  * 		"created_on": 
  * 			{
  * 				"start_date": "2024-05-07 00:00:00.000", 
  * 				"end_date": "2024-06-07 23:59:59.000"
  * 			}, 
  * 		"updated_on": null
  * 	});
  *
  * if any modification is done in same function/procedure please record the changes in below format
  *
  * Updated_by       	Updated_on      Purpose
  * ----------       	-----------     --------
  * Shreyas Sankpal		24-Jul-2024		Added support for meta search/sort filtering and fixes for datetime formatting
  *
  */
	DECLARE 
	column_name TEXT;
    _user_name_select_string TEXT;
    _user_id_select_string TEXT;
   	_select_clause_elements TEXT[];
    _column_name_select_string TEXT;
	_ticketing_select_clause TEXT;
	_where_clause TEXT;
	_where_clause_elements TEXT[];
	_query_table_filters TEXT;
	filter_key TEXT;
  	filter_value TEXT;
  	non_issue_types TEXT[] := ARRAY['Change Request', 'Query', 'No Issue']::TEXT[];
 	filter_value_array TEXT[];
 	filter_value_jsonb JSONB;
	_ticketing_where_clause TEXT;
	_ticket_user_join_query TEXT;
	_ticketing_filter_query TEXT;
	BEGIN
	-- BUILD SELECT CLAUSE
	FOREACH column_name IN ARRAY $2 loop
        IF column_name = 'user_name' THEN
            _user_name_select_string := 
                'coalesce(um.' || quote_ident(column_name) || ', ''IA_USER'') as ' || quote_ident(column_name);
            _select_clause_elements := array_append(_select_clause_elements, _user_name_select_string);
           	CONTINUE;
        END IF;
        
        IF column_name = 'user_id' THEN
            _user_id_select_string := 
                'coalesce(t.' || quote_ident(column_name) || ', 0) as ' || quote_ident(column_name);
            _select_clause_elements := array_append(_select_clause_elements, _user_id_select_string);
           	CONTINUE;
        END IF;

		-- if download request and column is title or description
		-- then wrap in double quotes to avoid breaking the CSV in case commas exist in text
       	IF $3 AND column_name IN ('title', 'description') THEN
       		_column_name_select_string := 
            	'concat(''"'', t.' || quote_ident(column_name) || ', ''"'') as ' || quote_ident(column_name);
        ELSE
            _column_name_select_string := 
                't.' || quote_ident(column_name) || ' as ' || quote_ident(column_name);
        END IF;
        _select_clause_elements := array_append(_select_clause_elements, _column_name_select_string);
    END LOOP;

    _ticketing_select_clause = 'select ' || array_to_string(_select_clause_elements, ',');
   	RAISE NOTICE '_ticketing_select_clause: %', _ticketing_select_clause;
  	
	--BUILD WHERE CLAUSE
   	_where_clause := 'where ';
   
   	FOR filter_key, filter_value IN SELECT * FROM jsonb_each($4) LOOP
        -- Handle filters based on their keys
	   	IF filter_value <> 'null' THEN
	        IF filter_key = 'exclude_non_issue' THEN
	        	IF filter_value::boolean <> FALSE THEN 
	            	_where_clause_elements := array_append(_where_clause_elements, format('(t.issue_type NOT IN (%s))', concat('''', array_to_string(non_issue_types, ''','''), '''')));
	        	END IF;
	        ELSIF filter_key NOT IN ('rated_on', 'created_on', 'updated_on', 'status_changed_on', 'solved_on', 'assigned_on',
	                                  'first_assigned_on', 'due_on', 'closed_on', 'deleted_at', 'scheduled_on') then
				-- filter value is an array
				filter_value_array := translate($4 ->> filter_key, '[]', '{}')::text[];
	            _where_clause_elements := array_append(_where_clause_elements, format('(t.%I IN (%s))', filter_key, concat('''', array_to_string(filter_value_array, ''','''), '''')));
	        ELSE
	        	-- filter value is a dictionary
	        	filter_value_jsonb := filter_value::jsonb;
	            _where_clause_elements := array_append(_where_clause_elements, format('(t.%I BETWEEN %L AND %L)',
	                                                                                        filter_key,
	                                                                                        (filter_value_jsonb->>'start_date') || ' +0000',
	                                                                                        (filter_value_jsonb->>'end_date') || ' +0000'));
	        END IF;
	  	END IF;
    END LOOP;
   
    -- Construct the final WHERE clause
    IF array_length(_where_clause_elements, 1) > 0 THEN
        _where_clause := _where_clause || array_to_string(_where_clause_elements, ' AND ');
    ELSE
        _where_clause := '';
    END IF;
   	
   	_ticketing_where_clause := _where_clause;
  	RAISE NOTICE '_ticketing_where_clause" %', _ticketing_where_clause;

	-- Meta search/sort filtering where clause
	_query_table_filters := global.form_table_query($5);
  
  	-- BUILD FETCH FILTERED TICKETS QUERY
  	_ticket_user_join_query := ' from global.ticket_attributes_filter t left join global.user_master um on t.user_id = um.user_code ';
   	_ticketing_filter_query := 'select * from (' || _ticketing_select_clause || _ticket_user_join_query || _ticketing_where_clause || ') X ' || _query_table_filters || ';';
   
   	-- EXECUTE QUERY
   	RAISE NOTICE '_ticketing_filter_query: %', _ticketing_filter_query;
	OPEN $1 FOR EXECUTE _ticketing_filter_query;
	RETURN $1;
	END;
$function$
;