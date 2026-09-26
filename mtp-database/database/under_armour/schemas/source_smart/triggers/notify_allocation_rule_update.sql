--liquibase formatted sql
--changeset zainab.firdous:notify_allocation_rule_update stripComments:false splitStatements:false context:Release_1_1 runOnChange:true labels:adding_security_definer
--comment: adding security definer

DROP FUNCTION IF EXISTS source_smart.notify_allocation_rule_update;

CREATE OR REPLACE FUNCTION source_smart.notify_allocation_rule_update()
RETURNS TRIGGER 
SECURITY DEFINER
AS $$
BEGIN
    IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
        PERFORM pg_notify(
            'allocation_rule_updated',
            json_build_object(
                'rule_id', NEW.rule_id,
                'is_active', NEW.is_active
            )::text
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_allocation_rule_update
AFTER UPDATE ON source_smart.allocation_rule_ua
FOR EACH ROW
EXECUTE FUNCTION source_smart.notify_allocation_rule_update();