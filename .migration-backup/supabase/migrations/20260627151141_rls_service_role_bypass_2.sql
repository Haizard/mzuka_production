CREATE POLICY "service_role_all" ON public."Gallery" TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public."MediaAsset" TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public."AiAnalysis" TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public."Payment" TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public."AccessLog" TO service_role USING (true) WITH CHECK (true);;
