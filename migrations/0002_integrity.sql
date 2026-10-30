CREATE TRIGGER action_state BEFORE INSERT ON actions BEGIN
SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM records WHERE tenant_id=NEW.tenant_id AND id=NEW.record_id AND ((NEW.action='submit' AND json_extract(data,'$.status')='draft') OR (NEW.action='approve' AND json_extract(data,'$.status')='pending') OR (NEW.action='send' AND json_extract(data,'$.status')='approved') OR (NEW.action='order' AND json_extract(data,'$.status')='sent') OR (NEW.action='deliver' AND json_extract(data,'$.status')='confirmed'))) THEN RAISE(ABORT,'invalid transition') END;
END;
CREATE TRIGGER receipt_limit BEFORE UPDATE ON records WHEN NEW.kind='receipt' AND json_extract(NEW.data,'$.status')='confirmed' BEGIN
SELECT CASE WHEN (SELECT COALESCE(SUM(json_extract(data,'$.amount')),0) FROM records WHERE tenant_id=NEW.tenant_id AND kind='receipt' AND id!=NEW.id AND json_extract(data,'$.orderId')=json_extract(NEW.data,'$.orderId') AND json_extract(data,'$.status')='confirmed')+json_extract(NEW.data,'$.amount') > (SELECT json_extract(data,'$.total') FROM records WHERE tenant_id=NEW.tenant_id AND id=json_extract(NEW.data,'$.orderId') AND kind='order') THEN RAISE(ABORT,'payment exceeds order') END;
END;
CREATE UNIQUE INDEX product_code ON records(tenant_id,json_extract(data,'$.code')) WHERE kind='product';
