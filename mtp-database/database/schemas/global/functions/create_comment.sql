--liquibase formatted sql
--changeset abhishek.jha@impactanalytics.co:create_comment runOnChange:true stripComments:false splitStatements:false context:MTP-121587 labels:liquibase_project_start
--comment: initial changeset for create_comment | MTP-121587
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.create_comment(input_comment jsonb);
CREATE OR REPLACE FUNCTION global.create_comment(input_comment jsonb)
 RETURNS TABLE(comment_id integer, event_id integer, created_at text, parent_comment_data jsonb)
 LANGUAGE plpgsql
AS $function$
/*
  * Function/Procedure name: global.create_comment
  * Created by: Abhishek Jha
  * Created at: 5-Dec-2024
  * No of input parameter: 1
  * Parameter Description : $1 = input json
  *							
  * SELECT "global".create_comment(
  *    '{"comment": "html_body", "application_code": 3, "screen_code": 3, "event_name": "Event Name_1", "event_id": null, "parent_comment_id": null, "users_mentioned": null, "created_by": 155, "component": "row", "cell_name": null, "component_ids": ["8cb30e9205d1305ec65404266f84b2f253dfa62f46f8fc3f20389ab888dc004c", "65b2d939c32384f3470c455abadc35a9ea2ffd89b5c7ad7a6a197b2a7b44c557"]}'
  *    );
  *
  * if any modification done in same function/procedure please record the changes in below format
  *
  * Updated_by       Updated_on      Purpose
  * ----------       -----------     --------
  * Shreyas Sankpal	 05-Mar-2025   Added request meetdata to insert query for notes_event_metadata
  * Srishti Kumari	 12-Jan-2026   Bugfix to add user only if they aren't part of the event
  */
DECLARE
    new_event_id INT;
	generated_note_code INT;
    new_note_code UUID;
    _created_by INT;
	event_name TEXT;
    component_type TEXT;
    search_context JSONB;
	components_list JSONB;
	component_id TEXT;
	result_note_codes TEXT[] := '{}'; -- To collect generated note codes
	insert_notes_master_query TEXT;
    insert_event_metadata_query TEXT;
    insert_component_event_mapping_query TEXT;
	retrieve_parent_comment_data TEXT;
	parent_comment_data JSONB;
	created_at text;
	hashed_component_id text;
	request_metadata jsonb;
	request_url text;
	request_method text;
	request_headers jsonb;
	request_payload jsonb;
	redirect_url text;
	_users_mentioned jsonb;
