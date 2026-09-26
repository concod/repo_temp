--liquibase formatted sql
--changeset pranshu.pandey@impactanalytics.co:fn_insert_notification runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: changed return type
--rollback: SELECT 1
DROP FUNCTION IF EXISTS pricesmart.fn_insert_notification;
CREATE OR REPLACE FUNCTION pricesmart.fn_insert_notification(
    _module character varying,
    _application character varying,
    _message character varying,
    _expiry integer DEFAULT 4320,
    _action character varying DEFAULT NULL::character varying,
    _navigate_to character varying DEFAULT NULL::character varying,
    _user_id integer DEFAULT 0,
    _status boolean DEFAULT NULL::boolean,
    _identifier character varying DEFAULT NULL::character varying,
    _header_text character varying DEFAULT NULL::character varying,
    _promo_ids INT [] DEFAULT NULL,
    _redirection_url text DEFAULT NULL
) RETURNS TABLE(
    notification_id integer,
    module character varying,
    application character varying,
    message text,
    expiry integer,
    action character varying,
    navigate_to character varying,
    read_at timestamp,
    created_at timestamp,
    user_id integer,
    status boolean,
    identifier character varying,
    header_text text,
    promo_ids int [],
    redirection_url text
) 
LANGUAGE plpgsql
SECURITY INVOKER
as $function$ 
declare
BEGIN 
    RETURN QUERY
    INSERT INTO pricesmart.tb_notifications (
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
        promo_ids,
        redirection_url
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
        _promo_ids,
        _redirection_url
    )
    RETURNING 
        pricesmart.tb_notifications.notification_id,
        pricesmart.tb_notifications.module,
        pricesmart.tb_notifications.application,
        pricesmart.tb_notifications.message,
        pricesmart.tb_notifications.expiry,
        pricesmart.tb_notifications.action,
        pricesmart.tb_notifications.navigate_to,
        pricesmart.tb_notifications.read_at,
        pricesmart.tb_notifications.created_at,
        pricesmart.tb_notifications.user_id,
        pricesmart.tb_notifications.status,
        pricesmart.tb_notifications.identifier,
        pricesmart.tb_notifications.header_text,
        pricesmart.tb_notifications.promo_ids,
        pricesmart.tb_notifications.redirection_url;
END;
$function$
;