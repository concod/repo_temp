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

    BEGIN

        select * into _promo_record from price_promo.promo_master pm where pm.promo_id = p_promo_id;

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
                price_promo.promo_status_config psc
            on pm.status = psc.status_id
            inner join 
                price_promo.promo_product pp
            on pm.promo_id = pp.promo_id
            inner join
                price_promo.product_master prod_m
            on pp.product_id = prod_m.product_id
            where pm.event_id = %4$L
            and pm.is_vendor_created_promo = true
            and pm.vendor_portal_status not in (0,5,6)
            and pp.product_id in (
                select 
                    source_pp.product_id 
                from price_promo.promo_product source_pp
                where source_pp.promo_id = %1$s
            )
            and pm.end_date >= %2$L
            and pm.start_date <= %3$L
            ',
            p_promo_id,
            _promo_record.start_date,
            _promo_record.end_date,
            _promo_record.event_id
        );

        raise notice 'query %', _query;
        return query execute _query;

    END;
$function$
;