BEGIN
    -- Extract `created_by` from the first input
    _created_by :=  (input_comment->>'created_by')::INT;

	-- Create a new event in `notes_event_metadata` if event_id is null
    IF input_comment->>'event_id' IS NULL THEN

		event_name = COALESCE(input_comment->>'event_name', 'Event_' || nextval('"global".notes_event_metadata_event_id_seq'));
		
		-- request metadata
		request_metadata := coalesce(input_comment -> 'request_metadata', '{}'::jsonb);
		request_url := jsonb_extract_path_text(request_metadata, 'request_url');
		request_method := jsonb_extract_path_text(request_metadata, 'request_method');
		request_headers := jsonb_extract_path_text(request_metadata, 'request_headers');
		request_payload := jsonb_extract_path_text(request_metadata, 'request_body');
		redirect_url := jsonb_extract_path_text(input_comment, 'redirect_url');

		insert_event_metadata_query = '
	        INSERT INTO "global".notes_event_metadata (
	            event_name, is_resolved, created_by, is_deleted, created_at, updated_at, request_url, request_method, request_headers, request_payload, redirect_url
	        )
	        VALUES (
	            ''' || event_name || ''',  
	            FALSE, -- is_resolved
	            '|| _created_by ||',
	            FALSE, -- is_deleted
				NOW(),
				NOW(),
				' || CASE WHEN request_url IS NULL THEN 'NULL' ELSE '''' || request_url || '''' END || ',
				' || CASE WHEN request_method IS NULL THEN 'NULL' ELSE '''' || request_method || '''' END || ',				
				' || CASE WHEN request_headers IS NULL THEN 'NULL' ELSE '''' || request_headers::text || '''' END ||',
				' || CASE WHEN request_payload IS NULL THEN 'NULL' ELSE '''' || request_payload::text || '''' END ||',
				' || CASE WHEN redirect_url IS NULL THEN 'NULL' ELSE '''' || redirect_url || '''' END || '
	        )
	        RETURNING event_id;
		';
		RAISE NOTICE 'Executing event metadata query: %', insert_event_metadata_query;
		EXECUTE insert_event_metadata_query INTO new_event_id;
		RAISE NOTICE 'new_event_id: %', new_event_id;
    ELSE
        new_event_id := input_comment->>'event_id';
		RAISE NOTICE 'existing_event_id: %', new_event_id;
    END IF;

	--result_note_codes := array_append(result_note_codes, new_event_id::text);

    -- Determine the `component` and `search_context`
    component_type := COALESCE(input_comment->>'component', 'screen');
    IF input_comment->>'sub_component_id' IS NOT NULL THEN
        search_context := jsonb_build_object('sub_component_id', input_comment->>'sub_component_id');
    ELSE
        search_context := '{}'::jsonb;
    END IF;
	RAISE NOTICE 'search_context: %', search_context::text;
	
    -- Insert the note into `notes_master`
	RAISE NOTICE 'parent_comment_id: %', COALESCE(input_comment->>'parent_comment_id', 'NULL');

	-- input_commpent ->> 'components' looks like [(12, 'row_1'), (13, 'row_2'), (14, 'row_3')]
	IF input_comment->>'components' IS NOT NULL THEN
		components_list := (input_comment->>'components')::JSONB;
		RAISE NOTICE '(hashed_component_id, component_id): %', components_list;
		FOR hashed_component_id, component_id IN 
   			 SELECT (c->>0)::TEXT AS hashed_component_id, (c->>1)::TEXT AS component_id
    			FROM jsonb_array_elements(components_list) AS c
			LOOP
			RAISE NOTICE 'For hashed_component_id: %', hashed_component_id;
			RAISE NOTICE 'For component_id: %', component_id;
			insert_component_event_mapping_query = '
		    INSERT INTO "global".notes_component_event_mapping (
		        hashed_component_id, sub_component, event_id, component_type, component_id, component_name
		    	)
			    VALUES (
			        ''' || hashed_component_id || ''',
					''' || COALESCE(search_context::text)|| ''',
			        '|| new_event_id ||',
					''' || (input_comment->>'component_type') || ''',
					''' || component_id || ''',
					''' || COALESCE(input_comment->>'unique_column', 'NULL') || '''
			    ) ON CONFLICT (hashed_component_id, sub_component, event_id) DO NOTHING;
			';
			RAISE NOTICE 'Executing component event mapping query: %', insert_component_event_mapping_query;
			EXECUTE insert_component_event_mapping_query;
		END LOOP;
	END IF;
	
	-- inserting the users mentioned in comment to notes_event_user_mapping to be fetched for that event
	_users_mentioned := input_comment->'users_mentioned';
	IF _users_mentioned IS NOT NULL AND jsonb_typeof(_users_mentioned) = 'array' THEN
	    INSERT INTO global.notes_event_user_mapping (event_id, member_id)
	    SELECT new_event_id, x.user_code
	    FROM jsonb_to_recordset(_users_mentioned) AS x(user_code bigint)
	    WHERE x.user_code IS NOT NULL
	    ON CONFLICT ON CONSTRAINT notes_event_user_mapping_pkey DO NOTHING;

		-- Insert into notes_event_member_history only if user was never added or last action was 'removed'
		WITH last_action_type AS (
			SELECT DISTINCT ON (x.user_code)
				x.user_code,
				h.action_type as last_action
			FROM jsonb_to_recordset(_users_mentioned) AS x(user_code bigint)
			LEFT JOIN global.notes_event_member_history h 
				ON h.event_id = new_event_id AND h.member_id = x.user_code
			WHERE x.user_code IS NOT NULL
			ORDER BY x.user_code, h.created_at DESC NULLS LAST
		),
		users_to_add AS (
			SELECT user_code
			FROM last_action_type
			WHERE last_action IS NULL OR last_action = 'removed'
		)
		INSERT INTO global.notes_event_member_history(event_id, member_id, action_type, created_at)
		SELECT new_event_id, user_code, 'added', now()
		FROM users_to_add;
		
	END IF;

	

	insert_notes_master_query = '
    INSERT INTO "global".notes_master (
        application_code, screen_code, search_context,
        created_by, created_at, is_deleted, parent_code,
        html_msg, updated_at, updated_by, users_mentioned,
        component, event_id
    	)
	    VALUES (
	        '|| (input_comment->>'application_code')::INT ||',
	        '|| (input_comment->>'screen_code')::INT ||',
	        ''' || '{}'::jsonb || ''',
	        ' || _created_by || ',	
	        NOW(),
	        FALSE, -- is_deleted
	        '|| COALESCE(input_comment->>'parent_comment_id', 'NULL') ||',
	        ''' || (input_comment->>'comment') || ''',
	        NOW(),
	        '|| _created_by ||', -- updated_by
			'''|| CASE 
		       WHEN input_comment->>'users_mentioned' IS NOT NULL THEN (input_comment->>'users_mentioned')::jsonb
		       ELSE NULL
		     END ||''',
	        ''' || component_type || ''',
	        '|| new_event_id ||'
	    )
		RETURNING note_code, created_at;  -- Capture the generated note_code
	';
	RAISE NOTICE 'Executing notes master query: %', insert_notes_master_query;
	EXECUTE insert_notes_master_query INTO generated_note_code, created_at;

	-- result_note_codes := array_append(result_note_codes, generated_note_code::text);

	IF input_comment->>'parent_comment_id' IS NOT NULL THEN
		retrieve_parent_comment_data = format(
			$$
			select json_build_object('comment_id', nm.note_code, 'comment', nm.html_msg, 
			'created_by', json_build_object('user_name', um.name, 'email', um.email), 
			'created_at', nm.created_at, 'users_mentioned', nm.users_mentioned) from global.notes_master nm left join
			global.user_master um on nm.created_by = um.user_code
			where note_code = %L
			$$, 
			COALESCE(input_comment->>'parent_comment_id', 'NULL')
		);
		RAISE NOTICE 'Retrieve parent comment data query: %', retrieve_parent_comment_data;
		EXECUTE retrieve_parent_comment_data INTO parent_comment_data;
	ELSE
		retrieve_parent_comment_data = NULL;
	END IF;
	-- result_note_codes := array_append(result_note_codes, parent_comment_data::text);


    -- Return the new event_id or -1 if event_id is not applicable
    RETURN QUERY
    SELECT new_event_id, generated_note_code, created_at, parent_comment_data;
END;
$function$
;
