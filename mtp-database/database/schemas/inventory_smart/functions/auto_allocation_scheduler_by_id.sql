--liquibase formatted sql
--changeset liquibase:auto_allocation_scheduler_by_id runOnChange:true stripComments:false splitStatements:false context:MTP-57602 labels:MTP-57602
--comment: MTP-57602 Used to get auto allocation schediuler rule by id
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.auto_allocation_scheduler_by_id(refcursor, int4);
CREATE OR REPLACE FUNCTION inventory_smart.auto_allocation_scheduler_by_id(input refcursor, sh_code_value integer)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    _final_query text;
	begin
		    
	_final_query := '
			SELECT sh_code, 
				   sh_name, 
				   sh_structure::jsonb, 
				   sh_frequency
			FROM 
				inventory_smart.auto_allocation_scheduler
			WHERE 
				sh_code = '|| sh_code_value ||'';

    OPEN $1 FOR execute _final_query;
    RETURN $1;

	END;
$function$
;