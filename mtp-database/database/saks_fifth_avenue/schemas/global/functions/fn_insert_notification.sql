--liquibase formatted sql
--changeset hareeshwar.c@impactanalytics.co:fn_insert_notification_3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: changed return type
--rollback: SELECT 1
DROP FUNCTION if exists global.fn_insert_notification;
CREATE OR REPLACE FUNCTION global.fn_insert_notification(_module character varying, _application character varying, _message character varying, _expiry integer DEFAULT 4320, _action character varying DEFAULT NULL::character varying, _navigate_to character varying DEFAULT NULL::character varying, _user_id integer DEFAULT 0, _status boolean DEFAULT NULL::boolean, _identifier character varying DEFAULT NULL::character varying, _header_text character varying DEFAULT NULL::character varying, _promo_ids INT[] DEFAULT NULL)
 RETURNS TABLE(notification_id integer, module character varying, application character varying, message text, expiry integer, action character varying, navigate_to character varying, read_at timestamp without time zone, created_at timestamp without time zone, user_id integer, status boolean, identifier character varying, header_text text, promo_ids int[])
 LANGUAGE plpgsql
AS $function$
BEGIN
	RETURN QUERY INSERT INTO global.tb_notifications (
        module,
        application,
        message,
        expiry,
        action,
        navigate_to,
        user_id,
        status,
        identifier,
        header_text,
        promo_ids
    )
    VALUES (
        _module,
        _application,
        _message,
        _expiry,
        _action,
        _navigate_to,
        _user_id,
        _status,
        _identifier,
        _header_text,
        _promo_ids
    )
    RETURNING
        global.tb_notifications.notification_id,
       	global.tb_notifications.module,
      	global.tb_notifications.application,
   		global.tb_notifications.message,
   		global.tb_notifications.expiry,
   		global.tb_notifications.action,
   		global.tb_notifications.navigate_to,
   		global.tb_notifications.read_at,
   		global.tb_notifications.created_at,
   		global.tb_notifications.user_id,
   		global.tb_notifications.status,
   		global.tb_notifications.identifier,
   		global.tb_notifications.header_text,
   		global.tb_notifications.promo_ids;
    --RETURN QUERY (SELECT null::integer as notification_id, null::text as module, null::text as application, null::text as message, null::integer as expiry, null::text as action, null::text as navigate_to, null::timestamp as read_at, null::timestamp as created_at, null::integer as user_id, null::bool as status, null::text as identifier, null::text as header_text);
END;
$function$
;
