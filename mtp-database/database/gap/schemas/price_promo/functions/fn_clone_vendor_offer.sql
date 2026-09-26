--liquibase formatted sql
--changeset shrrayan.sheel@impactanalytics.co:fn_clone_vendor_offer runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fn_clone_vendor_offer
DROP FUNCTION IF EXISTS price_promo.fn_clone_vendor_offer;
CREATE OR REPLACE FUNCTION price_promo.fn_clone_vendor_offer(p_promo_id integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE

    rec RECORD;
    archived_copy_promo_name text;
    archived_status INT;
    finalized_status INT;
    working_copy_promo_name text;
    copy_review_status integer = 0;
    review_status_updated_at boolean := true;
    finalized_promo_id INT;
    finalized_scenario_id INT;

BEGIN
    SELECT * INTO rec
    FROM price_promo.promo_master
    WHERE promo_id = p_promo_id;

    SELECT 
        MAX(CASE WHEN LOWER(status_name::text) = 'archived' THEN status_id END),
        MAX(CASE WHEN LOWER(status_name::text) = 'finalized' THEN status_id END)
    INTO archived_status, finalized_status
    FROM price_promo.promo_status_config;
    
    -- Append "copy" and store in new variable
    archived_copy_promo_name := rec.name || ' backup';
    working_copy_promo_name := rec.name;

    perform price_promo.fn_copy_promo(p_promo_id, rec.event_id, archived_copy_promo_name, rec.start_date, rec.end_date, rec.created_by, copy_review_status, p_promo_id, archived_status, review_status_updated_at, false, rec.created_by);
    select price_promo.fn_copy_promo(p_promo_id, rec.event_id, working_copy_promo_name, rec.start_date, rec.end_date, rec.created_by, copy_review_status, p_promo_id, finalized_status, review_status_updated_at, false, rec.created_by)
    into finalized_promo_id;

    SELECT scenario_id into finalized_scenario_id
    from price_promo.scenario_master where promo_id = finalized_promo_id;

    UPDATE price_promo.promo_master
    SET is_simulation_disabled = false, last_approved_scenario_id = finalized_scenario_id
    WHERE promo_id = finalized_promo_id;
	
 	UPDATE price_promo.promo_master
    SET vendor_portal_status = 2, vendor_portal_status_updated_at = NOW()
    WHERE promo_id = p_promo_id;

    -- UPDATE price_promo.event_master
    -- SET is_locked = true
    -- WHERE event_id = rec.event_id;
raise notice 'inserted promo id: %', p_promo_id;

	return finalized_promo_id;
END;
$function$
;
