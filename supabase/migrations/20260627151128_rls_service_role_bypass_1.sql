CREATE POLICY "service_role_all" ON public."User" TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public."ClientApproval" TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public."ServicePackage" TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public."Booking" TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public."BookingReminder" TO service_role USING (true) WITH CHECK (true);;
