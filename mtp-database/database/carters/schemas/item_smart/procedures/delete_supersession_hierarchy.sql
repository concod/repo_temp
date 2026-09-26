--liquibase formatted sql
--changeset sonika.baheti@impactanalytics.co:delete_supersession_hierarchy runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: initial changeset for item_smart.delete_supersession_hierarchy
--rollback: SELECT 1

DROP PROCEDURE if EXISTS item_smart.delete_supersession_hierarchy();

CREATE OR REPLACE PROCEDURE item_smart.delete_supersession_hierarchy()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'iaf_master', 
		'wp_master', 
		'ly_master',
		'lly_master',
		'ty_master',
		'itemfact_sku_week',
		'itemfact_sku',
		'lf_master',
		'op_master',
		'new_skus',
		'alerts'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        EXECUTE format('
            DELETE FROM item_smart.%I
            WHERE hierarchy_code IN (
                SELECT DISTINCT hierarchy_code FROM public.supersession_item
            )', tbl);
    END LOOP;
END;
$procedure$
;