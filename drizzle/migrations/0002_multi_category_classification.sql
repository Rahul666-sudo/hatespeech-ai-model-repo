-- 0002_multi_category_classification.sql
-- Update messages table to support multi-category content moderation:
-- "Hate Speech", "Personal Insults", "Threats", "Non-harmful Content", "Offensive", "Clean"

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_classification_check;

DROP POLICY IF EXISTS "Receiver sees allowed messages" ON public.messages;
CREATE POLICY "Receiver sees allowed messages" ON public.messages FOR SELECT TO authenticated USING (
  auth.uid() = receiver_id AND (
    classification = 'clean' OR
    classification = 'non_harmful' OR
    classification ILIKE '%Clean%' OR
    classification ILIKE '%Non-harmful Content%' OR
    NOT public.detector_on(auth.uid())
  )
);
