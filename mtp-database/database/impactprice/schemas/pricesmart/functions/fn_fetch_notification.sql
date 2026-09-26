--liquibase formatted sql
--changeset pranshu.pandey@impactanalytics.co:fn_fetch_notification runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: fn_fetch_notification
--rollback: SELECT 1
DROP FUNCTION if exists pricesmart.fn_fetch_notification;
CREATE OR REPLACE FUNCTION pricesmart.fn_fetch_notification(_user_id integer, _application character varying, _time_zone text DEFAULT 'US/Eastern'::text, _db_datetime_format text DEFAULT 'mm/dd/yyyy HH24:mi:ss'::text, _limit integer DEFAULT 1500, _offset integer DEFAULT 0)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
	final_result json;
BEGIN
    with notifications as (
	    select
	        notification_id,
	        "module",
	        message,
	        "action",
	        navigate_to::int,
	        to_char(read_at, _db_datetime_format) as read_at,
	        to_char(timezone(_time_zone,timezone('UTC', tn.created_at)), _db_datetime_format) as created_at,
	        tn.created_at as created_at_date,
	        ru.url as download_url,
			tn.redirection_url,
	        CASE
                when tn.module = 'promotions' 
                    and tn.action in ('refresh_metrics','copy','finalize','Execution Approval') 
                    then tn.identifier
                WHEN tn.module = 'promotions' THEN pm.name
                WHEN tn.module = 'strategy' THEN tsm.strategy_name
                WHEN tn.module = 'REPORT' THEN tn.identifier
                WHEN tn.module = 'product_group' THEN tpg.pg_name
                WHEN tn.module = 'store_group' THEN tsg.sg_name
                else tn.identifier
            END AS name,
	        CASE
                WHEN tn.module = 'promotions' THEN pm.step_count
                WHEN tn.module = 'strategy' THEN tsm.step_count
                ELSE NULL
            END AS step_count,
	        tn.status,
	        tn.header_text,
	        tn.promo_ids,
	        identifier,
            case
                when tn.module = 'REPORT' then
                    timezone(_time_zone,timezone('UTC', tn.created_at)) + interval '3' day < timezone(_time_zone,now())
            end as download_link_expired
	    from
	        pricesmart.tb_notifications tn
	    left join
	        pricesmart.report_urls ru
	        on ru.report_id = tn.navigate_to::bigint and tn.module = 'REPORT'
	    left join
	        price_markdown.tb_strategy_master tsm
	        on tsm.strategy_id = tn.navigate_to::bigint and tn.module = 'strategy'
	    LEFT JOIN
            price_promo.promo_master pm ON pm.promo_id = tn.navigate_to::BIGINT AND tn.module = 'promotions'
        LEFT JOIN
            pricesmart.tb_product_group tpg ON tpg.pg_id = tn.navigate_to::BIGINT AND tn.module = 'product_group'
        LEFT JOIN
            pricesmart.tb_store_group tsg ON tsg.sg_id = tn.navigate_to::BIGINT AND tn.module = 'store_group'
	    where
	        user_id = _user_id
	        and tn.created_at >= date(timezone(_time_zone, now())) - interval '30 days'
	        and tn.application = _application
	    order by
	        created_at_date desc
	    limit _limit offset _offset
	)
	select
		jsonb_build_object(
		    'notifications_count',(select count(*) from pricesmart.tb_notifications where user_id = _user_id and application = _application),
		    'notifications',coalesce(array_agg(
		        json_build_object(
		            'notification_id',notification_id ,
		            'module',"module",
		            'message',message ,
		            'action',"action",
		            'navigate_to',navigate_to ,
		            'read_at',read_at ,
		            'created_at',created_at,
		            'download_url',download_url,
		            'name', name,
		            'step_count',
		            step_count,
		            'execution_status',status,
		            'identifier',identifier,
		            'header_text',header_text,
                    'download_link_expired',download_link_expired,
                    'promo_ids',promo_ids, 
					'redirection_url', redirection_url
		        )
		    ),array[]::json[])
		) into final_result
	from notifications;
	return final_result;
END;
$function$
;
