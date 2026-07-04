CREATE POLICY "service_role_all" ON public."Download" TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public."Message" TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public."AuditLog" TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public."Project" TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public."StaffAssignment" TO service_role USING (true) WITH CHECK (true);;
