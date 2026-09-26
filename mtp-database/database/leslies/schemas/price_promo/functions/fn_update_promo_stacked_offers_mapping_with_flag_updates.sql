--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_update_promo_stacked_offers_mapping_with_flag_updates runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset

DROP FUNCTION if exists price_promo.fn_update_promo_stacked_offers_mapping_with_flag_updates;
CREATE OR REPLACE FUNCTION price_promo.fn_update_promo_stacked_offers_mapping_with_flag_updates(p_promo_ids integer[])
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
	query text;
BEGIN
	query = format('update price_promo.promo_master set has_stacked_offers=NULL where promo_id in (%1$s)',array_to_string(p_promo_ids, ',' ));
	raise notice '%', query;
	execute query;
    perform price_promo.fn_update_promo_stacked_offers_mapping(p_promo_ids);
END
$function$
;
