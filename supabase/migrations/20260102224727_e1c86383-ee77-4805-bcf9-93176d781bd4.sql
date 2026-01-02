-- Add evidence versioning to corpus
ALTER TABLE epsr_evidence_corpus
ADD COLUMN evidence_version INT DEFAULT 1;

-- Create trigger to auto-increment version on update
CREATE OR REPLACE FUNCTION increment_evidence_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.evidence_version = COALESCE(OLD.evidence_version, 1) + 1;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_increment_evidence_version
BEFORE UPDATE ON epsr_evidence_corpus
FOR EACH ROW
EXECUTE FUNCTION increment_evidence_version();