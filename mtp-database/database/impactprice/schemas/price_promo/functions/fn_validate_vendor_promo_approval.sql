--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_validate_vendor_promo_approval runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_validate_vendor_promo_approval 

DROP FUNCTION if exists price_promo.fn_validate_vendor_promo_approval;
CREATE OR REPLACE FUNCTION price_promo.fn_validate_vendor_promo_approval(
    p_promo_id int
)
 RETURNS TABLE(
    promo_id int,
    promo_name text,
    promo_status text,
    promo_start_date date,
    promo_end_date date,
    primaryupc text,
    product_description text,
    product_id bigint
 )
 LANGUAGE plpgsql
AS $function$
    DECLARE
        
        _promo_record price_promo.promo_master%ROWTYPE;

        _query text;

        _date_conflicting_promos integer[] := array[]::int[];

    BEGIN

        select * into _promo_record from price_promo.promo_master pm where pm.promo_id = p_promo_id;


        _date_conflicting_promos = (
            select 
                array_agg(pm.promo_id)
            from price_promo.promo_master pm
            where event_id = _promo_record.event_id
            and pm.promo_id != _promo_record.promo_id
            and pm.end_date >= _promo_record.start_date
            and pm.start_date <= _promo_record.end_date
            and pm.vendor_portal_status not in (0,5,6)
            and pm.is_vendor_created_promo = true
        );



        _query = format( '
            select 
                pm.promo_id,
                pm.name as promo_name,
                psc.status_name::text as promo_status,
                pm.start_date as promo_start_date,
                pm.end_date as promo_end_date,
                prod_m.primaryupc as primaryupc,
                prod_m.product_description,
                prod_m.product_id as product_id
            from 
                price_promo.promo_master pm
            inner join 
                price_promo.promo_vendor_portal_status_config psc
            on pm.vendor_portal_status = psc.status_id
            inner join 
            (
                select * from 
                price_promo.promo_product 
                where promo_id = any(%2$L)
            ) pp
            on pm.promo_id = pp.promo_id
            inner join
                price_promo.product_master prod_m
            on pp.product_id = prod_m.product_id
            where pm.promo_id = any(%2$L)
            and pp.product_id in (
                select 
                    source_pp.product_id 
                from price_promo.promo_product source_pp
                where source_pp.promo_id = %1$s
            )
            ',
            p_promo_id,
            _date_conflicting_promos
        );

        raise notice 'query %', _query;
        return query execute _query;

    END;
$function$
;
