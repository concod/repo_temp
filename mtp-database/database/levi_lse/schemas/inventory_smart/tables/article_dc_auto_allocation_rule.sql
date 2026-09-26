-- liquibase formatted sql
--changeset liquibase:article_dc_auto_allocation_rule stripComments:false splitStatements:false context:Release_1_0 labels:mtp_100726
--comment: create article_dc_auto_allocation_rule (preferred DC per article)

CREATE TABLE IF NOT EXISTS inventory_smart.article_dc_auto_allocation_rule (
  article  text PRIMARY KEY,                         -- article
  dc_code       text NOT NULL,                           -- the sole DC auto should use
  enabled       boolean NOT NULL DEFAULT true,
  validity      daterange NOT NULL DEFAULT daterange(current_date, NULL),
  updated_by    INT4,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),                                    -- ref to global.user_master(user_code)
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE inventory_smart.article_dc_auto_allocation_rule IS
  'Preferred DC for AUTO allocation per article. Manual flows unaffected.';

COMMENT ON COLUMN inventory_smart.article_dc_auto_allocation_rule.article IS 'article to which the rule applies';
COMMENT ON COLUMN inventory_smart.article_dc_auto_allocation_rule.dc_code       IS 'The sole DC to use for AUTO allocation when rule is active';
COMMENT ON COLUMN inventory_smart.article_dc_auto_allocation_rule.enabled       IS 'If true, rule is active (subject to validity)';
COMMENT ON COLUMN inventory_smart.article_dc_auto_allocation_rule.validity      IS 'Date range over which the rule applies';
COMMENT ON COLUMN inventory_smart.article_dc_auto_allocation_rule.updated_by    IS 'Last editor (user)';
COMMENT ON COLUMN inventory_smart.article_dc_auto_allocation_rule.updated_at    IS 'When last updated';


-- GiST index for daterange lookups (btree_gist extension must exist; you confirmed it does)
CREATE INDEX IF NOT EXISTS idx_article_dc_rule_valid
  ON inventory_smart.article_dc_auto_allocation_rule USING GIST (validity);

-- Prevent overlapping active windows for the same article when enabled
ALTER TABLE inventory_smart.article_dc_auto_allocation_rule
  ADD CONSTRAINT uq_article_no_overlap
  EXCLUDE USING gist (
    article WITH =,
    validity WITH &&
  ) WHERE (enabled);

-- Foreign key to user master for audit (optional, mirrors L0 table)
ALTER TABLE inventory_smart.article_dc_auto_allocation_rule
ADD CONSTRAINT article_dc_auto_allocation_rule_updated_by_fk 
FOREIGN KEY (updated_by) REFERENCES global.user_master(user_code) ON DELETE SET NULL;
