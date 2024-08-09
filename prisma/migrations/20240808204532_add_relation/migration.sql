-- AddForeignKey
ALTER TABLE "Invoices" ADD CONSTRAINT "Invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
