--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_reporting_get_stores runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pg new price_markdown.fn_reporting_get_stores
--rollback: SELECT 1
DROP FUNCTION if exists price_markdown.fn_reporting_get_stores;
CREATE OR REPLACE FUNCTION price_markdown.fn_reporting_get_stores(_store_h1_id integer[], _store_h2_id integer[], _store_h3_id integer[], _store_h4_id integer[], _store_h5_id integer[], _store_h6_id integer[])
 RETURNS TABLE(store_h1_id integer, store_h1_name character varying, store_h2_id integer, store_h2_name character varying, store_h3_id integer, store_h3_name character varying, store_h4_id integer, store_h4_name character varying, store_h5_id integer, store_h5_name character varying, store_h6_id integer, store_h6_name character varying, channel character varying)
	LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        sm.store_h1_id, sm.store_h1_name, 
        sm.store_h2_id, sm.store_h2_name, 
        sm.store_h3_id, sm.store_h3_name, 
        sm.store_h4_id, sm.store_h4_name,
        sm.store_h5_id, sm.store_h5_name,
        sm.store_h6_id, sm.store_h6_name,
		case when channel_type_id =23 then 'BnM' else 'Ecom' end::VARCHAR as channel
    FROM public.store_master sm
    WHERE sm.is_active = 1
    AND (
        (_store_h1_id IS NULL OR sm.store_h1_id = ANY(_store_h1_id))
        AND (_store_h2_id IS NULL OR sm.store_h2_id = ANY(_store_h2_id))
        AND (_store_h3_id IS NULL OR sm.store_h3_id = ANY(_store_h3_id))
        AND (_store_h4_id IS NULL OR sm.store_h4_id = ANY(_store_h4_id))
        AND (_store_h5_id IS NULL OR sm.store_h5_id = ANY(_store_h5_id))
        AND (_store_h6_id IS NULL OR sm.store_h6_id = ANY(_store_h6_id))
    );
END;
$function$
;