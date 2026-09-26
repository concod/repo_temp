--liquibase formatted sql
--changeset liquibase:customer_restriction stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for customer_restriction
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'price_promo'
          AND t.typname = 'customer_restriction'
    ) THEN

        RAISE NOTICE 'Creating type price_promo.customer_restriction.';

        EXECUTE '
            CREATE TYPE price_promo.customer_restriction AS (
				customer_restriction_level text,
				"lock" bool,
				hierarchy_data jsonb);
        ';

    ELSE
        RAISE NOTICE 'Type price_promo.customer_restriction already exists. Skipping creation.';
    END IF;
END
$$;