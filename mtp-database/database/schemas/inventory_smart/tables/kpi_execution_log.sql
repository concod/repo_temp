--liquibase formatted sql
--changeset liquibase:kpi_execution_log stripComments:false splitStatements:false context:MTP-108633 labels:MTP-108633
--comment: MTP-108633:initial changeset for kpi_execution_log
CREATE TABLE IF NOT EXISTS inventory_smart.kpi_execution_log (
  log_id SERIAL PRIMARY KEY,
  kpi_id INT REFERENCES inventory_smart.kpi_config(kpi_id),
  action VARCHAR(100),
  generated_sql TEXT,
  status VARCHAR(20) CHECK (status IN ('pending', 'running', 'success', 'failed')),
  error_message TEXT,
  executed_at TIMESTAMP DEFAULT now()
);
