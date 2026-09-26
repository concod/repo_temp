--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_insert_promo_sg_hierarchy runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_promo.fn_insert_promo_sg_hierarchy

drop function if exists price_promo.fn_insert_promo_sg_hierarchy;
CREATE OR REPLACE FUNCTION price_promo.fn_insert_promo_sg_hierarchy(
    p_promo_id int,
    p_store_group_ids int[]
)
RETURNS void AS $$
DECLARE

BEGIN

    INSERT INTO price_promo.promo_store_sg_hierarchy (
        promo_id,
        store_group_id,
        store_group_name,
        hierarchy_level_id, 
        hierarchy_level_name, 
        hierarchy_value_id, 
        hierarchy_value_name
    )
    SELECT DISTINCT
        p_promo_id AS promo_id,
        tsg.sg_id as store_group_id,
        tsg.sg_name AS store_group_name,
        tsh.hierarchy_level AS hierarchy_level_id,
        CASE 
            WHEN tsh.hierarchy_level = 0 THEN 'country'
            WHEN tsh.hierarchy_level = 1 THEN 'channel'
            WHEN tsh.hierarchy_level = 2 THEN 'store_group'
            WHEN tsh.hierarchy_level = 3 THEN 'district'
            WHEN tsh.hierarchy_level = 4 THEN 'state'
            WHEN tsh.hierarchy_level = 5 THEN 'city'
            WHEN tsh.hierarchy_level = -1 THEN 'store_id'
        END AS hierarchy_level_name,
        tsh.hierarchy_value AS hierarchy_value_id,
        CASE
            WHEN tsh.hierarchy_level = 0 THEN tsm.s0_name
            WHEN tsh.hierarchy_level = 1 THEN tsm.s1_name
            WHEN tsh.hierarchy_level = 2 THEN tsm.s2_name
            WHEN tsh.hierarchy_level = 3 THEN tsm.s3_name
            WHEN tsh.hierarchy_level = 4 THEN tsm.s4_name
            WHEN tsh.hierarchy_level = 5 THEN tsm.s5_name
            WHEN tsh.hierarchy_level = -1 THEN tsm.store_name
        END AS hierarchy_value_name
    FROM 
        pricesmart.tb_sg_hierarchy tsh
    LEFT JOIN pricesmart.tb_store_group tsg ON tsh.sg_id = tsg.sg_id
    LEFT JOIN 
        global.tb_store_master tsm 
    ON 
        (tsh.hierarchy_level = 0 AND tsh.hierarchy_value = tsm.s0_id) OR
        (tsh.hierarchy_level = 1 AND tsh.hierarchy_value = tsm.s1_id) OR
        (tsh.hierarchy_level = 2 AND tsh.hierarchy_value = tsm.s2_id) OR
        (tsh.hierarchy_level = 3 AND tsh.hierarchy_value = tsm.s3_id) OR
        (tsh.hierarchy_level = 4 AND tsh.hierarchy_value = tsm.s4_id) OR
        (tsh.hierarchy_level = 5 AND tsh.hierarchy_value = tsm.s5_id) OR
        (tsh.hierarchy_level = -1 AND tsh.hierarchy_value = tsm.store_id)
    WHERE
        tsh.sg_id = any(p_store_group_ids);

END;
$$ LANGUAGE plpgsql;
