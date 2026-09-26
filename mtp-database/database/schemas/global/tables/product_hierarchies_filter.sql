--liquibase formatted sql
--changeset liquibase:product_hierarchies_filter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_hierarchies_filter
CREATE TABLE "global".product_hierarchies_filter (
	hierarchy_code serial4 NOT NULL,
	"path" jsonb NOT NULL,
	"level" int2 NOT NULL,
	active bool NOT NULL DEFAULT true,
	created_at timestamp NOT NULL DEFAULT now(),
	updated_at timestamp NULL,
	CONSTRAINT product_hierarchies_filter_pk PRIMARY KEY (hierarchy_code),
	CONSTRAINT product_hierarchies_filter_un UNIQUE (path, level)
);
CREATE INDEX product_hierarchies_filter_level_idx ON global.product_hierarchies_filter USING btree (level);

--changeset ashish@impactanalytics.co:product_hierarchies_filter_validity_cleanup stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding validity column for product_hierarchies_filter_validity_cleanup
ALTER TABLE global.product_hierarchies_filter DROP COLUMN IF EXISTS validity;

--changeset ashish@impactanalytics.co:product_hierarchies_filter_reset_constraint stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: product_hierarchies_filter_reset_constraint
DO $$
DECLARE
    _is_correct boolean;
BEGIN
    -- Check if the constraint exists on the correct columns
    SELECT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        JOIN pg_attribute a1 ON a1.attnum = ANY(c.conkey) AND a1.attrelid = t.oid
        JOIN pg_attribute a2 ON a2.attnum = ANY(c.conkey) AND a2.attrelid = t.oid
        WHERE c.conname = 'product_hierarchies_filter_un'
          AND n.nspname = 'global'
          AND t.relname = 'product_hierarchies_filter'
          AND ARRAY(
                SELECT attname FROM pg_attribute 
                WHERE attrelid = t.oid AND attnum = ANY(c.conkey)
                ORDER BY attnum
              )::text[] = ARRAY['path', 'level']
    ) INTO _is_correct;

    -- Drop and recreate if exists but incorrect
    IF NOT _is_correct THEN
        IF EXISTS (
            SELECT 1
            FROM pg_constraint c
            JOIN pg_class t ON c.conrelid = t.oid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            WHERE c.conname = 'product_hierarchies_filter_un'
              AND n.nspname = 'global'
              AND t.relname = 'product_hierarchies_filter'
        ) THEN
            EXECUTE 'ALTER TABLE "global".product_hierarchies_filter DROP CONSTRAINT product_hierarchies_filter_un';
        END IF;

        EXECUTE 'ALTER TABLE "global".product_hierarchies_filter ADD CONSTRAINT product_hierarchies_filter_un UNIQUE (path, level)';
    END IF;
END $$;

--changeset kamalesh.k@impactanalytics.co:product_hierarchies_filter_path_idx stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: product_hierarchies_filter_path_idx
CREATE INDEX IF NOT EXISTS product_hierarchies_filter_path_idx
ON "global".product_hierarchies_filter
((path ->> 'product_code'), "level", active);
