--liquibase formatted sql
--changeset abhishek.jha@impactanalytics.co:create_new_event runOnChange:true stripComments:false splitStatements:false context:MTP-107267 labels:liquibase_project_start
--comment: initial changeset for create_new_event
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.create_new_event(input_comment jsonb);
CREATE OR REPLACE FUNCTION global.create_new_event(input_comment jsonb)
 RETURNS text[]
 LANGUAGE plpgsql
AS $function$
	DECLARE
	event_name TEXT;
	new_event_id INTEGER;
	insert_event_metadata_query TEXT;
	_created_by INTEGER;
	event_created_at TIMESTAMP;
	insert_component_event_mapping_query TEXT;
	search_context JSONB;
	components_list JSONB;
	component_id TEXT;
	fetch_user_info TEXT;
    user_code INT;
    user_name TEXT;
    user_email TEXT;
	user_json JSON;
	hashed_component_id text;
	BEGIN
	
	_created_by :=  (input_comment->>'created_by')::INT;
	
	-- Either use event_name from input param, or create a default event name as Event_{event_id}
	event_name = COALESCE(input_comment->>'event_name', 'Event_' || nextval('global.notes_event_metadata_event_id_seq'));
	RAISE NOTICE 'event_name: %', event_name;		

	insert_event_metadata_query = '
        INSERT INTO "global".notes_event_metadata (
            event_name, is_resolved, created_by, is_deleted, created_at, updated_at
        )
        VALUES (
            ''' || event_name || ''',
            FALSE, -- is_resolved
            '|| _created_by ||',
            FALSE, -- is_deleted
			NOW(),
			NOW()
        )
        RETURNING event_id, created_at;
	';

	RAISE NOTICE 'Executing event metadata query: %', insert_event_metadata_query;
	EXECUTE insert_event_metadata_query INTO new_event_id, event_created_at;
	RAISE NOTICE 'new_event_id: %, event_created_at: %', new_event_id, event_created_at;

	--insert
	INSERT INTO global.notes_event_user_mapping(event_id, member_id)
	VALUES (new_event_id, _created_by)
	ON CONFLICT (event_id, member_id) DO NOTHING;

	-- inserting data into notes_component_event_mapping 
		-- for each rows at the time of creating an event.
	-- Determine the `component` and `search_context`
    IF input_comment->>'sub_component_id' IS NOT NULL THEN
        search_context := jsonb_build_object('sub_component_id', input_comment->>'sub_component_id');
    ELSE
        search_context := '{}'::jsonb;
    END IF;
	RAISE NOTICE 'search_context: %', search_context::text;
	
    -- Insert the note into `notes_master`
	RAISE NOTICE 'parent_comment_id: %', COALESCE(input_comment->>'parent_comment_id', 'NULL');

	components_list := (input_comment->>'components')::JSONB;
	RAISE NOTICE '(hashed_component_id, component_id): %', components_list;
	FOR hashed_component_id, component_id IN 
		SELECT (c->>0)::TEXT as hashed_component_id, (c->>1)::TEXT as component_id from
			jsonb_array_elements(components_list) as c LOOP
		RAISE NOTICE 'For component_id: %', component_id;
		insert_component_event_mapping_query = '
	    INSERT INTO "global".notes_component_event_mapping (
	        hashed_component_id, sub_component, event_id, component_type, component_id
	    	)
		    VALUES (
		        ''' || hashed_component_id || ''',
				''' || COALESCE(search_context::text)|| ''',
		        '|| new_event_id ||',
				''' || (input_comment->>'component_type') || ''',
				''' || component_id || '''
		    ) ON CONFLICT (hashed_component_id, sub_component, event_id) DO NOTHING;
		';
		RAISE NOTICE 'Executing component event mapping query: %', insert_component_event_mapping_query;
		EXECUTE insert_component_event_mapping_query;
	END LOOP;

	-- getting out user info from user_master as required by FE
	fetch_user_info = 'select user_code, name, email from "global".user_master
		where user_code = '||_created_by||';';
	RAISE NOTICE 'Fetching user details" %', fetch_user_info;
	EXECUTE fetch_user_info INTO user_code, user_name, user_email;
	
	-- Create JSON object from variables
    user_json := json_build_object(
        'user_code', user_code,
        'user_name', user_name,
        'email', user_email
    );
	RAISE NOTICE 'User JSON: %', user_json;
   	
	RETURN Array[new_event_id::text, event_name, event_created_at::text, user_json::text];
	
	END;
$function$
;
