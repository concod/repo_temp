--liquibase formatted sql
--changeset suchithra.pr@impactanalytics.co:refresh_placeholders_info_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:refresh_itemsmart_tables_initial_commit
--comment: initial changeset for refresh_ph_info
--rollback: SELECT 1

DROP PROCEDURE if EXISTS item_smart.refresh_placeholders();

CREATE OR REPLACE PROCEDURE item_smart.refresh_placeholders()
 LANGUAGE plpgsql
AS $procedure$
BEGIN
    -- Delete data from placeholders info, for ph that are not present in the public table. 
    DELETE 
    FROM item_smart.placeholders_info
    where hierarchy_code in (
        select 
            distinct hierarchy_code
        from item_smart.placeholders_info isp
        left join public.placeholders_info_refresh pp
        using(hierarchy_code)
        where pp.hierarchy_code is null
    );

END;
$procedure$
;