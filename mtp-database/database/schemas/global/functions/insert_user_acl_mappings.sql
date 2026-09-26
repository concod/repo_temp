--liquibase formatted sql
--changeset liquibase:insert_user_acl_mappings runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for insert_user_acl_mappings
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.insert_user_acl_mappings(payload json);
CREATE OR REPLACE FUNCTION global.insert_user_acl_mappings(payload json)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
	DECLARE
    entry json;
    user_email text;
    app_name text;
    role_name text;

    _role_code int;
    _app_code int;
    _acl_code int;
    _user_code int;

    skipped jsonb := '[]'::jsonb;
    inserted jsonb := '[]'::jsonb;
    valid_roles text[];

    role_not_found boolean := false;
BEGIN
    -- Cache all valid roles
    SELECT array_agg(name) INTO valid_roles FROM global.roles_master;

    FOR entry IN SELECT * FROM json_array_elements(payload)
    LOOP
        user_email := entry->>'user_email';
        app_name := entry->>'application';
        role_name := entry->>'role';

        -- Get user_code
        SELECT user_code INTO _user_code
        FROM global.user_master
        WHERE lower(email) = lower(user_email);

        -- Skip if user not found
        IF _user_code IS NULL THEN
            skipped := skipped || jsonb_build_array(
                jsonb_build_object('error', 'User not found', 'input', entry)
            );
            CONTINUE;
        END IF;

        -- Get role_code (case-insensitive)
        SELECT role_code INTO _role_code
        FROM global.roles_master
        WHERE lower(name) = lower(role_name);

        IF _role_code IS NULL THEN
            role_not_found := true;
            skipped := skipped || jsonb_build_array(
                jsonb_build_object('error', 'Invalid role', 'input', entry)
            );
            CONTINUE;
        END IF;

        -- Get application_code
        SELECT application_code INTO _app_code
        FROM global.application_master
        WHERE name = app_name;

        IF _app_code IS NULL THEN
            skipped := skipped || jsonb_build_array(
                jsonb_build_object('error', 'Invalid application', 'input', entry)
            );
            CONTINUE;
        END IF;

        -- Get acl_code
        SELECT acl_code INTO _acl_code
        FROM global.acl_master
        WHERE role_code = _role_code AND application_code = _app_code;

        IF _acl_code IS NULL THEN
            skipped := skipped || jsonb_build_array(
                jsonb_build_object('error', 'No ACL found for this role and application', 'input', entry)
            );
            CONTINUE;
        END IF;

		IF NOT EXISTS (
		    SELECT 1 FROM global.user_access_hierarchy_mapping
		    WHERE user_code = _user_code AND acl_code = _acl_code
		) THEN
	        -- Insert into mapping table
	        INSERT INTO global.user_access_hierarchy_mapping (
	            user_code,
	            acl_code,
	            access_hierarchy,
	            filters,
	            updated_at,
	            updated_by
	        )
	        VALUES (
	            _user_code,
	            _acl_code,
	            '[]'::jsonb,
	            '[]'::jsonb,
	            CURRENT_TIMESTAMP,
	            _user_code
	        );
	
	        -- Log inserted entry
	        inserted := inserted || jsonb_build_array(
	            jsonb_build_object(
	                'user_email', user_email,
	                'application', app_name,
	                'role', role_name
	            )
	        );
		ELSE
		    inserted := inserted || jsonb_build_array(
	            jsonb_build_object(
	                'user_email', user_email,
	                'application', app_name,
	                'role', role_name
	            )
	        );
		END IF;
    END LOOP;

    -- Append valid roles only once if needed
    IF role_not_found THEN
        skipped := skipped || jsonb_build_array(
            jsonb_build_object(
                'note', 'Role must be selected from the following entries',
                'valid_roles', valid_roles
            )
        );
    END IF;

    RETURN json_build_object(
        'inserted_entries', inserted,
        'skipped_entries', skipped
    );
END;
$function$
;
