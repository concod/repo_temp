--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:customer_selection_type_enum  stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: initial changeset for price_promo.customer_selection_type_enum
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'price_promo'
          AND t.typname = 'customer_selection_type_enum'
    ) THEN

        RAISE NOTICE 'Creating type price_promo.customer_selection_type_enum.';

        EXECUTE '
            CREATE TYPE price_promo.customer_selection_type_enum AS ENUM (
                ''customer_segment''
            );
        ';

    ELSE
        RAISE NOTICE 'Type price_promo.customer_selection_type_enum already exists. Skipping creation.';
    END IF;
END
$$;

--changeset pranshu.pandey@impactanalytics.co:customer_selection_type_enum_add_all_customers stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: add all_customers value to existing customer_selection_type_enum if it doesn't exist
ALTER TYPE price_promo.customer_selection_type_enum ADD VALUE 'all_customers';