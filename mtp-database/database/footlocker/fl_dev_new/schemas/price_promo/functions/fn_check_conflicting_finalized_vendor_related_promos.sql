--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_check_conflicting_finalized_vendor_related_promos runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fn_check_conflicting_finalized_vendor_related_promos

DROP FUNCTION if exists price_promo.fn_check_conflicting_finalized_vendor_related_promos;
CREATE OR REPLACE FUNCTION price_promo.fn_check_conflicting_finalized_vendor_related_promos(
    p_promo_ids integer[]
)
 RETURNS TABLE(
    source_promo_id integer,
    source_promo_name text,
    conflicted_promo_id integer,
    conflicted_promo_name text,
    conflicted_promo_status text,
    conflicted_promo_start_date date,
    conflicted_promo_end_date date
 )
 LANGUAGE plpgsql
AS $function$
DECLARE
    _finalized_promo_status_list integer[];
BEGIN

    _finalized_promo_status_list :=  array(
        select jsonb_array_elements(price_promo.fn_get_configuration_value('promo', 'finalized_promo_status_list')::jsonb)::int
    );

    return query (
        select 
            input_promos.promo_id as source_promo_id,
            input_promos.name as source_promo_name,
            pm.promo_id as conflicted_promo_id,
            pm.name as conflicted_promo_name,
            psc.status_name::text as conflicted_promo_status,
            pm.start_date as conflicted_promo_start_date,
            pm.end_date as conflicted_promo_end_date
        from (
            select 
                * 
            from price_promo.promo_master
            where promo_id = any(p_promo_ids)
        ) input_promos
        inner join  
        price_promo.promo_master pm
        on pm.parent_vendor_promo_id = input_promos.parent_vendor_promo_id and pm.promo_id != input_promos.promo_id
        inner join 
        price_promo.promo_status_config psc
        on psc.status_id = pm.status
        where pm.status = any(_finalized_promo_status_list)
        union all 
        select 
            pm1.promo_id as source_promo_id,
            pm1.name as source_promo_name,
            pm2.promo_id as conflicted_promo_id,
            pm2.name as conflicted_promo_name,
            psc.status_name::text as conflicted_promo_status,
            pm2.start_date as conflicted_promo_start_date,
            pm2.end_date as conflicted_promo_end_date
        from (
            select 
            * 
            from price_promo.promo_master
            where promo_id = any(p_promo_ids)
        ) pm1
        inner join
        (
            select 
            * 
            from price_promo.promo_master
            where promo_id = any(p_promo_ids)
        ) pm2
        on pm1.parent_vendor_promo_id = pm2.parent_vendor_promo_id and pm1.promo_id != pm2.promo_id
        inner join 
        price_promo.promo_status_config psc
        on psc.status_id = pm2.status
    );

END;
$function$
;