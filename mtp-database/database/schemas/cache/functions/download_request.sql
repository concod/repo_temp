--liquibase formatted sql
--changeset liquibase:download_request runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for download_request
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cache.download_request(input character varying);
CREATE OR REPLACE FUNCTION cache.download_request(input character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 PARALLEL SAFE
AS $function$
declare
/*
 * Function/Procedure name: cache.download_request
 * Created by: Ashish Gupta
 * Created at: 19-Jul-2022
 * No of input parameter: 1
 * Parameter Description : 
 * $1 = _cache_key
 * Purpose: Just fetch back values and update download count
 */
	_val jsonb;
begin 
	UPDATE 
	  "cache".request_data 
	SET 
	  download_count = download_count + 1 
	WHERE 
	  "key" = $1 RETURNING value into _val;
	return _val;
END
$function$
;
