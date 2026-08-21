USE construction_erp;
INSERT IGNORE INTO material_categories(company_id,name) VALUES (1,'Cement'),(1,'Steel'),(1,'Aggregate'),(1,'Brick'),(1,'Paint'),(1,'Electrical'),(1,'Plumbing'),(1,'Other');
INSERT IGNORE INTO expense_categories(company_id,name,expense_type) VALUES (1,'Transport','Transport'),(1,'Fuel','Fuel'),(1,'Food','Food'),(1,'Office','Office'),(1,'Miscellaneous','Miscellaneous');
