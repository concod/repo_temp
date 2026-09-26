--liquibase formatted sql
--changeset shrrayan.sheel@impactanalytics.co:promo_sync_direction stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: initial changeset for price_promo.promo_sync_direction
CREATE TYPE price_promo.promo_sync_direction_enum AS ENUM (
    'vendor_portal_to_promo_smart',
    'promosmart_to_vendor_portal'
);


--changeset shrrayan.sheel@impactanalytics.co:promo_sync_direction_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: altering the first enum name
ALTER TYPE price_promo.promo_sync_direction_enum RENAME VALUE 'vendor_portal_to_promo_smart' TO 'vendor_portal_to_promosmart';
