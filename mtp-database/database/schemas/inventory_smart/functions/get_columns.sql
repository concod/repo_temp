--liquibase formatted sql
--changeset liquibase:get_columns runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_columns
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_columns(name character varying, schema character varying);
CREATE OR REPLACE FUNCTION inventory_smart.get_columns(name character varying, schema character varying)
 RETURNS text[]
 LANGUAGE plpgsql
AS $function$
DECLARE
   	columns text[];
BEGIN 
	IF EXISTS(SELECT FROM information_schema.tables WHERE table_schema = $2 AND table_name = $1) THEN
		EXECUTE(FORMAT($$SELECT ARRAY_AGG(column_name) FROM information_schema.columns WHERE table_schema = '%s' AND table_name = '%s'$$, $2, $1)) INTO columns;
	ELSE
		EXECUTE(FORMAT($$SELECT array_agg(a.attname) FROM pg_attribute a
						  JOIN pg_class t ON a.attrelid = t.oid
						  JOIN pg_namespace s ON t.relnamespace = s.oid
						WHERE a.attnum > 0  AND NOT a.attisdropped AND t.relname = '%s' AND s.nspname = '%s'$$,
                        $1, $2)) into columns;
   	END IF;
   	RETURN columns;
END
$function$
;