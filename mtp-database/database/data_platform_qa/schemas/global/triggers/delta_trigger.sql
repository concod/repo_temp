--liquibase formatted sql
--changeset liquibase:delta_trigger runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for delta_trigger
--rollback: SELECT 1
-- DROP FUNCTION IF EXISTS global.delta_calculator();
CREATE OR REPLACE FUNCTION global.delta_calculator()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
begin
	if new.table_name = 'product_master' then
		call global.sync_product(new.key);
	elseif new.table_name = 'store_master' then
		call global.sync_store(new.key);
	end if;
	return new;
end ;
$function$
;
CREATE OR REPLACE TRIGGER delta_trigger
    AFTER INSERT ON global.delta_tracker
    FOR EACH ROW
    EXECUTE PROCEDURE global.delta_calculator();
