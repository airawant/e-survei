-- Create enum types
CREATE TYPE survey_type AS ENUM ('weighted', 'unweighted');
CREATE TYPE question_type AS ENUM ('likert-4', 'likert-6', 'multiple_choice', 'text', 'dropdown', 'radio', 'checkbox', 'date', 'number');

-- Create surveys table
CREATE TABLE surveys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    type survey_type NOT NULL DEFAULT 'unweighted',
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indicators table
CREATE TABLE indicators (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    weight DECIMAL(5,2) DEFAULT 1.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create questions table
CREATE TABLE questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    indicator_id UUID REFERENCES indicators(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    type question_type NOT NULL DEFAULT 'likert',
    weight DECIMAL(5,2) DEFAULT 1.00,
    options JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create respondents table
CREATE TABLE respondents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create responses table
CREATE TABLE responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
    respondent_id UUID REFERENCES respondents(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create answers table
CREATE TABLE answers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    response_id UUID REFERENCES responses(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    text_answer TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_surveys_type ON surveys(type);
CREATE INDEX idx_indicators_survey_id ON indicators(survey_id);
CREATE INDEX idx_questions_indicator_id ON questions(indicator_id);
CREATE INDEX idx_respondents_survey_id ON respondents(survey_id);
CREATE INDEX idx_responses_survey_id ON responses(survey_id);
CREATE INDEX idx_responses_respondent_id ON responses(respondent_id);
CREATE INDEX idx_answers_response_id ON answers(response_id);
CREATE INDEX idx_answers_question_id ON answers(question_id);

-- Create RLS policies
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE respondents ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- Create policies for surveys
CREATE POLICY "Surveys are viewable by everyone" ON surveys
    FOR SELECT USING (true);

CREATE POLICY "Surveys are insertable by authenticated users" ON surveys
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Surveys are updatable by authenticated users" ON surveys
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create policies for indicators
CREATE POLICY "Indicators are viewable by everyone" ON indicators
    FOR SELECT USING (true);

CREATE POLICY "Indicators are insertable by authenticated users" ON indicators
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create policies for questions
CREATE POLICY "Questions are viewable by everyone" ON questions
    FOR SELECT USING (true);

CREATE POLICY "Questions are insertable by authenticated users" ON questions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create policies for respondents
CREATE POLICY "Respondents are viewable by authenticated users" ON respondents
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Respondents are insertable by authenticated users" ON respondents
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create policies for responses
CREATE POLICY "Responses are viewable by authenticated users" ON responses
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Responses are insertable by authenticated users" ON responses
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create policies for answers
CREATE POLICY "Answers are viewable by authenticated users" ON answers
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Answers are insertable by authenticated users" ON answers
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_surveys_updated_at
    BEFORE UPDATE ON surveys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_indicators_updated_at
    BEFORE UPDATE ON indicators
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at
    BEFORE UPDATE ON questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
