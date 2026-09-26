--liquibase formatted sql
--changeset liquibase:sp_log runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sp_log
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.sp_log(
    IN _id text,
    IN _sp_name text,
    IN _context text,
    IN _query text,
    IN _params jsonb
);
CREATE OR REPLACE FUNCTION global.sp_log(
    IN _id text,
    IN _sp_name text,
    IN _context text,
    IN _query text,
    IN _params jsonb
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
	BEGIN
		INSERT INTO global.sp_logs (
			id,
			sp_name,
			context,
			query,
			params,
			clock_timestamp
		) VALUES (
            _id,  
			_sp_name,
			_context,
			_query,
			_params,
			clock_timestamp()  
		);
		RETURN TRUE;
		EXCEPTION
			WHEN OTHERS THEN
				RAISE NOTICE 'Error logging to sp_logs: %', SQLERRM;
				RETURN FALSE;
	END;
$$;
