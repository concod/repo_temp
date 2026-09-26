--liquibase formatted sql
--changeset liquibase:generate where condition for no dates filter runOnChange:true stripComments:false splitStatements:false context:MTP-26235 added drop function statement labels:MTP-26235
--comment: MTP-26235 added drop function statement at the beginning
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.generate_where_condition_product_life_cycle(jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.generate_where_condition_product_life_cycle(json_data jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    _where_conditions text := '';
    key text;
    value text;
	BEGIN
		-- Loop through the keys and values in the JSON object
	    FOR key, value IN SELECT * FROM jsonb_each(json_data)
	    loop
		    IF key = 'markdown_date' OR key = 'clearance_date' then
		    		IF value IS NULL OR value = 'true' THEN
		    			_where_conditions := _where_conditions ||  'plc.'||key || '=''{}''  AND ';
		    		end if;   
		    else
	        		IF value IS NULL OR value = 'true' THEN
	            		_where_conditions := _where_conditions || 'plc.'||key || ' IS NULL AND ';
	        		end if; 
	        END IF;
	    END LOOP;
	
	    -- Remove the trailing "AND " from the final condition
	    _where_conditions := left(_where_conditions, length(_where_conditions) - 5);
	   
	   	IF _where_conditions <> '' THEN
        		_where_conditions := 'WHERE ' || _where_conditions;
    		END IF;
	
	    RETURN _where_conditions;
	END;
$function$
;
