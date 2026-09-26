--liquibase formatted sql
--changeset liquibase:auto_allocation_scheduler_by_id runOnChange:true stripComments:false splitStatements:false context:MTP-57602 labels:MTP-57602
--comment: MTP-57602 Used to delete auto allocation schediuler
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.auto_allocation_scheduler_delete(int4);
CREATE OR REPLACE FUNCTION inventory_smart.auto_allocation_scheduler_delete(sh_code_value integer)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare 
result jsonb;
_updated_id int4;
begin
				
    begin
       
		UPDATE "inventory_smart".auto_allocation_scheduler
	    SET 
	        is_deleted = True
	    WHERE sh_code = sh_code_value
	    RETURNING sh_code INTO _updated_id;
			
        UPDATE "inventory_smart".rcl_dc_store_policy
        SET auto_allocation_schedular = NULL,
            updated_at = now()
        WHERE auto_allocation_schedular = sh_code_value;

        result := jsonb_build_object(
	                'status', true,
	                'message', 'Scheduler record is deleted',
	                'id', _updated_id
	            );

	EXCEPTION
    
        WHEN OTHERS THEN
             result := jsonb_build_object(
                'status', false,
                'message', 'Error: ' || SQLERRM
            );		
 
    END;
    
    RETURN result;

	END;
$function$
;
