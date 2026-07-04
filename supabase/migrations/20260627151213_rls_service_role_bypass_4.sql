CREATE POLICY "service_role_all" ON public."ProjectTask" TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public."ProjectNote" TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public."ClientCommunication" TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public."_prisma_migrations" TO service_role USING (true) WITH CHECK (true);;
