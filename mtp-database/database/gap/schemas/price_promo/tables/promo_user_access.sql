--liquibase formatted sql
--changeset narendren.saravanan@impactanalytics.co:create_promo_user_access_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for promo_user_access table to manage user access to promotions

CREATE TABLE IF NOT EXISTS price_promo.promo_user_access (
    promo_id int4 NOT NULL,
    user_id int4 NOT NULL,
    PRIMARY KEY (promo_id, user_id)
); 