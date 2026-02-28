CREATE OR REPLACE FUNCTION get_exam_analytics(exam_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    WITH stats AS (
        SELECT
            COUNT(*) as total_participants,
            COALESCE(MAX(time_taken), 0) as max_time,
            COALESCE(MIN(time_taken), 0) as min_time,
            COALESCE(AVG(time_taken), 0) as avg_time,
            COALESCE(AVG(obtained_marks), 0) as avg_marks,
            COALESCE(MAX(obtained_marks), 0) as max_marks,
            COALESCE(MIN(obtained_marks), 0) as min_marks
        FROM student_submissions
        WHERE exam_id = exam_uuid
    ),
    question_performance AS (
        SELECT
            sa.question_id,
            q.question_text,
            COUNT(*) FILTER (WHERE sa.is_correct = true) as correct_count,
            COUNT(*) FILTER (WHERE sa.is_correct = false) as incorrect_count,
            COUNT(*) as total_attempts
        FROM student_answers sa
        JOIN student_submissions ss ON ss.id = sa.submission_id
        LEFT JOIN questions q ON q.id = sa.question_id
        WHERE ss.exam_id = exam_uuid
        GROUP BY sa.question_id, q.question_text
    ),
    student_details AS (
        SELECT
            student_name,
            student_roll,
            obtained_marks,
            total_marks,
            time_taken,
            submitted_at
        FROM student_submissions
        WHERE exam_id = exam_uuid
        ORDER BY obtained_marks DESC, time_taken ASC
    )
    SELECT json_build_object(
        'overview', (SELECT row_to_json(stats) FROM stats),
        'questions', (SELECT json_agg(row_to_json(question_performance)) FROM question_performance),
        'students', (SELECT json_agg(row_to_json(student_details)) FROM student_details)
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql;
