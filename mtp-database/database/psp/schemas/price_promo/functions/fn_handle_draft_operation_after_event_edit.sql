--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_handle_draft_operation_after_event_edit runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_promo.fn_handle_draft_operation_after_event_edit

DROP FUNCTION if exists price_promo.fn_handle_draft_operation_after_event_edit;
CREATE OR REPLACE FUNCTION price_promo.fn_handle_draft_operation_after_event_edit(
    p_promo_id int,
    p_event_id int,
    p_product_restriction_change varchar(100),
    p_store_restriction_change varchar(100)
)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
    _event_record record;

    _MODIFIED_RESTRICTIONS_MSG constant varchar(100) := 'modified restrictions';
begin

    update price_promo.promo_master set status = 0,step_count=0 where promo_id = p_promo_id;
    delete from price_promo.ps_scenario_discounts where promo_id = p_promo_id;

    if p_product_restriction_change = _MODIFIED_RESTRICTIONS_MSG then

        delete from price_promo.included_product_hierarchy where promo_id = p_promo_id;
        delete from price_promo.included_promo_product_groups where promo_id = p_promo_id;
        delete from price_promo.included_products where promo_id = p_promo_id;

        delete from price_promo.promo_product where promo_id = p_promo_id;
        delete from price_promo.promo_product_hierarchy where promo_id = p_promo_id;
        delete from price_promo.tb_promo_product_groups where promo_id = p_promo_id;
        update price_promo.promo_master set products_count = 0,product_selection_type = null where promo_id = p_promo_id;
    end if;


    if p_store_restriction_change = _MODIFIED_RESTRICTIONS_MSG then
        delete from price_promo.promo_store where promo_id = p_promo_id;
        delete from price_promo.tb_promo_store_groups where promo_id = p_promo_id;
        delete from price_promo.promo_store_hierarchy where promo_id = p_promo_id;
        delete from price_promo.promo_store_sg_hierarchy where promo_id = p_promo_id;
        update price_promo.promo_master set stores_count = 0,store_selection_type = null where promo_id = p_promo_id;
    end if;

end;
$function$
;
