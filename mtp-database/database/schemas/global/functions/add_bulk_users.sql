--liquibase formatted sql
--changeset liquibase:add_bulk_users runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_bulk_users
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.add_bulk_users(payload json);
CREATE OR REPLACE FUNCTION global.add_bulk_users(payload json)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
	user_data json;
    name_val text;
    email_val text;
	begin
        FOR user_data IN SELECT * FROM json_array_elements(payload->'users')
   		LOOP
	    	name_val := user_data->>'user_name';
	        email_val := user_data->>'email';
	
	        -- Check for existing email
	        IF NOT EXISTS (
	            SELECT 1 FROM "global".user_master WHERE email = email_val
	        ) THEN
	            INSERT INTO "global".user_master (
	                "name", "email", "user_name", "password", "salt", "status", "is_deleted",
	                "created_at", "updated_at", "created_by", "updated_by"
	            )
	            VALUES (
	                name_val,
	                email_val,
	                name_val, -- user_name same as name
	                NULL,
	                NULL,
	                true,
	                false,
	                now(),
	                now(),
	                NULL,
	                NULL
	            );
	        END IF;
    	END LOOP;
	END;
$function$
;
