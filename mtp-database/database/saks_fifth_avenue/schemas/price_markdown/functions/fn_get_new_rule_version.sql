--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_get_new_rule_version runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pg new price_markdown.fn_get_new_rule_version
--rollback: SELECT 1
DROP FUNCTION if exists price_markdown.fn_get_new_rule_version;
CREATE OR REPLACE FUNCTION price_markdown.fn_get_new_rule_version(input_string character varying)
 RETURNS character varying
	LANGUAGE plpgsql
AS $function$
DECLARE
    output_string VARCHAR;
    current_version INT;
  	original_name varchar;
begin
    	original_name := COALESCE(SUBSTRING(input_string FROM '^(.*)_v\d+$'), input_string);
    	raise notice 'original name %', original_name;

        -- Extract the current version and increment it
       	current_version := (
								select max(latest_version)
								from
								(
								SELECT
								    rule_name,
								    COALESCE(MAX(CAST(SUBSTRING(rule_name FROM '_v(\d+)$') AS INTEGER)), 0) AS latest_version
								FROM
								    price_markdown.tb_rule_master
								WHERE
								    rule_name LIKE original_name || '%'
								GROUP BY
								    rule_name
								) s
       						);
       	raise notice 'current version %',current_version;
        -- Remove the old version if present
        output_string := REPLACE(input_string, '_v' || current_version, '');

        -- Attach the incremented version to the input string
        output_string := original_name || '_v' || current_version+1;

	raise notice '%',output_string;
    -- Return the result
    RETURN output_string;
END;
$function$
;