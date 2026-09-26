--liquibase formatted sql
    --changeset vaibhav:pullforward_coefficient_opt stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
    --comment: initial changeset for pullforward_coefficient_opt

    CREATE TABLE price_promo_opt.tb_pullforward_coefficient_opt (
        coefficient FLOAT NULL,
        s1_id INTEGER NULL,
        l2_cid INTEGER NULL,
        week_no INTEGER NULL
    );

    CREATE INDEX idx_pullforward_factor_s1_id_week_no_l2_cid_opt ON
    price_promo_opt.tb_pullforward_coefficient_opt
    USING BTREE (s1_id, week_no, l2_cid);

--changeset vaibhav:pullforward_coefficient_opt_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for pullforward_coefficient_opt_v2


ALTER TABLE price_promo_opt.tb_pullforward_coefficient_opt
DROP COLUMN  l2_cid;
ALTER TABLE price_promo_opt.tb_pullforward_coefficient_opt
ADD COLUMN  l3_cid int4;
ALTER TABLE price_promo_opt.tb_pullforward_coefficient_opt
ADD COLUMN  brand_cid int4;
DROP INDEX IF exists price_promo_opt.idx_pullforward_factor_s1_id_week_no_l2_cid_opt ;
CREATE INDEX idx_pullforward_factor_s1_id_week_no_l3_brand_cid_opt ON price_promo_opt.tb_pullforward_coefficient_opt USING btree (s1_id, week_no, l3_cid, brand_cid);