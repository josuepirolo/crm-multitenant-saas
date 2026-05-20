-- Remove tabelas de conversas e mensagens.
-- Comunicação WhatsApp será gerenciada pelo provider externo (Z-API, Evolution, Meta Cloud API, etc.)
-- O frontend se comunica via abstração única no backend — sem armazenamento local.

DROP TABLE IF EXISTS messages      CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

DROP TYPE IF EXISTS conv_status;
DROP TYPE IF EXISTS message_direction;
DROP TYPE IF EXISTS message_status;
