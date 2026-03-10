-- Allow users to delete their own course requests (e.g. when unsaving a coming-soon course)
CREATE POLICY "Users can delete their own course requests"
  ON public.course_requests
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
