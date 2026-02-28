-- 1. Add time_taken column to student_submissions table
ALTER TABLE student_submissions 
ADD COLUMN IF NOT EXISTS time_taken INTEGER DEFAULT 0;

-- 2. Update the process_exam_result_queue function to handle time_taken
-- Note: This replaces the existing function. Ensure you have permissions.
CREATE OR REPLACE FUNCTION process_exam_result_queue(payloads JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item JSONB;
  v_submission_id UUID;
  q_answer JSONB;
  results JSONB := '[]'::JSONB;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(payloads)
  LOOP
    -- Insert or Update Submission
    INSERT INTO student_submissions (
      exam_id, 
      student_name, 
      student_roll, 
      total_marks, 
      obtained_marks, 
      status,
      time_taken -- Added field
    )
    VALUES (
      (item->>'exam_id')::UUID,
      item->>'student_name',
      item->>'student_roll',
      (item->>'total_marks')::NUMERIC,
      (item->>'obtained_marks')::NUMERIC,
      'checked',
      COALESCE((item->>'time_taken')::INTEGER, 0) -- Handle time_taken
    )
    ON CONFLICT (exam_id, student_roll) 
    DO UPDATE SET 
      obtained_marks = EXCLUDED.obtained_marks,
      total_marks = EXCLUDED.total_marks,
      student_name = EXCLUDED.student_name,
      time_taken = EXCLUDED.time_taken, -- Update time_taken
      updated_at = NOW()
    RETURNING id INTO v_submission_id;

    -- Process Answers
    IF item->'answers' IS NOT NULL THEN
      -- Delete existing answers for this submission to prevent duplicates/stale data
      DELETE FROM student_answers WHERE submission_id = v_submission_id;

      FOR q_answer IN SELECT * FROM jsonb_array_elements(item->'answers')
      LOOP
        INSERT INTO student_answers (
          submission_id,
          question_id,
          selected_option,
          text_answer,
          attachment_url,
          is_correct,
          marks_obtained
        )
        VALUES (
          v_submission_id,
          (q_answer->>'question_id')::UUID,
          q_answer->>'selected_option',
          q_answer->>'text_answer',
          q_answer->>'attachment_url',
          (q_answer->>'is_correct')::BOOLEAN,
          (q_answer->>'marks_obtained')::NUMERIC
        );
      END LOOP;
    END IF;

    results := results || jsonb_build_object('roll', item->>'student_roll', 'status', 'success');
  END LOOP;

  RETURN results;
END;
$$;
