--liquibase formatted sql
--changeset liquibase:rcl_trigger_function runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for rcl_trigger_function
--rollback: SELECT 1
DROP TRIGGER IF EXISTS create_rcl_schema ON "global".rcl_master;
DROP FUNCTION IF EXISTS global.rcl_trigger_function();
CREATE OR REPLACE FUNCTION global.rcl_trigger_function()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
	_module varchar;
BEGIN
    IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE') THEN
        select 
			case 
				when replace(lower(module_name), ' ', '_') like '%product_status%' then 'rcl_product_status'
				when replace(lower(module_name), ' ', '_') like '%store_status%' then 'rcl_store_status'
				when replace(lower(module_name), ' ', '_') like '%product_mapping%' then 'rcl_product_mapping_product_store'
                when replace(lower(module_name), ' ', '_') like '%oms_rules_constraints%' then 'rcl_oms_constraint_master' /*this has to be before rcl_constraint_master*/
				when replace(lower(module_name), ' ', '_') like '%constraint%' then 'rcl_constraint_master'
                when replace(lower(module_name), ' ', '_') like '%dc_store_policy%' then 'rcl_dc_store_policy'
			end into _module
		from global.module_master where module_code = NEW.module_code;
		IF _module is not NULL THEN
			call global.build_list_partitions(_module || ':' || NEW.rcl_code);
			RETURN NEW;
		ELSE
			RETURN NULL;
        END IF;
    END IF;
    RETURN NULL;
END;
$function$
;

CREATE OR REPLACE TRIGGER create_rcl_schema
    BEFORE INSERT OR UPDATE
    ON "global".rcl_master
    FOR EACH ROW
    EXECUTE PROCEDURE "global".rcl_trigger_function();
