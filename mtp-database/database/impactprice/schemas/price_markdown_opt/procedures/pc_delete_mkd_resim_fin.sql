--liquibase formatted sql
--changeset liquibase:pc_delete_mkd_resim_fin_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_delete_mkd_resim_fin
DROP PROCEDURE IF EXISTS price_markdown_opt.pc_delete_mkd_resim_fin(varchar, varchar, date);

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_delete_mkd_resim_fin(IN _reference_table character varying, IN _destination_table character varying, IN _pcd_start_date date)
 LANGUAGE plpgsql
  SECURITY DEFINER
AS $procedure$
    BEGIN
    EXECUTE FORMAT('
    with del_rows as
    (select product_level_id, store_level_id
    from price_markdown_opt_temp.%I t1
    group by 1,2)

    DELETE FROM price_markdown.%I as a1
    USING del_rows as a2
    WHERE a1.product_level_id = a2.product_level_id
    and a1.store_level_id = a2.store_level_id
    and a1.recommendation_date >= $1', _reference_table, _destination_table)
    using _pcd_start_date;
    END;
    $procedure$
;