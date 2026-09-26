--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:log_snapshot_deletion stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.log_snapshot_deletion

DROP FUNCTION IF EXISTS base_pricing_restaurant.log_snapshot_deletion;


CREATE OR REPLACE FUNCTION base_pricing_restaurant.log_snapshot_deletion()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Log the deletion
    INSERT INTO base_pricing_restaurant.bp_strategy_approval_snapshot_audit (
        strategy_id,
        preserved_strategy_status_id,
        preserved_approved_on,
        preserved_approved_by,
        deletion_reason,
        stack_trace
    ) VALUES (
        OLD.strategy_id,
        OLD.preserved_strategy_status_id,
        OLD.preserved_approved_on,
        OLD.preserved_approved_by,
        'DELETED',
        -- Try to get current query context
        current_query()
    );
    
    -- Also log to PostgreSQL log
    RAISE WARNING 'SNAPSHOT DELETED: strategy_id=%, status=%, reason=DELETED', 
        OLD.strategy_id, 
        OLD.preserved_strategy_status_id;
    
    RETURN OLD;
END;
$function$
;
