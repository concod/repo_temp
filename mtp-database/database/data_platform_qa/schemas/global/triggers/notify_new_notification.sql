--liquibase formatted sql
--changeset pradeep.nayak@impactanalytics.co:notify_new_notifications runOnChange:true stripComments:false splitStatements:false context:notify-using-pgnotify labels:notify-using-pgnotify
--comment: New notifications trigger
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.notify_new_notification();
CREATE OR REPLACE FUNCTION global.notify_new_notification()
RETURNS trigger AS $$
DECLARE
BEGIN
    PERFORM pg_notify(
        'new_notification',
        json_build_object('no_code', NEW.no_code, 'created_for', NEW.created_for)::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_notify_new_notification
AFTER INSERT ON global.notifications_master
FOR EACH ROW EXECUTE FUNCTION global.notify_new_notification();