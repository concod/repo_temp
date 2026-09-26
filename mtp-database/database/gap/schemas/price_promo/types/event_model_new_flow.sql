--liquibase formatted sql
--changeset liquibase:event_model_new_flow_1  stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: initial changeset for event_model_new_flow_1


CREATE TYPE price_promo.event_model_new_flow AS (
	"name" text,
	start_date date,
	end_date date,
	submit_offers_by date,
	additional_attributes jsonb,
	created_by int4,
	date_restriction price_promo.date_restriction,
	product_restriction price_promo.product_restriction,
	store_restriction price_promo.store_restriction,
	product_exclusion price_promo.product_exclusion);


--changeset harsh.singh@impactanalytics.co:event_model_new_flow_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding customer_restriction for event_model_new_flow

DO
$$
BEGIN
    -- Check if the attribute 'customer_restriction' already exists on the type 'price_promo.event_model_new_flow'
    IF NOT EXISTS (
        SELECT 1
		FROM pg_namespace nsp
		JOIN pg_type typ ON typ.typnamespace = nsp.oid
		JOIN pg_class cls ON cls.oid = typ.typrelid 
		JOIN pg_attribute att ON att.attrelid = cls.oid
		WHERE nsp.nspname = 'price_promo'
		  AND typ.typname = 'event_model_new_flow'
		  AND att.attname = 'customer_restriction'
		  AND att.attnum > 0 -- Exclude system columns
    ) THEN
        -- If it does not exist, then add the attribute
        RAISE NOTICE 'Adding attribute customer_restriction to type price_promo.event_model_new_flow.';
        ALTER TYPE price_promo.event_model_new_flow ADD ATTRIBUTE customer_restriction price_promo.customer_restriction;
    ELSE
        RAISE NOTICE 'Attribute customer_restriction already exists on type price_promo.event_model_new_flow. Skipping.';
    END IF;
END
$$;

--changeset narendren.saravanan@impactanalytics.co:event_model_new_flow_add_status stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding status attribute to event_model_new_flow type
ALTER TYPE price_promo.event_model_new_flow ADD ATTRIBUTE status int2;