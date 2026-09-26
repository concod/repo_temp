--liquibase formatted sql
--changeset liquibase:auto_allocation_scheduler_by_id runOnChange:true stripComments:false splitStatements:false context:MTP-57602 labels:MTP-57602
--comment: MTP-57602 Used to create auto allocation schediuler
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.auto_allocation_scheduler_create(jsonb, int4);
CREATE OR REPLACE FUNCTION inventory_smart.auto_allocation_scheduler_create(scheduler_data jsonb, _created_by integer)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result JSONB;
    _generated_id int4;
	existing_rule_count int4;
begin
       if scheduler_data ->> 'sh_code' is not NULL THEN
       	       	
	       	update "inventory_smart".auto_allocation_scheduler       	
	       	SET 
		        sh_structure =(scheduler_data -> 'sh_structure')::jsonb,
		        sh_frequency = scheduler_data ->> 'sh_frequency',
		        updated_by = _created_by,
		        updated_at = current_timestamp
		    WHERE sh_code = CAST(scheduler_data ->> 'sh_code' AS integer)
		    RETURNING sh_code INTO _generated_id;
		
		    IF FOUND THEN
		        result := jsonb_build_object(
		            'status', true,
		            'message', 'Scheduler record updated',
		            'id', _generated_id
		        );
		    end IF;

        else
        	
    	    SELECT COUNT(*) INTO existing_rule_count
    		FROM "inventory_smart".auto_allocation_scheduler
   			WHERE sh_name = scheduler_data ->> 'sh_name';
        
	        IF existing_rule_count > 0 THEN
	            result := jsonb_build_object(
	                'status', false,
	                'message', 'Scheduler Name already exists'
	            );

        	ELSE
			  	INSERT INTO "inventory_smart".auto_allocation_scheduler (sh_name, sh_structure, sh_frequency, created_by, is_deletable)
					values (
						scheduler_data ->> 'sh_name',
						(scheduler_data -> 'sh_structure')::jsonb,
						scheduler_data ->> 'sh_frequency',
						_created_by,
						true
					)
		
				RETURNING sh_code INTO _generated_id;	
				
		        result := jsonb_build_object(
			                'status', true,
			                'message', 'Scheduler record created',
			                'id', _generated_id
			            );
			END IF;  
	 	END IF;
    
	RETURN result;

end;
$function$
;