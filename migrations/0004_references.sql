CREATE TRIGGER record_references BEFORE INSERT ON records BEGIN
SELECT CASE WHEN NEW.kind='quote' AND NOT EXISTS(SELECT 1 FROM records WHERE tenant_id=NEW.tenant_id AND id=json_extract(NEW.data,'$.customerId') AND kind='customer') THEN RAISE(ABORT,'customer reference') END;
SELECT CASE WHEN NEW.kind='price' AND (NOT EXISTS(SELECT 1 FROM records WHERE tenant_id=NEW.tenant_id AND id=json_extract(NEW.data,'$.customerId') AND kind='customer') OR NOT EXISTS(SELECT 1 FROM records WHERE tenant_id=NEW.tenant_id AND id=json_extract(NEW.data,'$.productId') AND kind='product')) THEN RAISE(ABORT,'price reference') END;
SELECT CASE WHEN NEW.kind='receipt' AND NOT EXISTS(SELECT 1 FROM records WHERE tenant_id=NEW.tenant_id AND id=json_extract(NEW.data,'$.orderId') AND kind='order') THEN RAISE(ABORT,'order reference') END;
END;
CREATE TRIGGER receipt_positive BEFORE INSERT ON records WHEN NEW.kind='receipt' BEGIN
SELECT CASE WHEN json_extract(NEW.data,'$.amount')<=0 THEN RAISE(ABORT,'invalid receipt') END;
END;
