--liquibase formatted sql
    --changeset vaibhav:cannibalization_coefficient_opt stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
    --comment: initial changeset for cannibalization_coefficient_opt

    CREATE TABLE price_promo_opt.tb_cannibalization_coefficient_opt (
        coefficient FLOAT NULL,
        s1_id INTEGER NULL,
        cannibalizer_l3_cid INTEGER NULL,
        cannibalizer_brand_cid INTEGER NULL,
        cannibalized_l3_cid INTEGER NULL,
        cannibalized_brand_cid INTEGER NULL
    );

    CREATE INDEX idx_cannibalization_coefficient_s1_id_1_opt ON
    price_promo_opt.tb_cannibalization_coefficient_opt
    USING BTREE (s1_id, cannibalized_l3_cid, cannibalized_brand_cid);

    CREATE INDEX idx_cannibalization_coefficient_s1_id_2_opt ON
    price_promo_opt.tb_cannibalization_coefficient_opt
    USING BTREE (s1_id, cannibalizer_l3_cid, cannibalizer_brand_cid);