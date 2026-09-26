--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_update_event_edit_effected_promos runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_promo.fn_update_event_edit_effected_promos

DROP FUNCTION if exists price_promo.fn_update_event_edit_effected_promos;
CREATE OR REPLACE FUNCTION price_promo.fn_update_event_edit_effected_promos()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare

    _effected_promo_record record;

begin

    for _effected_promo_record in (select * from tb_temp_event_edit_effected_promos)
    loop
        raise notice '_effected_promo_record, %', _effected_promo_record.r_operation_to_perform;
        if _effected_promo_record.r_operation_to_perform = 'archive' then
            update price_promo.promo_master set status = 6 where promo_id = _effected_promo_record.r_promo_id;
        elsif _effected_promo_record.r_operation_to_perform = 'draft' then
            perform price_promo.fn_handle_draft_operation_after_event_edit(
                _effected_promo_record.r_promo_id,
                _effected_promo_record.event_id,
                _effected_promo_record.r_product_restrictions_change,
                _effected_promo_record.r_store_restrictions_change
            );
        elsif _effected_promo_record.r_operation_to_perform = 'refresh' then
            perform price_promo.fn_handle_refresh_operation_after_event_edit(_effected_promo_record.r_promo_id,_effected_promo_record.event_id);
        end if;
		
		update price_promo.promo_master 
	    set currency_id = (
	        select currency_id from global.tb_country_currency_mapping where country_id = (
	            select country_id from price_promo.event_master where event_id = _effected_promo_record.event_id
	        )
	    )
	    where promo_id = _effected_promo_record.r_promo_id;

    end loop;

end;
$function$
;
